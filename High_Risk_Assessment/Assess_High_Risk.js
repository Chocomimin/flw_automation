const { remote } = require('webdriverio');

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true,
    'appium:unicodeKeyboard': true,
    'appium:resetKeyboard': true
};

const wdioOptions = {
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities: capabilities
};

// ==========================================
// UTILITY & NAVIGATION FUNCTIONS
// ==========================================

async function swipeByCoordinates(driver, startX, startY, endX, endY) {
    await driver.performActions([{
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: startX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 200 },
            { type: 'pointerMove', duration: 600, x: endX, y: endY },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
}

async function tapByCoordinates(driver, x, y) {
    await driver.performActions([{
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: x, y: y },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 150 },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
}

async function clickGridItemByText(driver, text) {
    const xpath = `//android.widget.TextView[@text='${text}']/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_icon']`;
    const element = await driver.$(xpath);
    await element.waitForDisplayed({ timeout: 10000 });
    await element.click();
}

async function searchWithKeyboard(driver, searchText) {
    const searchInput = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
    await searchInput.waitForDisplayed({ timeout: 10000 });
    await searchInput.click();
    await searchInput.setValue(searchText);
    await driver.pressKeyCode(66);
}

// ==========================================
// ACTION FUNCTIONS
// ==========================================

async function clickAssessForBeneficiary(driver, memberName) {
    const androidScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${memberName}")`;
    try {
        await driver.$(`android=${androidScrollSelector}`).waitForDisplayed({ timeout: 10000 });
    } catch (e) {
        console.log(`Could not scroll to find ${memberName}`);
    }

    await driver.pause(1000);

    const assessBtnXPath =
        `//android.widget.TextView[contains(@text, '${memberName}')]` +
        `/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_ec_content']` +
        `//android.widget.Button[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/btn_form1' and @text='ASSESS']`;

    const assessBtn = await driver.$(assessBtnXPath);
    await assessBtn.waitForDisplayed({ timeout: 5000 });
    await assessBtn.click();
}

// ==========================================
// FORM FILLING FUNCTIONS
// ==========================================

async function selectRadioOption(driver, questionSubstring, option) {
    // FIX: Using 'cl_ri' as the strict ancestor block to isolate the specific question row
    const xpath = `//android.widget.TextView[contains(@text, '${questionSubstring}')]/ancestor::android.widget.LinearLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cl_ri']//android.widget.RadioButton[@text='${option}']`;

    // Attempt to scroll element into view if it's off-screen
    const scrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${questionSubstring}"))`;
    try {
        await driver.$(`android=${scrollSelector}`).waitForDisplayed({ timeout: 2000 });
    } catch (e) {
        // Ignore exception if the scrollable area isn't found or element is already visible
    }

    const element = await driver.$(xpath);
    await element.waitForDisplayed({ timeout: 5000 });
    await element.click();
}

async function submitAssessment(driver) {
    const submitBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]');

    const scrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Submit"))`;
    try {
        await driver.$(`android=${scrollSelector}`).waitForDisplayed({ timeout: 2000 });
    } catch (e) {}

    await submitBtn.waitForDisplayed({ timeout: 5000 });
    await submitBtn.click();
}

// ==========================================
// MAIN EXECUTION BLOCK
// ==========================================

async function main() {
    let driver;

    try {
        driver = await remote(wdioOptions);

        console.log("Navigating to Assess High Risk in Non-PW...");
        await clickGridItemByText(driver, 'High Risk Assessment');
        await driver.pause(1000);

        await clickGridItemByText(driver, 'Assess High Risk in Non-PW');
        await driver.pause(1000);

        const targetBeneficiary = 'MUNNI KARMAKAR';
        console.log(`Searching for beneficiary: ${targetBeneficiary}...`);
        await searchWithKeyboard(driver, targetBeneficiary);
        await driver.pause(2000);

        await clickAssessForBeneficiary(driver, targetBeneficiary);
        await driver.pause(2000);

        console.log("Filling out 'Information on Children'...");
        await selectRadioOption(driver, 'Deliveries is more than 3', 'No');
        await selectRadioOption(driver, 'less than 18 months', 'No');

        console.log("Filling out 'Physical Observation'...");
        await selectRadioOption(driver, 'Height is very short', 'No');
        await selectRadioOption(driver, 'Age is less than 18', 'No');

        console.log("Filling out 'Obstetric History'...");
        await selectRadioOption(driver, 'Miscarriage/abortion', 'No');
        await selectRadioOption(driver, 'Home delivery', 'No');
        await selectRadioOption(driver, 'faced any medical issues', 'No');
        await selectRadioOption(driver, 'Past C –section', 'No');

        await driver.pause(1000);

        console.log("Submitting form...");
        await submitAssessment(driver);

        console.log("Assessment completed successfully!");

    } catch (error) {
        console.error(error.message);
    } finally {
        if (driver) {
            await driver.pause(3000);
            await driver.deleteSession();
        }
    }
}

main();