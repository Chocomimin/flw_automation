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

async function clickGridItemByText(driver, text) {
    const xpath = `//android.widget.TextView[@text='${text}']/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_icon']`;
    const element = await driver.$(xpath);
    await element.waitForDisplayed({ timeout: 10000 });
    await element.click();
}

async function clickFollowUpForMember(driver, memberName) {
    const androidScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${memberName}")`;
    try {
        await driver.$(`android=${androidScrollSelector}`).waitForDisplayed({ timeout: 10000 });
    } catch (e) {}

    await driver.pause(1000);

    const followUpBtnXPath =
        `//android.widget.TextView[@text='${memberName}']` +
        `/ancestor::android.view.ViewGroup` +
        `//android.widget.Button[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/btn_form_tb' and @text='FOLLOW UP']`;

    const followUpBtn = await driver.$(followUpBtnXPath);
    await followUpBtn.waitForDisplayed({ timeout: 5000 });
    await followUpBtn.click();
}

async function selectFormRadio(driver, questionSubstring, answer) {
    const uiSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${questionSubstring}"))`;
    try { await driver.$(`android=${uiSelector}`).waitForDisplayed({ timeout: 5000 }); } catch (e) {}

    const radioButtonXPath =
        `//android.widget.TextView[contains(@text, "${questionSubstring}")]` +
        `/parent::android.widget.LinearLayout` +
        `/following-sibling::android.widget.RadioGroup` +
        `//android.widget.RadioButton[@text='${answer}']`;

    const radioBtn = await driver.$(radioButtonXPath);
    await radioBtn.waitForDisplayed({ timeout: 5000 });
    await radioBtn.click();
}

async function fillCalendarDate(driver, day, month, year, fieldHint) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const targetMonthName = monthNames[month - 1];
    const paddedDay = day < 10 ? '0' + day : day.toString();
    const targetDateDesc = `${paddedDay} ${targetMonthName} ${year}`;

    const dateScroll = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${fieldHint}"))`;
    try { await driver.$(`android=${dateScroll}`).waitForDisplayed({timeout: 3000}); } catch(e){}

    const dateField = await driver.$(`//android.widget.EditText[@hint='${fieldHint}']`);
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
        try {
            await driver.$(`android=${yearScroll}`).click();
        } catch (e) {}
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
        console.log(`[DEBUG] Date '${targetDateDesc}' was not found in the calendar view. Field not populated.`);
        const cancelBtn = await driver.$(`//android.widget.Button[@resource-id="android:id/button2"]`);
        await cancelBtn.click();
    }
}

async function handleTreatmentStatusSelection(driver, statusSelection) {
    const spinnerScroll = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown"))`;
    try { await driver.$(`android=${spinnerScroll}`).waitForDisplayed({ timeout: 5000 }); } catch (e) {}

    const spinner = await driver.$(`//android.widget.Spinner[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown"]`);
    await spinner.click();
    await driver.pause(1500);

    const coordinatesMap = {
        "Recovering": { x: 540, y: 1200 },
        "Cured": { x: 540, y: 1320 },
        "Recurrence of Symptoms": { x: 540, y: 1440 },
        "Regularly taking medicine": { x: 540, y: 1560 },
        "Not regularly taking medicine": { x: 540, y: 1680 }
    };

    const coords = coordinatesMap[statusSelection];
    if (coords) {
        await tapByCoordinates(driver, coords.x, coords.y);
    } else {
        console.log(`[DEBUG] Invalid status selection: ${statusSelection}`);
    }
    await driver.pause(1500);
}

async function main() {
    let driver;

    try {
        driver = await remote(wdioOptions);

        await clickGridItemByText(driver, 'Disease Control');
        await driver.pause(1500);

        await clickGridItemByText(driver, 'Leprosy');
        await driver.pause(1500);

        await clickGridItemByText(driver, 'Leprosy Confirmed');
        await driver.pause(2000);

        const targetBeneficiary = 'DEBA KARMAKAR';
        await clickFollowUpForMember(driver, targetBeneficiary);
        await driver.pause(2000);

        await fillCalendarDate(driver, 29, 3, 2026, 'Follow Up Dates *');
        await driver.pause(1000);

        const treatmentStatus = "Not regularly taking medicine";

        await handleTreatmentStatusSelection(driver, treatmentStatus);

        if (treatmentStatus === "Not regularly taking medicine") {
            await fillCalendarDate(driver, 29, 3, 2026, 'Actual Treatment Completion Date *');
            await driver.pause(1000);
        }

        await selectFormRadio(driver, "MDT/BLISTER PACK RECEIVED", "Yes");
        await driver.pause(1000);

        const submitScroll = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Submit"))`;
        await driver.$(`android=${submitScroll}`);
        const submitBtn = await driver.$(`//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]`);
        await submitBtn.waitForDisplayed({ timeout: 5000 });
        await submitBtn.click();

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