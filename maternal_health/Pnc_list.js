const { remote } = require('webdriverio');

// --- Capabilities ---
const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true
};

// --- Constants & Data ---
const FORM_DATA = {
    deliveryDate: { day: 5, month: 3, year: 2026 },
    pncPeriod: 'Day 1',
    pncVisitDate: { day: 6, month: 3, year: 2026 },

    // Mother Death Data
    maternalDeath: 'No', // Change to 'No' to skip to IFA tablets
    deathDate: { day: 7, month: 3, year: 2026 },
    causeOfDeath: 'HIGH FEVER',
    placeOfDeath: 'Other Place of Death',
    otherPlaceOfDeathText: 'Test Place',
    otherDeathCauseText: 'High fever leading to severe complications',

    // IFA Tablets
    ifaTablets: '15',

    // Family Planning Data
    ppcStarted: 'Yes',
    contraceptionMethod: 'CONDOM',

    // Danger Signs Data
    dangerSigns: 'Yes',
    dangerSignOption: 'FEVER',

    // Referral Data
    referralFacility: 'Other Private Hospital',

    // Additional Information
    remarks: 'Patient seems stable',

    // File Upload Config
    uploadDischargeSummary: true, // Set to false to skip the upload step
    numberOfSummariesToUpload: 4, // Change to 1, 2, 3, or 4 depending on how many you want
    manualWaitTime: 30000 // 30 seconds to let you manually pick from gallery per photo
};

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

const CALENDAR = {
    prevMonthBtn:  { x: 274, y: 924 },
    nextMonthBtn:  { x: 806, y: 924 },
    okBtn:         { x: 790, y: 1754 },
    cancelBtn:     { x: 610, y: 1754 },
    yearHeader:    { x: 280, y: 670 },
};

// --- Dropdown Coordinates ---
const PNC_PERIOD_ARROW = { x: 970, y: 664 };
const PNC_PERIOD_COORDS = {
    'Day 1': { x: 500, y: 800 },
    'Day 3': { x: 500, y: 910 },
    'Day 7': { x: 500, y: 1020 },
    'Day 14': { x: 500, y: 1130 },
    'Day 21': { x: 500, y: 1240 },
    'Day 28': { x: 500, y: 1350 },
    'Day 42': { x: 500, y: 1460 }
};

// Probable Cause of Death arrow
const CAUSE_OF_DEATH_ARROW = { x: 970, y: 1400 };

// Cause of Death dropdown items
const CAUSE_OF_DEATH_COORDS = {
    'ECLAMPSIA':         { x: 500, y: 530 },
    'HAEMORRHAGE (PPH)': { x: 500, y: 650 },
    'ANAEMIA':           { x: 500, y: 770 },
    'HIGH FEVER':        { x: 500, y: 890 },
    'Sepsis':            { x: 500, y: 1010 },
    'Accident':          { x: 500, y: 1130 },
    'Any Other':         { x: 500, y: 1250 }
};

// Place of Death arrow
const PLACE_OF_DEATH_ARROW = { x: 970, y: 1580 };

// Place of Death dropdown items
const PLACE_OF_DEATH_COORDS = {
    'Home':                     { x: 500, y: 500 },
    'Subcenter':                { x: 500, y: 620 },
    'PHC':                      { x: 500, y: 740 },
    'CHC':                      { x: 500, y: 860 },
    'District Hospital':        { x: 500, y: 980 },
    'Medical College Hospital': { x: 500, y: 1100 },
    'Private Hospital':         { x: 500, y: 1220 },
    'In Transit':               { x: 500, y: 1340 },
    'Other Place of Death':     { x: 500, y: 1460 }
};

// ── W3C Actions Helpers (Crash-Proof) ─────────────────────────────────────────
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

async function scrollDownToText(driver, text, maxScrolls = 5) {
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
        await tapAt(driver, CALENDAR.yearHeader.x, CALENDAR.yearHeader.y);
        await driver.pause(1000);
        const yearEl = await driver.$(`android=new UiScrollable(new UiSelector().resourceId("android:id/animator")).scrollIntoView(new UiSelector().text("${targetYear}"))`);
        await yearEl.click();
        await driver.pause(1000);
    }

    for (let i = 0; i < 12; i++) {
        const cur = await getCalendarMonthYear(driver);
        if (!cur || cur.month === targetMonth) break;
        await tapAt(driver, cur.month > targetMonth ? CALENDAR.prevMonthBtn.x : CALENDAR.nextMonthBtn.x, CALENDAR.prevMonthBtn.y);
        await driver.pause(500);
    }
}

async function pickDateFromCalendar(driver, dateObj) {
    const { day, month, year } = dateObj;
    await (await driver.$('android=new UiSelector().resourceId("android:id/datePicker")')).waitForDisplayed({ timeout: 5000 });
    await navigateToMonth(driver, month, year);

    const formattedDay = String(day).padStart(2, '0');
    await (await driver.$(`android=new UiSelector().description("${formattedDay} ${MONTH_NAMES[month]} ${year}")`)).click();
    await driver.pause(500);
    await tapAt(driver, CALENDAR.okBtn.x, CALENDAR.okBtn.y);
}

async function isEmpty(field, hintText) {
    try {
        const text = await field.getText();
        return !text || text.trim() === '' || text.trim() === hintText.trim();
    } catch { return true; }
}

// ── Navigation ────────────────────────────────────────────────────────────────
async function clickPnCMotherList(driver) {
    console.log('Attempting to click PNC Mother List...');
    const pncCard = await driver.$('//android.widget.TextView[@text="PNC Mother List"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_icon"]');
    await pncCard.waitForDisplayed({ timeout: 10000 });
    await pncCard.click();
}

async function scrollAndAddPncVisit(driver, patientFirstName) {
    console.log(`Scrolling to find: ${patientFirstName}...`);
    const scrollSelector = `new UiScrollable(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/rv_any")).scrollIntoView(new UiSelector().textContains("${patientFirstName}"))`;
    await (await driver.$(`android=${scrollSelector}`)).waitForDisplayed({ timeout: 20000 });

    const addVisitBtn = await driver.$(`//android.widget.TextView[contains(@text, "${patientFirstName}")]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]//android.widget.Button[@text="ADD PNC VISIT"]`);
    await addVisitBtn.waitForDisplayed({ timeout: 5000 });
    await addVisitBtn.click();
}

// ── Form Filling Functions ────────────────────────────────────────────────────
async function fillDateOfDelivery(driver) {
    console.log('Processing Date of Delivery...');
    await scrollDownToText(driver, "Date of Delivery *", 2);

    const field = await driver.$('//android.widget.EditText[@text="Date of Delivery *" or @hint="Date of Delivery *"]');
    await field.waitForDisplayed({ timeout: 5000 });

    if (await isEmpty(field, 'Date of Delivery *')) {
        await field.click();
        await driver.pause(1000);
        await pickDateFromCalendar(driver, FORM_DATA.deliveryDate);
        console.log('✔ Date of Delivery filled successfully.');
    }
}

async function fillPncPeriod(driver) {
    console.log('Processing PNC Period...');
    await scrollDownToText(driver, "PNC Period *", 2);

    const spinner = await driver.$('//android.widget.Spinner[@text="PNC Period *" or @hint="PNC Period *"]');
    if (await spinner.isExisting() && (await spinner.getText()) !== FORM_DATA.pncPeriod) {
        await tapAt(driver, PNC_PERIOD_ARROW.x, PNC_PERIOD_ARROW.y);
        await driver.pause(1500);
        await tapAt(driver, PNC_PERIOD_COORDS[FORM_DATA.pncPeriod].x, PNC_PERIOD_COORDS[FORM_DATA.pncPeriod].y);
        console.log(`✔ PNC Period updated to "${FORM_DATA.pncPeriod}".`);
    }
}

async function fillPncVisitDate(driver) {
    console.log('Processing PNC Visit Date...');
    await scrollDownToText(driver, "PNC Visit Date *", 2);

    const field = await driver.$('//android.widget.EditText[@text="PNC Visit Date *" or @hint="PNC Visit Date *"]');
    await field.waitForDisplayed({ timeout: 5000 });

    if (await isEmpty(field, 'PNC Visit Date *')) {
        await field.click();
        await driver.pause(1000);
        await pickDateFromCalendar(driver, FORM_DATA.pncVisitDate);
        console.log('✔ PNC Visit Date filled successfully.');
    }
}

async function fillMotherDeath(driver) {
    console.log('Processing Mother Death...');
    await scrollDownToText(driver, "Mother Death", 2);

    const xpath = `//android.widget.TextView[@text="Mother Death"]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${FORM_DATA.maternalDeath}"]`;
    const radioButton = await driver.$(xpath);

    if (await radioButton.isExisting() && await radioButton.getAttribute('checked') !== 'true') {
        await radioButton.click();
        console.log(`✔ Mother Death set to "${FORM_DATA.maternalDeath}".`);
    }
}

async function fillDeathDate(driver) {
    console.log('Processing Date of Death...');
    await scrollDownToText(driver, "Date of Death *", 2);

    const field = await driver.$('//android.widget.EditText[@text="Date of Death *" or @hint="Date of Death *"]');
    await field.waitForDisplayed({ timeout: 5000 });

    if (await isEmpty(field, 'Date of Death *')) {
        await field.click();
        await driver.pause(1000);
        await pickDateFromCalendar(driver, FORM_DATA.deathDate);
        console.log('✔ Date of Death filled successfully.');
    }
}

async function fillCauseOfDeath(driver) {
    console.log('Processing Probable Cause of Mother Death...');
    await scrollDownToText(driver, "Probable Cause of Mother Death *", 1);

    await tapAt(driver, CAUSE_OF_DEATH_ARROW.x, CAUSE_OF_DEATH_ARROW.y);
    await driver.pause(1500);

    const coords = CAUSE_OF_DEATH_COORDS[FORM_DATA.causeOfDeath];
    await tapAt(driver, coords.x, coords.y);
    console.log(`✔ Probable Cause updated to "${FORM_DATA.causeOfDeath}".`);
}

async function fillPlaceOfDeath(driver) {
    console.log('Processing Place of Death...');
    await scrollDownToText(driver, "Place of Death *", 2);

    const spinner = await driver.$('//android.widget.Spinner[@text="Place of Death *" or @hint="Place of Death *"]');
    if (await spinner.isExisting() && (await spinner.getText()) !== FORM_DATA.placeOfDeath) {

        await tapAt(driver, PLACE_OF_DEATH_ARROW.x, PLACE_OF_DEATH_ARROW.y);
        await driver.pause(1500);

        await tapAt(driver, PLACE_OF_DEATH_COORDS[FORM_DATA.placeOfDeath].x, PLACE_OF_DEATH_COORDS[FORM_DATA.placeOfDeath].y);
        console.log(`✔ Place of Death updated to "${FORM_DATA.placeOfDeath}".`);
        await driver.pause(1000);

        if (FORM_DATA.placeOfDeath === 'Other Place of Death') {
            await scrollDownToText(driver, "Other Place", 2);
            const placeField = await driver.$('//android.widget.EditText[contains(@text, "Other Place") or contains(@hint, "Other Place")]');
            if (await placeField.isExisting()) {
                await placeField.click();
                await placeField.setValue(FORM_DATA.otherPlaceOfDeathText);
                if (await driver.isKeyboardShown()) await driver.hideKeyboard();
                console.log(`✔ "Other Place of Death" text filled with "${FORM_DATA.otherPlaceOfDeathText}".`);
            }
        }
    }
}

async function fillOtherDeathCause(driver) {
    console.log('Checking for "Other Death Cause" field...');

    const xpath = `//android.widget.EditText[@text="Other Death Cause *" or @hint="Other Death Cause *"]`;
    const otherCauseField = await driver.$(xpath);

    if (await otherCauseField.isExisting()) {
        await scrollDownToText(driver, "Other Death Cause *", 2);
        await otherCauseField.click();
        await otherCauseField.clearValue();
        await scrollDownToText(driver, "Other Death Cause *", 2);
        await otherCauseField.setValue(FORM_DATA.otherDeathCauseText);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        console.log(`✔ "Other Death Cause" filled with "${FORM_DATA.otherDeathCauseText}".`);
    } else {
        console.log('➡ "Other Death Cause" field not present, moving to next column.');
    }
}

async function fillIfaTablets(driver) {
    console.log('Processing No. of IFA Tablets given...');

    await scrollDownToText(driver, "No. of IFA Tablets given", 3);

    const xpath = `//android.widget.TextView[@text="No. of IFA Tablets given"]/following-sibling::android.widget.FrameLayout//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/etNumberInput"]`;
    const inputField = await driver.$(xpath);

    if (await inputField.isExisting() && (await inputField.getText()) !== FORM_DATA.ifaTablets) {
        await inputField.click();
        await inputField.clearValue();
        await inputField.setValue(FORM_DATA.ifaTablets);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        console.log(`✔ IFA Tablets updated to "${FORM_DATA.ifaTablets}".`);
    } else {
         console.log('➡ "No. of IFA Tablets given" field not found or already correct.');
    }
}

async function fillFamilyPlanning(driver) {
    console.log('Processing Family Planning / Postpartum Contraception (PPC)...');

    await scrollDownToText(driver, "Has the couple started", 3);

    const radioXPath = `//android.widget.TextView[contains(@text, "Has the couple started")]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${FORM_DATA.ppcStarted}"]`;
    const radioButton = await driver.$(radioXPath);

    if (await radioButton.isExisting()) {
        if (await radioButton.getAttribute('checked') !== 'true') {
            await radioButton.click();
            console.log(`✔ PPC Started set to "${FORM_DATA.ppcStarted}".`);
        } else {
             console.log(`➡ PPC Started is already set to "${FORM_DATA.ppcStarted}".`);
        }
    } else {
        console.error('❌ Could not find PPC RadioButton. Check XPath or UI state.');
    }

    if (FORM_DATA.ppcStarted === 'Yes') {
        await driver.pause(1000);
        await scrollDownToText(driver, "Method of Contraception", 2);

        const contraceptionField = await driver.$('//android.widget.Spinner[@text="Method of Contraception" or @hint="Method of Contraception"]');

        if (await contraceptionField.isExisting()) {
            const loc = await contraceptionField.getLocation();

            await tapAt(driver, 970, loc.y + 60);
            await driver.pause(1500);

            const dynamicYOffset = {
                'POST PARTUM IUCD (PPIUCD)':       -780,
                'CONDOM':                          -660,
                'MALE STERILIZATION':              -540,
                'FEMALE STERILIZATION':            -420,
                'POST PARTUM STERILIZATION (PPS)': -300,
                'MiniLap':                         -180,
                'ANY OTHER (SPECIFY)':             -60
            }[FORM_DATA.contraceptionMethod];

            await tapAt(driver, 500, loc.y + dynamicYOffset);
            console.log(`✔ Contraception Method updated to "${FORM_DATA.contraceptionMethod}".`);
        } else {
             console.error('❌ Could not find "Method of Contraception" dropdown field.');
        }
    }
}

async function fillDangerSigns(driver) {
    console.log('Processing Danger Signs...');

    await scrollDownToText(driver, "Any Danger Signs?", 3);

    const radioXPath = `//android.widget.TextView[contains(@text, "Any Danger Signs?")]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${FORM_DATA.dangerSigns}"]`;
    const radioButton = await driver.$(radioXPath);

    if (await radioButton.isExisting()) {
        if (await radioButton.getAttribute('checked') !== 'true') {
            await radioButton.click();
            console.log(`✔ Danger Signs set to "${FORM_DATA.dangerSigns}".`);
        } else {
             console.log(`➡ Danger Signs is already set to "${FORM_DATA.dangerSigns}".`);
        }
    } else {
        console.error('❌ Could not find Danger Signs RadioButton. Check XPath or UI state.');
    }

    if (FORM_DATA.dangerSigns === 'Yes') {
        await driver.pause(1000);
        await scrollDownToText(driver, "Mother Danger Sign", 2);

        const dangerSignField = await driver.$('//android.widget.Spinner[contains(@text, "Mother Danger Sign") or contains(@hint, "Mother Danger Sign")]');

        if (await dangerSignField.isExisting()) {
            const loc = await dangerSignField.getLocation();

            await tapAt(driver, 970, loc.y + 60);
            await driver.pause(1500);

            const dynamicYOffset = {
                'PPH - Excessive bleeding':          -1260,
                'FEVER':                             -1140,
                'SEPSIS':                            -1020,
                'SEVERE ABDOMINAL PAIN':             -900,
                'SEVERE HEADACHE OR BLURRED VISION': -780,
                'DIFFICULT BREATHING':               -660,
                'Yellowness of Urine, Skin or Eyes': -540,
                'Pale Skin or Eyes':                 -420,
                'Swelling on face, hands and legs':  -300,
                'Abnormal behaviour':                -180,
                'Any Other':                         -60
            }[FORM_DATA.dangerSignOption];

            await tapAt(driver, 500, loc.y + dynamicYOffset);
            console.log(`✔ Mother Danger Sign updated to "${FORM_DATA.dangerSignOption}".`);
        } else {
             console.error('❌ Could not find "Mother Danger Sign" dropdown field.');
        }
    }
}

async function fillReferralFacility(driver) {
    console.log('Processing Referral Facility...');

    await scrollDownToText(driver, "Referral Facility", 2);

    const referralField = await driver.$('//android.widget.Spinner[contains(@text, "Referral Facility") or contains(@hint, "Referral Facility")]');

    if (await referralField.isExisting()) {
        const loc = await referralField.getLocation();

        await tapAt(driver, 970, loc.y + 60);
        await driver.pause(1500);

        const dynamicYOffset = {
            'Primary Health Centre':   190,
            'Community Health Centre': 310,
            'District Hospital':       430,
            'Other Private Hospital':  550
        }[FORM_DATA.referralFacility];

        if (dynamicYOffset) {
            await tapAt(driver, 500, loc.y + dynamicYOffset);
            console.log(`✔ Referral Facility updated to "${FORM_DATA.referralFacility}".`);
        } else {
             console.error(`❌ Invalid Referral Facility option mapped in FORM_DATA.`);
        }
    } else {
         console.log('➡ "Referral Facility" field not found, skipping.');
    }
}

async function fillRemarks(driver) {
    console.log('Processing Remarks...');

    await scrollDownToText(driver, "Remarks", 2);

    const remarksField = await driver.$('//android.widget.EditText[@hint="Remarks" or @text="Remarks"]');

    if (await remarksField.isExisting()) {
        await remarksField.click();
        await remarksField.clearValue();
        await remarksField.setValue(FORM_DATA.remarks);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        console.log(`✔ Remarks filled with "${FORM_DATA.remarks}".`);
    } else {
        console.error('❌ Could not find "Remarks" field.');
    }
}

async function handleDischargeSummary(driver) {
    console.log(`Processing Delivery Discharge Summaries. Expecting to upload ${FORM_DATA.numberOfSummariesToUpload} photos...`);

    for (let i = 1; i <= FORM_DATA.numberOfSummariesToUpload; i++) {

        const summaryText = `Delivery Discharge Summary ${i}`;
        await scrollDownToText(driver, summaryText, 3);

        console.log(`Looking for: ${summaryText}`);

        const addFileXPath = `//android.widget.TextView[@text="${summaryText}"]/following-sibling::android.widget.ImageView[@content-desc="add file"]`;
        const addFileBtn = await driver.$(addFileXPath);

        if (await addFileBtn.isExisting()) {
            await addFileBtn.click();
            await driver.pause(1500);

            const pickGalleryBtn = await driver.$('//android.widget.Button[@text="Pick from Gallery" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnGallery"]');

            if (await pickGalleryBtn.isExisting()) {
                await pickGalleryBtn.click();

                const waitSeconds = FORM_DATA.manualWaitTime / 1000;
                console.log(`⏳ PLEASE SELECT AN IMAGE NOW! Waiting ${waitSeconds} seconds for you to pick the image for Summary ${i}...`);

                await driver.pause(FORM_DATA.manualWaitTime);
                console.log(`✔ Manual selection wait time finished for Summary ${i}.`);
            } else {
                 console.error('❌ "Pick from Gallery" button not found in the modal.');
            }
        } else {
            console.log(`➡ "${summaryText}" add file button not found. Moving on.`);
        }

        await driver.pause(2000);
    }
}

// ── NEW: Submit Function ──────────────────────────────────────────────────────
async function submitForm(driver) {
    console.log('Attempting to Submit form...');

    // Scroll down multiple times to ensure we hit the absolute bottom of the form
    await scrollDownToText(driver, "Submit", 4);

    const submitBtn = await driver.$('//android.widget.Button[@text="Submit" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]');

    if (await submitBtn.isExisting()) {
        await submitBtn.click();
        console.log('✔ Submit button clicked!');
    } else {
        console.error('❌ Submit button not found on screen.');
    }
}

async function fillPncForm(driver) {
    console.log("--- Starting PNC Form Entry ---");

    await fillDateOfDelivery(driver);
    await driver.pause(1000);

    await fillPncPeriod(driver);
    await driver.pause(1000);

    await fillPncVisitDate(driver);
    await driver.pause(1000);

    // Select Mother Death
    await fillMotherDeath(driver);
    await driver.pause(2000);

    if (FORM_DATA.maternalDeath === 'Yes') {
        await fillDeathDate(driver);
        await driver.pause(1000);

        await fillCauseOfDeath(driver);
        await driver.pause(1000);

        await fillPlaceOfDeath(driver);
        await driver.pause(1000);

        await fillOtherDeathCause(driver);
        await driver.pause(1000);
    } else {
         // ONLY fill these if Maternal Death is 'No'
         await fillIfaTablets(driver);
         await driver.pause(1000);

         await fillFamilyPlanning(driver);
         await driver.pause(1000);

         await fillDangerSigns(driver);
         await driver.pause(1000);

         await fillReferralFacility(driver);
         await driver.pause(1000);

         await fillRemarks(driver);
         await driver.pause(1000);
    }

    // This triggers regardless of Mother Death Yes/No
    if (FORM_DATA.uploadDischargeSummary) {
         await handleDischargeSummary(driver);
         await driver.pause(1000);
    }

    // Submit the form
    await submitForm(driver);
    await driver.pause(2000);

    console.log("✅ PNC Form entry complete.");
}

async function runTest() {
    const driver = await remote({ path: '/', port: 4723, capabilities });
    try {
        console.log("App launched...");
        await clickPnCMotherList(driver);
        await driver.pause(3000);

        await scrollAndAddPncVisit(driver, "NANDINI KARMAKAR KARMAKAR");
        await driver.pause(4000);

        await fillPncForm(driver);
    } catch (err) {
        console.error("Test failed.", err);
    } finally {
        console.log('Closing session...');
        await driver.pause(3000);
        await driver.deleteSession();
    }
}

runTest();