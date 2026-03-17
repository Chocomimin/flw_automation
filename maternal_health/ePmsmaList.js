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
 * Searches for a beneficiary and clicks the PMSMA button on their specific card.
 * @param {WebdriverIO.Browser} driver
 * @param {string} searchName - The name of the beneficiary to search for.
 */
async function searchAndClickPMSMA(driver, searchName) {
    try {
        console.log(`Waiting for the search bar to load...`);

        // Locate the search bar
        const searchBar = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
        await searchBar.waitForDisplayed({ timeout: 10000 });

        // Click the search bar to bring up the keyboard
        await searchBar.click();
        await driver.pause(1000);

        console.log(`⌨️ Typing "${searchName}" into the search bar...`);

        // Type the name
        await driver.keys([...searchName]);
        await driver.pause(2000); // Give the list a moment to filter results

        // Find the specific PMSMA button that belongs to the card of the searched user
        const specificPmsmaButtonXPath = `//android.widget.TextView[@text="${searchName}"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]//android.widget.Button[@text="PMSMA"]`;
        const pmsmaButton = await driver.$(specificPmsmaButtonXPath);

        // Wait for the button and click it
        await pmsmaButton.waitForDisplayed({ timeout: 10000 });
        await pmsmaButton.click();

        console.log(`✅ Successfully clicked "PMSMA" for ${searchName}.`);

    } catch (error) {
        console.error(`❌ Failed during search or click process. Error: ${error.message}`);
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
        await searchAndClickPMSMA(driver, 'PRIYA PATHAK');

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