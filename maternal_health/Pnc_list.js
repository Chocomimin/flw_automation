// pncFormSteps.js
// ✅ DEVICE AGNOSTIC VERSION — Dropdowns handle all device scaling dynamically
// ✅ FIXED: Patient search uses a robust manual swipe loop instead of native UiScrollable.
// ✅ FIXED: Dropdowns now physically scroll inside the menu to find off-screen elements.

const { remote } = require('webdriverio');

// ─────────────────────────────────────────────────────────────
//  APPIUM CAPABILITIES
// ─────────────────────────────────────────────────────────────

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true
};

// ─────────────────────────────────────────────────────────────
//  FORM DATA
// ─────────────────────────────────────────────────────────────

const FORM_DATA = {
    deliveryDate:            { day: 5,  month: 3, year: 2026 },
    pncPeriod:               'Day 1',
    pncVisitDate:            { day: 6,  month: 3, year: 2026 },

    isMotherAlive:           'No',
    deathDate:               { day: 7,  month: 3, year: 2026 },
    causeOfDeath:            'HIGH FEVER',
    placeOfDeath:            'Other Place of Death',
    otherPlaceOfDeathText:   'Test Place',
    otherDeathCauseText:     'High fever leading to severe complications',

    ifaTablets:              '15',

    ppcStarted:              'No',
    contraceptionMethod:     'CONDOM',

    dangerSigns:             'No',
    dangerSignOption:        'FEVER',

    referralFacility:        'Other Private Hospital',

    remarks:                 'Patient seems stable',

    uploadDischargeSummary:      true,
    numberOfSummariesToUpload:   4,
    manualWaitTime:              30000
};

// ─────────────────────────────────────────────────────────────
//  CALENDAR CONSTANTS
// ─────────────────────────────────────────────────────────────

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

// ─────────────────────────────────────────────────────────────
//  DROPDOWN OPTION LISTS
// ─────────────────────────────────────────────────────────────

const OPTIONS = {
    pncPeriod: ['Day 1', 'Day 3', 'Day 7', 'Day 14', 'Day 21', 'Day 28', 'Day 42'],

    causeOfDeath: [
        'ECLAMPSIA', 'HAEMORRHAGE (PPH)', 'ANAEMIA',
        'HIGH FEVER', 'Sepsis', 'Accident', 'Any Other'
    ],

    placeOfDeath: [
        'Home', 'Subcenter', 'PHC', 'CHC', 'District Hospital',
        'Medical College Hospital', 'Private Hospital',
        'In Transit', 'Other Place of Death'
    ],

    contraceptionMethod: [
        'POST PARTUM IUCD (PPIUCD)', 'CONDOM', 'MALE STERILIZATION',
        'FEMALE STERILIZATION', 'POST PARTUM STERILIZATION (PPS)',
        'MiniLap', 'ANY OTHER (SPECIFY)'
    ],

    dangerSignOption: [
        'PPH - Excessive bleeding', 'FEVER', 'SEPSIS',
        'SEVERE ABDOMINAL PAIN', 'SEVERE HEADACHE OR BLURRED VISION',
        'DIFFICULT BREATHING', 'Yellowness of Urine, Skin or Eyes',
        'Pale Skin or Eyes', 'Swelling on face, hands and legs',
        'Abnormal behaviour', 'Any Other'
    ],

    referralFacility: [
        'Primary Health Centre', 'Community Health Centre',
        'District Hospital', 'Other Private Hospital'
    ]
};

// ─────────────────────────────────────────────────────────────
//  CORE HELPER — scroll spinner into the safe middle zone
// ─────────────────────────────────────────────────────────────

async function scrollSpinnerToMiddle(driver, spinnerSelector) {
    try {
        const spinner = await driver.$(spinnerSelector);
        const loc    = await spinner.getLocation();
        const screen = await driver.getWindowRect();
        const midY   = screen.height / 2;

        if (loc.y > midY + 100) {
            console.log(`⬆️  Spinner at y=${loc.y}, scrolling toward middle...`);
            const swipeX  = Math.floor(screen.width  / 2);
            const startY  = Math.floor(screen.height * 0.7);
            const endY    = Math.floor(screen.height * 0.3);

            await driver.performActions([{
                type: 'pointer', id: 'finger1',
                parameters: { pointerType: 'touch' },
                actions: [
                    { type: 'pointerMove', duration: 0,    x: swipeX, y: startY },
                    { type: 'pointerDown', button: 0 },
                    { type: 'pause',       duration: 200 },
                    { type: 'pointerMove', duration: 1000, x: swipeX, y: endY },
                    { type: 'pointerUp',   button: 0 }
                ]
            }]);
            await driver.releaseActions();
            await driver.pause(1500);
        }
    } catch (e) {
        console.log('⚠️  scrollSpinnerToMiddle skipped:', e.message);
    }
}

// ─────────────────────────────────────────────────────────────
//  CORE HELPER — tap by absolute coordinates
// ─────────────────────────────────────────────────────────────

async function tapByCoords(driver, tapX, tapY) {
    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0,   x: tapX, y: tapY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 150 },
            { type: 'pointerUp',   button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(500);
}

// ─────────────────────────────────────────────────────────────
//  CORE HELPER — universal spinner logic with dynamic device scaling
// ─────────────────────────────────────────────────────────────

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList, enableScroll = false) {
    await scrollSpinnerToMiddle(driver, spinnerSelector);

    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();
    const screen = await driver.getWindowRect();

    console.log(`📍 Clicking spinner to open the menu...`);
    await spinner.click();
    await driver.pause(2000);

    // ─── STRATEGY 0: Direct XPath ───
    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        if (await item.isDisplayed()) {
            await item.click();
            console.log(`✅ Selected "${value}" via XPath`);
            return;
        }
    } catch (e) {}

    // ─── STRATEGY 1: UiSelector ───
    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        if (await item.isDisplayed()) {
            await item.click();
            console.log(`✅ Selected "${value}" via UiSelector`);
            return;
        }
    } catch (e) {}

    // ─── STRATEGY 2: Bi-Directional Scroll Fallback (Used ONLY for Place of Death) ───
    if (enableScroll) {
        console.log(`⚠️ "${value}" might be off-screen. Executing physical scroll inside dropdown...`);

        const midScreenY = screen.height / 2;
        const opensUpward = loc.y > midScreenY;
        const swipeX = Math.floor(screen.width / 2);

        // Define safe swipe boundaries STRICTLY inside the popup menu
        let swipeStartY, swipeEndY;
        if (opensUpward) {
            // Menu is ABOVE the spinner
            swipeStartY = Math.floor(loc.y - 100);
            swipeEndY = Math.max(100, Math.floor(loc.y - 600));
        } else {
            // Menu is BELOW the spinner
            const spinnerBottomY = loc.y + size.height;
            swipeStartY = Math.floor(spinnerBottomY + 500);
            swipeEndY = Math.floor(spinnerBottomY + 50);
        }

        const checkAndClickElement = async () => {
            try {
                const item = await driver.$(`android=new UiSelector().className("android.widget.CheckedTextView").textContains("${value}")`);
                if (await item.isExisting() && await item.isDisplayed()) {
                    await item.click();
                    return true;
                }
            } catch (e) {}
            return false;
        };

        const maxSwipes = 3;

        // Phase A: Swipe Forward (Up)
        let found = await checkAndClickElement();
        if (!found) {
            for (let i = 0; i < maxSwipes; i++) {
                console.log(`   Swiping UP inside menu (Swipe ${i + 1}/${maxSwipes})...`);
                await driver.performActions([{
                    type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
                    actions: [
                        { type: 'pointerMove', duration: 0, x: swipeX, y: swipeStartY },
                        { type: 'pointerDown', button: 0 },
                        { type: 'pause', duration: 200 },
                        { type: 'pointerMove', duration: 1000, x: swipeX, y: swipeEndY },
                        { type: 'pointerUp', button: 0 }
                    ]
                }]);
                await driver.releaseActions();
                await driver.pause(1500);

                if (await checkAndClickElement()) {
                    console.log(`✅ Selected "${value}" after scrolling dropdown.`);
                    return;
                }
            }
        }

        // Phase B: If not found, Reverse Direction (Swipe Down)
        if (!found) {
            console.log(`   Not found swiping UP. Reversing direction to swipe DOWN...`);
            for (let i = 0; i < maxSwipes; i++) {
                console.log(`   Swiping DOWN inside menu (Swipe ${i + 1}/${maxSwipes})...`);
                await driver.performActions([{
                    type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
                    actions: [
                        { type: 'pointerMove', duration: 0, x: swipeX, y: swipeEndY }, // Reversed coords
                        { type: 'pointerDown', button: 0 },
                        { type: 'pause', duration: 200 },
                        { type: 'pointerMove', duration: 1000, x: swipeX, y: swipeStartY },
                        { type: 'pointerUp', button: 0 }
                    ]
                }]);
                await driver.releaseActions();
                await driver.pause(1500);

                if (await checkAndClickElement()) {
                    console.log(`✅ Selected "${value}" after scrolling dropdown.`);
                    return;
                }
            }
        }
    }

    // ─── STRATEGY 3: Dynamic Coordinate Fallback (Absolute Last Resort) ───
    console.log(`⚠️ Search failed. Attempting blind coordinate fallback...`);
    const idx = optionsList.indexOf(value);
    if (idx === -1) throw new Error(`❌ "${value}" not in list: [${optionsList.join(', ')}]`);

    const rowHeight = size.height;
    const midScreenY = screen.height / 2;
    const opensUpward = loc.y > midScreenY;

    const finalTapX = Math.floor(loc.x + (size.width / 2));
    let finalTapY;

    if (opensUpward) {
        const reversedIdx = (optionsList.length - 1) - idx;
        finalTapY = Math.floor(loc.y - (reversedIdx * rowHeight) - (rowHeight / 2));
        console.log(`⬆️ Menu opened UPWARDS on this device layout.`);
    } else {
        const spinnerBottomY = loc.y + size.height;
        finalTapY = Math.floor(spinnerBottomY + (idx * rowHeight) + (rowHeight / 2));
        console.log(`⬇️ Menu opened DOWNWARDS on this device layout.`);
    }

    finalTapY = Math.max(50, Math.min(finalTapY, screen.height - 150));
    console.log(`👆 Executing scaling dynamic click at (${finalTapX}, ${finalTapY})`);
    await tapByCoords(driver, finalTapX, finalTapY);
    await driver.pause(1500);
}

async function scrollIntoViewByText(driver, text) {
    await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${text}"))`);
    await driver.pause(1000);
}

// ─────────────────────────────────────────────────────────────
//  HELPER — calendar utilities
// ─────────────────────────────────────────────────────────────

async function getCalendarMonthYear(driver) {
    try {
        const dayEl       = await driver.$('android=new UiSelector().text("15")');
        const contentDesc = await dayEl.getAttribute('content-desc');
        const parts       = contentDesc.split(' ');
        return { month: MONTH_NAMES.indexOf(parts[1]), year: parseInt(parts[2]) };
    } catch { return null; }
}

async function navigateToMonth(driver, targetMonth, targetYear) {
    const yearHeader = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_header_year")');
    await yearHeader.waitForDisplayed({ timeout: 5000 });
    const currentYear = parseInt(await yearHeader.getText());

    if (currentYear !== targetYear) {
        await yearHeader.click();
        await driver.pause(1000);

        const yearEl = await driver.$(`android=new UiScrollable(new UiSelector().resourceId("android:id/animator")).scrollIntoView(new UiSelector().text("${targetYear}"))`);
        await yearEl.click();
        await driver.pause(1000);
    }

    for (let i = 0; i < 12; i++) {
        const cur = await getCalendarMonthYear(driver);
        if (!cur || cur.month === targetMonth) break;

        const btnId = cur.month > targetMonth ? "android:id/prev" : "android:id/next";
        const navBtn = await driver.$(`android=new UiSelector().resourceId("${btnId}")`);
        await navBtn.click();

        await driver.pause(500);
    }
}

async function pickDateFromCalendar(driver, dateObj) {
    const { day, month, year } = dateObj;
    await (await driver.$('android=new UiSelector().resourceId("android:id/datePicker")')).waitForDisplayed({ timeout: 5000 });

    await navigateToMonth(driver, month, year);

    const formattedDay = String(day).padStart(2, '0');
    const dayDesc = `${formattedDay} ${MONTH_NAMES[month]} ${year}`;
    await (await driver.$(`android=new UiSelector().description("${dayDesc}")`)).click();
    await driver.pause(500);

    const okBtn = await driver.$('android=new UiSelector().resourceId("android:id/button1")');
    await okBtn.click();
}

async function isEmpty(field, hintText) {
    try {
        const text = await field.getText();
        return !text || text.trim() === '' || text.trim() === hintText.trim();
    } catch { return true; }
}

// ─────────────────────────────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────────────────────────────

async function clickPnCMotherList(driver) {
    console.log('Attempting to click PNC Mother List...');
    const pncCard = await driver.$('//android.widget.TextView[@text="PNC Mother List"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_icon"]');
    await pncCard.waitForDisplayed({ timeout: 10000 });
    await pncCard.click();
}

// ✅ FIXED: Device-agnostic manual swiping loop instead of native UiScrollable
async function scrollAndAddPncVisit(driver, patientFirstName) {
    console.log(`Scrolling to find: ${patientFirstName}...`);

    const screen = await driver.getWindowRect();
    const swipeX = Math.floor(screen.width / 2);
    const startY = Math.floor(screen.height * 0.75); // Start lower down the screen
    const endY   = Math.floor(screen.height * 0.25); // Swipe higher up the screen

    let found = false;
    const maxSwipes = 20; // Hard limit to prevent infinite loops

    // Specifically target the exact ADD PNC VISIT button inside that patient's card
    const addVisitBtnXPath = `//android.widget.TextView[contains(@text, "${patientFirstName}")]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]//android.widget.Button[@text="ADD PNC VISIT"]`;

    for (let i = 0; i < maxSwipes; i++) {
        const addVisitBtn = await driver.$(addVisitBtnXPath);

        if (await addVisitBtn.isExisting() && await addVisitBtn.isDisplayed()) {
            console.log(`✅ Found card for ${patientFirstName}.`);

            // Do one extra small "nudge" swipe to make absolutely sure the button isn't cut off by a bottom navigation bar
            await driver.performActions([{
                type: 'pointer', id: 'finger1',
                parameters: { pointerType: 'touch' },
                actions: [
                    { type: 'pointerMove', duration: 0,    x: swipeX, y: Math.floor(screen.height * 0.6) },
                    { type: 'pointerDown', button: 0 },
                    { type: 'pause',       duration: 200 },
                    { type: 'pointerMove', duration: 1000, x: swipeX, y: Math.floor(screen.height * 0.4) },
                    { type: 'pointerUp',   button: 0 }
                ]
            }]);
            await driver.releaseActions();
            await driver.pause(1000);

            console.log('📍 Clicking "ADD PNC VISIT" button...');
            await addVisitBtn.click();
            found = true;
            break;
        }

        // If not found, swipe up (scroll down the list)
        console.log(`Swiping down to find patient... (Swipe ${i + 1}/${maxSwipes})`);
        await driver.performActions([{
            type: 'pointer', id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0,    x: swipeX, y: startY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause',       duration: 200 },
                { type: 'pointerMove', duration: 1000, x: swipeX, y: endY },
                { type: 'pointerUp',   button: 0 }
            ]
        }]);
        await driver.releaseActions();
        await driver.pause(1500); // Give the list time to load new elements
    }

    if (!found) {
        throw new Error(`❌ Could not find patient "${patientFirstName}" after ${maxSwipes} swipes.`);
    }
}

// ─────────────────────────────────────────────────────────────
//  FORM FIELD FILLERS
// ─────────────────────────────────────────────────────────────

async function fillDateOfDelivery(driver) {
    console.log('Processing Date of Delivery...');
    await scrollIntoViewByText(driver, 'Date of Delivery');

    const field = await driver.$('//android.widget.EditText[@text="Date of Delivery *" or @hint="Date of Delivery *"]');
    await field.waitForDisplayed({ timeout: 5000 });

    if (await isEmpty(field, 'Date of Delivery *')) {
        await field.click();
        await driver.pause(1000);
        await pickDateFromCalendar(driver, FORM_DATA.deliveryDate);
        console.log('✔ Date of Delivery filled.');
    }
}

async function fillPncPeriod(driver) {
    console.log('Processing PNC Period...');
    await scrollIntoViewByText(driver, 'PNC Period');

    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().className("android.widget.Spinner").textContains("PNC Period")',
        FORM_DATA.pncPeriod,
        OPTIONS.pncPeriod
    );
    console.log(`✔ PNC Period set to "${FORM_DATA.pncPeriod}".`);
}

async function fillPncVisitDate(driver) {
    console.log('Processing PNC Visit Date...');
    await scrollIntoViewByText(driver, 'PNC Visit Date');

    const field = await driver.$('//android.widget.EditText[@text="PNC Visit Date *" or @hint="PNC Visit Date *"]');
    await field.waitForDisplayed({ timeout: 5000 });

    if (await isEmpty(field, 'PNC Visit Date *')) {
        await field.click();
        await driver.pause(1000);
        await pickDateFromCalendar(driver, FORM_DATA.pncVisitDate);
        console.log('✔ PNC Visit Date filled.');
    }
}

async function fillIsMotherAlive(driver) {
    console.log('Processing Is the Mother alive?...');
    await scrollIntoViewByText(driver, 'Is the Mother alive?');

    const xpath = `//android.widget.TextView[contains(@text, "Is the Mother alive?")]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${FORM_DATA.isMotherAlive}"]`;
    const radioButton = await driver.$(xpath);

    if (await radioButton.isExisting() && await radioButton.getAttribute('checked') !== 'true') {
        await radioButton.click();
        console.log(`✔ Is Mother Alive set to "${FORM_DATA.isMotherAlive}".`);
    }
}

async function fillDeathDate(driver) {
    console.log('Processing Date of Death...');
    await scrollIntoViewByText(driver, 'Date of Death');

    const field = await driver.$('//android.widget.EditText[@text="Date of Death *" or @hint="Date of Death *"]');
    await field.waitForDisplayed({ timeout: 5000 });

    if (await isEmpty(field, 'Date of Death *')) {
        await field.click();
        await driver.pause(1000);
        await pickDateFromCalendar(driver, FORM_DATA.deathDate);
        console.log('✔ Date of Death filled.');
    }
}

async function fillCauseOfDeath(driver) {
    console.log('Processing Reason for Death...');
    await scrollIntoViewByText(driver, 'Reason for Death');

    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().className("android.widget.Spinner").textContains("Reason for Death")',
        FORM_DATA.causeOfDeath,
        OPTIONS.causeOfDeath
    );
    console.log(`✔ Reason for Death set to "${FORM_DATA.causeOfDeath}".`);
}

async function fillPlaceOfDeath(driver) {
    console.log('Processing Place of Death...');
    await scrollIntoViewByText(driver, 'Place of Death');

    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().className("android.widget.Spinner").textContains("Place of Death")',
        FORM_DATA.placeOfDeath,
        OPTIONS.placeOfDeath,
        true // <--- ENABLE SCROLL FALLBACK ONLY HERE
    );
    console.log(`✔ Place of Death set to "${FORM_DATA.placeOfDeath}".`);
    await driver.pause(1000);

    if (FORM_DATA.placeOfDeath === 'Other Place of Death') {
        await scrollIntoViewByText(driver, 'Other Place');
        const placeField = await driver.$('//android.widget.EditText[contains(@text, "Other Place") or contains(@hint, "Other Place")]');
        if (await placeField.isExisting()) {
            await placeField.click();
            await placeField.setValue(FORM_DATA.otherPlaceOfDeathText);
            if (await driver.isKeyboardShown()) await driver.hideKeyboard();
            console.log(`✔ Other Place of Death filled with "${FORM_DATA.otherPlaceOfDeathText}".`);
        }
    }
}

async function fillOtherDeathCause(driver) {
    console.log('Checking for "Other Death Cause" field...');
    const xpath = `//android.widget.EditText[@text="Other Death Cause *" or @hint="Other Death Cause *"]`;
    const otherCauseField = await driver.$(xpath);

    if (await otherCauseField.isExisting()) {
        await scrollIntoViewByText(driver, 'Other Death Cause');
        await otherCauseField.click();
        await otherCauseField.clearValue();
        await otherCauseField.setValue(FORM_DATA.otherDeathCauseText);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        console.log(`✔ Other Death Cause filled with "${FORM_DATA.otherDeathCauseText}".`);
    } else {
        console.log('➡ "Other Death Cause" field not present, skipping.');
    }
}

async function fillIfaTablets(driver) {
    console.log('Processing No. of IFA Tablets given...');
    await scrollIntoViewByText(driver, 'No. of IFA Tablets given');

    const xpath = `//android.widget.TextView[@text="No. of IFA Tablets given"]/following-sibling::android.widget.FrameLayout//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/etNumberInput"]`;
    const inputField = await driver.$(xpath);

    if (await inputField.isExisting() && (await inputField.getText()) !== FORM_DATA.ifaTablets) {
        await inputField.click();
        await inputField.clearValue();
        await inputField.setValue(FORM_DATA.ifaTablets);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        console.log(`✔ IFA Tablets set to "${FORM_DATA.ifaTablets}".`);
    } else {
        console.log('➡ IFA Tablets field not found or already correct.');
    }
}

async function fillFamilyPlanning(driver) {
    console.log('Processing Family Planning / PPC...');
    await scrollIntoViewByText(driver, 'Has the couple started');

    const radioXPath = `//android.widget.TextView[contains(@text, "Has the couple started")]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${FORM_DATA.ppcStarted}"]`;
    const radioButton = await driver.$(radioXPath);

    if (await radioButton.isExisting() && await radioButton.getAttribute('checked') !== 'true') {
        await radioButton.click();
        console.log(`✔ PPC Started set to "${FORM_DATA.ppcStarted}".`);
    }

    if (FORM_DATA.ppcStarted === 'Yes') {
        await driver.pause(1000);
        await scrollIntoViewByText(driver, 'Method of Contraception');

        await clickSpinnerAndSelectOption(
            driver,
            'android=new UiSelector().className("android.widget.Spinner").textContains("Method of Contraception")',
            FORM_DATA.contraceptionMethod,
            OPTIONS.contraceptionMethod
        );
        console.log(`✔ Contraception Method set to "${FORM_DATA.contraceptionMethod}".`);
    }
}

async function fillDangerSigns(driver) {
    console.log('Processing Danger Signs...');
    await scrollIntoViewByText(driver, 'Any Danger Signs?');

    const radioXPath = `//android.widget.TextView[contains(@text, "Any Danger Signs?")]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${FORM_DATA.dangerSigns}"]`;
    const radioButton = await driver.$(radioXPath);

    if (await radioButton.isExisting() && await radioButton.getAttribute('checked') !== 'true') {
        await radioButton.click();
        console.log(`✔ Danger Signs set to "${FORM_DATA.dangerSigns}".`);
    }

    if (FORM_DATA.dangerSigns === 'Yes') {
        await driver.pause(1000);
        await scrollIntoViewByText(driver, 'Mother Danger Sign');

        await clickSpinnerAndSelectOption(
            driver,
            'android=new UiSelector().className("android.widget.Spinner").textContains("Mother Danger Sign")',
            FORM_DATA.dangerSignOption,
            OPTIONS.dangerSignOption
        );
        console.log(`✔ Mother Danger Sign set to "${FORM_DATA.dangerSignOption}".`);
    }
}

async function fillReferralFacility(driver) {
    console.log('Processing Referral Facility...');
    await scrollIntoViewByText(driver, 'Referral Facility');

    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().className("android.widget.Spinner").textContains("Referral Facility")',
        FORM_DATA.referralFacility,
        OPTIONS.referralFacility
    );
    console.log(`✔ Referral Facility set to "${FORM_DATA.referralFacility}".`);
}

async function fillRemarks(driver) {
    console.log('Processing Remarks...');
    await scrollIntoViewByText(driver, 'Remarks');

    const remarksField = await driver.$('//android.widget.EditText[@hint="Remarks" or @text="Remarks"]');
    if (await remarksField.isExisting()) {
        await remarksField.click();
        await remarksField.clearValue();
        await remarksField.setValue(FORM_DATA.remarks);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        console.log(`✔ Remarks filled with "${FORM_DATA.remarks}".`);
    } else {
        console.error('❌ "Remarks" field not found.');
    }
}

async function handleDischargeSummary(driver) {
    console.log(`Processing Delivery Discharge Summaries (${FORM_DATA.numberOfSummariesToUpload} photos)...`);

    for (let i = 1; i <= FORM_DATA.numberOfSummariesToUpload; i++) {
        const summaryText = `Delivery Discharge Summary ${i}`;
        await scrollIntoViewByText(driver, summaryText);
        console.log(`Looking for: ${summaryText}`);

        const addFileXPath = `//android.widget.TextView[@text="${summaryText}"]/following-sibling::android.widget.ImageView[@content-desc="add file"]`;
        const addFileBtn   = await driver.$(addFileXPath);

        if (await addFileBtn.isExisting()) {
            await addFileBtn.click();
            await driver.pause(1500);

            const pickGalleryBtn = await driver.$('//android.widget.Button[@text="Pick from Gallery" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnGallery"]');
            if (await pickGalleryBtn.isExisting()) {
                await pickGalleryBtn.click();
                const waitSecs = FORM_DATA.manualWaitTime / 1000;
                console.log(`⏳ PLEASE SELECT AN IMAGE NOW! Waiting ${waitSecs}s for Summary ${i}...`);
                await driver.pause(FORM_DATA.manualWaitTime);
                console.log(`✔ Manual wait finished for Summary ${i}.`);
            } else {
                console.error('❌ "Pick from Gallery" button not found.');
            }
        } else {
            console.log(`➡ "${summaryText}" add-file button not found, skipping.`);
        }

        await driver.pause(2000);
    }
}

async function submitForm(driver) {
    console.log('Submitting form...');
    await scrollIntoViewByText(driver, 'Submit');

    const submitBtn = await driver.$('//android.widget.Button[@text="Submit" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]');
    if (await submitBtn.isExisting()) {
        await submitBtn.click();
        console.log('✔ Submit clicked!');
    } else {
        console.error('❌ Submit button not found.');
    }
}

async function handlePostSubmitAlert(driver, clickYes = false) {
    console.log('Checking for post-submit incentive alert...');

    try {
        // Look for the dialog message
        const messageEl = await driver.$('//android.widget.TextView[@resource-id="android:id/message"]');

        // Wait up to 5 seconds for the dialog to appear after hitting submit
        await messageEl.waitForDisplayed({ timeout: 5000 });

        const text = await messageEl.getText();
        if (text.includes('claim your Incentive')) {
            console.log(`Alert found: "${text}"`);

            if (clickYes) {
                const yesBtn = await driver.$('//android.widget.Button[@resource-id="android:id/button1" and @text="Yes"]');
                await yesBtn.click();
                console.log('✔ Clicked "Yes" on the incentive alert.');
            } else {
                const noBtn = await driver.$('//android.widget.Button[@resource-id="android:id/button2" and @text="No"]');
                await noBtn.click();
                console.log('✔ Clicked "No" on the incentive alert.');
            }
        }
    } catch (e) {
        console.log('➡ No post-submit alert appeared within the timeout.');
    }
}
async function fillPncForm(driver) {
    console.log('--- Starting PNC Form Entry ---');

    await fillDateOfDelivery(driver);  await driver.pause(1000);
    await fillPncPeriod(driver);       await driver.pause(1000);
    await fillPncVisitDate(driver);    await driver.pause(1000);
    await fillIsMotherAlive(driver);   await driver.pause(2000);

    if (FORM_DATA.isMotherAlive === 'No') {
        console.log('➡ Mother is marked as deceased. Filling death details only...');
        await fillDeathDate(driver);        await driver.pause(1000);
        await fillCauseOfDeath(driver);     await driver.pause(1000);
        await fillPlaceOfDeath(driver);     await driver.pause(1000);
        await fillOtherDeathCause(driver);  await driver.pause(1000);
    }
    else {
        console.log('➡ Mother is marked as alive. Filling general PNC details...');
        await fillIfaTablets(driver);       await driver.pause(1000);
        await fillFamilyPlanning(driver);   await driver.pause(1000);
        await fillDangerSigns(driver);      await driver.pause(1000);
        await fillReferralFacility(driver); await driver.pause(1000);
        await fillRemarks(driver);          await driver.pause(1000);

        if (FORM_DATA.uploadDischargeSummary) {
            await handleDischargeSummary(driver);
            await driver.pause(1000);
        }
    }

    await submitForm(driver);
    await driver.pause(2000);
    await handlePostSubmitAlert(driver, true); // Change to true if you want to click "Yes" on the incentive alert
    console.log('✅ PNC Form entry complete.');
}

// ─────────────────────────────────────────────────────────────
//  ENTRY POINT
// ─────────────────────────────────────────────────────────────

async function runTest() {
    const driver = await remote({ path: '/', port: 4723, capabilities });
    try {
        console.log('App launched...');
        await clickPnCMotherList(driver);
        await driver.pause(3000);

        await scrollAndAddPncVisit(driver, 'MIRA KARMAKAR');
        await driver.pause(4000);

        await fillPncForm(driver);
    } catch (err) {
        console.error('Test failed.', err);
    } finally {
        console.log('Closing session...');
        await driver.pause(3000);
        await driver.deleteSession();
    }
}

runTest();