const { remote } = require('webdriverio');
const{fillPregnancyForm} = require("./pregnancyRegistrationForm");

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true
};




async function clickMaternalHealth(driver) {
    console.log("Navigating to Maternal Health...");

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
    console.log(`Searching for '${searchQuery}'...`);

    const searchBar = await driver.$(
        '//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]'
    );
    await searchBar.waitForDisplayed({ timeout: 10000 });

    // Click and wait for focus
    await searchBar.click();
    await driver.pause(1500); // wait for keyboard to open

    // ✅ USE NATIVE WEBDRIVERIO INSTEAD OF ADB SHELL
    await searchBar.setValue(searchQuery);
    await driver.pause(500);

    // Hide the keyboard so it doesn't block the search icon
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(500);
    }

    // Verify text was entered - log current value
    const enteredText = await searchBar.getText();
    console.log(`Text in search bar: '${enteredText}'`);

    // Click the search icon
    console.log("Clicking search icon...");
    const searchIconBtn = await driver.$(
        '//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/ib_search"]'
    );
    await searchIconBtn.waitForDisplayed({ timeout: 5000 });
    await searchIconBtn.click();

    // Wait longer for results to load
    await driver.pause(4000);

    // Log what's on screen now
    const pageSource = await driver.getPageSource();
    if (pageSource.includes(searchQuery)) {
        console.log(`✅ ${searchQuery} found in page source!`);
    } else if (pageSource.includes('No Records Found')) {
        console.log('❌ Still showing No Records Found');
    } else {
        console.log('❓ Unknown state');
    }
}

async function clickRegister(driver) {
    console.log("Clicking Register button...");
    const registerBtn = await driver.$(
        '//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_form_ec1"]'
    );
    await registerBtn.waitForDisplayed({ timeout: 15000 });
    await registerBtn.click();
}


async function runTest() {
    let driver;
    try {

        driver = await remote({
            protocol: "http",
            hostname: "127.0.0.1",
            port: 4723,
            path: "/",
            capabilities: capabilities
        });


        await clickMaternalHealth(driver);
        await clickPregnantWomenRegistration(driver);
        await searchName(driver, "ANANYA");
        await clickRegister(driver);
        await fillPregnancyForm(driver);

        console.log("Test flow completed successfully!");

    } catch (error) {
        console.error("An error occurred during automation:", error);
    } finally {
        if (driver) {

            await driver.deleteSession();
        }
    }
}


runTest();