const { remote } = require('webdriverio');
// Import your form filler functions here if you have them for Abortion
const { fillAbortionForm } = require("./Abortion_form");

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

// Function to search for a beneficiary using the search bar and click ADD
async function searchAndClickAdd(driver, searchName) {
    try {
        console.log(`\n🔍 Searching for '${searchName}' using the search bar...`);

        // 1. Locate and click the Search Bar
        const searchInput = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/searchView")');
        await searchInput.waitForDisplayed({ timeout: 5000 });
        await searchInput.click();
        await searchInput.clearValue();

        // 2. Enter the search name (lowercase or any case)
        await searchInput.setValue(searchName);
        await driver.pause(3000); // Wait for the list to filter

        // 3. Hide keyboard so it doesn't block the screen
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }

        console.log(`✅ List filtered for '${searchName}'. Locating the ADD button...`);

        // 4. Convert the search string to UPPERCASE for the XPath match
        const upperCaseName = searchName.toUpperCase();

        // 5. Find the specific "ADD" button inside the filtered card
        // We look for the main card container (cv_content) that contains the UPPERCASE name, then grab the ADD button inside it.
        const specificAddButtonXPath = `//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"][.//android.widget.TextView[contains(@text, "${upperCaseName}")]]//android.widget.Button[@text="ADD"]`;
        const actionButton = await driver.$(specificAddButtonXPath);

        await actionButton.waitForDisplayed({ timeout: 5000 });
        await actionButton.click();

        console.log(`✅ Successfully clicked the "ADD" button for ${upperCaseName}.`);

    } catch (error) {
        console.error(`❌ Failed during search or click process in Abortion List. Error: ${error.message}`);
        throw error;
    }
}
async function runAbortionListTest() {
    // Connect to the Appium server
    const driver = await remote({
        path: '/',
        port: 4723,
        capabilities: capabilities,
        logLevel: 'error'
    });

    try {
        console.log("🚀 App launched. Attempting to navigate to Abortion List...");

        // 1. Click the Abortion List card on the dashboard
        await clickDashboardCard(driver, 'Abortion List');
        await driver.pause(2000);

        // 2. Search for the patient and click the ADD button
        await searchAndClickAdd(driver, 'kavya sharma');
        await driver.pause(2000);

        // 3. Fill the Abortion Form
        await fillAbortionForm(driver);

    } catch (err) {
        console.error("🛑 Test execution failed.", err);
    } finally {
        await driver.pause(3000);
        await driver.deleteSession();
        console.log("🔌 Session closed.");
    }
}

// Execute the test
runAbortionListTest();