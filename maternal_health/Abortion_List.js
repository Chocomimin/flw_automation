const { remote } = require('webdriverio');
// Import your form filler functions here if you have them for Abortion
// const { fillAbortionForm } = require("./abortionForm");
const{fillAbortionForm}=require("./Abortion_form");
const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true
};

// Reusable function to click any card on the Maternal Health dashboard
async function clickDashboardCard(driver, cardText) {
    const cardXPath = `//android.widget.TextView[@text="${cardText}"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_icon"]`;
    const cardElement = await driver.$(cardXPath);

    try {
        await cardElement.waitForDisplayed({ timeout: 10000 });
        await cardElement.click();
        console.log(`✅ Successfully clicked the '${cardText}' card.`);
    } catch (error) {
        console.error(`❌ Failed to click the '${cardText}' card. Error: ${error.message}`);
        throw error;
    }
}

// Function to scroll through the list and click the ADD button for a specific record
async function scrollAndSelectAbortionRecord(driver, searchName) {
    try {
        console.log(`📜 Scrolling to find beneficiary: "${searchName}"...`);

        // 1. Use Android's native UiScrollable to scroll until the text is in view
        // It looks inside the RecyclerView (rv_any) and scrolls until it finds the target text
        const uiAutomatorSelector = `new UiScrollable(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/rv_any").scrollable(true)).scrollIntoView(new UiSelector().textContains("${searchName}"))`;

        // Execute the scroll
        const targetElement = await driver.$(`android=${uiAutomatorSelector}`);
        await targetElement.waitForDisplayed({ timeout: 15000 });
        console.log(`👀 Found "${searchName}" on the screen.`);

        // 2. Find the exact "ADD" button inside the card that belongs to this person
        const specificAddButtonXPath = `//android.widget.TextView[@text="${searchName}"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]//android.widget.Button[@text="ADD"]`;
        const actionButton = await driver.$(specificAddButtonXPath);

        await actionButton.waitForDisplayed({ timeout: 5000 });
        await actionButton.click();

        console.log(`✅ Successfully clicked the "ADD" button for ${searchName}.`);

    } catch (error) {
        console.error(`❌ Failed during scroll or click process in Abortion List. Error: ${error.message}`);
        throw error;
    }
}

async function runAbortionListTest() {
    // Connect to the Appium server
    const driver = await remote({
        path: '/',
        port: 4723,
        capabilities: capabilities
    });

    try {
        console.log("App launched. Attempting to navigate to Abortion List...");

        // 1. Click the Abortion List card on the dashboard
        await clickDashboardCard(driver, 'Abortion List');
        await driver.pause(2000);
        // 2. Scroll to the patient and click the ADD button
        await scrollAndSelectAbortionRecord(driver, 'YYYY YY');

         await fillAbortionForm(driver);

    } catch (err) {
        console.error("Test execution failed.", err);
    } finally {
        await driver.pause(3000);
        await driver.deleteSession();
        console.log("Session closed.");
    }
}

// Execute the test
runAbortionListTest();