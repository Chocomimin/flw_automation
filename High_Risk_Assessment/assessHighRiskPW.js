const { remote } = require('webdriverio');

// ==========================================
// CONFIGURATION - CHANGE THIS TO SWITCH FORMS
// Options: 'MICRO_BIRTH_PLAN' or 'ASSESS'
// ==========================================
const FORM_TO_RUN = 'ASSESS'; // <-- CHANGE THIS

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

async function clickMicroBirthPlanForBeneficiary(driver, memberName) {
    const androidScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${memberName}")`;
    try {
        await driver.$(`android=${androidScrollSelector}`).waitForDisplayed({ timeout: 10000 });
    } catch (e) {}

    await driver.pause(1000);

    const btnXPath =
        `//android.widget.TextView[contains(@text, '${memberName}')]` +
        `/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_hrpa_content']` +
        `//android.widget.Button[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/btn_form2' and @text='MICRO BIRTH PLAN']`;

    const planBtn = await driver.$(btnXPath);
    await planBtn.waitForDisplayed({ timeout: 5000 });
    await planBtn.click();
    console.log(`Clicked MICRO BIRTH PLAN for: ${memberName}`);
}

async function clickAssessForBeneficiary(driver, memberName) {
    const androidScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${memberName}")`;
    try {
        await driver.$(`android=${androidScrollSelector}`).waitForDisplayed({ timeout: 10000 });
    } catch (e) {}

    await driver.pause(1000);

    const btnXPath =
        `//android.widget.TextView[contains(@text, '${memberName}')]` +
        `/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_hrpa_content']` +
        `//android.widget.Button[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/btn_form1' and @text='ASSESS']`;

    const assessBtn = await driver.$(btnXPath);
    await assessBtn.waitForDisplayed({ timeout: 5000 });
    await assessBtn.click();
    console.log(`Clicked ASSESS for: ${memberName}`);
}

// ==========================================
// FORM FILLING FUNCTIONS
// ==========================================

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

// ==========================================
// ASSESS FORM FILLING FUNCTION (FIXED)
// ==========================================

async function fillAssessForm(driver) {
    console.log("Filling Assess form - High Risk Conditions in Pregnant Women...");

    // FIXED: Select radio by tapping coordinates derived from the
    // question label's bounds — avoids stale element ID reuse bug
    async function selectRadioByQuestionText(driver, questionText, answerText) {
        console.log(`  Processing question: "${questionText}" -> "${answerText}"`);

        // Scroll question into view
        const questionXPath = `//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_nullable" and contains(@text, "${questionText}")]`;

        let questionEl = await driver.$(questionXPath);
        let isVisible = await questionEl.isDisplayed().catch(() => false);

        let retries = 5;
        while (!isVisible && retries > 0) {
            await swipeByCoordinates(driver, 540, 1800, 540, 500);
            await driver.pause(800);
            questionEl = await driver.$(questionXPath);
            isVisible = await questionEl.isDisplayed().catch(() => false);
            retries--;
        }

        await questionEl.waitForDisplayed({ timeout: 5000 });

        // Get the location of the question label
        const questionLocation = await questionEl.getLocation();
        const questionSize = await questionEl.getSize();
        const questionBottomY = questionLocation.y + questionSize.height;

        // FIXED: Find the RadioGroup that appears DIRECTLY AFTER this question label
        // by using the question's Y position to identify the correct RadioGroup
        // We find all RadioGroups and pick the one whose Y position is closest
        // and just below the question label
        const allRadioGroupsXPath = `//android.widget.RadioGroup[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/rg"]`;
        const allRadioGroups = await driver.$$(allRadioGroupsXPath);

        let targetRadioGroup = null;
        let closestDistance = Infinity;

        for (const rg of allRadioGroups) {
            const rgVisible = await rg.isDisplayed().catch(() => false);
            if (!rgVisible) continue;

            const rgLocation = await rg.getLocation();
            // The RadioGroup should be BELOW the question label
            if (rgLocation.y >= questionBottomY) {
                const distance = rgLocation.y - questionBottomY;
                if (distance < closestDistance) {
                    closestDistance = distance;
                    targetRadioGroup = rg;
                }
            }
        }

        if (!targetRadioGroup) {
            console.log(`  ERROR: Could not find RadioGroup for question: "${questionText}"`);
            return;
        }

        // Now find the Yes/No button INSIDE this specific RadioGroup
        const radioButtonXPath = `.//android.widget.RadioButton[@text="${answerText}"]`;
        const radioBtn = await targetRadioGroup.$(radioButtonXPath);
        await radioBtn.waitForDisplayed({ timeout: 5000 });

        // Re-fetch fresh element to avoid stale ID issue
        const isBtnChecked = await radioBtn.getAttribute('checked');
        if (isBtnChecked !== 'true') {
            await radioBtn.click();
            console.log(`  ✓ Selected '${answerText}' for: ${questionText}`);
        } else {
            console.log(`  ✓ '${answerText}' already selected for: ${questionText}`);
        }
        await driver.pause(500);
    }

    async function setDateField(driver, hintText, day, monthOffset) {
        const fieldXPath = `//android.widget.EditText[@hint="${hintText}"]`;

        let dateField = await driver.$(fieldXPath);
        let isVisible = await dateField.isDisplayed().catch(() => false);

        let retries = 5;
        while (!isVisible && retries > 0) {
            await swipeByCoordinates(driver, 540, 1800, 540, 500);
            await driver.pause(800);
            dateField = await driver.$(fieldXPath);
            isVisible = await dateField.isDisplayed().catch(() => false);
            retries--;
        }

        await dateField.waitForDisplayed({ timeout: 5000 });
        await dateField.click();
        await driver.pause(1500);

        console.log(`  DatePicker opened for '${hintText}'`);

        if (monthOffset < 0) {
            const prevMonthBtn = await driver.$('//android.widget.ImageButton[@content-desc="Previous month"]');
            for (let i = 0; i < Math.abs(monthOffset); i++) {
                await prevMonthBtn.waitForDisplayed({ timeout: 3000 });
                await prevMonthBtn.click();
                await driver.pause(500);
            }
        }

        const dayXPath = `//android.view.View[@text="${day}"]`;
        const dayEl = await driver.$(dayXPath);
        await dayEl.waitForDisplayed({ timeout: 3000 });
        await dayEl.click();
        await driver.pause(500);

        const okBtn = await driver.$('//android.widget.Button[@resource-id="android:id/button1" and @text="OK"]');
        await okBtn.waitForDisplayed({ timeout: 3000 });
        await okBtn.click();
        await driver.pause(800);

        console.log(`  Date set for '${hintText}'`);
    }

    // ----------------------------
    // SECTION: Information on Children
    // ----------------------------
    await selectRadioByQuestionText(driver, 'No. of Deliveries is more than 3', 'Yes');
    await selectRadioByQuestionText(driver, 'Time from last delivery is less than 18 months', 'Yes');

    // ----------------------------
    // SECTION: Physical Observation
    // ----------------------------
    await selectRadioByQuestionText(driver, 'Height is very short or less than 140 cms', 'Yes');
    await selectRadioByQuestionText(driver, 'Age is less than 18 or more than 35 years', 'No');

    // ----------------------------
    // SECTION: Obstetric History
    // ----------------------------
    await selectRadioByQuestionText(driver, 'Rh Negative', 'Yes');
    await selectRadioByQuestionText(driver, 'Home delivery of previous pregnancy', 'Yes');
    await selectRadioByQuestionText(driver, 'Bad obstetric history', 'Yes');
    await selectRadioByQuestionText(driver, 'Multiple Pregnancy', 'Yes');

    // ----------------------------
    // LMP Date: 31-03-2026
    // ----------------------------
    await setDateField(driver, 'LMP Date *', '31', 0);

    // EDD is auto-calculated and read-only
    console.log("  EDD is auto-calculated, skipping...");

    console.log("Assess form filled successfully!");
}

// ==========================================
// MICRO BIRTH PLAN FORM FILLING FUNCTION
// ==========================================

async function fillMicroBirthPlanForm(driver) {
    console.log("Filling out general text fields...");
    await fillTextField(driver, 'Nearest SC/HWC', 'City Center SC');
    await driver.pause(500);

    console.log("Opening Blood Group dropdown...");
    const bloodGroupTitleXPath = `//*[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown" or contains(@text, 'Blood Group')]`;

    let bgDropdown = await driver.$(bloodGroupTitleXPath);
    let bgVisible = await bgDropdown.isDisplayed().catch(() => false);

    let bgRetries = 5;
    while (!bgVisible && bgRetries > 0) {
        await swipeByCoordinates(driver, 540, 1800, 540, 500);
        await driver.pause(1000);
        bgDropdown = await driver.$(bloodGroupTitleXPath);
        bgVisible = await bgDropdown.isDisplayed().catch(() => false);
        bgRetries--;
    }

    await bgDropdown.waitForDisplayed({ timeout: 5000 });
    await bgDropdown.click();
    await driver.pause(1500);

    console.log("Calculating dynamic screen coordinates for Blood Group...");
    const windowSize = await driver.getWindowRect();
    const screenWidth = windowSize.width;
    const screenHeight = windowSize.height;

    const BLOOD_GROUP_Y_PCT = {
        'A +Ve': 0.345,
        'A -Ve': 0.386,
        'B +Ve': 0.427,
        'B -Ve': 0.469,
        'AB +Ve': 0.510,
        'AB -Ve': 0.552,
        'O +Ve': 0.593,
        'O -Ve': 0.634
    };

    const targetBloodGroup = 'A +Ve';
    const targetPercentage = BLOOD_GROUP_Y_PCT[targetBloodGroup];

    if (targetPercentage) {
        const tapX = Math.round(screenWidth * 0.5);
        const tapY = Math.round(screenHeight * targetPercentage);
        console.log(`Tapping '${targetBloodGroup}' at dynamic coordinates: X=${tapX}, Y=${tapY}`);
        await tapByCoordinates(driver, tapX, tapY);
    } else {
        console.log(`Error: Percentage mapping for blood group '${targetBloodGroup}' not found.`);
    }
    await driver.pause(1000);

    await fillTextField(driver, 'Contact Number 2', '9988776655');
    await driver.pause(500);

    await fillTextField(driver, 'SC/HWC/TG Hosp', 'General Hosp');
    await driver.pause(500);

    await fillTextField(driver, 'Nearest USG centre', 'Care USG');
    await driver.pause(500);

    await fillTextField(driver, 'Block', 'North Block');
    await driver.pause(500);

    await fillTextField(driver, 'Nearest 24x7 PHC', 'District PHC');
    await driver.pause(500);

    await fillTextField(driver, 'Nearest FRU', 'Central FRU');
    await driver.pause(500);

    await fillTextField(driver, 'Blood donors identified 1', 'John Doe');
    await driver.pause(500);

    await fillTextField(driver, 'Blood donors identified 2', 'Jane Doe');
    await driver.pause(500);

    console.log("Submitting Micro Birth Plan...");
    await submitAssessment(driver);
    console.log("Micro Birth Plan submitted successfully!");
}

// ==========================================
// MAIN EXECUTION BLOCK
// ==========================================

async function main() {
    let driver;

    try {
        driver = await remote(wdioOptions);

        console.log("Navigating to High Risk Assessment...");
        await clickGridItemByText(driver, 'High Risk Assessment');
        await driver.pause(1000);

        console.log("Navigating to Assess High Risk in PW...");
        await clickGridItemByText(driver, 'Assess High Risk in PW');
        await driver.pause(1000);

        const searchText = 'RITA';
        const targetBeneficiary = 'RITA SURI';

        console.log(`Searching for: ${searchText}...`);
        await searchWithKeyboard(driver, searchText);
        await driver.pause(2000);

        // -----------------------------------------------
        // SWITCH BASED ON FORM_TO_RUN CONFIG AT TOP
        // -----------------------------------------------
        if (FORM_TO_RUN === 'MICRO_BIRTH_PLAN') {
            console.log(`Running MICRO BIRTH PLAN flow for: ${targetBeneficiary}...`);
            await clickMicroBirthPlanForBeneficiary(driver, targetBeneficiary);
            await driver.pause(2000);
            await fillMicroBirthPlanForm(driver);

        } else if (FORM_TO_RUN === 'ASSESS') {
            console.log(`Running ASSESS flow for: ${targetBeneficiary}...`);
            await clickAssessForBeneficiary(driver, targetBeneficiary);
            await driver.pause(2000);
            await fillAssessForm(driver);
            await submitAssessment(driver);
            console.log("Assess form submitted successfully!");

        } else {
            console.error(`Invalid FORM_TO_RUN value: '${FORM_TO_RUN}'. Use 'MICRO_BIRTH_PLAN' or 'ASSESS'.`);
        }

    } catch (error) {
        console.error("Script failed:", error.message);
    } finally {
        if (driver) {
            await driver.pause(3000);
            await driver.deleteSession();
        }
    }
}

main();