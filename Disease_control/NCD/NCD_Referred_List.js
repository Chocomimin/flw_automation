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
// FORM FILLING FUNCTIONS
// ==========================================

async function fillCalendarDate(driver, day, month, year, fieldHint) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const targetMonthName = monthNames[month - 1];
    const paddedDay = day < 10 ? '0' + day : day.toString();
    const targetDateDesc = `${paddedDay} ${targetMonthName} ${year}`;

    const dateFieldXPath = `//android.widget.EditText[@hint='${fieldHint}']`;
    let dateField = await driver.$(dateFieldXPath);

    let isVisible = false;
    try { isVisible = await dateField.isDisplayed(); } catch (e) {}

    if (!isVisible) {
        await swipeByCoordinates(driver, 540, 1800, 540, 600);
        await driver.pause(1000);
        dateField = await driver.$(dateFieldXPath);
    }

    await dateField.waitForDisplayed({ timeout: 5000 });
    await dateField.click();
    await driver.pause(1500);

    const yearHeader = await driver.$(`//android.widget.TextView[@resource-id="android:id/date_picker_header_year"]`);
    const currentYearStr = await yearHeader.getText();
    const currentYear = parseInt(currentYearStr, 10);

    if (currentYear !== year) {
        await yearHeader.click();
        await driver.pause(1000);
        const yearScroll = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${year}")`;
        try { await driver.$(`android=${yearScroll}`).click(); } catch (e) {}
        await driver.pause(1000);
    }

    const headerDateText = await driver.$('//android.widget.TextView[@resource-id="android:id/date_picker_header_date"]').getText();

    let currentMonthIndex = -1;
    for (let i = 0; i < shortMonths.length; i++) {
        if (headerDateText.includes(shortMonths[i])) {
            currentMonthIndex = i;
            break;
        }
    }

    const targetMonthIndex = month - 1;
    const monthDiff = targetMonthIndex - currentMonthIndex;

    for (let i = 0; i < Math.abs(monthDiff); i++) {
        if (monthDiff > 0) {
            await swipeByCoordinates(driver, 800, 1200, 200, 1200);
        } else {
            await swipeByCoordinates(driver, 200, 1200, 800, 1200);
        }
        await driver.pause(800);
    }

    const specificDateBtn = await driver.$(`//android.view.View[@content-desc='${targetDateDesc}']`);
    if (await specificDateBtn.isExisting() && await specificDateBtn.isDisplayed()) {
        await specificDateBtn.click();
        const okBtn = await driver.$(`//android.widget.Button[@resource-id="android:id/button1"]`);
        await okBtn.click();
    } else {
        const cancelBtn = await driver.$(`//android.widget.Button[@resource-id="android:id/button2"]`);
        await cancelBtn.click();
    }
}

async function fillDiagnosis(driver, diagnosisList) {
    for (const diag of diagnosisList) {
         const diagCheckbox = await driver.$(`//android.widget.CheckBox[@text="${diag}"]`);
         await diagCheckbox.waitForDisplayed({ timeout: 5000 });
         await diagCheckbox.click();
    }
}

async function pickImageAndSubmit(driver) {
    const scrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("PICK IMAGE"))`;
    try {
        await driver.$(`android=${scrollSelector}`).waitForDisplayed({ timeout: 5000 });
    } catch (e) {
        console.log("Could not scroll to PICK IMAGE button");
    }

    const pickImageBtn = await driver.$('//android.widget.Button[@text="PICK IMAGE"]');
    await pickImageBtn.waitForDisplayed({ timeout: 5000 });
    await pickImageBtn.click();
    await driver.pause(2000);

    // Try "Choose from Gallery" option based on the XML dump
    let galleryOption;
    try {
        galleryOption = await driver.$('//android.widget.TextView[contains(@text, "Choose from Gallery")]');
        await galleryOption.waitForDisplayed({ timeout: 5000 });
    } catch(e) {
        // Fallback if the text matches the other XML
        galleryOption = await driver.$('//android.widget.TextView[contains(@text, "Choose File")]');
        await galleryOption.waitForDisplayed({ timeout: 5000 });
    }
    await galleryOption.click();

    console.log("Waiting 20 seconds for file selection...");
    await driver.pause(20000);

    const submitBtn = await driver.$('//android.widget.Button[translate(@text, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz")="submit"]');
    await submitBtn.waitForDisplayed({ timeout: 5000 });
    await submitBtn.click();
}

async function clickFollowUpForMember(driver, memberName) {
    const androidScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${memberName}")`;
    try {
        await driver.$(`android=${androidScrollSelector}`).waitForDisplayed({ timeout: 10000 });
    } catch (e) {}

    await driver.pause(1000);

    // FIX: Replaced contentLayout with cv_content to match correct ancestor layout hierarchy
    const followUpBtnXPath =
        `//android.widget.TextView[contains(@text, '${memberName}')]` +
        `/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_content']` +
        `//android.widget.Button[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/btnFollowUp']`;

    const followUpBtn = await driver.$(followUpBtnXPath);
    await followUpBtn.waitForDisplayed({ timeout: 5000 });
    await followUpBtn.click();
}

// ==========================================
// MAIN EXECUTION BLOCK
// ==========================================

async function main() {
    let driver;

    try {
        driver = await remote(wdioOptions);

        await clickGridItemByText(driver, 'NCD');
        await driver.pause(1500);

        await clickGridItemByText(driver, 'NCD Referred List');
        await driver.pause(1500);

        const targetBeneficiary = 'RADHIKA NAYAK';
        await searchWithKeyboard(driver, targetBeneficiary);
        await driver.pause(2000);

        await clickFollowUpForMember(driver, targetBeneficiary);
        await driver.pause(2000);

        console.log("Filling out Diagnosis...");
        // Assuming Hypertension based on standard flow
        await fillDiagnosis(driver, ["Hypertension (BP)"]);
        await driver.pause(1000);

        console.log("Filling out Treatment Start Date...");
        await fillCalendarDate(driver, 15, 3, 2026, 'Select Date');
        await driver.pause(1000);

        console.log("Uploading MCP Card and Submitting...");
        await pickImageAndSubmit(driver);

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