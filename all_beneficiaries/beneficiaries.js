const { remote } = require("webdriverio");
const { selectLanguage, login } = require("../steps/loginSteps"); // Adjust to '../steps/loginSteps' if needed based on directory structure
const { selectVillage } = require("../steps/villageSteps");

// ─────────────────────────────────────────────────────────────
//  ABHA HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

async function clickAllBeneficiaries(driver) {
    console.log("👆 Clicking on All Beneficiaries...");
    const allBeneficiariesBtn = await driver.$('//android.widget.TextView[@text="All\nBeneficiaries"]');
    await allBeneficiariesBtn.waitForDisplayed({ timeout: 5000 });
    await allBeneficiariesBtn.click();
    console.log("✅ Successfully clicked All Beneficiaries");
}

// New function to handle searching via the search bar instead of scrolling
async function searchAndClickAbha(driver, searchText, fullName) {
    console.log(`🔍 Typing '${searchText}' in the search bar...`);

    // Target the search bar using its resource-id from the XML
    const searchInput = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/searchView")');
    await searchInput.waitForDisplayed({ timeout: 5000 });
    await searchInput.click();
    await searchInput.setValue(searchText);

    // Hide keyboard if it pops up so it doesn't block the screen
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(800);
    }

    await driver.pause(2000); // Give the app a moment to filter the list

    const exactNameInApp = fullName.toUpperCase();
    console.log(`🔍 Verifying and looking for full name match: ${exactNameInApp}...`);

    try {
        // Find the ABHA button tied specifically to the full name provided
        const abhaButtonXPath = `//android.widget.TextView[@text="${exactNameInApp}"]/ancestor::android.view.ViewGroup[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/contentLayout"]//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_abha"]`;
        const abhaButton = await driver.$(abhaButtonXPath);

        await abhaButton.waitForDisplayed({ timeout: 10000 });
        console.log(`👆 Clicking ABHA button for ${exactNameInApp}...`);
        await abhaButton.click();
        console.log(`✅ Successfully clicked ABHA for ${exactNameInApp}`);
    } catch (error) {
        console.error(`❌ Could not find ${exactNameInApp} after searching for '${searchText}'.`);
        throw new Error(`Beneficiary ${exactNameInApp} not found in the filtered list.`);
    }
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

async function markAllAndAgree(driver) {
    console.log("📝 Handling ABHA Consent screen (AbhaConsentFragment)...");

    const title = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/tvTitleDeclaration")');
    await title.waitForDisplayed({ timeout: 10000 });
    console.log("✅ Consent screen is visible");

    try {
        await driver.$('android=new UiScrollable(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/recyclerView")).scrollToBeginning(5)');
    } catch (e) {
        console.log("⚠️ Could not scroll to top of consent list:", e.message);
    }
    await driver.pause(800);

    let allChecked = false;
    let scrollAttempts = 0;
    const maxScrollAttempts = 10;

    while (!allChecked && scrollAttempts < maxScrollAttempts) {
        const checkboxes = await driver.$$('//android.widget.CheckBox[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/checkBox"]');
        console.log(`🔍 Found ${checkboxes.length} visible checkbox(es) on screen`);

        for (let i = 0; i < checkboxes.length; i++) {
            try {
                const box = checkboxes[i];
                const isDisplayed = await box.isDisplayed();
                if (!isDisplayed) continue;

                const checkedAttr = await box.getAttribute("checked");
                const isChecked = (checkedAttr === "true" || checkedAttr === true);

                if (!isChecked) {
                    console.log(`☑️ Clicking unchecked checkbox ${i + 1}...`);
                    await box.click();
                    await driver.pause(600);

                    const newChecked = await box.getAttribute("checked");
                    if (newChecked === "true" || newChecked === true) {
                        console.log(`✅ Checkbox ${i + 1} is now checked`);
                    } else {
                        console.log(`⚠️ Checkbox ${i + 1} didn't toggle, trying text fallback...`);
                        try {
                            const textViews = await driver.$$('//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tvConsentText"]');
                            if (textViews[i]) {
                                await textViews[i].click();
                                await driver.pause(600);
                            }
                        } catch (e2) {
                            console.log(`⚠️ Text fallback also failed: ${e2.message}`);
                        }
                    }
                } else {
                    console.log(`✅ Checkbox ${i + 1} already checked`);
                }
            } catch (e) {
                console.log(`⚠️ Error processing checkbox ${i + 1}: ${e.message}`);
            }
        }

        try {
            const agreeBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_accept")');
            if (await agreeBtn.isExisting()) {
                const enabledAttr = await agreeBtn.getAttribute("enabled");
                if (enabledAttr === "true" || enabledAttr === true) {
                    console.log("🎯 'I Agree' button is now enabled!");
                    allChecked = true;
                    break;
                }
            }
        } catch (e) {}

        console.log("📜 Scrolling down to reveal more consent items...");
        try {
            await driver.$('android=new UiScrollable(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/recyclerView")).scrollForward(3)');
        } catch (e) {
            try {
                await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollForward()');
            } catch (e2) {
                console.log("⚠️ Scroll forward failed:", e2.message);
            }
        }
        await driver.pause(1000);
        scrollAttempts++;
    }

    console.log("👆 Clicking 'I Agree' button...");
    const finalAgreeBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_accept")');
    await finalAgreeBtn.waitForDisplayed({ timeout: 8000 });

    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_accept"))');
        await driver.pause(500);
    } catch (e) {}

    await finalAgreeBtn.click();
    console.log("🎉 Clicked 'I Agree' successfully!");
    await driver.pause(2000);
}

async function createAbha(driver, aadhaarNumber, mobileNumber) {
    console.log("📝 Starting ABHA Creation process...");

    const createToggle = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/createToggle")');
    await createToggle.waitForDisplayed({ timeout: 5000 });
    await createToggle.click();
    console.log("✅ Selected 'Create ABHA' tab");
    await driver.pause(1000);

    console.log(`🔢 Entering Aadhaar Number: ${aadhaarNumber}`);
    const cleanAadhaar = aadhaarNumber.replace(/\s|-/g, '');

    if (cleanAadhaar.length === 12) {
        const part1 = cleanAadhaar.substring(0, 4);
        const part2 = cleanAadhaar.substring(4, 8);
        const part3 = cleanAadhaar.substring(8, 12);

        const aadhaarInputs = await driver.$$('//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tiet_aadhaar_number"]//android.widget.EditText');

        if (aadhaarInputs.length === 3) {
            await aadhaarInputs[0].click();
            await aadhaarInputs[0].setValue(part1);
            await driver.pause(600);

            await aadhaarInputs[1].click();
            await aadhaarInputs[1].setValue(part2);
            await driver.pause(600);

            await aadhaarInputs[2].click();
            await aadhaarInputs[2].setValue(part3);
            await driver.pause(600);

            console.log("✅ Aadhaar Number entered successfully");
        } else {
            throw new Error(`Found ${aadhaarInputs.length} Aadhaar input boxes, expected 3.`);
        }
    } else {
        throw new Error(`Aadhaar number must be exactly 12 digits. Got: ${cleanAadhaar.length}`);
    }

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(800);
    }

    console.log(`📱 Entering Mobile Number: ${mobileNumber}`);
    const mobileInput = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/tiet_mobile_number")');
    await mobileInput.waitForDisplayed({ timeout: 5000 });
    await mobileInput.click();
    await mobileInput.clearValue();
    await mobileInput.setValue(mobileNumber);
    await driver.pause(600);

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(800);
    }
    console.log("✅ Mobile Number entered");
    await driver.pause(1000);

    console.log("🔄 Scrolling consent area into view...");
    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/clickview"))');
    } catch (e) {
        console.log("⚠️ Scroll to consent area skipped:", e.message);
    }
    await driver.pause(600);

    console.log("👆 Clicking consent clickview (will open consent screen)...");
    const consentClickView = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/clickview")');
    await consentClickView.waitForDisplayed({ timeout: 5000 });
    await consentClickView.click();
    await driver.pause(2500);

    let consentScreenOpened = false;
    try {
        const consentTitle = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/tvTitleDeclaration")');
        consentScreenOpened = await consentTitle.isDisplayed();
    } catch (e) {
        consentScreenOpened = false;
    }

    if (consentScreenOpened) {
        console.log("📋 Consent screen opened — processing all checkboxes...");
        await markAllAndAgree(driver);
        await driver.pause(2000);
        console.log("✅ Returned to Aadhaar entry screen after consent");
    } else {
        console.log("ℹ️ Consent screen did not open — checkbox may have toggled directly");
    }

    console.log("🔄 Scrolling Send OTP button into view...");
    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_verify_aadhaar"))');
    } catch (e) {
        console.log("⚠️ Scroll to Send OTP skipped:", e.message);
    }
    await driver.pause(1000);

    console.log("⏳ Waiting for Send OTP button to become enabled...");
    const sendOtpBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_verify_aadhaar")');
    await sendOtpBtn.waitForDisplayed({ timeout: 8000 });

    let isEnabled = false;
    for (let attempt = 1; attempt <= 5; attempt++) {
        const enabled = await sendOtpBtn.getAttribute("enabled");
        if (enabled === "true" || enabled === true) {
            isEnabled = true;
            break;
        }
        console.log(`⚠️ Send OTP not yet enabled (attempt ${attempt}/5)...`);

        if (attempt === 3) {
            console.log("🔄 Re-attempting consent click...");
            try {
                await consentClickView.click();
                await driver.pause(2000);
                try {
                    const consentTitle = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/tvTitleDeclaration")');
                    if (await consentTitle.isDisplayed()) {
                        console.log("📋 Consent screen opened again — re-processing...");
                        await markAllAndAgree(driver);
                        await driver.pause(2000);
                    }
                } catch (e) {}
            } catch (e) {
                console.log("⚠️ Could not re-click consent:", e.message);
            }
        }

        await driver.pause(1500);
    }

    if (!isEnabled) {
        throw new Error("❌ Send OTP button never became enabled. Check: Aadhaar (12 digits), Mobile (10 digits), and Consent.");
    }

    await sendOtpBtn.click();
    console.log("✅ Clicked Send OTP");
}

async function waitForManualOtpAndVerify(driver, otpName = "OTP", waitSeconds = 180) {
    console.log(`⏳ [${otpName}] You have ${waitSeconds / 60} minute(s) to enter the OTP on the device...`);

    const pollInterval = 5000;
    const maxPolls = Math.floor((waitSeconds * 1000) / pollInterval);

    const verifyOtpBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_verify_OTP")');

    for (let poll = 0; poll < maxPolls; poll++) {
        await driver.pause(pollInterval);
        try {
            const isDisplayed = await verifyOtpBtn.isDisplayed();
            if (isDisplayed) {
                const enabled = await verifyOtpBtn.getAttribute("enabled");
                if (enabled === "true" || enabled === true) {
                    console.log(`✅ [${otpName}] OTP complete — clicking Verify OTP early (poll ${poll + 1})`);
                    await verifyOtpBtn.click();
                    console.log(`✅ [${otpName}] Verify OTP clicked!`);
                    return;
                }
            }
        } catch (e) {
            // Button not yet visible, keep waiting
        }
        const elapsedSec = (poll + 1) * (pollInterval / 1000);
        const remaining = waitSeconds - elapsedSec;
        if (remaining > 0) {
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            console.log(`⏳ [${otpName}] ~${mins}m ${secs}s remaining...`);
        }
    }

    console.log(`⏳ [${otpName}] Wait complete — final attempt to verify...`);
    try {
        await verifyOtpBtn.waitForDisplayed({ timeout: 5000 });
        await driver.waitUntil(
            async () => {
                const enabled = await verifyOtpBtn.getAttribute("enabled");
                return enabled === "true" || enabled === true;
            },
            {
                timeout: 15000,
                interval: 1000,
                timeoutMsg: `[${otpName}] Verify OTP button is still disabled. Did you enter the full 6-digit OTP?`
            }
        );
        await verifyOtpBtn.click();
        console.log(`✅ [${otpName}] Verify OTP clicked successfully!`);
    } catch (error) {
        console.error(`❌ [${otpName}] Failed to verify OTP: ${error.message}`);
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

// ─────────────────────────────────────────────────────────────
//  MAIN EXECUTION ROUTINE
// ─────────────────────────────────────────────────────────────

async function main() {
    const driver = await remote({
        protocol: "http",
        hostname: "localhost",
        port: 4723,
        path: "/",
        capabilities: {
            platformName: "Android",
            "appium:deviceName": "ZD222X4TDK",
            "appium:automationName": "UiAutomator2",
            "appium:appPackage": "org.piramalswasthya.sakhi.saksham.uat",
            "appium:appActivity": "org.piramalswasthya.sakhi.ui.login_activity.LoginActivity",
            "appium:noReset": false,
            "appium:autoGrantPermissions": true,
            "appium:newCommandTimeout": 300,
            "appium:language": "en",
            "appium:locale": "US",
        }
    });

    console.log("✅ App launched successfully!");

    try {
        // --- 1. APP LOGIN & SETUP ---
        const myPreferredLanguage = "English";
        await selectLanguage(driver, myPreferredLanguage);

        await login(driver, "Bobita", "Test@123");
        await driver.pause(5000);

        if (typeof selectVillage !== "function") {
            throw new Error("selectVillage is not available from steps/villageSteps");
        }

        await selectVillage(driver, "Oating");
        await driver.pause(2000);

        await clickAllBeneficiaries(driver);
        await driver.pause(2000);

        // --- 2. SEARCH & CLICK ABHA ---
        // Using the newly requested search logic instead of scrolling
        await searchAndClickAbha(driver, "Kamna", "KAMNA SINGH");
        await driver.pause(2000);

        // --- 3. CREATE ABHA ---
        await createAbha(driver, "000000000000" /* [Aadhaar Redacted] */, "9014984113");

        await waitForManualOtpAndVerify(driver, "Aadhaar OTP", 180);
        await driver.pause(3000);

        await waitForManualOtpAndVerify(driver, "Mobile OTP", 180);
        await driver.pause(3000);

        // Decline ABHA card download
        await declineAbhaDownload(driver);

        console.log("🎊 ABHA Creation flow completed successfully!");

    } catch (error) {
        console.error("❌ Test failed:", error);

        try {
            const screenshot = await driver.takeScreenshot();
            const fs = require('fs');
            fs.writeFileSync(`error-${Date.now()}.png`, screenshot, 'base64');
            console.log("📸 Screenshot saved for debugging");
        } catch (screenshotError) {
            console.error("Could not take screenshot:", screenshotError);
        }
    } finally {
        console.log('🧹 Closing active sessions...');
        await driver.pause(5000);
        await driver.deleteSession();
    }
}

main().catch(err => {
    console.error("❌ Main function failed:", err);
});