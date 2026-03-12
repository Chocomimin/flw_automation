const { remote } = require('webdriverio');
const { fillAncForm } = require("./ancVisitForm");
const{fillMdsrForm}=require("./Mdsr");
// Your provided capabilities
const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true
};

// Reusable helper function to click any dashboard card by its text name
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

// Function to search for a beneficiary and click their specific "ADD ANC VISIT" button
async function searchAndAddAncVisit(driver, searchName) {
    try {
        console.log(`Waiting for the search bar to load...`);

        // 1. Locate the Search Bar
        const searchBar = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
        await searchBar.waitForDisplayed({ timeout: 10000 });

        // 2. Click the search bar to focus it and bring up the keyboard
        await searchBar.click();
        await driver.pause(1000); // Wait 1 second for the keyboard to fully appear

        // Use the native keyboard to type the text
        console.log(`⌨️ Typing "${searchName}" using the keyboard...`);

        // We convert the string into an array of characters so it types them out naturally
        await driver.keys([...searchName]);

        // Short pause to allow the app to filter the list based on the typed input
        await driver.pause(2000);

        // 3. Locate the specific "ADD ANC VISIT" button for this beneficiary
        const specificAddAncButtonXPath = `//android.widget.TextView[@text="${searchName}"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]//android.widget.Button[@text="ADD ANC VISIT"]`;
        const addAncButton = await driver.$(specificAddAncButtonXPath);

        // 4. Wait for the button and click it
        await addAncButton.waitForDisplayed({ timeout: 10000 });
        await addAncButton.click();

        console.log(`✅ Successfully clicked "ADD ANC VISIT" for ${searchName}.`);

    } catch (error) {
        console.error(`❌ Failed during search or click process. Error: ${error.message}`);
        throw error;
    }
}

// --- Execution Block ---
async function runTest() {
    // Initialize the Appium session
    const driver = await remote({
        path: '/', // Appium 2.x server setup path
        port: 4723,
        capabilities: capabilities
    });

    try {
        console.log("App launched. Attempting to click ANC Visits...");

        // 1. Click the ANC Visits card from the dashboard
        await clickDashboardCard(driver, 'ANC Visits');

        // Allow screen transition
        await driver.pause(2000);

        // 2. Search for the specific patient and click Add ANC Visit
        await searchAndAddAncVisit(driver, 'SWEETY KARMAKAR');
        await fillAncForm(driver); // Assuming this function fills the form and submits it
        await fillMdsrForm(driver); // Assuming this function fills the MDSR form and submits it
    } catch (err) {
        console.error("Test execution failed.", err);
    } finally {
        // Pause to observe the result, then clean up the session
        await driver.pause(3000);
        await driver.deleteSession();
    }
}

// Run the script
runTest();