const { remote } = require('webdriverio');
const {fillCheckSamForm} = require('./fillCheckSamForm');
const {fillIfaForm} = require('./ifa_form');
const { fillOrsForm } = require('./ors_form');
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
    hostname: '127.0.0.1',
    port: 4723,
    logLevel: 'error',
    capabilities,
};

async function clickElementByText(driver, text, timeout = 15000) {
    try {
        const element = await driver.$(`//*[@text="${text}"]`);
        await element.waitForDisplayed({ timeout });
        await element.click();
        console.log(`Successfully clicked on: '${text}'`);
    } catch (error) {
        console.error(`Failed to interact with '${text}': ${error.message}`);
        throw error;
    }
}

async function searchByName(driver, searchText, timeout = 15000) {
    try {
        const searchBar = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
        await searchBar.waitForDisplayed({ timeout });
        await searchBar.click();
        console.log('Search bar focused.');
        await searchBar.clearValue();
        await searchBar.setValue(searchText);
        console.log(`Typed '${searchText}' into search bar.`);
        await driver.pressKeyCode(66);
        console.log('Pressed Enter key.');
        await driver.pause(2000);
    } catch (error) {
        console.error(`Failed to search for '${searchText}': ${error.message}`);
        throw error;
    }
}

async function clickActionButton(driver, buttonText, timeout = 15000) {
    try {
        const button = await driver.$(`//android.widget.Button[@text="${buttonText}"]`);
        await button.waitForDisplayed({ timeout });
        await button.click();
        console.log(`Successfully clicked action button: '${buttonText}'`);
    } catch (error) {
        console.error(`Failed to click action button '${buttonText}': ${error.message}`);
        throw error;
    }
}

async function clickAddInBottomSheet(driver, timeout = 15000) {
    try {
        const bottomSheet = await driver.$('//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/design_bottom_sheet"]');
        await bottomSheet.waitForDisplayed({ timeout });
        console.log('Bottom sheet appeared.');
        const addButton = await driver.$('//androidx.recyclerview.widget.RecyclerView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/rv_anc"]//android.widget.Button[@text="ADD"]');
        await addButton.waitForDisplayed({ timeout });
        await addButton.click();
        console.log('Successfully clicked ADD button in bottom sheet.');
    } catch (error) {
        console.error(`Failed to click ADD in bottom sheet: ${error.message}`);
        throw error;
    }
}

async function runTest() {
    const driver = await remote(wdOpts);

    try {
        console.log("Starting test execution...");

        await clickElementByText(driver, 'Child Care');
        await clickElementByText(driver, 'Children under 5 Years');
        await searchByName(driver, 'mohit jsbs');

        // Define which form you want to target for this test run
        // In a real scenario, you might get this from a data file or a loop
        const actionToPerform = 'IFA'; // Options: 'Check SAM', 'IFA', 'ORS'

        await clickActionButton(driver, actionToPerform);
        await clickAddInBottomSheet(driver);

        // --- Conditional Form Filling ---
        if (actionToPerform === 'Check SAM') {
            console.log("Routing to Check SAM form...");
            await fillCheckSamForm(driver);
        }
        else if (actionToPerform === 'IFA') {
            console.log("Routing to IFA form...");
            await fillIfaForm(driver);
        }
        else if (actionToPerform === 'ORS') {
            console.log("Routing to ORS form...");
            await fillOrsForm(driver);
        }

        await clickElementByText(driver, 'SUBMIT');

    } catch (error) {
        console.error("Test execution aborted:", error.message);
    } finally {
        await driver.deleteSession();
    }
}
runTest();