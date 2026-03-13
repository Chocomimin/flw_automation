const { remote } = require('webdriverio');

// FIXED: Ensure the imported name exactly matches the exported name from the other file
const { fillDeliveryOutcomeForm } = require("./deliveryRegistration");

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true
};

const wdOpts = {
    hostname: process.env.APPIUM_HOST || 'localhost',
    port: parseInt(process.env.APPIUM_PORT, 10) || 4723,
    logLevel: 'error',
    capabilities,
};

/**
 * Clicks on the "Delivery Outcome" option in the grid view.
 */
async function clickDeliveryOutcome(driver) {
    try {
        console.log("⏳ Looking for 'Delivery Outcome' icon...");
        const deliveryOutcomeElement = await driver.$("//android.widget.TextView[@text='Delivery Outcome']");
        await deliveryOutcomeElement.waitForDisplayed({ timeout: 5000 });
        await deliveryOutcomeElement.click();
        console.log("✅ Successfully clicked on 'Delivery Outcome'");
    } catch (error) {
        console.error("❌ Failed to click on 'Delivery Outcome':", error.message);
        throw error;
    }
}

/**
 * Scrolls down the list until it finds the target name, then clicks their specific Register button.
 */
async function scrollAndRegister(driver, targetName) {
    try {
        console.log(`⏳ Scrolling through the list to find '${targetName}'...`);

        // Tell Android's UIAutomator to scroll down automatically
        const androidScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${targetName}")`;
        const nameElement = await driver.$(`android=${androidScrollSelector}`);
        await nameElement.waitForDisplayed({ timeout: 15000 });

        console.log(`✅ Found '${targetName}' on the screen!`);

        console.log("⏳ Locating their specific REGISTER button...");
        const specificRegisterButtonXPath = `//android.widget.TextView[@text="${targetName}"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]//android.widget.Button[@text="REGISTER"]`;

        const registerButton = await driver.$(specificRegisterButtonXPath);
        await registerButton.waitForDisplayed({ timeout: 5000 });

        await registerButton.click();
        console.log(`✅ Successfully clicked the 'REGISTER' button for ${targetName}`);

    } catch (error) {
        console.error(`❌ Failed during Scroll and Register for ${targetName}:`, error.message);
        throw error;
    }
}

async function runTest() {
    let driver;
    try {
        driver = await remote(wdOpts);
        console.log("🚀 Starting Test Flow...");

        // 1. Click Delivery Outcome from the Home Screen
        await clickDeliveryOutcome(driver);
        await driver.pause(3000);

        // 2. Scroll through the list to find Kulsuma Begum and click register
        await scrollAndRegister(driver, "KULSUMA BEGUM");

        // Wait 3 seconds for the form to fully render on the screen
        await driver.pause(3000);

        // 3. Call the imported form function
        await fillDeliveryOutcomeForm(driver);

        console.log("🎉 Test Flow Completed Successfully!");

    } catch (error) {
        console.error("🛑 Test execution stopped due to an error:", error.message);
    } finally {
        if (driver) {
            await driver.deleteSession();
        }
    }
}

runTest();