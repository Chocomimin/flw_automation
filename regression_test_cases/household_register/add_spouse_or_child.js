const { remote } = require('webdriverio');
const { createNewHouseholdFlow } = require('./Add_Spouse_Details/householdCreationFlow.js');

// ─────────────────────────────────────────────────────────────
// Appium Capabilities & Configuration
// ─────────────────────────────────────────────────────────────
const wdioOptions = {
    hostname: '127.0.0.1', // Default Appium server host
    port: 4723,            // Default Appium server port
    path: '/',             // Sometimes '/wd/hub' depending on your Appium version (Appium 2.x uses '/')
    logLevel: 'info',
    capabilities: {
        "platformName": "Android",
        "appium:automationName": "UiAutomator2",
        // Update these next two with your actual device/emulator info
        "appium:deviceName": "ZD222X4TDK",
        "appium:platformVersion": "16",

        // Target app details (extracted from your XML)
        "appium:appPackage": "org.piramalswasthya.sakhi.saksham.uat",
        "appium:appActivity": ".MainActivity", // Update if your launch activity is different
        "appium:noReset": true // Keeps you logged in so you start on the Home screen
    }
};

// ─────────────────────────────────────────────────────────────
// Main Execution Block
// ─────────────────────────────────────────────────────────────
(async () => {
    let driver;
    try {
        console.log("🚀 Initializing Appium session...");
        driver = await remote(wdioOptions);

        console.log("📱 Appium session started successfully. Waiting for app to load...");
        await driver.pause(5000); // Give the app a moment to fully render the home screen

        // Execute our orchestration flow
        await createNewHouseholdFlow(driver);

        console.log("✅ Script execution completed successfully.");

    } catch (error) {
        console.error("❌ An error occurred during execution:\n", error);
    } finally {
        // Always ensure the session is closed, even if the script crashes
        if (driver) {
            console.log("🧹 Tearing down Appium session...");
            await driver.deleteSession();
            console.log("👋 Session closed.");
        }
    }
})();