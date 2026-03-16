const { remote } = require('webdriverio');

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'emulator-5554',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': '.ui.login.LoginActivity',
    'appium:noReset': true
};

const wdioOptions = {
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities: capabilities,
    logLevel: 'error'
};

async function clickAllBeneficiaries(driver) {
    console.log("👆 Clicking on All Beneficiaries...");

    const allBeneficiariesBtn = await driver.$('//android.widget.TextView[@text="All\nBeneficiaries"]');

    await allBeneficiariesBtn.waitForDisplayed({ timeout: 5000 });
    await allBeneficiariesBtn.click();

    console.log("✅ Successfully clicked All Beneficiaries");
}


async function scrollAndClickAbha(driver, nameToSearch) {
    const exactNameInApp = nameToSearch.toUpperCase();
    console.log(`🔍 Scrolling to find: ${exactNameInApp}...`);


    const scrollableSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${exactNameInApp}")`;

    try {
        const nameElement = await driver.$(scrollableSelector);

        await nameElement.waitForExist({ timeout: 15000 });
        console.log(`✅ Found ${exactNameInApp} in the list!`);
    } catch (error) {
        console.error(`❌ Could not find ${exactNameInApp} after scrolling.`);
        throw new Error(`Beneficiary ${exactNameInApp} not found in the list.`);
    }

    await driver.pause(1000);

    console.log(`👆 Clicking ABHA button for ${exactNameInApp}...`);


    const abhaButtonXPath = `//android.widget.TextView[@text="${exactNameInApp}"]/ancestor::android.view.ViewGroup[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/contentLayout"]//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_abha"]`;

    const abhaButton = await driver.$(abhaButtonXPath);
    await abhaButton.waitForDisplayed({ timeout: 5000 });
    await abhaButton.click();

    console.log(`✅ Successfully clicked ABHA for ${exactNameInApp}`);
}

async function createAbha(driver, aadhaarNumber, mobileNumber) {
    console.log("📝 Starting ABHA Creation process...");

    const createToggle = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/createToggle")');
    await createToggle.waitForDisplayed({ timeout: 5000 });
    await createToggle.click();
    console.log("✅ Selected 'Create ABHA' tab");

    await driver.pause(1000);

    console.log(`🔢 Entering Aadhaar Number: ${aadhaarNumber}`);

    const cleanAadhaar = aadhaarNumber.replace(/\s/g, '');

    if (cleanAadhaar.length === 12) {
        const part1 = cleanAadhaar.substring(0, 4);
        const part2 = cleanAadhaar.substring(4, 8);
        const part3 = cleanAadhaar.substring(8, 12);

        const aadhaarInputs = await driver.$$('//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tiet_aadhaar_number"]//android.widget.EditText');

        if (aadhaarInputs.length === 3) {
            await aadhaarInputs[0].setValue(part1);
            await aadhaarInputs[1].setValue(part2);
            await aadhaarInputs[2].setValue(part3);
            console.log("✅ Aadhaar Number entered successfully");
        } else {
            console.log("❌ Error: Could not find exactly 3 Aadhaar input boxes.");
        }
    } else {
        console.log("❌ Error: Aadhaar number must be exactly 12 digits.");
    }

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
    }

    console.log(`📱 Entering Mobile Number: ${mobileNumber}`);
    const mobileInput = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/tiet_mobile_number")');
    await mobileInput.setValue(mobileNumber);

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
    }
    console.log("✅ Mobile Number entered");

    await driver.pause(1000);

    console.log("👆 Accepting Consent...");

    const consentClickView = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/clickview")');
    await consentClickView.click();
    console.log("✅ Consent accepted");

    await driver.pause(1000);

    console.log("👆 Clicking 'Send OTP'...");
    const sendOtpBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_verify_aadhaar")');

    await driver.waitUntil(
        async () => await sendOtpBtn.isEnabled(),
        {
            timeout: 5000,
            timeoutMsg: 'Send OTP button did not become enabled after 5s'
        }
    );

    await sendOtpBtn.click();
    console.log("✅ Clicked Send OTP");
}

async function markAllAndAgree(driver) {
    console.log("📝 Handling ABHA Consent screen...");

    const title = await driver.$(
        'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/tvTitleDeclaration")'
    );
    await title.waitForDisplayed({ timeout: 10000 });

    console.log("☑️ Verifying and clicking all consent checkboxes...");


    const checkboxes = await driver.$$('//android.widget.CheckBox[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/checkBox"]');


    for (let i = 0; i < checkboxes.length; i++) {
        const isChecked = await checkboxes[i].getAttribute("checked");

        if (isChecked === "false") {
            await checkboxes[i].click();
            console.log(`✅ Clicked checkbox ${i + 1}`);
            await driver.pause(500); // Brief pause to allow UI to register the click
        } else {
            console.log(`ℹ️ Checkbox ${i + 1} was already checked`);
        }
    }

    await driver.pause(1000);

    const agreeBtn = await driver.$(
        'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_accept")'
    );

    await agreeBtn.waitForDisplayed({ timeout: 5000 });
    await agreeBtn.click();

    console.log("🎉 Clicked I Agree successfully!");
}
async function waitForManualOtpAndVerify(driver, otpName = "OTP") {
    console.log(`⏳ You have 30 seconds to manually enter the ${otpName} on the device/emulator...`);

    // Wait for 30 seconds (30,000 milliseconds)
    await driver.pause(30000);

    console.log(`⏳ 30 seconds are up! Attempting to click 'Verify OTP' for ${otpName}...`);

    // Locate the Verify OTP button using its resource ID
    const verifyOtpBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_verify_OTP")');

    try {
        // Wait up to 5 seconds to make sure the button became enabled after your manual input
        await driver.waitUntil(
            async () => await verifyOtpBtn.isEnabled(),
            {
                timeout: 5000,
                timeoutMsg: `Verify OTP button is still disabled. Did you enter the full 6-digit ${otpName}?`
            }
        );

         
        await verifyOtpBtn.click();
        console.log(`✅ Clicked 'Verify OTP' for ${otpName} successfully!`);

    } catch (error) {
        console.error(`❌ Failed to verify ${otpName}: ${error.message}`);
        throw error;
    }
}

async function declineAbhaDownload(driver) {
    console.log("📝 Checking for ABHA download prompt...");


    const noButton = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_download_abha_no")');

    try {

        await noButton.waitForDisplayed({ timeout: 10000 });
        await noButton.click();
        console.log("✅ Clicked 'No' for downloading the ABHA card!");
    } catch (error) {
        console.error(`❌ Could not find or click the 'No' button: ${error.message}`);
        throw error;
    }
}
async function main() {
    console.log("🚀 Starting Appium session...");
    const driver = await remote(wdioOptions);

    try {
        await driver.pause(3000);

        await clickAllBeneficiaries(driver);
        await driver.pause(2000);

        await scrollAndClickAbha(driver, "KAVITA VERMA");
        await driver.pause(2000);


        await createAbha(driver, "379337136926", "9014984113");


        await waitForManualOtpAndVerify(driver, "Aadhaar OTP");

        await driver.pause(3000);


        await markAllAndAgree(driver);

        await driver.pause(3000);


        await waitForManualOtpAndVerify(driver, "Mobile OTP");
        await driver.pause(3000);


        await declineAbhaDownload(driver);

    } catch (error) {
        console.error("❌ Test Failed:", error);
    } finally {
        if (driver) {
            console.log("🛑 Closing Appium session...");
            await driver.pause(2000);
            await driver.deleteSession();
        }
    }
}


main();