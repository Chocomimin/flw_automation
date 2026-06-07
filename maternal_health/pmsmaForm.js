const { remote } = require('webdriverio');

// ── Configuration & Data ──────────────────────────────────────────────────────

const PMSMA_FORM_DATA = {
    ancDate: { day: 2, month: 6, year: 2026 },
    ancPeriod: '3',

    // Abortion Path
    abortionIfAny: 'Yes', // Set to 'Yes' to trigger abortion fields
    abortionType: 'Spontaneous',
    facility: 'District Hospital',
    abortionDate: { day: 2, month: 6, year: 2026 },

    // Alive/Death Path
    isPregnantWomanAlive: 'No', // If 'No', it will fill Death details. If 'Yes', it fills Health details.
    causeOfDeath: 'ABORTION',
    deathDate: { day: 2, month: 6, year: 2026 },
    placeOfDeath: 'District Hospital',

    // Health Details (Only filled if Alive = Yes)
    weightAtRegistration: '55',
    hasDelivered: 'Yes',
    bpSystolicDiastolic: '120/80',
    hbValue: '11.5',

    // Vaccinations & Supplements
    tdTt1stDoseDate: { day: 10, month: 4, year: 2026 },
    tdTt2ndDoseDate: { day: 10, month: 5, year: 2026 },
    tdTtBoosterDate: null, // Set to null to skip filling this field
    folicAcidTabsGiven: '30',
    ifaTabsGiven: '90',

    // High Risk Details
    anyHighRiskConditions: 'Yes',
    highRiskCondition: 'OTHER',
    otherHighRiskCondition: 'Severe Asthma',
    referralFacility: 'District Hospital',
    isHrpConfirmed: 'Yes',
    hrpIdentifier: 'PHC - MO',

    // Bottom of the form
    fundalHeight: '28'
};

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

// ── Robust Dropdown & Touch Helpers ───────────────────────────────────────────

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

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList) {
    // 1. Force the spinner to a safe middle zone
    await scrollSpinnerToMiddle(driver, spinnerSelector);
    await driver.pause(1500);

    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc = await spinner.getLocation();
    const size = await spinner.getSize();

    // 2. Tap the right-side arrow icon to open the menu
    const tapX = Math.floor(loc.x + (size.width * 0.90));
    const tapY = Math.floor(loc.y + (size.height / 2));

    console.log(`📍 Opening dropdown for "${value}" at (${tapX}, ${tapY})...`);
    await tapByCoords(driver, tapX, tapY);

    // Give the Popup Window layer time to fully render on screen
    await driver.pause(2000);

    // Handle pesky keyboard interruptions
    if (await driver.isKeyboardShown()) {
        console.log('⚠️ Keyboard detected. Hiding and retrying tap...');
        await driver.hideKeyboard();
        await driver.pause(1000);
        await tapByCoords(driver, tapX, tapY);
        await driver.pause(2000);
    }

    // 3. PURE MATH TAP (Skipping DOM checks for speed)
    const index = optionsList.indexOf(value);

    if (index === -1) {
        throw new Error(`❌ "${value}" was not found in the provided options list: [${optionsList.join(', ')}]`);
    }

    console.log(`⚡ Bypassing Appium DOM. Executing Math Tap for index ${index}...`);

    // Calculate exact screen pixels
    const gapBelowSpinner = 15; // Gap between spinner bottom and first option
    const itemHeight = Math.floor(size.height * 0.92); // Option rows are slightly shorter than the spinner
    const spinnerBottom = loc.y + size.height;

    const finalTapX = Math.floor(loc.x + (size.width / 2));
    const finalTapY = Math.floor(spinnerBottom + gapBelowSpinner + (index * itemHeight) + (itemHeight / 2));

    console.log(`📍 Blind Tapping calculated coordinates (${finalTapX}, ${finalTapY})`);
    await tapByCoords(driver, finalTapX, finalTapY);
    console.log(`✅ Selected "${value}" successfully!`);

    // Small pause to let the menu close smoothly
    await driver.pause(1000);
}

// ── General Scroll Helpers ────────────────────────────────────────────────────

async function swipeHorizontal(driver, direction) {
    const size = await driver.getWindowRect();
    const startX = direction === 'left' ? Math.floor(size.width * 0.8) : Math.floor(size.width * 0.2);
    const endX = direction === 'left' ? Math.floor(size.width * 0.2) : Math.floor(size.width * 0.8);
    const startY = Math.floor(size.height * 0.5);

    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: startX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerMove', duration: 500, x: endX, y: startY },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(1000);
}

async function scrollDown(driver) {
    const size = await driver.getWindowRect();
    const startX = Math.floor(size.width / 2);
    const startY = Math.floor(size.height * 0.70);
    const endY = Math.floor(size.height * 0.30);

    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: startX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerMove', duration: 600, x: startX, y: endY },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(1000);
}

async function scrollUp(driver) {
    const size = await driver.getWindowRect();
    const startX = Math.floor(size.width / 2);
    const startY = Math.floor(size.height * 0.30);
    const endY = Math.floor(size.height * 0.70);

    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: startX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerMove', duration: 600, x: startX, y: endY },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(1000);
}

async function scrollToText(driver, text, maxScrolls = 4) {
    const elementXPath = `//*[contains(@text, "${text}") or contains(@hint, "${text}")]`;

    try {
        const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${text}"))`;
        await driver.$(`android=${scrollable}`).catch(() => {});
    } catch (e) {}

    let element = await driver.$(elementXPath);
    if ((await element.isExisting()) && (await element.isDisplayed())) return;

    for (let i = 0; i < maxScrolls; i++) {
        element = await driver.$(elementXPath);
        if ((await element.isExisting()) && (await element.isDisplayed())) return;
        await scrollDown(driver);
    }

    for (let i = 0; i < maxScrolls * 2; i++) {
        element = await driver.$(elementXPath);
        if ((await element.isExisting()) && (await element.isDisplayed())) return;
        await scrollUp(driver);
    }

    console.log(`⚠️ Element containing "${text}" not found after bidirectional scroll.`);
}

async function isEmpty(field, hintText) {
    try {
        const text = await field.getText();
        return !text || text.trim() === '' || text.includes(hintText);
    } catch {
        return true;
    }
}

// ── Calendar Helpers ──────────────────────────────────────────────────────────

async function navigateToMonth(driver, targetMonth, targetYear) {
    const yearHeader = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_header_year")');
    if (await yearHeader.isExisting()) {
        const currentYear = parseInt(await yearHeader.getText());
        if (currentYear !== targetYear) {
            await yearHeader.click();
            await driver.pause(1000);
            const yearEl = await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${targetYear}")`);
            if (await yearEl.isExisting()) {
                await yearEl.click();
            }
            await driver.pause(1000);
        }
    }

    for (let i = 0; i < 12; i++) {
        const dayElement = await driver.$('//android.view.View[@text="15"]');
        if (!(await dayElement.isExisting())) break;

        const contentDesc = await dayElement.getAttribute('content-desc');
        if (!contentDesc) break;

        const currentMonthName = MONTH_NAMES.find(m => m !== '' && contentDesc.includes(m));
        const currentMonthIndex = MONTH_NAMES.indexOf(currentMonthName);

        if (currentMonthIndex === targetMonth) break;

        if (currentMonthIndex < targetMonth) {
            const nextBtn = await driver.$('~Next month');
            if (await nextBtn.isExisting()) await nextBtn.click();
            else await swipeHorizontal(driver, 'left');
        } else {
            const prevBtn = await driver.$('~Previous month');
            if (await prevBtn.isExisting()) await prevBtn.click();
            else await swipeHorizontal(driver, 'right');
        }
        await driver.pause(1000);
    }
}

async function pickDateFromCalendar(driver, dateObj) {
    const { day, month, year } = dateObj;

    const datePicker = await driver.$('android=new UiSelector().resourceId("android:id/datePicker")');
    await datePicker.waitForDisplayed({ timeout: 5000 });

    await navigateToMonth(driver, month, year);

    const formattedDay = String(day);
    const dayToClick = await driver.$(`//android.view.View[@text="${formattedDay}"]`);

    if (await dayToClick.isExisting()) {
        await dayToClick.click();
    }
    await driver.pause(500);

    const okBtn = await driver.$('//android.widget.Button[@text="OK" or @resource-id="android:id/button1"]');
    if (await okBtn.isExisting()) {
        await okBtn.click();
    }
}

// ── Form Filling Functions ────────────────────────────────────────────────────

async function fillAncDate(driver) {
    console.log('Processing ANC Date...');
    await scrollToText(driver, "ANC Date");

    const field = await driver.$('//android.widget.EditText[contains(@hint, "ANC Date") or contains(@text, "ANC Date")]');
    await field.waitForDisplayed({ timeout: 5000 }).catch(()=>null);

    if (await field.isExisting() && await isEmpty(field, 'ANC Date')) {
        await field.click();
        await driver.pause(1500);
        await pickDateFromCalendar(driver, PMSMA_FORM_DATA.ancDate);
        console.log('✔ ANC Date filled successfully.');
    }
}

async function fillAncPeriod(driver) {
    console.log('Processing ANC Period Dropdown...');
    await scrollToText(driver, "ANC Period");

    const spinnerXPath = `//android.widget.Spinner[contains(@hint, "ANC Period") or contains(@text, "ANC Period")]`;
    const optionsList = ['2', '3', '4', '5', '6', '7', '8', '9'];

    await clickSpinnerAndSelectOption(driver, spinnerXPath, PMSMA_FORM_DATA.ancPeriod, optionsList);
}

// ── ABORTION CONDITIONAL FIELDS ──

async function fillAbortionIfAny(driver) {
    console.log('Checking for "Abortion If Any" field...');
    await scrollToText(driver, "Abortion If Any");

    const targetOption = PMSMA_FORM_DATA.abortionIfAny;
    const radioXPath = `//android.widget.TextView[@text="Abortion If Any"]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${targetOption}"]`;
    const radioButton = await driver.$(radioXPath);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');
        if (isChecked !== 'true') {
            await radioButton.click();
            console.log(`✔ "Abortion If Any" changed to "${targetOption}".`);
            await driver.pause(1000);
        }
    }
}

async function fillAbortionType(driver) {
    console.log('Processing Abortion Type Dropdown...');
    await scrollToText(driver, "Abortion Type");

    const spinnerXPath = `//android.widget.Spinner[contains(@hint, "Abortion Type") or contains(@text, "Abortion Type")]`;
    const optionsList = ['Induced', 'Spontaneous', 'Incomplete'];

    await clickSpinnerAndSelectOption(driver, spinnerXPath, PMSMA_FORM_DATA.abortionType, optionsList);
}

async function fillFacilityPlaceOfAbortion(driver) {
    console.log('Processing Facility Dropdown...');
    await scrollToText(driver, "Facility");

    const spinnerXPath = `//android.widget.Spinner[contains(@hint, "Facility") or contains(@text, "Facility")]`;
    const optionsList = ['Home', 'Subcenter', 'PHC', 'CHC', 'District Hospital', 'Medical College Hospital', 'Private Hospital', 'In Transit', 'Other Place of Abortion'];

    await clickSpinnerAndSelectOption(driver, spinnerXPath, PMSMA_FORM_DATA.facility, optionsList);
}

async function fillAbortionDate(driver) {
    console.log('Processing Abortion Date...');
    await scrollToText(driver, "Abortion Date");

    const field = await driver.$('//android.widget.EditText[contains(@hint, "Abortion Date") or contains(@text, "Abortion Date")]');

    if (await field.isExisting() && await isEmpty(field, 'Abortion Date')) {
        await field.click();
        await driver.pause(1500);
        await pickDateFromCalendar(driver, PMSMA_FORM_DATA.abortionDate);
        console.log('✔ Abortion Date filled successfully.');
    }
}

// ── ALIVE / DEATH CONDITIONAL FIELDS ──

async function fillIsPregnantWomanAlive(driver) {
    console.log('Checking for "Is pregnant woman alive?" field...');
    await scrollToText(driver, "alive");

    const targetOption = PMSMA_FORM_DATA.isPregnantWomanAlive;
    const radioXPath = `//android.widget.TextView[contains(@text, "alive") or contains(@text, "Alive")]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${targetOption}"]`;
    const radioButton = await driver.$(radioXPath);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');
        if (isChecked !== 'true') {
            await radioButton.click();
            console.log(`✔ "Is pregnant woman alive?" changed to "${targetOption}".`);
            await driver.pause(1000);
        }
    }
}

// ── DEATH FIELDS ──

async function fillProbableCauseOfDeath(driver) {
    console.log('Processing Probable Cause of Death Dropdown...');
    await scrollToText(driver, "Reason for Death"); // Sometimes labeled "Probable Cause"

    const spinnerXPath = `//android.widget.Spinner[contains(@hint, "Death") or contains(@text, "Death")]`;
    const optionsList = ['ECLAMPSIA', 'HAEMORRHAGE', 'HIGH FEVER', 'ABORTION', 'Accident', 'OTHER', 'Other Maternal Death'];

    await clickSpinnerAndSelectOption(driver, spinnerXPath, PMSMA_FORM_DATA.causeOfDeath, optionsList);
}

async function fillDeathDate(driver) {
    console.log('Processing Date of Death...');
    await scrollToText(driver, "Date of death");

    const field = await driver.$('//android.widget.EditText[contains(@hint, "Date of death") or contains(@text, "Date of death")]');
    if (await field.isExisting() && await isEmpty(field, 'Date of death')) {
        await field.click();
        await driver.pause(1500);
        await pickDateFromCalendar(driver, PMSMA_FORM_DATA.deathDate);
        console.log('✔ Date of death filled successfully.');
    }
}

async function fillPlaceOfDeath(driver) {
    console.log('Processing Place of Death Dropdown...');
    await scrollToText(driver, "Place of Death");

    const spinnerXPath = `//android.widget.Spinner[contains(@text, "Place of Death") or contains(@hint, "Place of Death")]`;
    const optionsList = ['Home', 'Subcenter', 'PHC', 'CHC', 'District Hospital', 'Medical College Hospital', 'Private Hospital', 'In Transit', 'Other Place of Death'];

    await clickSpinnerAndSelectOption(driver, spinnerXPath, PMSMA_FORM_DATA.placeOfDeath, optionsList);
}

// ── HEALTH METRICS FIELDS ──

async function fillWeightAtRegistration(driver) {
    console.log('Processing Weight of PW (Kg)...');
    await scrollToText(driver, "Weight of PW");

    const field = await driver.$('//android.widget.EditText[contains(@hint, "Weight of PW")]');

    if (await field.isExisting() && await isEmpty(field, 'Weight of PW')) {
        await field.click();
        await driver.pause(500);
        await field.clearValue();
        await field.setValue(String(PMSMA_FORM_DATA.weightAtRegistration));
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    }
}

async function fillHasDelivered(driver) {
    console.log('Checking for "Has the pregnant woman delivered?" field...');
    await scrollToText(driver, "Has the pregnant woman delivered");

    const targetOption = PMSMA_FORM_DATA.hasDelivered;
    const radioXPath = `//android.widget.TextView[contains(@text, "delivered")]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${targetOption}"]`;
    const radioButton = await driver.$(radioXPath);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');
        if (isChecked !== 'true') {
            await radioButton.click();
            await driver.pause(1000);
        }
    }
}

async function fillBpSystolicDiastolic(driver) {
    console.log('Processing BP of PW – Systolic/ Diastolic (mm Hg)...');
    await scrollToText(driver, "BP of PW");

    const field = await driver.$('//android.widget.EditText[contains(@hint, "BP of PW") or contains(@text, "BP of PW")]');
    if (await field.isExisting() && await isEmpty(field, 'BP of PW')) {
        await field.click();
        await driver.pause(500);
        await field.clearValue();
        await field.setValue(String(PMSMA_FORM_DATA.bpSystolicDiastolic));
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    }
}

async function fillHbValue(driver) {
    console.log('Processing HB (gm/dl)...');
    await scrollToText(driver, "HB (gm/dl)");

    const field = await driver.$('//android.widget.EditText[contains(@hint, "HB (gm/dl)") or contains(@text, "HB (gm/dl)")]');
    if (await field.isExisting() && await isEmpty(field, 'HB (gm/dl)')) {
        await field.click();
        await driver.pause(500);
        await field.clearValue();
        await field.setValue(String(PMSMA_FORM_DATA.hbValue));
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    }
}

async function fillFundalHeight(driver) {
    if (PMSMA_FORM_DATA.isPregnantWomanAlive === 'No') return;

    console.log('Processing Fundal Height / Size of the Uterus weeks...');
    await scrollToText(driver, "Fundal Height");

    const field = await driver.$('//android.widget.EditText[contains(@text, "Fundal Height") or contains(@hint, "Fundal Height")]');

    if (await field.isExisting() && await isEmpty(field, 'Fundal Height')) {
        await field.click();
        await driver.pause(500);
        await field.clearValue();
        await field.setValue(String(PMSMA_FORM_DATA.fundalHeight));
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        console.log('✔ Fundal Height filled successfully.');
    }
}

// ── VACCINATION & SUPPLEMENT FIELDS ──

async function fillTdTt1stDose(driver) {
    if (!PMSMA_FORM_DATA.tdTt1stDoseDate) return;

    console.log('Processing Date of Td TT (1st Dose)...');
    await scrollToText(driver, "Td TT (1st Dose)");

    const field = await driver.$('//android.widget.EditText[contains(@hint, "Td TT (1st Dose)") or contains(@text, "Td TT (1st Dose)")]');
    if (await field.isExisting() && await isEmpty(field, 'Td TT (1st Dose)')) {
        const isClickable = await field.getAttribute('clickable');
        if (isClickable === 'false') return;
        await field.click();
        await driver.pause(1500);
        await pickDateFromCalendar(driver, PMSMA_FORM_DATA.tdTt1stDoseDate);
    }
}

async function fillTdTt2ndDose(driver) {
    if (!PMSMA_FORM_DATA.tdTt2ndDoseDate) return;

    console.log('Processing Date of Td TT (2nd Dose)...');
    await scrollToText(driver, "Td TT (2nd Dose)");

    const field = await driver.$('//android.widget.EditText[contains(@hint, "Td TT (2nd Dose)") or contains(@text, "Td TT (2nd Dose)")]');
    if (await field.isExisting() && await isEmpty(field, 'Td TT (2nd Dose)')) {
        const isClickable = await field.getAttribute('clickable');
        if (isClickable === 'false') return;
        await field.click();
        await driver.pause(1500);
        await pickDateFromCalendar(driver, PMSMA_FORM_DATA.tdTt2ndDoseDate);
    }
}

async function fillTdTtBoosterDose(driver) {
    if (!PMSMA_FORM_DATA.tdTtBoosterDate) return;

    console.log('Processing Date of Td TT (Booster Dose)...');
    await scrollToText(driver, "Td TT (Booster)");

    const field = await driver.$('//android.widget.EditText[contains(@hint, "Td TT (Booster") or contains(@text, "Td TT (Booster")]');
    if (await field.isExisting() && await isEmpty(field, 'Td TT (Booster')) {
        const isClickable = await field.getAttribute('clickable');
        if (isClickable === 'false') return;
        await field.click();
        await driver.pause(1500);
        await pickDateFromCalendar(driver, PMSMA_FORM_DATA.tdTtBoosterDate);
    }
}

async function fillFolicAcidTabsGiven(driver) {
    console.log('Processing No. of Folic Acid Tabs given...');
    await scrollToText(driver, "Folic Acid Tabs");

    const field = await driver.$('//android.widget.EditText[contains(@hint, "Folic Acid Tabs") or contains(@text, "Folic Acid Tabs")]');
    if (await field.isExisting() && await isEmpty(field, 'Folic Acid Tabs')) {
        await field.click();
        await driver.pause(500);
        await field.clearValue();
        await field.setValue(String(PMSMA_FORM_DATA.folicAcidTabsGiven));
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    }
}

async function fillIfaTabsGiven(driver) {
    console.log('Processing No. of IFA Tabs given...');
    await scrollToText(driver, "IFA Tabs given");

    const field = await driver.$('//android.widget.EditText[contains(@hint, "IFA Tabs") or contains(@text, "IFA Tabs")]');
    if (await field.isExisting() && await isEmpty(field, 'IFA Tabs')) {
        await field.click();
        await driver.pause(500);
        await field.clearValue();
        await field.setValue(String(PMSMA_FORM_DATA.ifaTabsGiven));
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    }
}

// ── HIGH RISK FIELDS ──

async function fillAnyHighRiskConditions(driver) {
    console.log('Checking for "Any High Risk conditions" field...');
    await scrollToText(driver, "Any High Risk conditions");

    const targetOption = PMSMA_FORM_DATA.anyHighRiskConditions;
    const radioXPath = `//android.widget.TextView[@text="Any High Risk conditions"]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${targetOption}"]`;
    const radioButton = await driver.$(radioXPath);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');
        if (isChecked !== 'true') {
            await radioButton.click();
            await driver.pause(1500);
        }
    }
}

async function fillHighRiskConditionDetails(driver) {
    console.log('Processing "High Risk Conditions" Dropdown...');
    const spinnerXPath = `//android.widget.Spinner[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown" and not(contains(@text, "Referral Facility")) and not(contains(@text, "Who had identified"))]`;
    const optionsList = [
        'NONE', 'HIGH BP (SYSTOLIC>=140 AND OR DIASTOLIC >=90mmHg)', 'CONVULSIONS',
        'VAGINAL BLEEDING', 'FOUL SMELLING DISCHARGE', 'SEVERE ANAEMIA (HB less than 7 gm/dl)',
        'DIABETES', 'TWINS', 'OTHER'
    ];
    await clickSpinnerAndSelectOption(driver, spinnerXPath, PMSMA_FORM_DATA.highRiskCondition, optionsList);
}

async function fillAnyOtherHighRiskCondition(driver) {
    console.log('Processing "Any other High Risk conditions" text field...');
    await scrollToText(driver, "Any other High Risk conditions");

    const fieldXPath = '//android.widget.EditText[contains(@hint, "Any other High Risk conditions") or contains(@text, "Any other High Risk conditions")]';
    const field = await driver.$(fieldXPath);

    if (await field.isExisting() && await isEmpty(field, 'Any other High Risk conditions')) {
        await field.click();
        await driver.pause(500);
        await field.clearValue();
        const uppercaseValue = PMSMA_FORM_DATA.otherHighRiskCondition.toUpperCase();
        await field.setValue(uppercaseValue);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    }
}

async function fillReferralFacility(driver) {
    console.log('Processing Referral Facility Dropdown...');
    const spinnerXPath = `//android.widget.Spinner[contains(@text, "Referral Facility") or contains(@hint, "Referral Facility")]`;
    const optionsList = ['Primary Health Centre', 'Community Health Centre', 'District Hospital', 'Other Private Hospital'];
    await clickSpinnerAndSelectOption(driver, spinnerXPath, PMSMA_FORM_DATA.referralFacility, optionsList);
}

async function fillIsHrpConfirmed(driver) {
    console.log('Checking for "Is HRP Confirmed?" field...');
    await scrollToText(driver, "Is HRP Confirmed?");

    const targetOption = PMSMA_FORM_DATA.isHrpConfirmed;
    const radioXPath = `//android.widget.TextView[@text="Is HRP Confirmed?"]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${targetOption}"]`;
    const radioButton = await driver.$(radioXPath);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');
        if (isChecked !== 'true') {
            await radioButton.click();
            await driver.pause(1000);
        }
    }
}

async function fillWhoIdentifiedAsHrp(driver) {
    console.log('Processing "Who had identified as HRP?" Dropdown...');
    const spinnerXPath = `//android.widget.Spinner[contains(@text, "Who had identified") or contains(@hint, "Who had identified")]`;
    const optionsList = ['ANM', 'CHO', 'PHC - MO', 'Specialist at Higher Facility'];
    await clickSpinnerAndSelectOption(driver, spinnerXPath, PMSMA_FORM_DATA.hrpIdentifier, optionsList);
}

// ── MCP CARD UPLOAD ──

async function fillFrontSideMcpCard(driver) {
    console.log('Processing Front Side MCP Card...');
    await scrollToText(driver, "Front Side");

    const addFileBtn = await driver.$('//android.widget.TextView[@text="Front Side"]/following-sibling::android.widget.ImageView[@content-desc="add file"]');
    if (await addFileBtn.isExisting()) {
        await addFileBtn.click();
        await driver.pause(1500);

        const pickFromGallery = await driver.$('//android.widget.TextView[@text="Pick from Gallery" or @text="Pick from gallery" or @text="Gallery" or @text="Choose from Gallery"]');
        if (await pickFromGallery.isExisting()) {
            await pickFromGallery.click();
        } else {
            await tapByCoords(driver, 540, 1400);
        }
        console.log('⏳ Waiting 20 seconds for gallery selection...');
        await driver.pause(20000);
    }
}

async function fillBackSideMcpCard(driver) {
    console.log('Processing Back Side MCP Card...');
    await scrollToText(driver, "Back Side");

    const addFileBtn = await driver.$('//android.widget.TextView[@text="Back Side"]/following-sibling::android.widget.ImageView[@content-desc="add file"]');
    if (await addFileBtn.isExisting()) {
        await addFileBtn.click();
        await driver.pause(1500);

        const pickFromGallery = await driver.$('//android.widget.TextView[@text="Pick from Gallery" or @text="Pick from gallery" or @text="Gallery" or @text="Choose from Gallery"]');
        if (await pickFromGallery.isExisting()) {
            await pickFromGallery.click();
        } else {
            await tapByCoords(driver, 540, 1400);
        }
        console.log('⏳ Waiting 20 seconds for gallery selection...');
        await driver.pause(20000);
    }
}

async function submitForm(driver) {
    console.log('Clicking Submit button...');
    await scrollToText(driver, "Submit");

    const submitBtn = await driver.$('//android.widget.Button[@text="Submit" and @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]');
    if (await submitBtn.isExisting()) {
        await submitBtn.click();
        console.log('✔ Submit button clicked successfully.');
        await driver.pause(2000);
    }
}

// ── REFACTORED MAIN FLOW ────────────────────────────────────────────────────────

async function fillPmsmaForm(driver) {
    console.log("--- Starting PMSMA Form Details ---");

    const isAbortionYes = PMSMA_FORM_DATA.abortionIfAny === 'Yes';
    const isAliveYes = PMSMA_FORM_DATA.isPregnantWomanAlive === 'Yes';

    // Top Level Basics
    await fillAncDate(driver);
    await fillAbortionIfAny(driver);
    await fillIsPregnantWomanAlive(driver);

    // Flow 1: If abortion is present and yes -> fill abortion details
    if (isAbortionYes) {
        await fillAbortionType(driver);
        await fillFacilityPlaceOfAbortion(driver);
        await fillAbortionDate(driver);
    }

    // Base condition: If pregnant woman is alive is yes -> fill ANC period
    if (isAliveYes) {
        await fillAncPeriod(driver);
    }

    // ── Evaluating Strict Combinations ── //

    if (!isAbortionYes && !isAliveYes) {
        // Combination: Abortion=No, Alive=No -> fill reason for death, place of death, anc period
        await fillProbableCauseOfDeath(driver);
        await fillDeathDate(driver);
        await fillPlaceOfDeath(driver);
        await fillAncPeriod(driver);
    }
    else if (isAbortionYes && !isAliveYes) {
        // Combination: Abortion=Yes, Alive=No -> fill abortion type, facility, abortion date (handled above)
        // AND reason for death, date of death, place of death, anc
        await fillProbableCauseOfDeath(driver);
        await fillDeathDate(driver);
        await fillPlaceOfDeath(driver);
        await fillAncPeriod(driver);
    }
    else if (!isAbortionYes && isAliveYes) {
        // Combination: Abortion=No, Alive=Yes -> fill health metrics, supplements, hrp, etc.
        await fillWeightAtRegistration(driver);
        await fillBpSystolicDiastolic(driver);
        await fillHbValue(driver);
        await fillFundalHeight(driver);

        await fillTdTt1stDose(driver);
        await fillTdTt2ndDose(driver);

        await fillFolicAcidTabsGiven(driver);
        await fillIfaTabsGiven(driver);

        await fillAnyHighRiskConditions(driver);
        if (PMSMA_FORM_DATA.anyHighRiskConditions === 'Yes') {
            await fillHighRiskConditionDetails(driver);
            await fillAnyOtherHighRiskCondition(driver);
            await fillReferralFacility(driver);
        }

        await fillIsHrpConfirmed(driver);
        if (PMSMA_FORM_DATA.isHrpConfirmed === 'Yes') {
            await fillWhoIdentifiedAsHrp(driver);
        }

        await fillHasDelivered(driver);
        await fillFrontSideMcpCard(driver);
        await fillBackSideMcpCard(driver);
    }

    await submitForm(driver);
    console.log("--- Finished PMSMA Form Details ---");
}

module.exports = { fillPmsmaForm };