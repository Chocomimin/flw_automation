const { remote } = require('webdriverio');

// --- Constants & Data ---
const FORM_DATA = {
    ancDate: { day: 15, month: 2, year: 2024 },
    placeOfAnc: 'CHC',
    ancPeriod: '7',

    // Maternal Death Selection ('Yes' or 'No')
    maternalDeath: 'Yes',
    probableCauseOfDeath: 'ECLAMPSIA',
    placeOfDeath: 'Other Place of Death',
    otherPlaceOfDeath: 'On the way to hospital',
    deathDate: { day: 22, month: 2, year: 2024 },
    // Has Delivered Selection ('Yes' or 'No')
    delivered: 'Yes',

    // Physical Measurements
    weight: '65',
    bp: '120/80',
    hb: '12',
    fundalHeight: '24',
    ifaTabs: '30',
    highRisk: 'No',
    highRiskCondition: 'OTHER',
    otherHighRisk: 'Patient has a history of severe asthma',
    referralFacility: 'District Hospital',
    hrpConfirmed: 'Yes',
    identifiedAsHrp: 'ANM'
};

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

// Android native DatePicker coordinates
const CALENDAR = {
    prevMonthBtn:  { x: 274, y: 924 },
    nextMonthBtn:  { x: 806, y: 924 },
    okBtn:         { x: 790, y: 1754 },
    cancelBtn:     { x: 610, y: 1754 },
    yearHeader:    { x: 280, y: 670 },
};

// HIGHLY ACCURATE: Dropdown Coordinates for Place of ANC
const PLACE_OF_ANC_ARROW = { x: 980, y: 580 };
const PLACE_OF_ANC_COORDS = {
    'Sub-Centre':               { x: 500, y: 680 },
    'VHND/VHSND':               { x: 500, y: 780 },
    'PHC':                      { x: 500, y: 880 },
    'PMSMA Visit':              { x: 500, y: 980 },
    'CHC':                      { x: 500, y: 1080 },
    'District Hospital':        { x: 500, y: 1180 },
    'Medical College Hospital': { x: 500, y: 1280 }
};

// HIGHLY ACCURATE: Dropdown Coordinates for ANC Period
const ANC_PERIOD_ARROW = { x: 980, y: 888 };
const ANC_PERIOD_COORDS = {
    '4': { x: 500, y: 888 },
    '5': { x: 500, y: 1035 },
    '6': { x: 500, y: 1180 },
    '7': { x: 500, y: 1325 },
    '8': { x: 500, y: 1480 },
    '9': { x: 500, y: 1635 }
};

// Dropdown Coordinates for High Risk Conditions
// Dropdown Coordinates for High Risk Conditions
const HIGH_RISK_ARROW = { x: 980, y: 1615 };
const HIGH_RISK_COORDS = {
    'NONE': { x: 500, y: 580 },
    'HIGH BP (SYSTOLIC>=140 AND OR DIASTOLIC >=90mmHg)': { x: 500, y: 700 },
    'CONVULSIONS': { x: 500, y: 820 },
    'VAGINAL BLEEDING': { x: 500, y: 940 },
    'FOUL SMELLING DISCHARGE': { x: 500, y: 1060 },
    'SEVERE ANAEMIA (HB less than 7 gm/dl)': { x: 500, y: 1180 }, // Shifted up from 1300
    'DIABETES': { x: 500, y: 1300 },
    'TWINS': { x: 500, y: 1420 },
    'OTHER': { x: 500, y: 1540 }
};

// HIGHLY ACCURATE: Dropdown Coordinates for Referral Facility
// HIGHLY ACCURATE: Dropdown Coordinates for Referral Facility
// HIGHLY ACCURATE: Dropdown Coordinates for Referral Facility
// HIGHLY ACCURATE: Dropdown Coordinates for Referral Facility
const REFERRAL_FACILITY_ARROW = { x: 980, y: 1770 };
const REFERRAL_FACILITY_COORDS = {
    'Primary Health Centre':   { x: 500, y: 1350 },
    'Community Health Centre': { x: 500, y: 1470 },
    'District Hospital':       { x: 500, y: 1470 },
    'Other Private Hospital':  { x: 500, y: 1710 }
};
// ── W3C Actions Helpers ─────────────────────────────────────────
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

async function scrollDownToText(driver, text, maxScrolls = 3) {
    const elementXPath = `//*[contains(@text, "${text}") or contains(@hint, "${text}")]`;
    for (let i = 0; i < maxScrolls; i++) {
        try {
            const element = await driver.$(elementXPath);
            if ((await element.isExisting()) && (await element.isDisplayed())) {
                return; // Element found, stop scrolling
            }
        } catch (e) { } // Keep scrolling

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
}

async function isEmpty(field, hintText) {
    try {
        const text = await field.getText();
        return !text || text.trim() === '' || text.trim() === hintText.trim();
    } catch { return true; }
}

// ── Calendar Helpers ──────────────────────────────────────────────────────────
async function getCalendarMonthYear(driver) {
    try {
        const dayElement = await driver.$('android=new UiSelector().text("15")');
        const contentDesc = await dayElement.getAttribute('content-desc');
        const parts = contentDesc.split(' ');
        return { month: MONTH_NAMES.indexOf(parts[1]), year: parseInt(parts[2]) };
    } catch (error) { return null; }
}

async function navigateToMonth(driver, targetMonth, targetYear) {
    const yearHeader = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_header_year")');
    const currentYear = parseInt(await yearHeader.getText());

    if (currentYear !== targetYear) {
        await yearHeader.click();
        await driver.pause(1000);
        const yearEl = await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${targetYear}")`);
        await yearEl.click();
        await driver.pause(1000);
    }

    for (let i = 0; i < 12; i++) {
        const cur = await getCalendarMonthYear(driver);
        if (!cur) break;

        if (cur.month === targetMonth) break;

        const direction = cur.month < targetMonth ? 'left' : 'right';
        await swipeHorizontal(driver, direction);
    }
}

async function pickDateFromCalendar(driver, dateObj) {
    const { day, month, year } = dateObj;
    await (await driver.$('android=new UiSelector().resourceId("android:id/datePicker")')).waitForDisplayed({ timeout: 5000 });

    await navigateToMonth(driver, month, year);

    const formattedDay = String(day);
    const dayToClick = await driver.$(`android=new UiSelector().text("${formattedDay}").clickable(true)`);
    await dayToClick.click();
    await driver.pause(500);

    const okBtn = await driver.$('//android.widget.Button[@text="OK" or @resource-id="android:id/button1"]');
    await okBtn.click();
}

// ── Form Filling Functions ────────────────────────────────────────────────────
async function fillAncDate(driver) {
    console.log('Processing ANC Date...');
    const field = await driver.$('//android.widget.EditText[@text="ANC Date *" or @hint="ANC Date *"]');
    await field.waitForDisplayed({ timeout: 5000 });

    if (await isEmpty(field, 'ANC Date *')) {
        await field.click();
        await driver.pause(1000);
        await pickDateFromCalendar(driver, FORM_DATA.ancDate);
        console.log('✔ ANC Date filled successfully.');
    } else {
        console.log('➡ ANC Date is already filled.');
    }
}

async function fillPlaceOfAnc(driver) {
    console.log('Processing Place of ANC...');
    const spinner = await driver.$('//android.widget.Spinner[@text="Place of ANC *" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown"]');

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();
        if (currentText !== FORM_DATA.placeOfAnc) {
            await tapAt(driver, PLACE_OF_ANC_ARROW.x, PLACE_OF_ANC_ARROW.y);
            await driver.pause(1500);

            const coords = PLACE_OF_ANC_COORDS[FORM_DATA.placeOfAnc];
            if (coords) {
                await tapAt(driver, coords.x, coords.y);
                console.log(`✔ Place of ANC updated to "${FORM_DATA.placeOfAnc}".`);
            } else {
                console.error(`❌ Option "${FORM_DATA.placeOfAnc}" not found in coordinate map.`);
            }
        } else {
            console.log(`➡ Place of ANC is already set to "${FORM_DATA.placeOfAnc}".`);
        }
    } else {
        console.error('❌ Could not find "Place of ANC" dropdown field.');
    }
}

async function fillAncPeriod(driver) {
    console.log('Processing ANC Period...');

    const spinner = await driver.$('//android.widget.Spinner[@hint="ANC Period *"]');

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();

        if (currentText !== FORM_DATA.ancPeriod) {
            await tapAt(driver, ANC_PERIOD_ARROW.x, ANC_PERIOD_ARROW.y);
            await driver.pause(1500);

            const coords = ANC_PERIOD_COORDS[FORM_DATA.ancPeriod];

            if (coords) {
                await tapAt(driver, coords.x, coords.y);
                console.log(`✔ ANC Period updated to "${FORM_DATA.ancPeriod}".`);
            } else {
                console.error(`❌ Option "${FORM_DATA.ancPeriod}" not found in coordinate map.`);
            }
        } else {
            console.log(`➡ ANC Period is already set to "${FORM_DATA.ancPeriod}".`);
        }
    } else {
        console.error('❌ Could not find "ANC Period" dropdown field.');
    }
}

async function fillMaternalDeath(driver) {
    console.log('Processing Maternal Death...');
    await scrollDownToText(driver, "Maternal Death", 2);

    const radioXPath = `//android.widget.TextView[@text="Maternal Death"]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${FORM_DATA.maternalDeath}"]`;
    const radioButton = await driver.$(radioXPath);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');
        if (isChecked !== 'true') {
            await radioButton.click();
            console.log(`✔ Maternal Death set to "${FORM_DATA.maternalDeath}".`);
        } else {
            console.log(`➡ Maternal Death is already set to "${FORM_DATA.maternalDeath}".`);
        }
    } else {
        console.error('❌ Could not find Maternal Death radio buttons.');
    }
}

async function fillHasDelivered(driver) {
    console.log('Processing "Has the pregnant woman delivered?"...');
    await scrollDownToText(driver, "Has the pregnant woman delivered?", 2);

    const radioXPath = `//android.widget.TextView[@text="Has the pregnant woman delivered?"]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${FORM_DATA.delivered}"]`;
    const radioButton = await driver.$(radioXPath);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');
        if (isChecked !== 'true') {
            await radioButton.click();
            console.log(`✔ "Has the pregnant woman delivered?" set to "${FORM_DATA.delivered}".`);
        } else {
            console.log(`➡ "Has the pregnant woman delivered?" is already set to "${FORM_DATA.delivered}".`);
        }
    } else {
        console.error('❌ Could not find "Has the pregnant woman delivered?" radio buttons.');
    }
}

async function fillWeight(driver) {
    console.log('Processing Weight of PW...');
    await scrollDownToText(driver, "Weight of PW", 2);

    const weightField = await driver.$('//android.widget.EditText[contains(@hint, "Weight of PW")]');

    if (await weightField.isExisting()) {
        const currentText = await weightField.getText();

        if (currentText !== FORM_DATA.weight && await isEmpty(weightField, "Weight of PW (Kg) at time Registration")) {
            await weightField.click();
            await weightField.clearValue();
            await weightField.setValue(FORM_DATA.weight);

            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
            }
            console.log(`✔ Weight set to "${FORM_DATA.weight}".`);
        } else {
            console.log(`➡ Weight is already set or matches "${FORM_DATA.weight}".`);
        }
    } else {
        console.error('❌ Could not find "Weight of PW" input field.');
    }
}

async function fillBp(driver) {
    console.log('Processing BP of PW...');
    await scrollDownToText(driver, "BP of PW", 2);

    const bpField = await driver.$('//android.widget.EditText[contains(@hint, "BP of PW")]');

    if (await bpField.isExisting()) {
        const currentText = await bpField.getText();

        if (currentText !== FORM_DATA.bp && await isEmpty(bpField, "BP of PW – Systolic/ Diastolic (mm Hg) ")) {
            await bpField.click();
            await bpField.clearValue();
            await bpField.setValue(FORM_DATA.bp);

            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
            }
            console.log(`✔ BP set to "${FORM_DATA.bp}".`);
        } else {
            console.log(`➡ BP is already set or matches "${FORM_DATA.bp}".`);
        }
    } else {
        console.error('❌ Could not find "BP of PW" input field.');
    }
}

async function fillHb(driver) {
    console.log('Processing HB (gm/dl)...');
    await scrollDownToText(driver, "HB (gm/dl)", 2);

    const hbField = await driver.$('//android.widget.EditText[contains(@hint, "HB (gm/dl)")]');

    if (await hbField.isExisting()) {
        const currentText = await hbField.getText();

        if (currentText !== FORM_DATA.hb && await isEmpty(hbField, "HB (gm/dl)")) {
            await hbField.click();
            await hbField.clearValue();
            await hbField.setValue(FORM_DATA.hb);

            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
            }
            console.log(`✔ HB set to "${FORM_DATA.hb}".`);
        } else {
            console.log(`➡ HB is already set or matches "${FORM_DATA.hb}".`);
        }
    } else {
        console.error('❌ Could not find "HB (gm/dl)" input field.');
    }
}

async function fillFundalHeight(driver) {
    console.log('Processing Fundal Height...');
    await scrollDownToText(driver, "Fundal Height", 2);

    const fundalField = await driver.$('//android.widget.EditText[contains(@hint, "Fundal Height")]');

    if (await fundalField.isExisting()) {
        const currentText = await fundalField.getText();

        if (currentText !== FORM_DATA.fundalHeight && await isEmpty(fundalField, "Fundal Height / Size of the Uterus weeks")) {
            await fundalField.click();
            await fundalField.clearValue();
            await fundalField.setValue(FORM_DATA.fundalHeight);

            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
            }
            console.log(`✔ Fundal Height set to "${FORM_DATA.fundalHeight}".`);
        } else {
            console.log(`➡ Fundal Height is already set or matches "${FORM_DATA.fundalHeight}".`);
        }
    } else {
        console.error('❌ Could not find "Fundal Height" input field.');
    }
}

async function fillIfaTabs(driver) {
    console.log('Processing No. of IFA Tabs given...');
    await scrollDownToText(driver, "No. of IFA Tabs given", 3);

    const ifaField = await driver.$('//android.widget.EditText[contains(@hint, "No. of IFA Tabs given")]');

    if (await ifaField.isExisting()) {
        const currentText = await ifaField.getText();

        if (currentText !== FORM_DATA.ifaTabs && await isEmpty(ifaField, "No. of IFA Tabs given")) {
            await ifaField.click();
            await ifaField.clearValue();
            await ifaField.setValue(FORM_DATA.ifaTabs);

            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
            }
            console.log(`✔ IFA Tabs set to "${FORM_DATA.ifaTabs}".`);
        } else {
            console.log(`➡ IFA Tabs is already set or matches "${FORM_DATA.ifaTabs}".`);
        }
    } else {
        console.error('❌ Could not find "No. of IFA Tabs given" input field.');
    }
}

async function fillHighRisk(driver) {
    console.log('Processing "Any High Risk conditions"...');
    await scrollDownToText(driver, "Any High Risk conditions", 3);

    // 1. Select the Radio Button (Yes/No)
    const radioXPath = `//android.widget.TextView[@text="Any High Risk conditions"]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${FORM_DATA.highRisk}"]`;
    const radioButton = await driver.$(radioXPath);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');
        if (isChecked !== 'true') {
            await radioButton.click();
            console.log(`✔ "Any High Risk conditions" set to "${FORM_DATA.highRisk}".`);
        } else {
            console.log(`➡ "Any High Risk conditions" is already set to "${FORM_DATA.highRisk}".`);
        }
    } else {
        console.error('❌ Could not find "Any High Risk conditions" radio buttons.');
        return; // Exit the function early if radio button isn't found
    }

    // 2. If 'Yes' was clicked, interact with the Dropdown
    if (FORM_DATA.highRisk === 'Yes') {
        await driver.pause(1500); // Give the app a second to expand the dropdown menu
        await scrollDownToText(driver, "High Risk Conditions", 2);

        // Using a robust structural XPath since @hint is sometimes ignored by Appium
        const spinnerXPath = `//android.widget.TextView[@text="Any High Risk conditions"]/ancestor::android.widget.LinearLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cl_ri"]/following-sibling::android.view.ViewGroup//android.widget.Spinner`;
        const spinner = await driver.$(spinnerXPath);

        if (await spinner.isExisting()) {
            const currentText = await spinner.getText();

            if (currentText !== FORM_DATA.highRiskCondition) {
                // Tap the dropdown arrow
                await tapAt(driver, HIGH_RISK_ARROW.x, HIGH_RISK_ARROW.y);
                await driver.pause(1500);

                // Select the option via coordinates
                const coords = HIGH_RISK_COORDS[FORM_DATA.highRiskCondition];
                if (coords) {
                    await tapAt(driver, coords.x, coords.y);
                    console.log(`✔ High Risk Condition updated to "${FORM_DATA.highRiskCondition}".`);
                } else {
                    console.error(`❌ Option "${FORM_DATA.highRiskCondition}" not found in coordinate map.`);
                }
            } else {
                console.log(`➡ High Risk Condition is already set to "${FORM_DATA.highRiskCondition}".`);
            }
        } else {
            console.error('❌ Could not find "High Risk Conditions" dropdown field.');
        }
    }
}

async function fillHighRiskConditionDropdown(driver) {
    console.log('Processing High Risk Conditions Dropdown...');

    // The XML shows the hint is "High Risk Conditions"
    const spinner = await driver.$('//android.widget.Spinner[@hint="High Risk Conditions"]');

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();

        if (currentText !== FORM_DATA.highRiskCondition) {

            // Tap the dropdown arrow
            await tapAt(driver, HIGH_RISK_ARROW.x, HIGH_RISK_ARROW.y);
            await driver.pause(1500); // Wait for the dropdown animation

            // Grab the coordinates for the selected condition
            const coords = HIGH_RISK_COORDS[FORM_DATA.highRiskCondition];

            if (coords) {
                await tapAt(driver, coords.x, coords.y);
                console.log(`✔ High Risk Condition updated to "${FORM_DATA.highRiskCondition}".`);
            } else {
                console.error(`❌ Option "${FORM_DATA.highRiskCondition}" not found in coordinate map.`);
            }
        } else {
            console.log(`➡ High Risk Condition is already set to "${FORM_DATA.highRiskCondition}".`);
        }
    } else {
        console.error('❌ Could not find "High Risk Conditions" dropdown field.');
    }
}

async function fillOtherHighRiskCondition(driver) {
    console.log('Checking for "Any other High Risk conditions" text field...');

    await scrollDownToText(driver, "Any other High Risk", 2);

    const otherField = await driver.$('//android.widget.EditText[contains(@hint, "Any other High Risk") or contains(@text, "Any other High Risk")]');

    if (await otherField.isExisting() && await otherField.isDisplayed()) {
        const currentText = await otherField.getText();

        if (currentText !== FORM_DATA.otherHighRisk && await isEmpty(otherField, "Any other High Risk conditions *")) {
            await otherField.click();
            await otherField.clearValue();
            await otherField.setValue(FORM_DATA.otherHighRisk);

            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
            }
            console.log(`✔ "Any other High Risk conditions" text filled with "${FORM_DATA.otherHighRisk}".`);
        } else {
            console.log(`➡ "Any other High Risk conditions" text is already set to "${FORM_DATA.otherHighRisk}".`);
        }
    } else {
        console.log('➡ "Any other High Risk conditions" field not shown, skipping to next.');
    }
}

async function fillReferralFacility(driver) {
    console.log('Processing Referral Facility Dropdown...');

    // Ensure we scroll down so the dropdown is fully visible on screen
    await scrollDownToText(driver, "Referral Facility", 2);

    const spinner = await driver.$('//android.widget.Spinner[@text="Referral Facility" or @hint="Referral Facility"]');

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();

        if (currentText !== FORM_DATA.referralFacility) {

            // Locate the dropdown arrow specific to Referral Facility
            const arrowXPath = `//android.widget.Spinner[@text="Referral Facility" or @hint="Referral Facility"]/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            if (await dropdownArrow.isExisting()) {

                // 1. Initial click to open the dropdown
                await dropdownArrow.click();
                await driver.pause(1000);

                // 2. Check if the keyboard opened instead of the dropdown list
                if (await driver.isKeyboardShown()) {
                    console.log('Keyboard opened unexpectedly. Closing keyboard and retrying dropdown click...');
                    await driver.hideKeyboard();
                    await driver.pause(1000); // Wait for keyboard to fully hide

                    // Click the arrow again to actually open the dropdown list
                    await dropdownArrow.click();
                    await driver.pause(1500); // Wait for list animation
                } else {
                    // Keyboard didn't show, just wait the remaining time for the list animation
                    await driver.pause(500);
                }

                // HIGHLY ACCURATE: Adjusted coordinates based on the 1500 baseline
                const REFERRAL_FACILITY_COORDS = {
                    'Primary Health Centre':   { x: 500, y: 1500 },
                    'Community Health Centre': { x: 500, y: 1590 },
                    'District Hospital':       { x: 500, y: 1680 },
                    'Other Private Hospital':  { x: 500, y: 1770 }
                };

                const coords = REFERRAL_FACILITY_COORDS[FORM_DATA.referralFacility];

                if (coords) {
                    await tapAt(driver, coords.x, coords.y);
                    console.log(`✔ Referral Facility updated to "${FORM_DATA.referralFacility}".`);
                } else {
                    console.error(`❌ Option "${FORM_DATA.referralFacility}" not found in coordinate map.`);
                }
            } else {
                console.error('❌ Could not find the dropdown arrow for Referral Facility.');
            }

        } else {
            console.log(`➡ Referral Facility is already set to "${FORM_DATA.referralFacility}".`);
        }
    } else {
        console.error('❌ Could not find "Referral Facility" dropdown field.');
    }
}

async function fillHrpConfirmed(driver) {
    console.log('Processing "Is HRP Confirmed?"...');
    await scrollDownToText(driver, "Is HRP Confirmed?", 3);

    const radioXPath = `//android.widget.TextView[@text="Is HRP Confirmed?"]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${FORM_DATA.hrpConfirmed}"]`;
    const radioButton = await driver.$(radioXPath);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');
        if (isChecked !== 'true') {
            await radioButton.click();
            console.log(`✔ "Is HRP Confirmed?" set to "${FORM_DATA.hrpConfirmed}".`);
        } else {
            console.log(`➡ "Is HRP Confirmed?" is already set to "${FORM_DATA.hrpConfirmed}".`);
        }
    } else {
        console.error('❌ Could not find "Is HRP Confirmed?" radio buttons.');
    }
}

async function fillIdentifiedAsHrp(driver) {
    console.log('Processing "Who had identified as HRP?"...');

    // Scroll slightly to make sure the field is visible
    await scrollDownToText(driver, "Who had identified as HRP?", 2);

    const spinnerXPath = `//android.widget.Spinner[contains(@text, "Who had identified as HRP?") or contains(@hint, "Who had identified as HRP?")]`;
    const spinner = await driver.$(spinnerXPath);

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();

        if (currentText !== FORM_DATA.identifiedAsHrp) {

            // Locate the dropdown arrow using the XML structure
            const arrowXPath = `${spinnerXPath}/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            if (await dropdownArrow.isExisting()) {

                // 1. Initial click to open the dropdown
                await dropdownArrow.click();
                await driver.pause(1000);

                // 2. Handle unexpected keyboard popups
                if (await driver.isKeyboardShown()) {
                    console.log('Keyboard opened unexpectedly. Closing keyboard and retrying dropdown click...');
                    await driver.hideKeyboard();
                    await driver.pause(1000);

                    await dropdownArrow.click();
                    await driver.pause(1500);
                } else {
                    await driver.pause(500);
                }

                // HIGHLY ACCURATE: Shifted coordinates down.
                // The popup starts around y:1715, safely below the "High Risk Conditions" dropdown.
                const IDENTIFIED_AS_HRP_COORDS = {
                    'ANM':                           { x: 500, y: 1770 },
                    'CHO':                           { x: 500, y: 1880 },
                    'PHC - MO':                      { x: 500, y: 1990 },
                    'Specialist at Higher Facility': { x: 500, y: 2100 }
                };

                const coords = IDENTIFIED_AS_HRP_COORDS[FORM_DATA.identifiedAsHrp];

                if (coords) {
                    await tapAt(driver, coords.x, coords.y);
                    console.log(`✔ "Who had identified as HRP?" updated to "${FORM_DATA.identifiedAsHrp}".`);
                } else {
                    console.error(`❌ Option "${FORM_DATA.identifiedAsHrp}" not found in coordinate map.`);
                }
            } else {
                console.error('❌ Could not find the dropdown arrow for "Who had identified as HRP?".');
            }
        } else {
            console.log(`➡ "Who had identified as HRP?" is already set to "${FORM_DATA.identifiedAsHrp}".`);
        }
    } else {
        console.error('❌ Could not find "Who had identified as HRP?" dropdown field.');
    }
}

async function fillReferralFacilityHighRiskNo(driver) {
    console.log('Processing Referral Facility Dropdown (High Risk = No)...');

    // Scroll slightly to make sure the field is visible
    await scrollDownToText(driver, "Referral Facility", 2);

    const spinner = await driver.$('//android.widget.Spinner[@text="Referral Facility" or @hint="Referral Facility"]');

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();

        if (currentText !== FORM_DATA.referralFacility) {

            // Locate the dropdown arrow specific to Referral Facility
            const arrowXPath = `//android.widget.Spinner[@text="Referral Facility" or @hint="Referral Facility"]/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            if (await dropdownArrow.isExisting()) {

                // 1. Initial click to open the dropdown
                await dropdownArrow.click();
                await driver.pause(1000);

                // 2. Check if the keyboard opened instead of the dropdown list
                if (await driver.isKeyboardShown()) {
                    console.log('Keyboard opened unexpectedly. Closing keyboard and retrying dropdown click...');
                    await driver.hideKeyboard();
                    await driver.pause(1000);

                    // Click the arrow again to actually open the dropdown list
                    await dropdownArrow.click();
                    await driver.pause(1500);
                } else {
                    await driver.pause(500);
                }

                // HIGHLY ACCURATE: Shifted coordinates for the "No" state.
                // Because intermediate fields are hidden, the menu now opens DOWNWARDS.
                const REFERRAL_FACILITY_NO_RISK_COORDS = {
                    'Primary Health Centre':   { x: 500, y: 1720 }, // Top option, right below the field
                    'Community Health Centre': { x: 500, y: 1830 },
                    'District Hospital':       { x: 500, y: 1940 },
                    'Other Private Hospital':  { x: 500, y: 2050 }  // Bottom option
                };

                const coords = REFERRAL_FACILITY_NO_RISK_COORDS[FORM_DATA.referralFacility];

                if (coords) {
                    await tapAt(driver, coords.x, coords.y);
                    console.log(`✔ Referral Facility updated to "${FORM_DATA.referralFacility}".`);
                } else {
                    console.error(`❌ Option "${FORM_DATA.referralFacility}" not found in coordinate map.`);
                }
            } else {
                console.error('❌ Could not find the dropdown arrow for Referral Facility.');
            }

        } else {
            console.log(`➡ Referral Facility is already set to "${FORM_DATA.referralFacility}".`);
        }
    } else {
        console.error('❌ Could not find "Referral Facility" dropdown field.');
    }
}

async function fillProbableCauseOfDeath(driver) {
    console.log('Processing Probable Cause of Death Dropdown...');

    // Scroll to make sure it's fully visible
    await scrollDownToText(driver, "Probable Cause of Death", 2);

    const spinnerXPath = `//android.widget.Spinner[contains(@text, "Probable Cause of Death") or contains(@hint, "Probable Cause of Death")]`;
    const spinner = await driver.$(spinnerXPath);

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();

        if (currentText !== FORM_DATA.probableCauseOfDeath) {

            // Locate the dropdown arrow using the standard structure
            const arrowXPath = `${spinnerXPath}/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            if (await dropdownArrow.isExisting()) {

                // 1. Initial click to open the dropdown
                await dropdownArrow.click();
                await driver.pause(1000);

                // 2. Check if the keyboard opened instead of the dropdown list
                if (await driver.isKeyboardShown()) {
                    console.log('Keyboard opened unexpectedly. Closing keyboard and retrying dropdown click...');
                    await driver.hideKeyboard();
                    await driver.pause(1000);

                    // Click the arrow again to actually open the dropdown list
                    await dropdownArrow.click();
                    await driver.pause(1500);
                } else {
                    await driver.pause(500);
                }

                // HIGHLY ACCURATE: Downward coordinates based on the screenshot
                const CAUSE_OF_DEATH_COORDS = {
                    'ECLAMPSIA':   { x: 500, y: 1350 },
                    'HAEMORRHAGE': { x: 500, y: 1460 },
                    'HIGH FEVER':  { x: 500, y: 1570 },
                    'ABORTION':    { x: 500, y: 1680 },
                    'Accident':    { x: 500, y: 1790 },
                    'OTHER':       { x: 500, y: 1900 }
                };

                const coords = CAUSE_OF_DEATH_COORDS[FORM_DATA.probableCauseOfDeath];

                if (coords) {
                    await tapAt(driver, coords.x, coords.y);
                    console.log(`✔ Probable Cause of Death updated to "${FORM_DATA.probableCauseOfDeath}".`);
                } else {
                    console.error(`❌ Option "${FORM_DATA.probableCauseOfDeath}" not found in coordinate map.`);
                }
            } else {
                console.error('❌ Could not find the dropdown arrow for Probable Cause of Death.');
            }

        } else {
            console.log(`➡ Probable Cause of Death is already set to "${FORM_DATA.probableCauseOfDeath}".`);
        }
    } else {
        console.error('❌ Could not find "Probable Cause of Death" dropdown field.');
    }
}

async function fillDeathDate(driver) {
    console.log('Processing Death Date...');

    // Scroll down slightly to make sure the field is visible on screen
    await scrollDownToText(driver, "Death Date", 2);

    const field = await driver.$('//android.widget.EditText[@text="Death Date *" or @hint="Death Date *"]');

    if (await field.isExisting() && await field.isDisplayed()) {
        if (await isEmpty(field, 'Death Date *')) {
            await field.click();
            await driver.pause(1000); // Wait for calendar popup

            // Call your existing calendar helper
            await pickDateFromCalendar(driver, FORM_DATA.deathDate);
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

    // Scroll to make sure it's fully visible
    await scrollDownToText(driver, "Place of Death", 2);

    const spinnerXPath = `//android.widget.Spinner[contains(@text, "Place of Death") or contains(@hint, "Place of Death")]`;
    const spinner = await driver.$(spinnerXPath);

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();

        if (currentText !== FORM_DATA.placeOfDeath) {

            // Locate the dropdown arrow using the XML structure
            const arrowXPath = `${spinnerXPath}/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            if (await dropdownArrow.isExisting()) {

                // 1. Initial click to open the dropdown
                await dropdownArrow.click();
                await driver.pause(1000);

                // 2. Check if the keyboard opened instead of the dropdown list
                if (await driver.isKeyboardShown()) {
                    console.log('Keyboard opened unexpectedly. Closing keyboard and retrying dropdown click...');
                    await driver.hideKeyboard();
                    await driver.pause(1000);

                    // Click the arrow again to actually open the dropdown list
                    await dropdownArrow.click();
                    await driver.pause(1500);
                } else {
                    await driver.pause(500);
                }

                // HIGHLY ACCURATE: Upward coordinates based on the screenshot
                // The menu stretches high up the screen, so Y values get smaller at the top
                const PLACE_OF_DEATH_COORDS = {
                    'Home':                     { x: 500, y: 560 }, // Top-most option
                    'Subcenter':                { x: 500, y: 660 },
                    'PHC':                      { x: 500, y: 760 },
                    'CHC':                      { x: 500, y: 860 },
                    'District Hospital':        { x: 500, y: 960 },
                    'Medical College Hospital': { x: 500, y: 1060 },
                    'Private Hospital':         { x: 500, y: 1160 },
                    'In Transit':               { x: 500, y: 1260 },
                    'Other Place of Death':     { x: 500, y: 1360 } // Bottom-most option, right above the field
                };

                const coords = PLACE_OF_DEATH_COORDS[FORM_DATA.placeOfDeath];

                if (coords) {
                    await tapAt(driver, coords.x, coords.y);
                    console.log(`✔ Place of Death updated to "${FORM_DATA.placeOfDeath}".`);
                } else {
                    console.error(`❌ Option "${FORM_DATA.placeOfDeath}" not found in coordinate map.`);
                }
            } else {
                console.error('❌ Could not find the dropdown arrow for Place of Death.');
            }

        } else {
            console.log(`➡ Place of Death is already set to "${FORM_DATA.placeOfDeath}".`);
        }
    } else {
        console.error('❌ Could not find "Place of Death" dropdown field.');
    }
}

async function fillOtherPlaceOfDeath(driver) {
    console.log('Checking for "Other Place of Death" text field...');

    // Scroll slightly to make sure the field is visible if it appeared
    await scrollDownToText(driver, "Other Place of Death", 2);

    const otherField = await driver.$('//android.widget.EditText[contains(@hint, "Other Place of Death") or contains(@text, "Other Place of Death")]');

    if (await otherField.isExisting() && await otherField.isDisplayed()) {
        const currentText = await otherField.getText();

        if (currentText !== FORM_DATA.otherPlaceOfDeath && await isEmpty(otherField, "Other Place of Death *")) {
            await otherField.click();
            await otherField.clearValue();
            await otherField.setValue(FORM_DATA.otherPlaceOfDeath);

            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
            }
            console.log(`✔ "Other Place of Death" text filled with "${FORM_DATA.otherPlaceOfDeath}".`);
        } else {
            console.log(`➡ "Other Place of Death" text is already set to "${FORM_DATA.otherPlaceOfDeath}".`);
        }
    } else {
        console.log('➡ "Other Place of Death" field not shown, skipping to next.');
    }
}

async function uploadMcpCard(driver, sideName) {
    console.log(`Processing MCP Card (${sideName})...`);

    // Scroll to make sure the specific side is visible
    await scrollDownToText(driver, sideName, 2);

    // Locate the "add file" button directly next to the specific text (Front Side / Back Side)
    const addFileBtn = await driver.$(`//android.widget.TextView[@text="${sideName}"]/following-sibling::android.widget.ImageView[@content-desc="add file"]`);

    if (await addFileBtn.isExisting() && await addFileBtn.isDisplayed()) {
        await addFileBtn.click();
        await driver.pause(1500); // Wait for the modal menu to pop up

        // Locate and click "Pick from Gallery"
        const galleryBtn = await driver.$('//android.widget.Button[@text="Pick from Gallery" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnGallery"]');

        if (await galleryBtn.isExisting()) {
            await galleryBtn.click();
            console.log(`✔ Clicked "Pick from Gallery" for ${sideName}. Waiting 20 seconds...`);

            // Wait for 20 seconds as requested
            await driver.pause(20000);
        } else {
            console.error(`❌ Could not find "Pick from Gallery" button for ${sideName}.`);
        }
    } else {
        console.error(`❌ Could not find "add file" button for ${sideName}.`);
    }
}

async function clickSubmitButton(driver) {
    console.log('Clicking Submit button...');

    await scrollDownToText(driver, "Submit", 2);
    const submitBtn = await driver.$('//android.widget.Button[@text="Submit" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]');

    if (await submitBtn.isExisting()) {
        await submitBtn.click();
        console.log('✔ Submit button clicked successfully!');
    } else {
        console.error('❌ Could not find the Submit button.');
    }
}
async function fillAncForm(driver) {
    await fillAncDate(driver);
    await driver.pause(1000);

    await fillPlaceOfAnc(driver);
    await driver.pause(1000);

    await fillAncPeriod(driver);
    await driver.pause(1000);

    await fillMaternalDeath(driver);
    await driver.pause(1000);

    if (FORM_DATA.maternalDeath === 'Yes') {
        // If Mother died, fill cause of death (and skip the rest of the measurements)
        await fillProbableCauseOfDeath(driver);
        await driver.pause(1000);
        await fillDeathDate(driver); // ✅ Call this first!
        await driver.pause(1000);
        await fillPlaceOfDeath(driver);
        await driver.pause(1000);
        await fillOtherPlaceOfDeath(driver);
        await driver.pause(1000);
        await fillFundalHeight(driver);
        await driver.pause(1000);
    } else if (FORM_DATA.maternalDeath === 'No') {

        await fillHasDelivered(driver);
        await driver.pause(1000);

        await fillWeight(driver);
        await driver.pause(1000);

        await fillBp(driver);
        await driver.pause(1000);
        await fillHb(driver);
        await driver.pause(1000);
        await fillFundalHeight(driver);
        await driver.pause(1000);
        // --- NEW LINE BELOW ---
        await fillIfaTabs(driver);
        await driver.pause(1000);
        await fillHighRisk(driver);
        await driver.pause(1000);
        if (FORM_DATA.highRisk === 'Yes') {
            await fillHighRiskConditionDropdown(driver);
            await driver.pause(1000);
            await fillOtherHighRiskCondition(driver);
            await driver.pause(1000);
            await fillReferralFacility(driver);
            await driver.pause(1000);
        } else {
            // High Risk is 'No'
            // Uses the new shifted coordinates
            await fillReferralFacilityHighRiskNo(driver);
            await driver.pause(1000);
        }

        // --- NEW LINE ADDED HERE ---
        await fillHrpConfirmed(driver);
        await driver.pause(1000);
        if (FORM_DATA.hrpConfirmed === 'Yes') {
            await fillIdentifiedAsHrp(driver);
            await driver.pause(1000);
        }
    }
    await uploadMcpCard(driver, "Front Side");
    await driver.pause(1000);

    // 2. Upload Back Side
    await uploadMcpCard(driver, "Back Side");
    await driver.pause(1000);

    // 3. Click final Submit
    await clickSubmitButton(driver);
}

module.exports = { fillAncForm };