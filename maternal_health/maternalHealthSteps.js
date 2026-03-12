const { remote } = require('webdriverio');
const{fillPregnancyForm} = require("./pregnancyRegistrationForm");
// Your provided capabilities
const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true   // ✅ FIX 2: Enable XPath1
};


// --- Reusable Automation Functions ---

async function clickMaternalHealth(driver) {
    console.log("Navigating to Maternal Health...");
    // Locating by text since the resource-id 'textView2' is generic
    const maternalHealthBtn = await driver.$('//android.widget.TextView[@text="Maternal Health"]');
    await maternalHealthBtn.waitForDisplayed({ timeout: 10000 });
    await maternalHealthBtn.click();
}

async function clickPregnantWomenRegistration(driver) {
    console.log("Opening Pregnant Women Registration...");
    const pwRegBtn = await driver.$('//android.widget.TextView[@text="Pregnant Women Registration"]');
    await pwRegBtn.waitForDisplayed({ timeout: 10000 });
    await pwRegBtn.click();
}

async function searchName(driver, searchQuery) {
    console.log(`Focusing on search bar to open keyboard...`);
    const searchBar = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
    await searchBar.waitForDisplayed({ timeout: 10000 });

    // 1. Click the search bar to explicitly bring up the soft keyboard
    await searchBar.click();

    console.log(`Typing '${searchQuery}'...`);
    // 2. Type the search query into the active field
    await searchBar.setValue(searchQuery);

    // Optional pause if the app needs a millisecond to register the text before searching
    await driver.pause(500);

    console.log("Pressing the 'Enter/Search' key on the keyboard...");
    // 3. Press the Android Enter/Search key (KEYCODE_ENTER = 66)
    await driver.pressKeyCode(66);
}

async function clickRegister(driver) {
    console.log("Clicking Register button...");
    // Locating by the specific button resource-id
    const registerBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_form_ec1"]');
    await registerBtn.waitForDisplayed({ timeout: 10000 });
    await registerBtn.click();
}

// --- Main Execution Block ---

async function runTest() {
    let driver;
    try {
        // Initialize the Appium session
        driver = await remote({
            protocol: "http",
            hostname: "127.0.0.1",
            port: 4723,
            path: "/", // Use "/wd/hub" if you are on an older Appium 1.x server
            capabilities: capabilities
        });

        // Execute the flow using the functions
        await clickMaternalHealth(driver);
        await clickPregnantWomenRegistration(driver);
        await searchName(driver, "krishna");
        await clickRegister(driver);
        await fillPregnancyForm(driver); // Assuming this function fills the form and submits it

        console.log("Test flow completed successfully!");

    } catch (error) {
        console.error("An error occurred during automation:", error);
    } finally {
        if (driver) {
            // Close the app and end the session
            await driver.deleteSession();
        }
    }
}

// Run the script
runTest();