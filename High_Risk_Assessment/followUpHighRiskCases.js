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

async function clickFollowUpForBeneficiary(driver, memberName) {
    const androidScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${memberName}")`;
    try {
        await driver.$(`android=${androidScrollSelector}`).waitForDisplayed({ timeout: 10000 });
    } catch (e) {
    }

    await driver.pause(1000);

    const followUpBtnXPath =
        `//android.widget.TextView[contains(@text, '${memberName}')]` +
        `/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_content']` +
        `//android.widget.Button[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/btn_form1' and @text='FOLLOW UP']`;

    const followUpBtn = await driver.$(followUpBtnXPath);
    await followUpBtn.waitForDisplayed({ timeout: 5000 });
    await followUpBtn.click();
}

async function fillCalendarDate(driver, day, month, year, fieldHint) {
    const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const targetMonthName = fullMonths[month - 1];
    const paddedDay = day < 10 ? '0' + day : day.toString();
    const targetDateDesc = `${paddedDay} ${targetMonthName} ${year}`;

    const dateFieldXPath = `//android.widget.EditText[@hint='${fieldHint}']`;
    let dateField = await driver.$(dateFieldXPath);

    let isVisible = await dateField.isDisplayed().catch(() => false);

    let retries = 5;
    while (!isVisible && retries > 0) {
        await swipeByCoordinates(driver, 540, 1800, 540, 600);
        await driver.pause(1000);
        dateField = await driver.$(dateFieldXPath);
        isVisible = await dateField.isDisplayed().catch(() => false);
        retries--;
    }

    await dateField.waitForDisplayed({ timeout: 5000 });
    await dateField.click();
    await driver.pause(1500);

    // 1. Check and Change Year
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

    // 2. Check and Change Month via Buttons
    let headerDateText = await driver.$('//android.widget.TextView[@resource-id="android:id/date_picker_header_date"]').getText();

    let currentMonthIndex = shortMonths.findIndex(m => headerDateText.includes(m));
    let targetMonthIndex = month - 1;

    while (currentMonthIndex !== targetMonthIndex && currentMonthIndex !== -1) {
        if (targetMonthIndex > currentMonthIndex) {
            const nextBtn = await driver.$('//android.widget.ImageButton[@content-desc="Next month"]');
            if (await nextBtn.isExisting() && await nextBtn.isDisplayed()) {
                await nextBtn.click();
            } else {
                await swipeByCoordinates(driver, 700, 1200, 300, 1200); // Fallback swipe
            }
            currentMonthIndex++;
        } else {
            const prevBtn = await driver.$('//android.widget.ImageButton[@content-desc="Previous month"]');
            if (await prevBtn.isExisting() && await prevBtn.isDisplayed()) {
                await prevBtn.click();
            } else {
                await swipeByCoordinates(driver, 300, 1200, 700, 1200); // Fallback swipe
            }
            currentMonthIndex--;
        }
        await driver.pause(800);
    }

    // 3. Click exactly on the target day
    const specificDateBtn = await driver.$(`//android.view.View[@content-desc='${targetDateDesc}']`);
    await specificDateBtn.waitForDisplayed({ timeout: 5000 });
    await specificDateBtn.click();

    // 4. Submit Datepicker
    const okBtn = await driver.$(`//android.widget.Button[@resource-id="android:id/button1"]`);
    await okBtn.click();
}

async function selectRadioOption(driver, questionSubstring, option) {
    const xpath = `//android.widget.TextView[contains(@text, '${questionSubstring}')]/ancestor::android.widget.LinearLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cl_ri']//android.widget.RadioButton[@text='${option}']`;

    let element = await driver.$(xpath);
    let isDisplayed = await element.isDisplayed().catch(() => false);

    let retries = 5;
    while (!isDisplayed && retries > 0) {
        await swipeByCoordinates(driver, 540, 1800, 540, 500);
        await driver.pause(1000);
        element = await driver.$(xpath);
        isDisplayed = await element.isDisplayed().catch(() => false);
        retries--;
    }

    await element.waitForDisplayed({ timeout: 5000 });
    await element.click();
}

async function fillTextField(driver, hintSubstring, textValue) {
    const xpath = `//android.widget.EditText[contains(@hint, '${hintSubstring}')]`;

    let element = await driver.$(xpath);
    let isDisplayed = await element.isDisplayed().catch(() => false);

    let retries = 5;
    while (!isDisplayed && retries > 0) {
        await swipeByCoordinates(driver, 540, 1800, 540, 500);
        await driver.pause(1000);
        element = await driver.$(xpath);
        isDisplayed = await element.isDisplayed().catch(() => false);
        retries--;
    }

    await element.waitForDisplayed({ timeout: 5000 });
    await element.click();
    await element.setValue(textValue);

    try {
        await driver.hideKeyboard();
    } catch (e) {}
}

async function submitAssessment(driver) {
    const xpath = `//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]`;

    let submitBtn = await driver.$(xpath);
    let isDisplayed = await submitBtn.isDisplayed().catch(() => false);

    let retries = 5;
    while (!isDisplayed && retries > 0) {
        await swipeByCoordinates(driver, 540, 1800, 540, 500);
        await driver.pause(1000);
        submitBtn = await driver.$(xpath);
        isDisplayed = await submitBtn.isDisplayed().catch(() => false);
        retries--;
    }

    await submitBtn.waitForDisplayed({ timeout: 5000 });
    await submitBtn.click();
}

async function main() {
    let driver;

    try {
        driver = await remote(wdioOptions);

        await clickGridItemByText(driver, 'High Risk Assessment');
        await driver.pause(1000);

        await clickGridItemByText(driver, 'Follow-up of High Risk Cases');
        await driver.pause(1000);

        const searchText = 'uma';
        const targetBeneficiary = 'UMA  KARMAKAR';

        await searchWithKeyboard(driver, searchText);
        await driver.pause(2000);

        await clickFollowUpForBeneficiary(driver, targetBeneficiary);
        await driver.pause(2000);

        await fillCalendarDate(driver, 15, 3, 2026, 'Date of Visit *');
        await driver.pause(1000);

        await selectRadioOption(driver, 'Visible signs of Anemia as per appearance', 'No');
        await driver.pause(500);

        await selectRadioOption(driver, 'Hypertension', 'Yes');
        await driver.pause(500);

        await fillTextField(driver, 'Systolic', '120');
        await driver.pause(500);

        await fillTextField(driver, 'Diastolic', '80');
        await driver.pause(500);

        await selectRadioOption(driver, 'Diabetes', 'Yes');
        await driver.pause(500);

        const glucoseTestType = 'FBS & PPBS';

        await selectRadioOption(driver, 'Blood Glucose (Sugar) Test', glucoseTestType);
        await driver.pause(500);

        if (glucoseTestType === 'RBS') {
            await fillTextField(driver, 'Random blood Sugar', '110');
        } else if (glucoseTestType === 'FBS & PPBS') {
            await fillTextField(driver, 'Fasting Blood Sugar Test (FBS)', '100');
            await driver.pause(500);
            await fillTextField(driver, 'Post-Prandial Blood Sugar Test (PPBS)', '140');
        }
        await driver.pause(500);

        await selectRadioOption(driver, 'Severe Anemia', 'No');
        await driver.pause(500);

        await fillTextField(driver, 'Hemoglobin (Hb) Test', '12.5');
        await driver.pause(500);

        const isIFAProvided = 'Yes';
        await selectRadioOption(driver, 'Whether IFA supplement is provided', isIFAProvided);
        await driver.pause(500);

        if (isIFAProvided === 'Yes') {
            await fillTextField(driver, 'Issued quantity of IFA supplement', '30');
            await driver.pause(500);
        }

        await selectRadioOption(driver, 'Adoption of Family Planning', 'Yes');
        await driver.pause(500);

        // LMP Uses the updated robust calendar function
        await fillCalendarDate(driver, 10, 2, 2026, 'LMP *');
        await driver.pause(1000);

        await selectRadioOption(driver, 'Missed Period', 'No');
        await driver.pause(500);

        await selectRadioOption(driver, 'Is Pregnant', 'No');
        await driver.pause(500);

        await submitAssessment(driver);

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