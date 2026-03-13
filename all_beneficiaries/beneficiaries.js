const { remote } = require('webdriverio');

// 1. Define your Appium Capabilities
const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'emulator-5554', // Change to your actual device name or ID
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat', // ✅ Updated Package ID
    'appium:appActivity': '.ui.login.LoginActivity',
    'appium:noReset': true // Keeps you logged in between test runs
};

const wdioOptions = {
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities: capabilities,
    logLevel: 'error'
};

// 2. Click All Beneficiaries
async function clickAllBeneficiaries(driver) {
    console.log("👆 Clicking on All Beneficiaries...");

    const allBeneficiariesBtn = await driver.$('//android.widget.TextView[@text="All\nBeneficiaries"]');

    await allBeneficiariesBtn.waitForDisplayed({ timeout: 5000 });
    await allBeneficiariesBtn.click();

    console.log("✅ Successfully clicked All Beneficiaries");
}

// 3. Search and Click ABHA
async function searchAndClickAbha(driver, nameToSearch) {
    console.log(`🔍 Searching for: ${nameToSearch}`);

    // Find and click the Search Box
    const searchBox = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/searchView")'); // ✅ Updated ID
    await searchBox.waitForDisplayed({ timeout: 5000 });
    await searchBox.click();

    // Type the name into the search box
    await searchBox.setValue(nameToSearch);

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
    }

    // Brief pause to allow the list to filter
    await driver.pause(2000);

    // Format the name to uppercase to match the app's UI exactly
    const exactNameInApp = nameToSearch.toUpperCase();
    console.log(`👆 Clicking ABHA button for ${exactNameInApp}...`);

    // Find the specific person's card, then find the ABHA button inside it
    const abhaButtonXPath = `//android.widget.TextView[@text="${exactNameInApp}"]/ancestor::android.view.ViewGroup[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/contentLayout"]//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_abha"]`; // ✅ Updated IDs

    const abhaButton = await driver.$(abhaButtonXPath);
    await abhaButton.waitForDisplayed({ timeout: 5000 });
    await abhaButton.click();

    console.log(`✅ Successfully clicked ABHA for ${exactNameInApp}`);
}

async function createAbha(driver, aadhaarNumber, mobileNumber) {
    console.log("📝 Starting ABHA Creation process...");

    // 1. Ensure we are on the "Create ABHA" tab
    const createToggle = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/createToggle")'); // ✅ Updated ID
    await createToggle.waitForDisplayed({ timeout: 5000 });
    await createToggle.click();
    console.log("✅ Selected 'Create ABHA' tab");

    await driver.pause(1000);

    // 2. Fill the Aadhaar Number
    // The Aadhaar input is split into 3 fields (4 digits each). We need to find all of them.
    console.log(`🔢 Entering Aadhaar Number: ${aadhaarNumber}`);

    // Removing any spaces from the input just in case
    const cleanAadhaar = aadhaarNumber.replace(/\s/g, '');

    if (cleanAadhaar.length === 12) {
        const part1 = cleanAadhaar.substring(0, 4);
        const part2 = cleanAadhaar.substring(4, 8);
        const part3 = cleanAadhaar.substring(8, 12);

        // Find all EditTexts inside the Aadhaar input container
        const aadhaarInputs = await driver.$$('//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tiet_aadhaar_number"]//android.widget.EditText'); // ✅ Updated ID

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

    // 3. Fill the Mobile Number
    console.log(`📱 Entering Mobile Number: ${mobileNumber}`);
    const mobileInput = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/tiet_mobile_number")'); // ✅ Updated ID
    await mobileInput.setValue(mobileNumber);

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
    }
    console.log("✅ Mobile Number entered");

    await driver.pause(1000);

    // 4. Click the Consent View/Checkbox
    console.log("👆 Accepting Consent...");
    // The developer made a specific view clickable for the consent instead of just the checkbox
    const consentClickView = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/clickview")'); // ✅ Updated ID
    await consentClickView.click();
    console.log("✅ Consent accepted");

    await driver.pause(1000);

    // 5. Click "Send OTP"
    console.log("👆 Clicking 'Send OTP'...");
    const sendOtpBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_verify_aadhaar")'); // ✅ Updated ID

    // Wait for the button to become enabled (it usually enables after consent is checked and valid data is entered)
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

    // Wait for consent screen
    const title = await driver.$(
        'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/tvTitleDeclaration")' // ✅ Updated ID
    );
    await title.waitForDisplayed({ timeout: 10000 });

    console.log("☑️ Clicking MASTER checkbox (first one)...");

    // Click the FIRST checkbox inside RecyclerView
    const firstCheckbox = await driver.$(
        '(//androidx.recyclerview.widget.RecyclerView//*[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/checkBox"])[1]' // ✅ Updated ID
    );

    await firstCheckbox.waitForDisplayed({ timeout: 5000 });

    const isChecked = await firstCheckbox.getAttribute("checked");

    if (isChecked === "false") {
        await firstCheckbox.click();
        console.log("✅ Master checkbox clicked — all boxes selected");
    } else {
        console.log("ℹ️ Already checked");
    }

    await driver.pause(1000);

    // Click I Agree
    const agreeBtn = await driver.$(
        'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_accept")' // ✅ Updated ID
    );

    await agreeBtn.waitForDisplayed({ timeout: 5000 });
    await agreeBtn.click();

    console.log("🎉 Clicked I Agree successfully!");
}

// 4. Main Execution Block
async function main() {
    console.log("🚀 Starting Appium session...");
    const driver = await remote(wdioOptions);

    try {
        // Wait for the Dashboard to load fully
        await driver.pause(3000);

        // Execute the flow
        await clickAllBeneficiaries(driver);
        await driver.pause(2000); // Wait for beneficiaries list to load

        await searchAndClickAbha(driver, "Rahul sharma");
        await driver.pause(2000);
        await createAbha(driver, "264396640972", "9391345768");
        await markAllAndAgree(driver);
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

// Run the script
main();