const { remote } = require('webdriverio');
const {fillPmsmaForm}=require("./pmsmaForm");
const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true
};

/**
 * Clicks a card on the Maternal Health dashboard based on its visible text.
 * @param {WebdriverIO.Browser} driver
 * @param {string} cardText - The exact text of the card to click.
 */
async function clickDashboardCard(driver, cardText) {
    console.log(`Attempting to click the '${cardText}' card...`);

    // Finds the TextView with the exact text, then travels up the hierarchy to find the clickable FrameLayout card
    const cardXPath = `//android.widget.TextView[@text="${cardText}"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_icon"]`;
    const cardElement = await driver.$(cardXPath);

    try {
        // Wait for the element to exist and be displayed on the screen
        await cardElement.waitForDisplayed({ timeout: 10000 });

        // Execute the click
        await cardElement.click();
        console.log(`✅ Successfully clicked the '${cardText}' card.`);
    } catch (error) {
        console.error(`❌ Failed to click the '${cardText}' card. Error: ${error.message}`);
        throw error;
    }
}

/**
 * Searches for a partial name, scrolls through the results, and clicks PMSMA for a specific user.
 * @param {WebdriverIO.Browser} driver
 * @param {string} searchTerm - The short name to type in the search bar (e.g., 'Baby').
 * @param {string} targetFullName - The exact full name to scroll to and find (e.g., 'Baby Begum').
 */
async function searchAndClickPMSMA(driver, searchTerm, targetFullName) {
    try {
        console.log(`Waiting for the search bar to load...`);

        // 1. Locate and fill the search bar
        const searchBar = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
        await searchBar.waitForDisplayed({ timeout: 10000 });

        console.log(`⌨️ Typing "${searchTerm}" into the search bar...`);
        await searchBar.setValue(searchTerm);

        // Hide the keyboard so it doesn't block our view while scrolling
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }
        await driver.pause(2000); // Wait for the list to filter

        console.log(`↕️ Scrolling list to find exact match: "${targetFullName}"...`);

        // 2. Use Android's native UiScrollable to scroll until the target full name is in view
        // It looks for a scrollable container and scrolls until it finds text matching your target.
        const scrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${targetFullName}"))`;

        try {
            await driver.$(`android=${scrollSelector}`);
            // Small pause after scrolling to let the UI settle
            await driver.pause(1000);
        } catch (scrollError) {
            console.log(`⚠️ Note: Could not perform scroll. The target might already be visible or doesn't exist. Continuing...`);
        }

        // 3. Find the specific PMSMA button that belongs to the card of the targetFullName
        const specificPmsmaButtonXPath = `//android.widget.TextView[contains(@text, "${targetFullName}")]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]//android.widget.Button[@text="PMSMA"]`;

        const pmsmaButton = await driver.$(specificPmsmaButtonXPath);

        // Wait for the button and click it
        await pmsmaButton.waitForDisplayed({ timeout: 10000 });
        await pmsmaButton.click();

        console.log(`✅ Successfully clicked "PMSMA" for ${targetFullName}.`);

    } catch (error) {
        console.error(`❌ Failed during search, scroll, or click process. Error: ${error.message}`);
        throw error;
    }
}

async function runEPmsmaTest() {
    console.log("Connecting to Appium server...");

    // Initialize the Appium session
    const driver = await remote({
        path: '/',
        port: 4723,
        capabilities: capabilities
    });

    try {
        console.log("App launched successfully.");

        // 1. Click the "e-PMSMA List" card on the dashboard
        await clickDashboardCard(driver, 'e-PMSMA List');

        // Pause to allow the e-PMSMA List screen to fully render
        await driver.pause(3000);

        // 2. Search for the patient and click PMSMA
        await searchAndClickPMSMA(driver, 'RTRT', 'RTRT YES');

        // Allow the form screen to load
        await driver.pause(3000);
        await fillPmsmaForm(driver);
        // Add the next steps (filling out the PMSMA form) here later

    } catch (err) {
        console.error("Test execution failed.", err);
    } finally {
        // Clean up and end the session
        await driver.pause(2000);
        await driver.deleteSession();
        console.log("Session closed.");
    }
}

// Execute the test
runEPmsmaTest();