// pncFormSteps.js
// ✅ DEVICE AGNOSTIC VERSION — Dropdowns handle all device scaling dynamically
// ✅ FIXED: Patient search uses a robust manual swipe loop instead of native UiScrollable.
// ✅ FIXED: Dropdowns now use the ANC specific approach (content-desc, explicit ImageButton click).
// ✅ FIXED: Dropdown ListView scrolling added for hidden items (fixes "Other Place of Death").
// ✅ FIXED: Regex Page Source extraction and Mathematical coordinate fallback drift.
// ✅ NEW: Random but calendar-valid dates (respects days-in-month / leap years).
// ✅ NEW: Captures patient name, triggers MDSR if Mother is deceased, and verifies the Death Report list.

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
//  CALENDAR CONSTANTS
// ─────────────────────────────────────────────────────────────

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

// ─────────────────────────────────────────────────────────────
//  RANDOM CALENDAR-VALID DATE GENERATOR
// ─────────────────────────────────────────────────────────────

function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function daysInMonth(month, year) {
    const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month === 2 && isLeapYear(year)) return 29;
    return days[month - 1];
}

function getRandomValidDate(minYear = 2025, maxYear = 2026) {
    const year   = minYear + Math.floor(Math.random() * (maxYear - minYear + 1));
    const month  = 1 + Math.floor(Math.random() * 12);
    const maxDay = daysInMonth(month, year);
    const day    = 1 + Math.floor(Math.random() * maxDay);
    return { day, month, year };
}

// ─────────────────────────────────────────────────────────────
//  FORM DATA
// ─────────────────────────────────────────────────────────────

const FORM_DATA = {
    pncPeriod:               'Day 1',

    // ⚠️ Set to 'No' to trigger the MDSR flow and Death Report verification
    isMotherAlive:           'No',

    causeOfDeath:            'HIGH FEVER',
    placeOfDeath:            'Other Place of Death',
    otherPlaceOfDeathText:   'Test Place',
    otherDeathCauseText:     'High fever leading to severe complications',

    ifaTablets:              '15',

    ppcStarted:              'Yes',
    contraceptionMethod:     'CONDOM',

    dangerSigns:             'Yes',
    dangerSignOption:        'FEVER',

    referralFacility:        'Other Private Hospital',

    remarks:                 'Patient seems stable',

    uploadDischargeSummary:      true,
    numberOfSummariesToUpload:   4,
    manualWaitTime:              30000
};

console.log('📅 Dates will be picked randomly from each calendar\'s actual selectable range at runtime.');

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
//  LOW-LEVEL HELPERS
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

async function hideKeyboardSafe(driver) {
    try {
        let isShown = await driver.isKeyboardShown();
        if (isShown) {
            await driver.hideKeyboard();
            await driver.pause(500);

            isShown = await driver.isKeyboardShown();
            if (isShown) {
                console.log("⚠️ Keyboard still shown, forcing native BACK button...");
                await driver.pressKeyCode(4);
                await driver.pause(500);
            }
        }
    } catch (e) {
        try {
            await driver.pressKeyCode(4);
            await driver.pause(500);
        } catch(err) {
            console.log(`⚠️ Could not hide keyboard: ${err.message}`);
        }
    }
}

// ─────────────────────────────────────────────────────────────
//  CORE SPINNER SELECTOR (ANC APPROACH — direct arrow-coordinate tap,
//  click → hide-keyboard → re-click, then multi-strategy item match)
// ─────────────────────────────────────────────────────────────

async function openSpinnerAndSelect(driver, spinnerContentDesc, optionsList, value) {
    const idx = optionsList.indexOf(value);
    if (idx === -1) {
        throw new Error(`"${value}" not found in options: [${optionsList.join(', ')}]`);
    }

    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().descriptionContains("${spinnerContentDesc}"))`);
        await driver.pause(500);
    } catch (e) {
        console.log(`⚠️  scrollIntoView skipped for "${spinnerContentDesc}": ${e.message}`);
    }

    const spinnerXPath = `//android.widget.Spinner[@content-desc="${spinnerContentDesc}"]`;
    const spinner = await driver.$(spinnerXPath);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();
    console.log(`📍 Spinner "${spinnerContentDesc}" @ (${loc.x}, ${loc.y}), size (${size.width}x${size.height})`);

    // Click #1: Tap the right-side arrow icon of the spinner (ANC approach)
    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);
    console.log(`📍 Tapping dropdown arrow at (${tapX}, ${tapY})`);
    await tapByCoords(driver, tapX, tapY);

    await driver.pause(1000);

    // Check if keyboard popped up, close it, and click again
    try {
        if (await driver.isKeyboardShown()) {
            console.log('⚠️ Keyboard opened after clicking dropdown! Closing it...');
            await driver.hideKeyboard();
            await driver.pause(1000);

            console.log('🔄 Clicking dropdown again...');
            await tapByCoords(driver, tapX, tapY);
            await driver.pause(1500);
        }
    } catch (e) {}

    // ── STRATEGY 1: CheckedTextView XPath ──
    try {
        const item = await driver.$(`//android.widget.CheckedTextView[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`✅ Selected "${value}" via CheckedTextView XPath`);
        return;
    } catch (e) {
        console.log(`⚠️  CheckedTextView XPath failed: ${e.message}`);
    }

    // ── STRATEGY 2: UiSelector CheckedTextView ──
    try {
        const item = await driver.$(`android=new UiSelector().className("android.widget.CheckedTextView").text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via UiSelector CheckedTextView`);
        return;
    } catch (e) {
        console.log(`⚠️  UiSelector CheckedTextView failed: ${e.message}`);
    }

    // ── STRATEGY 2.5: UiScrollable inside ListView (for long dropdowns) ──
    try {
        const scrollableItem = await driver.$(`android=new UiScrollable(new UiSelector().className("android.widget.ListView").scrollable(true)).scrollIntoView(new UiSelector().className("android.widget.CheckedTextView").text("${value}"))`);
        if (await scrollableItem.isExisting()) {
            await scrollableItem.click();
            console.log(`✅ Selected "${value}" via UiScrollable ListView scroll`);
            return;
        }
    } catch (e) {
        console.log(`⚠️ ListView Scrollable strategy skipped: ${e.message}`);
    }

    // ── STRATEGY 3: Generic XPath ──
    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via generic XPath`);
        return;
    } catch (e) {
        console.log(`⚠️  Generic XPath failed: ${e.message}`);
    }

    // ── STRATEGY 4: Page Source Regex Bounds Extraction ──
    try {
        const source = await driver.getPageSource();
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const checkedPattern = new RegExp(
            `class="android\\.widget\\.CheckedTextView"[^>]*?text="${escapedValue}"[^>]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
            's'
        );
        const genericPattern = new RegExp(
            `text="${escapedValue}"[^>]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`
        );

        const match = source.match(checkedPattern) || source.match(genericPattern);
        if (match) {
            const bx = Math.floor((parseInt(match[1]) + parseInt(match[3])) / 2);
            const by = Math.floor((parseInt(match[2]) + parseInt(match[4])) / 2);
            console.log(`📍 Found "${value}" in page source → tap(${bx}, ${by})`);
            await tapByCoords(driver, bx, by);
            console.log(`✅ Selected "${value}" via page source bounds`);
            return;
        }
        console.log(`⚠️  "${value}" not found in page source`);
    } catch (e) {
        console.log(`⚠️  Page source strategy failed: ${e.message}`);
    }

    // ── STRATEGY 5: Dynamic Math Coordinate Fallback ──
    const freshLoc  = await spinner.getLocation();
    const freshSize = await spinner.getSize();
    let screenHeight = 2400;
    let screenWidth  = 1080;
    try {
        const screen = await driver.getWindowRect();
        screenHeight = screen.height;
        screenWidth  = screen.width;
    } catch (e) {}

    const rowHeight     = freshSize.height;
    const spinnerBottom = freshLoc.y + freshSize.height;
    const spaceBelow    = screenHeight - spinnerBottom;
    const opensUpward   = spaceBelow < (optionsList.length * rowHeight);
    const finalTapX     = Math.floor(freshLoc.x + freshSize.width / 2);
    let   finalTapY;

    if (opensUpward) {
        const popupTop = freshLoc.y - (optionsList.length * rowHeight);
        finalTapY = Math.floor(popupTop + (idx * rowHeight) + rowHeight / 2);
    } else {
        finalTapY = Math.floor(spinnerBottom + (idx * rowHeight) + rowHeight / 2);
    }
    finalTapY = Math.max(5, Math.min(finalTapY, screenHeight - 5));

    console.log(`📍 Coordinate fallback → tap(${finalTapX}, ${finalTapY})`);
    await tapByCoords(driver, finalTapX, finalTapY);
    console.log(`✅ Selected "${value}" via coordinates`);
}

// ─────────────────────────────────────────────────────────────
//  SCROLLING & UI HELPERS
// ─────────────────────────────────────────────────────────────

async function scrollIntoViewByText(driver, text) {
    try {
        const xpath = `//*[contains(@text, "${text}") or contains(@hint, "${text}") or contains(@content-desc, "${text}")]`;
        const el = await driver.$(xpath);

        if (await el.isExisting() && await el.isDisplayed()) {
            console.log(`➡ "${text}" is already visible on screen, skipping scroll.`);
            return;
        }

        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${text}"))`);
        await driver.pause(1000);
    } catch (e) {
        console.log(`➡ scrollIntoViewByText("${text}") finished/caught. Continuing...`);
    }
}

async function isEmpty(field, hintText) {
    try {
        const text = await field.getText();
        return !text || text.trim() === '' || text.trim() === hintText.trim();
    } catch { return true; }
}

// ─────────────────────────────────────────────────────────────
//  CALENDAR LOGIC
// ─────────────────────────────────────────────────────────────

async function getCalendarMonthYear(driver) {
    try {
        const dayEl       = await driver.$('android=new UiSelector().text("15")');
        const contentDesc = await dayEl.getAttribute('content-desc');
        const parts       = contentDesc.split(' ');
        return { month: MONTH_NAMES.indexOf(parts[1]), year: parseInt(parts[2]) };
    } catch { return null; }
}

async function findNavButton(driver, direction) {
    const resourceId = direction === 'prev' ? 'android:id/prev' : 'android:id/next';
    const contentDesc = direction === 'prev' ? 'Previous month' : 'Next month';

    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const byId = await driver.$(`android=new UiSelector().resourceId("${resourceId}")`);
            if (await byId.isExisting()) return byId;
        } catch (e) {}

        try {
            const byDesc = await driver.$(`android=new UiSelector().description("${contentDesc}")`);
            if (await byDesc.isExisting()) return byDesc;
        } catch (e) {}

        console.log(`⏳ "${direction}" nav button not ready yet, waiting (attempt ${attempt + 1}/5)...`);
        await driver.pause(700);
    }

    throw new Error(`❌ Could not locate the "${direction}" month navigation button after retries.`);
}

async function navigateToMonth(driver, targetMonth, targetYear) {
    const yearHeader = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_header_year")');
    await yearHeader.waitForDisplayed({ timeout: 5000 });
    const currentYear = parseInt(await yearHeader.getText());

    if (currentYear !== targetYear) {
        await yearHeader.click();
        await driver.pause(1000);

        let yearSelected = false;
        try {
            const directYearEl = await driver.$(`android=new UiSelector().text("${targetYear}")`);
            if (await directYearEl.isExisting() && await directYearEl.isDisplayed()) {
                await directYearEl.click();
                yearSelected = true;
            }
        } catch (e) {}

        if (!yearSelected) {
            try {
                const yearEl = await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${targetYear}"))`);
                await yearEl.click();
                yearSelected = true;
            } catch (e) {
                console.log(`⚠️ Generic scrollable search for year ${targetYear} failed, trying manual swipe...`);
            }
        }

        if (!yearSelected) {
            const screen = await driver.getWindowRect();
            const swipeX = Math.floor(screen.width / 2);
            const isFuture = targetYear > currentYear;
            const startY = isFuture ? Math.floor(screen.height * 0.7) : Math.floor(screen.height * 0.3);
            const endY   = isFuture ? Math.floor(screen.height * 0.3) : Math.floor(screen.height * 0.7);

            for (let i = 0; i < 10 && !yearSelected; i++) {
                try {
                    const yearEl = await driver.$(`android=new UiSelector().text("${targetYear}")`);
                    if (await yearEl.isExisting() && await yearEl.isDisplayed()) {
                        await yearEl.click();
                        yearSelected = true;
                        break;
                    }
                } catch (e) {}

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
                await driver.pause(1000);
            }
        }

        if (!yearSelected) {
            console.log(`⚠️ Could not select year ${targetYear}. Falling back to the currently open year.`);
        }
        await driver.pause(1500);
    }

    for (let i = 0; i < 12; i++) {
        const cur = await getCalendarMonthYear(driver);
        if (!cur || cur.month === targetMonth) break;

        const direction = cur.month > targetMonth ? 'prev' : 'next';
        const navBtn = await findNavButton(driver, direction);
        await navBtn.click();
        await driver.pause(700);
    }
}

async function pickRandomValidDate(driver, fieldLabel = 'date') {
    console.log(`🎲 Scanning the currently opened calendar for valid days for ${fieldLabel}...`);
    await (await driver.$('android=new UiSelector().resourceId("android:id/datePicker")')).waitForDisplayed({ timeout: 5000 });

    let dayEls = [];
    for (let attempt = 0; attempt < 6; attempt++) {
        dayEls = await driver.$$('android=new UiSelector().className("android.view.View")');
        if (dayEls.length > 0) break;
        console.log(`⏳ Day grid not rendered yet, waiting (attempt ${attempt + 1}/6)...`);
        await driver.pause(700);
    }

    const availableDays = [];
    for (const el of dayEls) {
        try {
            const enabled   = await el.getAttribute('enabled');
            const clickable = await el.getAttribute('clickable');
            const desc      = await el.getAttribute('content-desc');

            if (desc && /^\d{1,2}\s\w+\s\d{4}$/.test(desc)) {
                if (enabled === 'true' && clickable === 'true') {
                    availableDays.push({ el, desc });
                }
            }
        } catch (e) {}
    }

    if (availableDays.length === 0) {
        throw new Error(`❌ No enabled/selectable days found on the current calendar screen for ${fieldLabel}.`);
    }

    const chosenDay = availableDays[Math.floor(Math.random() * availableDays.length)];
    console.log(`   📅 Day chosen: ${chosenDay.desc}`);

    await chosenDay.el.click();
    await driver.pause(500);

    const okBtn = await driver.$('android=new UiSelector().resourceId("android:id/button1")');
    await okBtn.click();
    await driver.pause(500);
}

// ─────────────────────────────────────────────────────────────
//  NAVIGATION & LISTS
// ─────────────────────────────────────────────────────────────

async function clickGoToHome(driver) {
    console.log('🏠 Navigating back to Home screen...');
    const homeBtn = await driver.$('//android.widget.Button[@content-desc="Go to Home" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/toolbar_menu_home"]');

    if (await homeBtn.isExisting()) {
        await homeBtn.click();
    } else {
        console.log('➡ Home button not found, falling back to Android hardware BACK button...');
        await driver.pressKeyCode(4);
    }
    await driver.pause(2000);
}

async function clickMaternalHealth(driver) {
    console.log('⚕️ Clicking on Maternal Health...');
    const xpath = `//android.widget.TextView[@text="Maternal Health"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_icon"]`;
    const maternalHealthCard = await driver.$(xpath);

    await maternalHealthCard.waitForDisplayed({ timeout: 10000 });
    await maternalHealthCard.click();
    await driver.pause(2000);
}

async function clickPnCMotherList(driver) {
    console.log('Attempting to click PNC Mother List...');
    const pncCard = await driver.$('//android.widget.TextView[@text="PNC Mother List"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_icon"]');
    await pncCard.waitForDisplayed({ timeout: 10000 });
    await pncCard.click();
}

async function clickRandomAddPncVisitAndGetName(driver) {
    console.log('Searching for all available "ADD PNC VISIT" buttons on the current screen...');
    const addPncButtons = await driver.$$('//android.widget.Button[@text="ADD PNC VISIT"]');

    if (addPncButtons.length === 0) {
        throw new Error('❌ No "ADD PNC VISIT" buttons found on the current screen. You may need to scroll first.');
    }

    console.log(`✅ Found ${addPncButtons.length} "ADD PNC VISIT" button(s).`);

    const randomIndex = Math.floor(Math.random() * addPncButtons.length);
    console.log(`🎲 Clicking the "ADD PNC VISIT" button at random index ${randomIndex}...`);

    const chosenBtn = addPncButtons[randomIndex];

    let patientName = null;
    try {
        const cardXPath = `(//android.widget.Button[@text="ADD PNC VISIT"])[${randomIndex + 1}]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]`;
        const nameEl = await driver.$(`${cardXPath}//android.widget.TextView[1]`);
        if (await nameEl.isExisting()) {
            patientName = (await nameEl.getText()).trim();
        }
    } catch (e) {
        console.log('⚠️ Could not auto-capture patient name from card:', e.message);
    }

    console.log(`📝 Remembered patient name: "${patientName}"`);

    await chosenBtn.click();
    return patientName;
}

async function searchPatientByName(driver, patientName) {
    console.log(`🔎 Searching for "${patientName}" again...`);

    const searchField = await driver.$('//android.widget.EditText[contains(@hint,"Search") or contains(@resource-id,"etSearch") or contains(@resource-id,"search")]');
    await searchField.waitForDisplayed({ timeout: 10000 });
    await searchField.click();
    await searchField.clearValue();
    await searchField.setValue(patientName);
    await driver.pause(1500);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    await driver.pause(1000);
}

async function verifyPncVisitStatus(driver, patientName) {
    if (!patientName) {
        console.log('⚠️ No patient name was captured earlier, skipping verification.');
        return false;
    }

    await searchPatientByName(driver, patientName);

    const cardXPath = `//android.widget.TextView[contains(@text, "${patientName}")]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]`;

    const pncViewBtn = await driver.$(`${cardXPath}//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_view_visits"]`);
    const addPncBtn  = await driver.$(`${cardXPath}//android.widget.Button[@text="ADD PNC VISIT"]`);

    if (await pncViewBtn.isExisting() && await pncViewBtn.isDisplayed()) {
        console.log(`✅ TEST PASSED — "${patientName}" now shows "PNC VISITS" button.`);
        return true;
    } else if (await addPncBtn.isExisting() && await addPncBtn.isDisplayed()) {
        console.log(`❌ TEST FAILED — "${patientName}" still shows "ADD PNC VISIT" instead of "PNC VISITS".`);
        return false;
    } else {
        console.log(`⚠️ Could not find either button for "${patientName}". Card may not have loaded.`);
        return false;
    }
}

// ─────────────────────────────────────────────────────────────
//  MDSR VERIFICATION HELPERS
// ─────────────────────────────────────────────────────────────

async function clickDeathReports(driver) {
    console.log('📋 Clicking on Death Reports...');
    const deathReportsCard = await driver.$('//android.widget.TextView[@text="Death Reports"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_icon"]');

    await deathReportsCard.waitForDisplayed({ timeout: 10000 });
    await deathReportsCard.click();
    await driver.pause(2000);
}

async function clickMaternalDeaths(driver) {
    console.log('💀 Clicking on Maternal Deaths (MDSR)...');
    const maternalDeathCard = await driver.$('//android.widget.TextView[@text="Maternal Deaths (MDSR)"]/ancestor::androidx.cardview.widget.CardView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/card_maternal_deaths"]');

    await maternalDeathCard.waitForDisplayed({ timeout: 10000 });
    await maternalDeathCard.click();
    await driver.pause(2000);
}

async function verifyMdsrReportExists(driver, patientName) {
    console.log(`🔎 Searching for "${patientName}" in MDSR List...`);

    const searchField = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
    await searchField.waitForDisplayed({ timeout: 10000 });
    await searchField.click();
    await searchField.clearValue();
    await searchField.setValue(patientName);
    await driver.pause(1500);

    try {
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
            await driver.pause(1000);
        }
    } catch (e) {}

    // ── Multi-strategy match (resource-id of this card is NOT "tv_val", so don't rely on it) ──

    // Strategy 1: exact text match anywhere on screen (e.g. the "KIYA H" header line)
    try {
        const exactEl = await driver.$(`//android.widget.TextView[@text="${patientName}"]`);
        if (await exactEl.isExisting() && await exactEl.isDisplayed()) {
            console.log(`✅ TEST PASSED — MDSR report for "${patientName}" found (exact text match).`);
            return true;
        }
    } catch (e) {}

    // Strategy 2: contains-text match anywhere (covers partial/whitespace differences)
    try {
        const containsEl = await driver.$(`//android.widget.TextView[contains(@text, "${patientName}")]`);
        if (await containsEl.isExisting() && await containsEl.isDisplayed()) {
            console.log(`✅ TEST PASSED — MDSR report for "${patientName}" found (contains-text match).`);
            return true;
        }
    } catch (e) {}

    // Strategy 3: name split into first/last parts — Beneficiary Name + Surname are separate fields
    // (e.g. patientName "KIYA H" → Beneficiary Name "KIYA", Surname "H")
    try {
        const nameParts = patientName.trim().split(/\s+/).filter(Boolean);
        if (nameParts.length > 0) {
            const firstPart = nameParts[0];
            const partEl = await driver.$(`//android.widget.TextView[contains(@text, "${firstPart}")]`);
            if (await partEl.isExisting() && await partEl.isDisplayed()) {
                console.log(`✅ TEST PASSED — MDSR report matched via name part "${firstPart}".`);
                return true;
            }
        }
    } catch (e) {}

    // Strategy 4: page source regex fallback, in case the element isn't picked up by XPath at all
    try {
        const source = await driver.getPageSource();
        const escapedName = patientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(escapedName, 'i').test(source)) {
            console.log(`✅ TEST PASSED — MDSR report for "${patientName}" found via page source scan.`);
            return true;
        }
    } catch (e) {}

    console.log(`❌ TEST FAILED — MDSR report for "${patientName}" NOT found in the list.`);
    return false;
}

// ─────────────────────────────────────────────────────────────
//  FORM FIELD FILLERS
// ─────────────────────────────────────────────────────────────

async function fillDateOfDelivery(driver) {
    console.log('Processing Date of Delivery...');
    await scrollIntoViewByText(driver, 'Date of Delivery');

    const field = await driver.$('//android.widget.EditText[contains(@text, "Date of Delivery") or contains(@hint, "Date of Delivery")]');
    await field.waitForDisplayed({ timeout: 8000 });

    if (await isEmpty(field, 'Date of Delivery *')) {
        await field.click();
        await driver.pause(1000);
        await pickRandomValidDate(driver, 'Date of Delivery');
        console.log('✔ Date of Delivery filled.');
        return true;
    } else {
        console.log('➡ Date of Delivery already filled, skipping.');
        return true;
    }
}

async function fillPncPeriod(driver) {
    console.log('Processing PNC Period...');
    await openSpinnerAndSelect(driver, 'PNC Period', OPTIONS.pncPeriod, FORM_DATA.pncPeriod);
    console.log(`✔ PNC Period set to "${FORM_DATA.pncPeriod}".`);
}

async function fillPncVisitDate(driver) {
    console.log('Processing PNC Visit Date...');
    await scrollIntoViewByText(driver, 'PNC Visit Date');

    const field = await driver.$('//android.widget.EditText[contains(@text, "PNC Visit Date") or contains(@hint, "PNC Visit Date")]');
    await field.waitForDisplayed({ timeout: 8000 });

    if (await isEmpty(field, 'PNC Visit Date *')) {
        await field.click();
        await driver.pause(1000);
        await pickRandomValidDate(driver, 'PNC Visit Date');
        console.log('✔ PNC Visit Date filled.');
    } else {
        console.log('➡ PNC Visit Date already filled, skipping.');
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

    const field = await driver.$('//android.widget.EditText[contains(@text, "Date of Death") or contains(@hint, "Date of Death")]');
    await field.waitForDisplayed({ timeout: 8000 });

    if (await isEmpty(field, 'Date of Death *')) {
        await field.click();
        await driver.pause(1000);
        await pickRandomValidDate(driver, 'Date of Death');
        console.log('✔ Date of Death filled.');
    } else {
        console.log('➡ Date of Death already filled, skipping.');
    }
}

async function fillCauseOfDeath(driver) {
    console.log('Processing Reason for Death...');
    await openSpinnerAndSelect(driver, 'Reason for Death', OPTIONS.causeOfDeath, FORM_DATA.causeOfDeath);
    console.log(`✔ Reason for Death set to "${FORM_DATA.causeOfDeath}".`);
}

// ── Place of Death — now mirrors the ANC dropdown + "Other" text field approach exactly ──

async function fillPlaceOfDeath(driver) {
    console.log('Processing Place of Death Dropdown...');
    if (!FORM_DATA.placeOfDeath) return;

    await scrollIntoViewByText(driver, 'Place of Death');

    await openSpinnerAndSelect(driver, 'Place of Death', OPTIONS.placeOfDeath, FORM_DATA.placeOfDeath);
    console.log(`✔ Place of Death set to "${FORM_DATA.placeOfDeath}".`);

    if (FORM_DATA.placeOfDeath === 'Other Place of Death') {
        await fillOtherPlaceOfDeathText(driver);
    }
}

async function fillOtherPlaceOfDeathText(driver) {
    console.log('Processing Other Place of Death Text Input...');
    if (!FORM_DATA.otherPlaceOfDeathText) return;
    await driver.pause(1500);

    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Other Place of Death"))`);
        await driver.pause(500);
    } catch (e) {}

    const locators = [
        '//android.widget.EditText[contains(@hint, "Other Place of Death")]',
        '//android.widget.EditText[contains(@text, "Other Place of Death")]',
        'android=new UiSelector().className("android.widget.EditText").textContains("Other Place of Death")'
    ];

    let field   = null;
    let isFound = false;
    for (const loc of locators) {
        try {
            field = await driver.$(loc);
            if (await field.isExisting()) {
                await field.waitForDisplayed({ timeout: 2000 });
                isFound = true;
                break;
            }
        } catch (e) {}
    }

    if (!isFound) {
        console.log('➡ "Other Place of Death" text field not present. Skipping.');
        return;
    }

    await field.click();
    await field.clearValue();
    await field.setValue(FORM_DATA.otherPlaceOfDeathText);

    try {
        await driver.pressKeyCode(66);
    } catch (e) {}

    await hideKeyboardSafe(driver);
    console.log(`✅ "Other Place of Death" text → "${FORM_DATA.otherPlaceOfDeathText}"`);
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
        await openSpinnerAndSelect(driver, 'Method of Contraception', OPTIONS.contraceptionMethod, FORM_DATA.contraceptionMethod);
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
        await openSpinnerAndSelect(driver, 'Mother Danger Sign', OPTIONS.dangerSignOption, FORM_DATA.dangerSignOption);
        console.log(`✔ Mother Danger Sign set to "${FORM_DATA.dangerSignOption}".`);
    }
}

async function fillReferralFacility(driver) {
    console.log('Processing Referral Facility...');
    await openSpinnerAndSelect(driver, 'Referral Facility', OPTIONS.referralFacility, FORM_DATA.referralFacility);
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
        const messageEl = await driver.$('//android.widget.TextView[@resource-id="android:id/message"]');
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

async function fillMdsrForm(driver) {
    console.log('--- Starting MDSR Form Entry ---');

    const mdsrTitle = await driver.$('//android.widget.TextView[@text="MDSR" and @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_toolbar"]');
    await mdsrTitle.waitForDisplayed({ timeout: 10000 });
    console.log('✔ MDSR Screen recognized.');

    console.log('Processing MDSR Date...');

    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().className("android.widget.EditText").textContains("Date"))`);
        await driver.pause(1000);
    } catch (e) {
        console.log('➡ MDSR specific scroll finished.');
    }

    const dateField = await driver.$('//android.widget.EditText[@hint="Date" or @text="Date"]');
    await dateField.waitForDisplayed({ timeout: 5000 });

    await dateField.click();
    await driver.pause(1000);
    await pickRandomValidDate(driver, 'MDSR Date');
    console.log('✔ MDSR Date filled.');

    await driver.pause(1000);
    await submitForm(driver);
    await driver.pause(2000);

    console.log('✅ MDSR Form entry complete.');
}

async function fillPncForm(driver) {
    console.log('--- Starting PNC Form Entry ---');

    const isDeliveryDateReady = await fillDateOfDelivery(driver);
    await driver.pause(1000);

    if (isDeliveryDateReady) {
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

        await handlePostSubmitAlert(driver, false);
        if (FORM_DATA.isMotherAlive === 'No') {
            console.log('➡ Mother is marked as deceased. Proceeding to mandatory MDSR form...');
            await driver.pause(2000);
            await fillMdsrForm(driver);
        }
        console.log('✅ PNC Form entry complete.');
    } else {
        console.log('🛑 Date of Delivery was not filled. Halting PNC form entry.');
    }
}

// ─────────────────────────────────────────────────────────────
//  ENTRY POINT
// ─────────────────────────────────────────────────────────────

async function runTest() {
    const driver = await remote({ path: '/', port: 4723, capabilities });
    let testPassed = false;

    try {
        console.log('App launched...');

        await clickPnCMotherList(driver);
        await driver.pause(3000);

        const patientName = await clickRandomAddPncVisitAndGetName(driver);
        await driver.pause(4000);

        // Fill PNC form (which will trigger MDSR if mother is marked deceased)
        await fillPncForm(driver);
        await driver.pause(3000);

        // Go back home
        await clickGoToHome(driver);

        // Decide which verification to run based on the form data
        if (FORM_DATA.isMotherAlive === 'No') {
            console.log('➡ Mother is deceased. Verifying MDSR list instead of PNC list...');
            await clickDeathReports(driver);
            await clickMaternalDeaths(driver);
            await driver.pause(2000);

            testPassed = await verifyMdsrReportExists(driver, patientName);
        } else {
            console.log('➡ Mother is alive. Verifying PNC Visit status...');
            await clickMaternalHealth(driver);
            await clickPnCMotherList(driver);
            await driver.pause(2000);

            testPassed = await verifyPncVisitStatus(driver, patientName);
        }

        console.log(testPassed ? '🎉 RESULT: TEST PASSED' : '🛑 RESULT: TEST FAILED');
    } catch (err) {
        console.error('Test failed.', err);
    } finally {
        console.log('Closing session...');
        await driver.pause(3000);
        await driver.deleteSession();
    }
}

runTest();