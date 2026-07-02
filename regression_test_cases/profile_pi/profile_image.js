const { remote } = require('webdriverio');

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true,
    'appium:newCommandTimeout': 180 // Crucial for the 2-minute pause
};

const wdOpts = {
    hostname: '127.0.0.1',
    port: 4723,
    logLevel: 'error',
    capabilities,
};

// ==========================================
// 1. PAGE ACTIONS
// ==========================================

async function openNavigationDrawer(driver) {
    try {
        const navDrawerBtn = await driver.$('~Open navigation drawer');
        await navDrawerBtn.waitForDisplayed({ timeout: 10000 });
        await navDrawerBtn.click();
        console.log("✔ Navigation drawer opened.");
    } catch (error) {
        console.error("❌ Failed to open navigation drawer:", error.message);
        throw error; // Stop execution if we can't open the menu
    }
}

async function clickProfilePicture(driver) {
    try {
        // Updated with the correct resource-id from the XML
        const profilePicId = "org.piramalswasthya.sakhi.saksham.uat:id/iv_profile_pic";
        const profilePic = await driver.$(`android=new UiSelector().resourceId("${profilePicId}")`);

        await profilePic.waitForDisplayed({ timeout: 5000 });
        await profilePic.click();
        console.log("✔ Profile picture clicked.");
    } catch (error) {
        console.error("❌ Failed to click profile picture:", error.message);
        throw error;
    }
}

async function waitTwoMinutes(driver) {
    console.log("⏳ Waiting for 2 minutes (120 seconds)...");
    await driver.pause(120000);
    console.log("✔ Wait complete.");
}

// ==========================================
// MAIN TEST EXECUTION
// ==========================================

async function runTest() {
    const driver = await remote(wdOpts);

    try {
        // Give the app a moment to settle after launch
        await driver.pause(2000);

        // 1. Open the navigation menu
        await openNavigationDrawer(driver);

        // Wait a second for the slide-out animation to finish
        await driver.pause(1000);

        // 2. Click the profile picture inside the drawer
        await clickProfilePicture(driver);

        // 3. Wait for 2 minutes
        await waitTwoMinutes(driver);

        // 4. Success Output
        console.log("✅ Successful!");

    } catch (error) {
        console.error("❌ Script Execution Failed:", error.message);
    } finally {
        if (driver) {
            await driver.pause(2000);
            await driver.deleteSession();
        }
    }
}

runTest();