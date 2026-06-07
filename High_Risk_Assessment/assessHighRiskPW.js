const { remote } = require('webdriverio');

// ==========================================
// CONFIGURATION - CHANGE THIS TO SWITCH FORMS
// Options: 'MICRO_BIRTH_PLAN' or 'ASSESS'
// ==========================================
const FORM_TO_RUN = 'MICRO_BIRTH_PLAN'; // <-- CHANGE THIS

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
// CORE DROPDOWN HELPERS (From Household Form)
// ==========================================

async function scrollSpinnerToMiddle(driver, spinnerSelector) {
    try {
        const spinner = await driver.$(spinnerSelector);
        const loc = await spinner.getLocation();
        const screen = await driver.getWindowRect();
        const midY = screen.height / 2;

        if (loc.y > midY + 100) {
            console.log(`⬆️  Spinner at y=${loc.y}, scrolling toward middle...`);
            const startY = Math.floor(screen.height * 0.7);
            const endY = Math.floor(screen.height * 0.3);
            const swipeX = Math.floor(screen.width / 2);

            await driver.performActions([{
                type: 'pointer', id: 'finger1',
                parameters: { pointerType: 'touch' },
                actions: [
                    { type: 'pointerMove', duration: 0, x: swipeX, y: startY },
                    { type: 'pointerDown', button: 0 },
                    { type: 'pause', duration: 200 },
                    { type: 'pointerMove', duration: 1000, x: swipeX, y: endY },
                    { type: 'pointerUp', button: 0 }
                ]
            }]);
            await driver.releaseActions();
            await driver.pause(1500);
        }
    } catch (e) {
        console.log('⚠️  scrollSpinnerToMiddle skipped:', e.message);
    }
}

async function tapByCoords(driver, tapX, tapY) {
    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: tapX, y: tapY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 150 },
            { type: 'pointerUp',   button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(500);
}

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList) {
    // 1. Force the spinner to the safe middle zone
    await scrollSpinnerToMiddle(driver, spinnerSelector);

    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();
    console.log(`📍 Spinner @ (${loc.x}, ${loc.y}), size (${size.width}x${size.height})`);

    // 2. Click the RIGHT side of the spinner to explicitly hit the dropdown arrow
    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);

    console.log(`📍 Tapping dropdown arrow at (${tapX}, ${tapY})`);
    await tapByCoords(driver, tapX, tapY);
    await driver.pause(2000); // Wait for popup to fully expand

    // STRATEGY 0: Direct XPath
    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`✅ Selected "${value}" via XPath`);
        return;
    } catch (e) {}

    // STRATEGY 1: UiSelector
    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via UiSelector`);
        return;
    } catch (e) {}

    // STRATEGY 2: Tag-by-tag XML parse
    try {
        const source = await driver.getPageSource();
        const nodes = source.match(/<[^>]+>/g) || [];
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const textRegex = new RegExp(`(?:text|content-desc)="\\s*${escapedValue}\\s*"`);
        let foundNode = null;

        for (const node of nodes) {
            if (textRegex.test(node) && node.includes('bounds=')) {
                foundNode = node;
                break;
            }
        }

        if (foundNode) {
            const boundsMatch = foundNode.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
            if (boundsMatch) {
                const tapX = Math.floor((parseInt(boundsMatch[1]) + parseInt(boundsMatch[3])) / 2);
                const tapY = Math.floor((parseInt(boundsMatch[2]) + parseInt(boundsMatch[4])) / 2);
                await tapByCoords(driver, tapX, tapY);
                console.log(`✅ Selected "${value}" via tag parse`);
                return;
            }
        }
    } catch (e) {}

    // STRATEGY 3: Inline regex bounds
    try {
        const source = await driver.getPageSource();
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`text="${escapedValue}"[^/]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
        const match = source.match(regex);

        if (match) {
            const tapX = Math.floor((parseInt(match[1]) + parseInt(match[3])) / 2);
            const tapY = Math.floor((parseInt(match[2]) + parseInt(match[4])) / 2);
            await tapByCoords(driver, tapX, tapY);
            console.log(`✅ Selected "${value}" via regex`);
            return;
        }
    } catch (e) {}

    // STRATEGY 4: Coordinate fallback
    const screen = await driver.getWindowRect();
    const idx = optionsList.indexOf(value);
    if (idx === -1) throw new Error(`"${value}" not in list: [${optionsList.join(', ')}]`);

    const rowHeight     = size.height;
    const spinnerBottom = loc.y + size.height;
    const opensUpward   = (screen.height - spinnerBottom) < (optionsList.length * rowHeight);
    const finalTapX     = Math.floor(loc.x + size.width / 2);
    let   finalTapY;

    if (opensUpward) {
        const reversedIdx = (optionsList.length - 1) - idx;
        finalTapY = Math.floor(loc.y - (reversedIdx * rowHeight) - (rowHeight / 2));
    } else {
        finalTapY = Math.floor(spinnerBottom + (idx * rowHeight) + (rowHeight / 2));
    }
    finalTapY = Math.max(5, Math.min(finalTapY, screen.height - 5));

    await tapByCoords(driver, finalTapX, finalTapY);
    console.log(`✅ Selected "${value}" via coordinates`);
}

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

// Kept for backward compatibility with your other functions
async function tapByCoordinates(driver, x, y) {
    await tapByCoords(driver, x, y);
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
// ASSESS FORM FILLING FUNCTION
// ==========================================

async function fillAssessForm(driver) {
    console.log("Filling Assess form - High Risk Conditions in Pregnant Women...");

    async function selectRadioByQuestionText(driver, questionText, answerText) {
        console.log(`  Processing question: "${questionText}" -> "${answerText}"`);

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

        const questionLocation = await questionEl.getLocation();
        const questionSize = await questionEl.getSize();
        const questionBottomY = questionLocation.y + questionSize.height;

        const allRadioGroupsXPath = `//android.widget.RadioGroup[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/rg"]`;
        const allRadioGroups = await driver.$$(allRadioGroupsXPath);

        let targetRadioGroup = null;
        let closestDistance = Infinity;

        for (const rg of allRadioGroups) {
            const rgVisible = await rg.isDisplayed().catch(() => false);
            if (!rgVisible) continue;

            const rgLocation = await rg.getLocation();
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

        const radioButtonXPath = `.//android.widget.RadioButton[@text="${answerText}"]`;
        const radioBtn = await targetRadioGroup.$(radioButtonXPath);
        await radioBtn.waitForDisplayed({ timeout: 5000 });

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

    await selectRadioByQuestionText(driver, 'No. of Deliveries is more than 3', 'Yes');
    await selectRadioByQuestionText(driver, 'Time from last delivery is less than 18 months', 'Yes');
    await selectRadioByQuestionText(driver, 'Height is very short or less than 140 cms', 'Yes');
    await selectRadioByQuestionText(driver, 'Age is less than 18 or more than 35 years', 'No');
    await selectRadioByQuestionText(driver, 'Rh Negative', 'Yes');
    await selectRadioByQuestionText(driver, 'Home delivery of previous pregnancy', 'Yes');
    await selectRadioByQuestionText(driver, 'Bad obstetric history', 'Yes');
    await selectRadioByQuestionText(driver, 'Multiple Pregnancy', 'Yes');

    await setDateField(driver, 'LMP Date *', '31', 0);
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

    console.log("Selecting Blood Group...");

    // 1. Ensure the field is fully scrolled into view so the UI engine can locate the element
    const bloodGroupScrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Blood Group"))`;
    try { await driver.$(bloodGroupScrollSelector).waitForExist({ timeout: 3000 }); } catch (e) {}
    await driver.pause(1000);

    // 2. Call the new robust helper method
    const bloodGroupOptions = ['A +Ve', 'A -Ve', 'B +Ve', 'B -Ve', 'AB +Ve', 'AB -Ve', 'O +Ve', 'O -Ve'];
    const spinnerSelector = `//android.widget.Spinner[contains(@text, "Blood Group")]`;

    await clickSpinnerAndSelectOption(driver, spinnerSelector, 'A +Ve', bloodGroupOptions);
    await driver.pause(1000);

    // Continue filling text fields
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

        const searchText = 'JINA';
        const targetBeneficiary = 'JINA BEGHAM';

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