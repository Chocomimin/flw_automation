const { remote } = require('webdriverio');

// ── Configuration & Data ──────────────────────────────────────────────────────

const PMSMA_FORM_DATA = {
    ancDate: { day: 26, month: 10, year: 2025 },
    ancPeriod: '3',
    abortionIfAny: 'No',
    abortionType: 'Spontaneous',
    facility: 'District Hospital',
    abortionDate: { day: 10, month: 6, year: 2025 },
    maternalDeath: 'No',
    causeOfDeath: 'ABORTION',
    deathDate: { day: 2, month: 7, year: 2025 },
    placeOfDeath: 'District Hospital',
    fundalHeight: '28',
    weightAtRegistration: '55',
    hasDelivered: 'Yes',
    bpSystolicDiastolic: '120/80',
    hbValue: '11.5',
    ifaTabsGiven: '90',
    anyHighRiskConditions: 'Yes',
    highRiskCondition: 'OTHER',
    otherHighRiskCondition: 'Severe Asthma',
    referralFacility: 'District Hospital',
    isHrpConfirmed: 'Yes',
    hrpIdentifier: 'PHC - MO'
};

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

const ABORTION_TYPE_COORDS = {
    'Induced': { x: 500, y: 1350 },
    'Spontaneous': { x: 500, y: 1415 },
    'Incomplete': { x: 500, y: 1480 }
};

const ANC_PERIOD_COORDS = {
    '2': { x: 500, y: 1000 },
    '3': { x: 500, y: 1100 },
    '4': { x: 500, y: 1200 },
    '5': { x: 500, y: 1300 },
    '6': { x: 500, y: 1400 },
    '7': { x: 500, y: 1500 },
    '8': { x: 500, y: 1600 },
    '9': { x: 500, y: 1700 }
};

const FACILITY_COORDS = {
    'Home': { x: 500, y: 350 },
    'Subcenter': { x: 500, y: 450 },
    'PHC': { x: 500, y: 550 },
    'CHC': { x: 500, y: 650 },
    'District Hospital': { x: 500, y: 750 },
    'Medical College Hospital': { x: 500, y: 850 },
    'Private Hospital': { x: 500, y: 950 },
    'In Transit': { x: 500, y: 1050 },
    'Other Place of Abortion': { x: 500, y: 1150 }
};

const CAUSE_OF_DEATH_COORDS = {
    'ECLAMPSIA': { x: 500, y: 1170 },
    'HAEMORRHAGE': { x: 500, y: 1275 },
    'HIGH FEVER': { x: 500, y: 1380 },
    'ABORTION': { x: 500, y: 1485 },
    'Accident': { x: 500, y: 1590 },
    'OTHER': { x: 500, y: 1695 }
};

const CAUSE_OF_DEATH_COORDS_NO_ABORTION = {
    'ECLAMPSIA': { x: 500, y: 1320 },
    'HAEMORRHAGE': { x: 500, y: 1425 },
    'HIGH FEVER': { x: 500, y: 1530 },
    'ABORTION': { x: 500, y: 1635 },
    'Accident': { x: 500, y: 1740 },
    'OTHER': { x: 500, y: 1845 }
};

const CAUSE_OF_DEATH_COORDS_ABORTION_NO_VALUE = {
    'ECLAMPSIA': { x: 500, y: 1450 },
    'HAEMORRHAGE': { x: 500, y: 1550 },
    'HIGH FEVER': { x: 500, y: 1650 },
    'ABORTION': { x: 500, y: 1750 },
    'Accident': { x: 500, y: 1850 },
    'OTHER': { x: 500, y: 1950 }
};

const PLACE_OF_DEATH_COORDS = {
    'Home':                     { x: 500, y: 240 },
    'Subcenter':                { x: 500, y: 330 },
    'PHC':                      { x: 500, y: 420 },
    'CHC':                      { x: 500, y: 510 },
    'District Hospital':        { x: 500, y: 600 },
    'Medical College Hospital': { x: 500, y: 690 },
    'Private Hospital':         { x: 500, y: 780 },
    'In Transit':               { x: 500, y: 870 },
    'Other Place of Death':     { x: 500, y: 960 }
};

const PLACE_OF_DEATH_COORDS_ABORTION_NO = {
    'Home':                     { x: 500, y: 295 },
    'Subcenter':                { x: 500, y: 390 },
    'PHC':                      { x: 500, y: 485 },
    'CHC':                      { x: 500, y: 580 },
    'District Hospital':        { x: 500, y: 675 },
    'Medical College Hospital': { x: 500, y: 770 },
    'Private Hospital':         { x: 500, y: 865 },
    'In Transit':               { x: 500, y: 960 },
    'Other Place of Death':     { x: 500, y: 1055 }
};

const PLACE_OF_DEATH_COORDS_ABORTION_YES = {
    'Home':                     { x: 500, y: 1180 },
    'Subcenter':                { x: 500, y: 1280 },
    'PHC':                      { x: 500, y: 1380 },
    'CHC':                      { x: 500, y: 1480 },
    'District Hospital':        { x: 500, y: 1580 },
    'Medical College Hospital': { x: 500, y: 1680 },
    'Private Hospital':         { x: 500, y: 1780 },
    'In Transit':               { x: 500, y: 1880 },
    'Other Place of Death':     { x: 500, y: 1980 }
};

const REFERRAL_FACILITY_COORDS = {
    'Primary Health Centre':    { x: 540, y: 1720 },
    'Community Health Centre':  { x: 540, y: 1840 },
    'District Hospital':        { x: 540, y: 1960 },
    'Other Private Hospital':   { x: 540, y: 2080 }
};

const HRP_COORDS = {
    'ANM':                           { x: 540, y: 1550 },
    'CHO':                           { x: 540, y: 1680 },
    'PHC - MO':                      { x: 540, y: 1810 },
    'Specialist at Higher Facility': { x: 540, y: 1940 }
};

const HIGH_RISK_CONDITION_COORDS = {
    'NONE':                                               { x: 540, y: 540 },
    'HIGH BP (SYSTOLIC>=140 AND OR DIASTOLIC >=90mmHg)':  { x: 540, y: 640 },
    'CONVULSIONS':                                        { x: 540, y: 745 },
    'VAGINAL BLEEDING':                                   { x: 540, y: 845 },
    'FOUL SMELLING DISCHARGE':                            { x: 540, y: 945 },
    'SEVERE ANAEMIA (HB less than 7 gm/dl)':              { x: 540, y: 1045 },
    'DIABETES':                                           { x: 540, y: 1150 },
    'TWINS':                                              { x: 540, y: 1250 },
    'OTHER':                                              { x: 540, y: 1350 }
};

// Use this when "High Risk Conditions" IS "OTHER" (the text box pushes the UI down)
const REFERRAL_FACILITY_COORDS_OTHER_YES = {
    'Primary Health Centre':    { x: 540, y: 1730 },
    'Community Health Centre':  { x: 540, y: 1840 },
    'District Hospital':        { x: 540, y: 1950 },
    'Other Private Hospital':   { x: 540, y: 2060 }
};

// ── Helper Functions ──────────────────────────────────────────────────────────

async function tapAt(driver, x, y) {
    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x, y },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerUp', button: 0 },
        ],
    }]);
    await driver.releaseActions();
}

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

async function scrollDownToText(driver, text, maxScrolls = 3) {
    const elementXPath = `//*[contains(@text, "${text}") or contains(@hint, "${text}")]`;
    for (let i = 0; i < maxScrolls; i++) {
        try {
            const element = await driver.$(elementXPath);
            if ((await element.isExisting()) && (await element.isDisplayed())) {
                return;
            }
        } catch (e) { }
        await scrollDown(driver);
    }
}

async function scrollUpToText(driver, text, maxScrolls = 2) {
    const elementXPath = `//*[contains(@text, "${text}") or contains(@hint, "${text}")]`;
    for (let i = 0; i < maxScrolls; i++) {
        try {
            const element = await driver.$(elementXPath);
            if ((await element.isExisting()) && (await element.isDisplayed())) {
                return;
            }
        } catch (e) { }

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
}

async function isEmpty(field, hintText) {
    try {
        const text = await field.getText();
        return !text || text.trim() === '' || text.trim() === hintText.trim();
    } catch { return true; }
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
    const field = await driver.$('//android.widget.EditText[contains(@hint, "ANC Date")]');
    await field.waitForDisplayed({ timeout: 10000 });

    if (await isEmpty(field, 'ANC Date *')) {
        await field.click();
        await driver.pause(1500);
        await pickDateFromCalendar(driver, PMSMA_FORM_DATA.ancDate);
        console.log('✔ ANC Date filled successfully.');
    } else {
        console.log('➡ ANC Date is already filled.');
    }
}

async function fillAncPeriod(driver) {
    console.log('Processing ANC Period Dropdown...');
    await scrollDownToText(driver, "ANC Period", 2);

    const spinnerXPath = `//android.widget.Spinner[contains(@hint, "ANC Period")]`;
    const spinner = await driver.$(spinnerXPath);

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();
        if (currentText !== PMSMA_FORM_DATA.ancPeriod) {
            const arrowXPath = `${spinnerXPath}/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            if (await dropdownArrow.isExisting()) {
                await dropdownArrow.click();
                await driver.pause(1000);

                if (await driver.isKeyboardShown()) {
                    await driver.hideKeyboard();
                    await driver.pause(1000);
                    await dropdownArrow.click();
                    await driver.pause(1500);
                } else {
                    await driver.pause(500);
                }

                const coords = ANC_PERIOD_COORDS[PMSMA_FORM_DATA.ancPeriod];
                if (coords) {
                    await tapAt(driver, coords.x, coords.y);
                    console.log(`✔ "ANC Period" updated to "${PMSMA_FORM_DATA.ancPeriod}".`);
                } else {
                    console.error(`❌ Option "${PMSMA_FORM_DATA.ancPeriod}" not found in coordinate map.`);
                }
            } else {
                console.error('❌ Could not find the dropdown arrow for "ANC Period".');
            }
        } else {
            console.log(`➡ "ANC Period" is already set to "${PMSMA_FORM_DATA.ancPeriod}".`);
        }
    } else {
        console.error('❌ Could not find "ANC Period" dropdown field.');
    }
}

async function fillAbortionIfAny(driver) {
    console.log('Checking for "Abortion If Any" field...');
    await scrollDownToText(driver, "Abortion If Any", 2);

    const targetOption = PMSMA_FORM_DATA.abortionIfAny;
    const radioXPath = `//android.widget.TextView[@text="Abortion If Any"]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${targetOption}"]`;
    const radioButton = await driver.$(radioXPath);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');
        if (isChecked !== 'true') {
            await radioButton.click();
            console.log(`✔ "Abortion If Any" changed to "${targetOption}".`);
            await driver.pause(1000);
        } else {
            console.log(`➡ "Abortion If Any" is already set to "${targetOption}". No action taken.`);
        }
    } else {
        console.log('ℹ "Abortion If Any" field is not present on this screen. skipping.');
    }
}

async function fillAbortionType(driver) {
    console.log('Processing Abortion Type Dropdown...');
    if (PMSMA_FORM_DATA.abortionIfAny !== 'Yes') {
        console.log('➡ "Abortion If Any" is not Yes. Skipping Abortion Type.');
        return;
    }

    await scrollDownToText(driver, "Abortion Type", 2);
    const spinnerXPath = `//android.widget.Spinner[contains(@hint, "Abortion Type") or contains(@text, "Abortion Type")]`;
    const spinner = await driver.$(spinnerXPath);

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();
        if (currentText !== PMSMA_FORM_DATA.abortionType) {
            const arrowXPath = `${spinnerXPath}/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            if (await dropdownArrow.isExisting()) {
                await dropdownArrow.click();
            } else {
                await spinner.click();
            }
            await driver.pause(1000);

            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
                await driver.pause(1000);
                await spinner.click();
                await driver.pause(1500);
            } else {
                await driver.pause(500);
            }

            const coords = ABORTION_TYPE_COORDS[PMSMA_FORM_DATA.abortionType];
            if (coords) {
                await tapAt(driver, coords.x, coords.y);
                console.log(`✔ "Abortion Type" updated to "${PMSMA_FORM_DATA.abortionType}".`);
            } else {
                console.error(`❌ Option "${PMSMA_FORM_DATA.abortionType}" not found in coordinate map.`);
            }
        } else {
            console.log(`➡ "Abortion Type" is already set to "${PMSMA_FORM_DATA.abortionType}".`);
        }
    } else {
        console.error('❌ Could not find "Abortion Type" dropdown field.');
    }
}

async function fillFacilityPlaceOfAbortion(driver) {
    console.log('Processing Facility Dropdown...');
    if (PMSMA_FORM_DATA.abortionIfAny !== 'Yes') {
        console.log('➡ "Abortion If Any" is not Yes. Skipping Facility Dropdown.');
        return;
    }

    await scrollDownToText(driver, "Facility", 2);
    const spinnerXPath = `//android.widget.Spinner[contains(@hint, "Facility") or contains(@text, "Facility")]`;
    const spinner = await driver.$(spinnerXPath);

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();
        if (currentText !== PMSMA_FORM_DATA.facility) {
            const arrowXPath = `${spinnerXPath}/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            if (await dropdownArrow.isExisting()) {
                await dropdownArrow.click();
            } else {
                await spinner.click();
            }
            await driver.pause(1500);

            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
                await driver.pause(1000);
                await spinner.click();
                await driver.pause(1500);
            }

            const coords = FACILITY_COORDS[PMSMA_FORM_DATA.facility];
            if (coords) {
                await tapAt(driver, coords.x, coords.y);
                console.log(`✔ "Facility" updated to "${PMSMA_FORM_DATA.facility}".`);
            } else {
                console.error(`❌ Option "${PMSMA_FORM_DATA.facility}" not found in coordinate map.`);
            }
        } else {
            console.log(`➡ "Facility" is already set to "${PMSMA_FORM_DATA.facility}".`);
        }
    } else {
        console.error('❌ Could not find "Facility" dropdown field.');
    }
}

async function fillAbortionDate(driver) {
    console.log('Processing Abortion Date...');
    if (PMSMA_FORM_DATA.abortionIfAny !== 'Yes') {
        console.log('➡ "Abortion If Any" is not Yes. Skipping Abortion Date.');
        return;
    }

    await scrollDownToText(driver, "Abortion Date", 2);
    const field = await driver.$('//android.widget.EditText[contains(@hint, "Abortion Date")]');
    await field.waitForDisplayed({ timeout: 5000 }).catch(() => null);

    if (await field.isExisting()) {
        if (await isEmpty(field, 'Abortion Date *')) {
            await field.click();
            await driver.pause(1500);
            await pickDateFromCalendar(driver, PMSMA_FORM_DATA.abortionDate);
            console.log('✔ Abortion Date filled successfully.');
        } else {
            console.log('➡ Abortion Date is already filled.');
        }
    } else {
        console.error('❌ Could not find "Abortion Date" field.');
    }
}

async function fillMaternalDeath(driver) {
    console.log('Checking for "Maternal Death" field...');
    await scrollUpToText(driver, "Maternal Death", 2);
    await scrollDownToText(driver, "Maternal Death", 5);

    const targetOption = PMSMA_FORM_DATA.maternalDeath;
    const radioXPath = `//android.widget.TextView[@text="Maternal Death"]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${targetOption}"]`;
    const radioButton = await driver.$(radioXPath);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');
        if (isChecked !== 'true') {
            await radioButton.click();
            console.log(`✔ "Maternal Death" changed to "${targetOption}".`);
            await driver.pause(1000);
        } else {
            console.log(`➡ "Maternal Death" is already set to "${targetOption}". No action taken.`);
        }
    } else {
        console.log('ℹ "Maternal Death" field is not present on this screen. Skipping.');
    }
}

async function fillProbableCauseOfDeath(driver) {
    console.log('Processing Probable Cause of Death Dropdown...');

    if (PMSMA_FORM_DATA.maternalDeath !== 'Yes') {
        console.log('➡ "Maternal Death" is not Yes. Skipping Probable Cause of Death.');
        return;
    }

    await scrollUpToText(driver, "Abortion If Any", 2);

    const abortionText = await driver.$('//*[contains(@text, "Abortion If Any")]');
    let currentCoordsMap;

    if (!(await abortionText.isExisting())) {
        console.log('➡ "Abortion If Any" is entirely MISSING. Using NO_ABORTION coordinates.');
        currentCoordsMap = CAUSE_OF_DEATH_COORDS_NO_ABORTION;
    } else {
        if (PMSMA_FORM_DATA.abortionIfAny === 'Yes') {
            console.log('➡ "Abortion If Any" is YES. Using standard coordinates.');
            currentCoordsMap = CAUSE_OF_DEATH_COORDS;
        } else {
            console.log('➡ "Abortion If Any" is NO. Using shifted coordinates.');
            currentCoordsMap = CAUSE_OF_DEATH_COORDS_ABORTION_NO_VALUE;
        }
    }

    await scrollDownToText(driver, "Probable Cause of Death", 3);

    const spinnerXPath = `//android.widget.Spinner[contains(@hint, "Probable Cause of Death") or contains(@text, "Probable Cause of Death")]`;
    const spinner = await driver.$(spinnerXPath);

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();

        if (currentText !== PMSMA_FORM_DATA.causeOfDeath) {
            const arrowXPath = `${spinnerXPath}/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            if (await dropdownArrow.isExisting()) {
                await dropdownArrow.click();
            } else {
                await spinner.click();
            }

            await driver.pause(1500);

            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
                await driver.pause(1000);
                await spinner.click();
                await driver.pause(1500);
            }

            const coords = currentCoordsMap[PMSMA_FORM_DATA.causeOfDeath];
            if (coords) {
                await tapAt(driver, coords.x, coords.y);
                console.log(`✔ "Probable Cause of Death" updated to "${PMSMA_FORM_DATA.causeOfDeath}".`);
            } else {
                console.error(`❌ Option "${PMSMA_FORM_DATA.causeOfDeath}" not found in coordinate map.`);
            }
        } else {
            console.log(`➡ "Probable Cause of Death" is already set to "${PMSMA_FORM_DATA.causeOfDeath}".`);
        }
    } else {
        console.error('❌ Could not find "Probable Cause of Death" dropdown field.');
    }
}

async function fillDeathDate(driver) {
    console.log('Processing Death Date...');

    if (PMSMA_FORM_DATA.maternalDeath !== 'Yes') {
        console.log('➡ "Maternal Death" is not Yes. Skipping Death Date.');
        return;
    }

    await scrollDownToText(driver, "Death Date", 3);

    const field = await driver.$('//android.widget.EditText[contains(@hint, "Death Date")]');
    await field.waitForDisplayed({ timeout: 5000 }).catch(() => null);

    if (await field.isExisting()) {
        if (await isEmpty(field, 'Death Date *')) {
            await field.click();
            await driver.pause(1500);
            await pickDateFromCalendar(driver, PMSMA_FORM_DATA.deathDate);
            console.log('✔ Death Date filled successfully.');
        } else {
            console.log('➡ Death Date is already filled.');
        }
    } else {
        console.error('❌ Could not find "Death Date" field.');
    }
}

async function fillPlaceOfDeath(driver) {
    console.log('Processing Place of Death Dropdown...');

    if (PMSMA_FORM_DATA.maternalDeath !== 'Yes') {
        console.log('➡ "Maternal Death" is not Yes. Skipping Place of Death.');
        return;
    }

    await scrollUpToText(driver, "Abortion If Any", 2);

    let currentCoordsMap;
    if (PMSMA_FORM_DATA.abortionIfAny === 'Yes') {
        console.log('➡ Abortion is YES. Using ABORTION_YES layout map.');
        currentCoordsMap = PLACE_OF_DEATH_COORDS_ABORTION_YES;
    } else {
        const abortionText = await driver.$('//*[contains(@text, "Abortion If Any")]');
        if (!(await abortionText.isExisting())) {
            console.log('➡ Abortion field missing. Using NO_ABORTION layout.');
            currentCoordsMap = PLACE_OF_DEATH_COORDS;
        } else {
            console.log('➡ Abortion is NO. Using ABORTION_NO layout map.');
            currentCoordsMap = PLACE_OF_DEATH_COORDS_ABORTION_NO;
        }
    }

    await scrollDownToText(driver, "Place of Death", 3);
    const spinnerXPath = `//android.widget.Spinner[contains(@text, "Place of Death") or contains(@hint, "Place of Death")]`;
    const spinner = await driver.$(spinnerXPath);

    if (await spinner.isExisting()) {
        const arrowXPath = `${spinnerXPath}/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
        const dropdownArrow = await driver.$(arrowXPath);

        await (await dropdownArrow.isExisting() ? dropdownArrow : spinner).click();
        await driver.pause(1500);

        const targetFacility = PMSMA_FORM_DATA.placeOfDeath || PMSMA_FORM_DATA.facility;
        const coords = currentCoordsMap[targetFacility];

        if (coords) {
            await tapAt(driver, coords.x, coords.y);
            console.log(`✔ "Place of Death" updated to "${targetFacility}".`);
        } else {
            console.error(`❌ Option "${targetFacility}" not found in selected map.`);
        }
    }
}

async function fillFundalHeight(driver) {
    console.log('Processing Fundal Height / Size of the Uterus weeks...');
    await scrollDownToText(driver, "Fundal Height", 3);

    const field = await driver.$('//android.widget.EditText[contains(@hint, "Fundal Height / Size of the Uterus weeks")]');
    await field.waitForDisplayed({ timeout: 5000 }).catch(() => null);

    if (await field.isExisting()) {
        const currentText = await field.getText();
        const hintText = 'Fundal Height / Size of the Uterus weeks';
        if (!currentText || currentText.trim() === '' || currentText.trim() === hintText) {
            await field.click();
            await driver.pause(500);
            await field.clearValue();
            await field.setValue(String(PMSMA_FORM_DATA.fundalHeight));
            await driver.pause(500);
            if (await driver.isKeyboardShown()) await driver.hideKeyboard();
            console.log('✔ Fundal Height filled successfully.');
        } else {
            console.log(`➡ Fundal Height is already filled with: ${currentText}`);
        }
    } else {
        console.error('❌ Could not find "Fundal Height / Size of the Uterus weeks" field.');
    }
}

async function fillWeightAtRegistration(driver) {
    console.log('Processing Weight of PW (Kg) at time Registration...');

    if (PMSMA_FORM_DATA.maternalDeath !== 'No') {
        console.log('➡ "Maternal Death" is not No. Skipping Weight at Registration.');
        return;
    }

    await scrollDownToText(driver, "Weight of PW", 3);

    const field = await driver.$('//android.widget.EditText[contains(@hint, "Weight of PW (Kg) at time Registration")]');
    await field.waitForDisplayed({ timeout: 5000 }).catch(() => null);

    if (await field.isExisting()) {
        const currentText = await field.getText();
        const hintText = 'Weight of PW (Kg) at time Registration';
        if (!currentText || currentText.trim() === '' || currentText.trim() === hintText) {
            await field.click();
            await driver.pause(500);
            await field.clearValue();
            await field.setValue(String(PMSMA_FORM_DATA.weightAtRegistration));
            await driver.pause(500);
            if (await driver.isKeyboardShown()) await driver.hideKeyboard();
            console.log('✔ Weight at Registration filled successfully.');
        } else {
            console.log(`➡ Weight at Registration is already filled with: ${currentText}`);
        }
    } else {
        console.error('❌ Could not find "Weight of PW (Kg) at time Registration" field.');
    }
}

async function fillHasDelivered(driver) {
    console.log('Checking for "Has the pregnant woman delivered?" field...');

    if (PMSMA_FORM_DATA.maternalDeath !== 'No') {
        console.log('➡ "Maternal Death" is not No. Skipping "Has the pregnant woman delivered?"');
        return;
    }

    await scrollDownToText(driver, "Has the pregnant woman delivered", 3);

    const targetOption = PMSMA_FORM_DATA.hasDelivered;
    const radioXPath = `//android.widget.TextView[@text="Has the pregnant woman delivered?"]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${targetOption}"]`;
    const radioButton = await driver.$(radioXPath);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');
        if (isChecked !== 'true') {
            await radioButton.click();
            console.log(`✔ "Has the pregnant woman delivered?" changed to "${targetOption}".`);
            await driver.pause(1000);
        } else {
            console.log(`➡ "Has the pregnant woman delivered?" is already set to "${targetOption}". No action taken.`);
        }
    } else {
        console.log('ℹ "Has the pregnant woman delivered?" field is not present on this screen. Skipping.');
    }
}

async function fillBpSystolicDiastolic(driver) {
    console.log('Processing BP of PW – Systolic/ Diastolic (mm Hg)...');

    if (PMSMA_FORM_DATA.maternalDeath !== 'No') {
        console.log('➡ "Maternal Death" is not No. Skipping BP field.');
        return;
    }

    await scrollDownToText(driver, "BP of PW", 3);

    const field = await driver.$('//android.widget.EditText[contains(@hint, "BP of PW")]');
    await field.waitForDisplayed({ timeout: 5000 }).catch(() => null);

    if (await field.isExisting()) {
        const currentText = await field.getText();
        const hintText = 'BP of PW – Systolic/ Diastolic (mm Hg) ';
        if (!currentText || currentText.trim() === '' || currentText.trim() === hintText.trim()) {
            await field.click();
            await driver.pause(500);
            await field.clearValue();
            await field.setValue(String(PMSMA_FORM_DATA.bpSystolicDiastolic));
            await driver.pause(500);
            if (await driver.isKeyboardShown()) await driver.hideKeyboard();
            console.log('✔ BP Systolic/Diastolic filled successfully.');
        } else {
            console.log(`➡ BP field is already filled with: ${currentText}`);
        }
    } else {
        console.error('❌ Could not find "BP of PW – Systolic/ Diastolic (mm Hg)" field.');
    }
}

async function fillHbValue(driver) {
    console.log('Processing HB (gm/dl)...');

    if (PMSMA_FORM_DATA.maternalDeath !== 'No') {
        console.log('➡ "Maternal Death" is not No. Skipping HB field.');
        return;
    }

    await scrollDownToText(driver, "HB (gm/dl)", 3);

    const field = await driver.$('//android.widget.EditText[contains(@hint, "HB (gm/dl)")]');
    await field.waitForDisplayed({ timeout: 5000 }).catch(() => null);

    if (await field.isExisting()) {
        const currentText = await field.getText();
        const hintText = 'HB (gm/dl)';
        if (!currentText || currentText.trim() === '' || currentText.trim() === hintText) {
            await field.click();
            await driver.pause(500);
            await field.clearValue();
            await field.setValue(String(PMSMA_FORM_DATA.hbValue));
            await driver.pause(500);
            if (await driver.isKeyboardShown()) await driver.hideKeyboard();
            console.log('✔ HB (gm/dl) filled successfully.');
        } else {
            console.log(`➡ HB field is already filled with: ${currentText}`);
        }
    } else {
        console.error('❌ Could not find "HB (gm/dl)" field.');
    }
}

async function fillIfaTabsGiven(driver) {
    console.log('Processing No. of IFA Tabs given...');

    if (PMSMA_FORM_DATA.maternalDeath !== 'No') {
        console.log('➡ "Maternal Death" is not No. Skipping IFA Tabs field.');
        return;
    }

    await scrollDownToText(driver, "No. of IFA Tabs given", 3);

    const field = await driver.$('//android.widget.EditText[contains(@hint, "No. of IFA Tabs given")]');
    await field.waitForDisplayed({ timeout: 5000 }).catch(() => null);

    if (await field.isExisting()) {
        const currentText = await field.getText();
        const hintText = 'No. of IFA Tabs given';
        if (!currentText || currentText.trim() === '' || currentText.trim() === hintText) {
            await field.click();
            await driver.pause(500);
            await field.clearValue();
            await field.setValue(String(PMSMA_FORM_DATA.ifaTabsGiven));
            await driver.pause(500);
            if (await driver.isKeyboardShown()) await driver.hideKeyboard();
            console.log('✔ No. of IFA Tabs given filled successfully.');
        } else {
            console.log(`➡ IFA Tabs field is already filled with: ${currentText}`);
        }
    } else {
        console.error('❌ Could not find "No. of IFA Tabs given" field.');
    }
}

// ── UPDATED: Scrolls down after selecting Yes to reveal new fields ─────────────
async function fillAnyHighRiskConditions(driver) {
    console.log('Checking for "Any High Risk conditions" field...');

    if (PMSMA_FORM_DATA.maternalDeath !== 'No') {
        console.log('➡ "Maternal Death" is not No. Skipping Any High Risk conditions.');
        return;
    }

    await scrollDownToText(driver, "Any High Risk conditions", 3);

    const targetOption = PMSMA_FORM_DATA.anyHighRiskConditions;
    const radioXPath = `//android.widget.TextView[@text="Any High Risk conditions"]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${targetOption}"]`;
    const radioButton = await driver.$(radioXPath);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');
        if (isChecked !== 'true') {
            await radioButton.click();
            console.log(`✔ "Any High Risk conditions" changed to "${targetOption}".`);
            await driver.pause(1500);
        } else {
            console.log(`➡ "Any High Risk conditions" is already set to "${targetOption}". No action taken.`);
        }

        // ✅ Scroll down after selecting Yes to reveal newly appeared fields
        if (targetOption === 'Yes') {
            console.log('⬇ Scrolling down to reveal High Risk condition fields...');
            await scrollDown(driver);
        }
    } else {
        console.log('ℹ "Any High Risk conditions" field is not present on this screen. Skipping.');
    }
}

async function fillHighRiskConditionDetails(driver) {
    console.log('Processing "High Risk Conditions" Dropdown...');

    if (PMSMA_FORM_DATA.anyHighRiskConditions !== 'Yes') {
        console.log('➡ "Any High Risk conditions" is not Yes. Skipping Condition Details.');
        return;
    }

    await scrollDownToText(driver, "High Risk Conditions", 5);
    await driver.pause(500);

    const spinnerXPath = `//android.widget.Spinner[contains(@text, "High Risk") or contains(@hint, "High Risk") or contains(@text, "NONE")]`;
    const spinner = await driver.$(spinnerXPath);

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();

        if (currentText !== PMSMA_FORM_DATA.highRiskCondition) {
            const arrowXPath = `${spinnerXPath}/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            // Open the dropdown
            if (await dropdownArrow.isExisting()) {
                await dropdownArrow.click();
            } else {
                await spinner.click();
            }
            await driver.pause(1500);

            // Handle keyboard obstructing the view
            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
                await driver.pause(1000);
                await spinner.click();
                await driver.pause(1500);
            }

            // Tap the coordinate for the targeted condition
            const targetCondition = PMSMA_FORM_DATA.highRiskCondition;
            const coords = HIGH_RISK_CONDITION_COORDS[targetCondition];

            if (coords) {
                await tapAt(driver, coords.x, coords.y);
                console.log(`✔ "High Risk Conditions" updated to "${targetCondition}".`);
                await driver.pause(1000);

                // Scroll down after selecting condition to reveal next fields
                console.log('⬇ Scrolling down after High Risk Condition selection...');
                await scrollDown(driver);

            } else {
                console.error(`❌ Option "${targetCondition}" not found in coordinate map.`);
            }
        } else {
            console.log(`➡ "High Risk Conditions" is already set to "${PMSMA_FORM_DATA.highRiskCondition}".`);
        }
    } else {
        console.log('ℹ "High Risk Conditions" dropdown is not present on this screen. Skipping.');
    }
}

async function fillReferralFacility(driver) {
    console.log('Processing Referral Facility Dropdown...');

    if (PMSMA_FORM_DATA.maternalDeath !== 'No') {
        console.log('➡ "Maternal Death" is not No. Skipping Referral Facility.');
        return;
    }

    await scrollDownToText(driver, "Referral Facility", 3);

    // ✅ Decide which coordinate map to use based on the presence of the "OTHER" field
    let currentCoordsMap;
    if (PMSMA_FORM_DATA.anyHighRiskConditions === 'Yes' && PMSMA_FORM_DATA.highRiskCondition === 'OTHER') {
        console.log('➡ "OTHER" High Risk Condition is present. Using shifted coordinates for Referral Facility.');
        currentCoordsMap = REFERRAL_FACILITY_COORDS_OTHER_YES;
    } else {
        console.log('➡ Using standard coordinates for Referral Facility.');
        currentCoordsMap = REFERRAL_FACILITY_COORDS;
    }

    const spinnerXPath = `//android.widget.Spinner[contains(@hint, "Referral Facility") or contains(@text, "Referral Facility")]`;
    const spinner = await driver.$(spinnerXPath);

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();

        if (!currentText || currentText.trim() === '' || currentText.trim() === 'Referral Facility') {
            const arrowXPath = `${spinnerXPath}/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            if (await dropdownArrow.isExisting()) {
                await dropdownArrow.click();
            } else {
                await spinner.click();
            }
            await driver.pause(1500);

            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
                await driver.pause(1000);
                await spinner.click();
                await driver.pause(1500);
            }

            // ✅ Use the dynamically selected map
            const coords = currentCoordsMap[PMSMA_FORM_DATA.referralFacility];

            if (coords) {
                await tapAt(driver, coords.x, coords.y);
                console.log(`✔ "Referral Facility" updated to "${PMSMA_FORM_DATA.referralFacility}".`);
            } else {
                console.error(`❌ Option "${PMSMA_FORM_DATA.referralFacility}" not found in coordinate map.`);
            }
        } else {
            console.log(`➡ "Referral Facility" is already set to "${currentText}".`);
        }
    } else {
        console.log('ℹ "Referral Facility" dropdown is not present on this screen. Skipping.');
    }
}

async function fillIsHrpConfirmed(driver) {
    console.log('Checking for "Is HRP Confirmed?" field...');

    if (PMSMA_FORM_DATA.maternalDeath !== 'No') {
        console.log('➡ "Maternal Death" is not No. Skipping "Is HRP Confirmed?"');
        return;
    }

    await scrollDownToText(driver, "Is HRP Confirmed?", 3);

    const targetOption = PMSMA_FORM_DATA.isHrpConfirmed;
    const radioXPath = `//android.widget.TextView[@text="Is HRP Confirmed?"]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${targetOption}"]`;
    const radioButton = await driver.$(radioXPath);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');
        if (isChecked !== 'true') {
            await radioButton.click();
            console.log(`✔ "Is HRP Confirmed?" changed to "${targetOption}".`);
            await driver.pause(1000);
        } else {
            console.log(`➡ "Is HRP Confirmed?" is already set to "${targetOption}". No action taken.`);
        }
    } else {
        console.log('ℹ "Is HRP Confirmed?" field is not present on this screen. Skipping.');
    }
}

async function fillWhoIdentifiedAsHrp(driver) {
    console.log('Processing "Who had identified as HRP?" Dropdown...');

    await scrollDownToText(driver, "Who had identified as HRP?", 3);

    const spinnerXPath = `//android.widget.Spinner[contains(@text, "Who had identified as HRP?") or contains(@hint, "Who had identified as HRP?")]`;
    const spinner = await driver.$(spinnerXPath);

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();

        if (currentText.includes("Who had identified")) {
            const arrowXPath = `${spinnerXPath}/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            if (await dropdownArrow.isExisting()) {
                await dropdownArrow.click();
            } else {
                await spinner.click();
            }
            await driver.pause(1500);

            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
                await driver.pause(1000);
                await spinner.click();
                await driver.pause(1500);
            }

            const targetIdentifier = PMSMA_FORM_DATA.hrpIdentifier;
            const coords = HRP_COORDS[targetIdentifier];

            if (coords) {
                await tapAt(driver, coords.x, coords.y);
                console.log(`✔ "Who had identified as HRP?" updated to "${targetIdentifier}".`);
            } else {
                console.error(`❌ Option "${targetIdentifier}" not found in HRP coordinate map.`);
            }
        } else {
            console.log(`➡ "Who had identified as HRP?" is already set to "${currentText}".`);
        }
    } else {
        console.log('ℹ "Who had identified as HRP?" dropdown is not present on this screen. Skipping.');
    }
}

async function fillFrontSideMcpCard(driver) {
    console.log('Processing Front Side MCP Card...');

    if (PMSMA_FORM_DATA.maternalDeath !== 'No') {
        console.log('➡ "Maternal Death" is not No. Skipping Front Side MCP Card.');
        return;
    }

    await scrollDownToText(driver, "Front Side", 3);

    const addFileBtn = await driver.$('//android.widget.TextView[@text="Front Side"]/following-sibling::android.widget.ImageView[@content-desc="add file"]');

    if (await addFileBtn.isExisting()) {
        await addFileBtn.click();
        console.log('✔ Clicked "add file" for Front Side.');
        await driver.pause(1500);

        const pickFromGallery = await driver.$('//android.widget.TextView[@text="Pick from Gallery" or @text="Pick from gallery" or @text="Gallery" or @text="Choose from Gallery"]');
        if (await pickFromGallery.isExisting()) {
            await pickFromGallery.click();
            console.log('✔ Clicked "Pick from Gallery" for Front Side.');
        } else {
            await tapAt(driver, 540, 1400);
            console.log('⚠ Tapped approximate "Pick from Gallery" position for Front Side.');
        }

        console.log('⏳ Waiting 20 seconds for gallery selection...');
        await driver.pause(20000);
        console.log('✔ Front Side gallery wait complete.');
    } else {
        console.error('❌ Could not find "add file" button for Front Side.');
    }
}

async function fillBackSideMcpCard(driver) {
    console.log('Processing Back Side MCP Card...');

    if (PMSMA_FORM_DATA.maternalDeath !== 'No') {
        console.log('➡ "Maternal Death" is not No. Skipping Back Side MCP Card.');
        return;
    }

    await scrollDownToText(driver, "Back Side", 3);

    const addFileBtn = await driver.$('//android.widget.TextView[@text="Back Side"]/following-sibling::android.widget.ImageView[@content-desc="add file"]');

    if (await addFileBtn.isExisting()) {
        await addFileBtn.click();
        console.log('✔ Clicked "add file" for Back Side.');
        await driver.pause(1500);

        const pickFromGallery = await driver.$('//android.widget.TextView[@text="Pick from Gallery" or @text="Pick from gallery" or @text="Gallery" or @text="Choose from Gallery"]');
        if (await pickFromGallery.isExisting()) {
            await pickFromGallery.click();
            console.log('✔ Clicked "Pick from Gallery" for Back Side.');
        } else {
            await tapAt(driver, 540, 1400);
            console.log('⚠ Tapped approximate "Pick from Gallery" position for Back Side.');
        }

        console.log('⏳ Waiting 20 seconds for gallery selection...');
        await driver.pause(20000);
        console.log('✔ Back Side gallery wait complete.');
    } else {
        console.error('❌ Could not find "add file" button for Back Side.');
    }
}

async function submitForm(driver) {
    console.log('Clicking Submit button...');

    await scrollDownToText(driver, "Submit", 3);

    const submitBtn = await driver.$('//android.widget.Button[@text="Submit" and @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]');

    if (await submitBtn.isExisting()) {
        await submitBtn.click();
        console.log('✔ Submit button clicked successfully.');
        await driver.pause(2000);
    } else {
        console.error('❌ Could not find Submit button.');
    }
}

async function fillAnyOtherHighRiskCondition(driver) {
    console.log('Processing "Any other High Risk conditions" text field...');

    // Only run if "Any High Risk conditions" is "Yes" AND "High Risk Conditions" is "OTHER"
    if (PMSMA_FORM_DATA.anyHighRiskConditions !== 'Yes' || PMSMA_FORM_DATA.highRiskCondition !== 'OTHER') {
        console.log('➡ High Risk condition is not "OTHER". Skipping the manual entry text field.');
        return;
    }

    await scrollDownToText(driver, "Any other High Risk conditions", 3);

    // Locate the element based on the hint text found in your XML
    const fieldXPath = '//android.widget.EditText[contains(@hint, "Any other High Risk conditions")]';
    const field = await driver.$(fieldXPath);

    await field.waitForDisplayed({ timeout: 5000 }).catch(() => null);

    if (await field.isExisting()) {
        const currentText = await field.getText();
        const hintText = 'Any other High Risk conditions *';

        // If it's empty or just showing the hint text, fill it
        if (!currentText || currentText.trim() === '' || currentText.trim() === hintText) {
            await field.click();
            await driver.pause(500);
            await field.clearValue();

            // Set the value from our form data
            await field.setValue(PMSMA_FORM_DATA.otherHighRiskCondition);
            await driver.pause(500);

            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
            }
            console.log(`✔ "Any other High Risk conditions" filled with: "${PMSMA_FORM_DATA.otherHighRiskCondition}".`);

            // Scroll down after filling to reveal the next fields
            await scrollDown(driver);
        } else {
            console.log(`➡ "Any other High Risk conditions" is already filled with: "${currentText}".`);
        }
    } else {
        console.error('❌ Could not find "Any other High Risk conditions" text field.');
    }
}


async function fillPmsmaForm(driver) {
    console.log("--- Starting PMSMA Form Details ---");

    await fillAncDate(driver);
    await driver.pause(1000);

    await fillAncPeriod(driver);
    await driver.pause(1000);

    await fillAbortionIfAny(driver);
    await driver.pause(1000);

    await fillAbortionType(driver);
    await driver.pause(1000);

    await fillFacilityPlaceOfAbortion(driver);
    await driver.pause(1000);

    await fillAbortionDate(driver);
    await driver.pause(1000);

    await fillMaternalDeath(driver);
    await driver.pause(1000);

    await fillHasDelivered(driver);
    await driver.pause(1000);

    await fillBpSystolicDiastolic(driver);
    await driver.pause(1000);

    await fillHbValue(driver);
    await driver.pause(1000);

    await fillProbableCauseOfDeath(driver);
    await driver.pause(1000);

    await fillDeathDate(driver);
    await driver.pause(1000);

    await fillPlaceOfDeath(driver);
    await driver.pause(1000);

    await fillFundalHeight(driver);
    await driver.pause(1000);

    await fillWeightAtRegistration(driver);
    await driver.pause(1000);

    await fillIfaTabsGiven(driver);
    await driver.pause(1000);

    await fillAnyHighRiskConditions(driver);  // ✅ Now scrolls down after Yes
    await driver.pause(1000);

    await fillHighRiskConditionDetails(driver); // ✅ Now scrolls after selection
    await driver.pause(1000);
    await fillAnyOtherHighRiskCondition(driver);
    await driver.pause(1000);
    await fillReferralFacility(driver);
    await driver.pause(1000);

    await fillIsHrpConfirmed(driver);
    await driver.pause(1000);

    await fillWhoIdentifiedAsHrp(driver);
    await driver.pause(1000);

    await fillFrontSideMcpCard(driver);
    await driver.pause(1000);

    await fillBackSideMcpCard(driver);
    await driver.pause(1000);

    await submitForm(driver);

    console.log("--- Finished PMSMA Form Details ---");
}

module.exports = { fillPmsmaForm };