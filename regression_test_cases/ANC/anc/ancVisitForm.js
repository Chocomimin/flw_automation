// ── Configuration & Data ──────────────────────────────────────────────────────

const FORM_DATA = {
    ancDate:             { day: 10, month: 10,  year: 2025 },
    abortionIfAny:       'Yes',
    abortionType:        'Spontaneous',
    abortionFacility:    'CHC',
    abortionDate:        { day: 15, month: 4,  year: 2026 },
    pregnantWomanAlive:  'Yes',
    reasonForDeath:      'Other Maternal Death',
    dateOfDeath:         { day: 12, month: 4,  year: 2026 },
    placeOfDeath:        'Other Place of Death',
    otherPlaceOfDeathText: 'Local Clinic',

    placeOfAnc:          'Sub-Centre',
    ancPeriod:           '2',
    pregnantWomanDelivered: 'No',
    weightOfPw:          '60',
    bp:                  '120/80',
    hb:                  '12',
    fundalHeight:        '24',
    noOfIfa:             '30',

    highRiskCondition:          'Yes',
    highRiskConditionType:      'OTHER',
    otherHighRiskConditionText: 'Gestational Diabetes History',
    referralFacility:           'Other Private Hospital',
    isHrpConfirmed:             'Yes',
    whoIdentifiedHrp:           'ANM'
};

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

// ── LOW-LEVEL HELPERS ─────────────────────────────────────────────────────────

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

async function isEmpty(field, hintText) {
    try {
        const text = await field.getText();
        return !text || text.trim() === '' || text.trim() === hintText.trim();
    } catch { return true; }
}

async function swipeUp(driver) {
    const screen = await driver.getWindowRect();
    const swipeX = Math.floor(screen.width / 2);
    const startY = Math.floor(screen.height * 0.6);
    const endY   = Math.floor(screen.height * 0.4);
    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0,   x: swipeX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 200 },
            { type: 'pointerMove', duration: 800, x: swipeX, y: endY },
            { type: 'pointerUp',   button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(1000);
}

async function swipeDown(driver) {
    const screen = await driver.getWindowRect();
    const swipeX = Math.floor(screen.width / 2);
    const startY = Math.floor(screen.height * 0.3);
    const endY   = Math.floor(screen.height * 0.7);
    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0,   x: swipeX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 200 },
            { type: 'pointerMove', duration: 800, x: swipeX, y: endY },
            { type: 'pointerUp',   button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(1000);
}

// ── CORE SPINNER SELECTOR (UPDATED WITH CLICK -> HIDE -> CLICK LOGIC) ─────────

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

    // Click #1: Tap the right-side arrow icon of the spinner
    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);
    console.log(`📍 Tapping dropdown arrow at (${tapX}, ${tapY})`);
    await tapByCoords(driver, tapX, tapY);

    await driver.pause(1000);

    // ── NEW LOGIC: Check if keyboard popped up, close it, and click again ──
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
    // ───────────────────────────────────────────────────────────────────────

    try {
        const item = await driver.$(`//android.widget.CheckedTextView[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`✅ Selected "${value}" via CheckedTextView XPath`);
        return;
    } catch (e) {
        console.log(`⚠️  CheckedTextView XPath failed: ${e.message}`);
    }

    try {
        const item = await driver.$(`android=new UiSelector().className("android.widget.CheckedTextView").text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via UiSelector CheckedTextView`);
        return;
    } catch (e) {
        console.log(`⚠️  UiSelector CheckedTextView failed: ${e.message}`);
    }

    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via generic XPath`);
        return;
    } catch (e) {
        console.log(`⚠️  Generic XPath failed: ${e.message}`);
    }

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

// ── CALENDAR HELPERS ──────────────────────────────────────────────────────────

async function getCalendarMonthYear(driver) {
    for (const dayNum of ['15', '14', '13', '10', '1']) {
        try {
            const el = await driver.$(`android=new UiSelector().text("${dayNum}").className("android.view.View")`);
            if (await el.isExisting()) {
                const cd = await el.getAttribute('content-desc');
                if (cd && cd.includes(' ')) {
                    const parts = cd.trim().split(' ');
                    if (parts.length >= 3) {
                        const month = MONTH_NAMES.indexOf(parts[1]);
                        const year  = parseInt(parts[2]);
                        if (month > 0 && year > 2000) return { month, year };
                    }
                }
            }
        } catch (e) {}
    }
    return null;
}

async function clickCalendarNavButton(driver, direction) {
    const resourceId = direction === 'prev' ? 'android:id/prev' : 'android:id/next';
    try {
        const btn = await driver.$(`android=new UiSelector().resourceId("${resourceId}")`);
        if (await btn.isExisting()) {
            await btn.click();
            await driver.pause(800);
            return true;
        }
    } catch (e) {}
    return false;
}

async function navigateToMonth(driver, targetMonth, targetYear) {
    const yearHeader  = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_header_year")');
    const currentYear = parseInt(await yearHeader.getText());

    if (currentYear !== targetYear) {
        await yearHeader.click();
        await driver.pause(1000);
        const yearEl = await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${targetYear}")`);
        await yearEl.click();
        await driver.pause(1000);
    }

    for (let i = 0; i < 24; i++) {
        const cur = await getCalendarMonthYear(driver);
        if (!cur) { console.log(`⚠️ Could not read month at iteration ${i}`); break; }
        if (cur.month === targetMonth && cur.year === targetYear) {
            console.log(`✅ Calendar at ${MONTH_NAMES[targetMonth]} ${targetYear}`);
            break;
        }
        const goBack = cur.year > targetYear || (cur.year === targetYear && cur.month > targetMonth);
        console.log(`📅 At ${MONTH_NAMES[cur.month]} ${cur.year}, clicking ${goBack ? 'prev ◀' : 'next ▶'}...`);
        const clicked = await clickCalendarNavButton(driver, goBack ? 'prev' : 'next');
        if (!clicked) { console.log(`⚠️ Nav button not found`); break; }
    }
}

async function pickDateFromCalendar(driver, dateObj) {
    const { day, month, year } = dateObj;
    await (await driver.$('android=new UiSelector().resourceId("android:id/datePicker")')).waitForDisplayed({ timeout: 5000 });
    await navigateToMonth(driver, month, year);
    await driver.pause(300);

    let dayEl = null;
    try {
        dayEl = await driver.$(`android=new UiSelector().text("${String(day)}").className("android.view.View").clickable(true)`);
        if (!(await dayEl.isExisting())) dayEl = null;
    } catch (e) { dayEl = null; }

    if (!dayEl) {
        dayEl = await driver.$(`android=new UiSelector().text("${String(day)}").clickable(true)`);
    }

    await dayEl.click();
    await driver.pause(500);

    const okBtn = await driver.$('//android.widget.Button[@text="OK" or @resource-id="android:id/button1"]');
    await okBtn.click();
}

// ── FORM FILL FUNCTIONS ───────────────────────────────────────────────────────

async function fillAncDate(driver) {
    console.log('Processing ANC Date...');
    const field = await driver.$('//android.widget.EditText[contains(@hint, "ANC Date *")]');
    await field.waitForDisplayed({ timeout: 10000 });
    if (await isEmpty(field, 'ANC Date *')) {
        await field.click();
        await driver.pause(1500);
        await pickDateFromCalendar(driver, FORM_DATA.ancDate);
        console.log('✔ ANC Date filled.');
    } else {
        console.log('➡ ANC Date already filled.');
    }
}

async function fillAbortionIfAny(driver) {
    console.log('Processing Abortion If Any...');
    if (!FORM_DATA.abortionIfAny) return;
    const xp = `//android.widget.TextView[@text="Abortion If Any"]/../../android.widget.RadioGroup/android.widget.RadioButton[@text="${FORM_DATA.abortionIfAny}"]`;
    const rb  = await driver.$(xp);
    if (await rb.isExisting()) {
        if (await rb.getAttribute('checked') !== 'true') {
            await rb.click();
            console.log(`✔ "Abortion If Any" → "${FORM_DATA.abortionIfAny}"`);
        } else {
            console.log(`➡ "Abortion If Any" already "${FORM_DATA.abortionIfAny}"`);
        }
    } else {
        console.error(`❌ RadioButton "${FORM_DATA.abortionIfAny}" not found under "Abortion If Any"`);
    }
}

async function fillAbortionType(driver) {
    console.log('Processing Abortion Type Dropdown...');
    if (!FORM_DATA.abortionType) return;
    await openSpinnerAndSelect(driver, 'Abortion Type',
        ['Induced', 'Spontaneous', 'Incomplete'],
        FORM_DATA.abortionType);
}

async function fillAbortionFacility(driver) {
    console.log('Processing Abortion Facility Dropdown...');
    if (!FORM_DATA.abortionFacility) return;
    await openSpinnerAndSelect(driver, 'Facility (Place of Abortion)',
        ['Home', 'Subcenter', 'PHC', 'CHC', 'District Hospital',
         'Medical College Hospital', 'Private Hospital', 'In Transit', 'Other Place of Abortion'],
        FORM_DATA.abortionFacility);
}

async function fillAbortionDate(driver) {
    console.log('Processing Abortion Date...');
    const field = await driver.$('//android.widget.EditText[contains(@hint, "Abortion Date *")]');
    await field.waitForDisplayed({ timeout: 10000 });
    if (await isEmpty(field, 'Abortion Date *')) {
        await field.click();
        await driver.pause(1500);
        await pickDateFromCalendar(driver, FORM_DATA.abortionDate);
        console.log('✔ Abortion Date filled.');
    } else {
        console.log('➡ Abortion Date already filled.');
    }
}

async function fillPregnantWomanAlive(driver) {
    console.log('Processing Is the Pregnant Woman alive?...');
    if (!FORM_DATA.pregnantWomanAlive) return;
    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Is the Pregnant Woman alive?"))`);
        await driver.pause(800);
    } catch (e) {}
    const xp = `//android.widget.TextView[@text="Is the Pregnant Woman alive?"]/../../android.widget.RadioGroup/android.widget.RadioButton[@text="${FORM_DATA.pregnantWomanAlive}"]`;
    const rb  = await driver.$(xp);
    if (await rb.isExisting()) {
        if (await rb.getAttribute('checked') !== 'true') {
            await rb.click();
            console.log(`✔ "Is the Pregnant Woman alive?" → "${FORM_DATA.pregnantWomanAlive}"`);
        } else {
            console.log(`➡ "Is the Pregnant Woman alive?" already "${FORM_DATA.pregnantWomanAlive}"`);
        }
    } else {
        console.error(`❌ RadioButton "${FORM_DATA.pregnantWomanAlive}" not found`);
    }
}

async function fillReasonForDeath(driver) {
    console.log('Processing Reason for Death Dropdown...');
    if (!FORM_DATA.reasonForDeath) return;
    await openSpinnerAndSelect(driver, 'Reason for Death',
        ['ECLAMPSIA', 'HAEMORRHAGE', 'HIGH FEVER', 'ABORTION', 'Accident', 'Other Maternal Death'],
        FORM_DATA.reasonForDeath);
}

async function fillDateOfDeath(driver) {
    console.log('Processing Date of Death...');
    if (!FORM_DATA.dateOfDeath) return;
    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Date of death"))`);
        await driver.pause(500);
    } catch (e) {}
    const field = await driver.$('//android.widget.EditText[contains(@hint, "Date of death") or contains(@text, "Date of death")]');
    await field.waitForDisplayed({ timeout: 10000 });
    if (await isEmpty(field, 'Date of death *')) {
        await field.click();
        await driver.pause(1500);
        await pickDateFromCalendar(driver, FORM_DATA.dateOfDeath);
        console.log('✔ Date of death filled.');
    } else {
        console.log('➡ Date of death already filled.');
    }
}

async function fillPlaceOfDeath(driver) {
    console.log('Processing Place of Death Dropdown...');
    if (!FORM_DATA.placeOfDeath) return;
    await openSpinnerAndSelect(driver, 'Place of Death',
        ['Home', 'Subcenter', 'PHC', 'CHC', 'District Hospital',
         'Medical College Hospital', 'Private Hospital', 'In Transit', 'Other Place of Death'],
        FORM_DATA.placeOfDeath);
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
    } catch(e) {}

    await hideKeyboardSafe(driver);
    console.log(`✅ "Other Place of Death" text → "${FORM_DATA.otherPlaceOfDeathText}"`);
}

async function fillPlaceOfAnc(driver) {
    console.log('Processing Place of ANC Dropdown...');
    if (!FORM_DATA.placeOfAnc) return;
    await openSpinnerAndSelect(driver, 'Place of ANC',
        ['Sub-Centre', 'VHND/VHSND', 'PHC', 'PMSMA Visit', 'CHC', 'District Hospital', 'Medical College Hospital'],
        FORM_DATA.placeOfAnc);
}

async function fillAncPeriod(driver) {
    console.log('Processing ANC Period Dropdown...');
    if (!FORM_DATA.ancPeriod) return;

    let isFound = false;
    try {
        const el = await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().descriptionContains("ANC Period"))`);
        if (await el.isExisting()) {
            isFound = true;
            await driver.pause(500);
        }
    } catch (e) {}

    if (!isFound) {
        console.log('➡ "ANC Period" not found scrolling down. Scrolling up...');
        for (let i = 0; i < 5; i++) {
            await swipeDown(driver);
            const checkEl = await driver.$(`android=new UiSelector().descriptionContains("ANC Period")`);
            if (await checkEl.isExisting()) {
                console.log('✅ "ANC Period" found.');
                break;
            }
        }
    }

    await openSpinnerAndSelect(driver, 'ANC Period',
        ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
        FORM_DATA.ancPeriod);
}

async function fillWeight(driver) {
    console.log('Processing Weight of PW...');
    if (!FORM_DATA.weightOfPw) return;
    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Weight of PW"))`);
        await driver.pause(500);
    } catch (e) {}
    const field = await driver.$('//android.widget.EditText[contains(@hint, "Weight of PW")]');
    if (await field.isExisting()) {
        await field.click(); await field.clearValue(); await field.setValue(FORM_DATA.weightOfPw);
        await hideKeyboardSafe(driver);
        console.log(`✅ "Weight of PW" → "${FORM_DATA.weightOfPw}"`);
    }
}

async function fillBp(driver) {
    console.log('Processing BP...');
    if (!FORM_DATA.bp) return;
    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("BP of PW"))`);
        await driver.pause(500);
    } catch (e) {}
    const field = await driver.$('//android.widget.EditText[contains(@hint, "BP of PW")]');
    if (await field.isExisting()) {
        await field.click(); await field.clearValue(); await field.setValue(FORM_DATA.bp);
        await hideKeyboardSafe(driver);
        console.log(`✅ "BP" → "${FORM_DATA.bp}"`);
    }
}

async function fillHb(driver) {
    console.log('Processing HB...');
    if (!FORM_DATA.hb) return;
    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("HB (gm/dl)"))`);
        await driver.pause(500);
    } catch (e) {}
    const field = await driver.$('//android.widget.EditText[contains(@hint, "HB (gm/dl)")]');
    if (await field.isExisting()) {
        await field.click(); await field.clearValue(); await field.setValue(FORM_DATA.hb);
        await hideKeyboardSafe(driver);
        console.log(`✅ "HB" → "${FORM_DATA.hb}"`);
    }
}

async function fillFundalHeight(driver) {
    console.log('Processing Fundal Height...');
    if (!FORM_DATA.fundalHeight) return;
    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Fundal Height"))`);
        await driver.pause(500);
    } catch (e) {}
    const field = await driver.$('//android.widget.EditText[contains(@hint, "Fundal Height")]');
    if (await field.isExisting()) {
        await field.click(); await field.clearValue(); await field.setValue(FORM_DATA.fundalHeight);
        await hideKeyboardSafe(driver);
        console.log(`✅ "Fundal Height" → "${FORM_DATA.fundalHeight}"`);
    } else {
        console.log('➡ "Fundal Height" field not present on this screen.');
    }
}

async function fillNoOfIfa(driver) {
    console.log('Processing No. of IFA Tabs...');
    if (!FORM_DATA.noOfIfa) return;
    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("No. of IFA Tabs given"))`);
        await driver.pause(500);
    } catch (e) {}
    const field = await driver.$('//android.widget.EditText[contains(@hint, "No. of IFA Tabs given")]');
    if (await field.isExisting()) {
        await field.click(); await field.clearValue(); await field.setValue(FORM_DATA.noOfIfa);
        await hideKeyboardSafe(driver);
        console.log(`✅ "No. of IFA Tabs given" → "${FORM_DATA.noOfIfa}"`);
    }
}

async function fillPregnantWomanDelivered(driver) {
    console.log('Processing Pregnant Woman Delivered?...');
    if (!FORM_DATA.pregnantWomanDelivered) return;

    let isFound = false;
    try {
        const el = await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("eliver"))`);
        if (await el.isExisting()) { isFound = true; await driver.pause(500); }
    } catch (e) {}

    if (!isFound) {
        console.log('➡ "Delivered" not found. Scrolling up...');
        for (let i = 0; i < 5; i++) {
            await swipeDown(driver);
            const checkEl = await driver.$(`android=new UiSelector().textContains("eliver")`);
            if (await checkEl.isExisting()) { isFound = true; break; }
        }
    }

    const xpaths = [
        `//android.widget.TextView[contains(translate(@text, 'DELIVER', 'deliver'), 'deliver')]/../../android.widget.RadioGroup/android.widget.RadioButton[@text="${FORM_DATA.pregnantWomanDelivered}"]`,
        `//android.widget.TextView[contains(translate(@text, 'DELIVER', 'deliver'), 'deliver')]/../android.widget.RadioGroup/android.widget.RadioButton[@text="${FORM_DATA.pregnantWomanDelivered}"]`,
        `//android.widget.TextView[contains(translate(@text, 'DELIVER', 'deliver'), 'deliver')]/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${FORM_DATA.pregnantWomanDelivered}"]`
    ];

    let rb = null, foundRb = false;
    for (const xp of xpaths) {
        rb = await driver.$(xp);
        if (await rb.isExisting()) { foundRb = true; break; }
    }

    if (foundRb && rb) {
        if (await rb.getAttribute('checked') !== 'true') {
            await rb.click();
            console.log(`✔ "Pregnant Woman Delivered?" → "${FORM_DATA.pregnantWomanDelivered}"`);
        } else {
            console.log(`➡ "Pregnant Woman Delivered?" already "${FORM_DATA.pregnantWomanDelivered}"`);
        }
    } else {
        console.log(`➡ "Pregnant Woman Delivered?" field not present on this screen.`);
    }
}

// ── HRP FLOW FUNCTIONS ────────────────────────────────────────────────────────

async function fillHighRiskCondition(driver) {
    console.log('Processing Any High Risk conditions?...');
    if (!FORM_DATA.highRiskCondition) return;
    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Any High Risk conditions"))`);
        await driver.pause(500);
    } catch (e) {}
    const xp = `//android.widget.TextView[contains(@text, "Any High Risk conditions")]/../../android.widget.RadioGroup/android.widget.RadioButton[@text="${FORM_DATA.highRiskCondition}"]`;
    const rb  = await driver.$(xp);
    if (await rb.isExisting()) {
        if (await rb.getAttribute('checked') !== 'true') {
            await rb.click();
            console.log(`✔ "Any High Risk conditions" → "${FORM_DATA.highRiskCondition}"`);
        } else {
            console.log(`➡ "Any High Risk conditions" already "${FORM_DATA.highRiskCondition}"`);
        }
    }
}

async function fillHighRiskConditionType(driver) {
    console.log('Processing High Risk Conditions Dropdown...');
    if (!FORM_DATA.highRiskConditionType) return;
    await openSpinnerAndSelect(driver, 'High risk conditions',
        ['NONE', 'HIGH BP (SYSTOLIC>=140 AND OR DIASTOLIC >=90mmHg)', 'CONVULSIONS',
         'VAGINAL BLEEDING', 'FOUL SMELLING DISCHARGE', 'SEVERE ANAEMIA (HB less than 7 gm/dl)',
         'DIABETES', 'TWINS', 'OTHER'],
        FORM_DATA.highRiskConditionType);
}

async function fillOtherHighRiskConditionText(driver) {
    console.log('Processing Other High Risk Condition Text...');
    if (!FORM_DATA.otherHighRiskConditionText) return;
    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Any other High Risk conditions"))`);
        await driver.pause(500);
    } catch (e) {}
    const field = await driver.$('//android.widget.EditText[contains(@hint, "Any other High Risk conditions")]');
    if (await field.isExisting()) {
        await field.click(); await field.clearValue(); await field.setValue(FORM_DATA.otherHighRiskConditionText);
        await hideKeyboardSafe(driver);
        console.log(`✅ "Any other High Risk conditions" → "${FORM_DATA.otherHighRiskConditionText}"`);
    }
}

async function fillReferralFacility(driver) {
    console.log('Processing Referral Facility Dropdown...');
    if (!FORM_DATA.referralFacility) return;
    await openSpinnerAndSelect(driver, 'Referral Facility',
        ['Primary Health Centre', 'Community Health Centre', 'District Hospital', 'Other Private Hospital'],
        FORM_DATA.referralFacility);
}

async function fillIsHrpConfirmed(driver) {
    console.log('Processing Is HRP Confirmed?...');
    if (!FORM_DATA.isHrpConfirmed) return;
    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Is HRP Confirmed?"))`);
        await driver.pause(500);
    } catch (e) {}
    const xp = `//android.widget.TextView[contains(@text, "Is HRP Confirmed?")]/../../android.widget.RadioGroup/android.widget.RadioButton[@text="${FORM_DATA.isHrpConfirmed}"]`;
    const rb  = await driver.$(xp);
    if (await rb.isExisting()) {
        if (await rb.getAttribute('checked') !== 'true') {
            await rb.click();
            console.log(`✔ "Is HRP Confirmed?" → "${FORM_DATA.isHrpConfirmed}"`);
        } else {
            console.log(`➡ "Is HRP Confirmed?" already "${FORM_DATA.isHrpConfirmed}"`);
        }
    }
}

async function fillWhoIdentifiedHrp(driver) {
    console.log('Processing Who Identified HRP Dropdown...');
    if (!FORM_DATA.whoIdentifiedHrp) return;
    await openSpinnerAndSelect(driver, 'Who had identified as HRP?',
        ['ANM', 'CHO', 'PHC – MO', 'Specialist at Higher Facility'],
        FORM_DATA.whoIdentifiedHrp);
}

// ── MAIN EXECUTION ────────────────────────────────────────────────────────────

async function fillAncForm(driver) {
    console.log('--- Starting ANC Form Fill ---');

    await fillAncDate(driver);
    await driver.pause(1000);

    const abortionTitle     = await driver.$('//android.widget.TextView[@text="Abortion If Any"]');
    const isAbortionPresent = await abortionTitle.isExisting();
    let hadAbortion = false;

    if (isAbortionPresent) {
        await fillAbortionIfAny(driver);
        await driver.pause(1000);
        if (FORM_DATA.abortionIfAny === 'Yes') {
            hadAbortion = true;
            await fillAbortionType(driver);
            await driver.pause(1000);
            await fillAbortionFacility(driver);
            await driver.pause(1000);
            await fillAbortionDate(driver);
            await driver.pause(1000);
        }
    } else {
        console.log("➡ 'Abortion If Any' not on this screen. Skipping.");
    }

    await fillPregnantWomanAlive(driver);
    await driver.pause(1000);

    if (FORM_DATA.pregnantWomanAlive === 'No') {
        await fillReasonForDeath(driver);
        await driver.pause(1000);
        await fillDateOfDeath(driver);
        await driver.pause(1000);
        await fillPlaceOfDeath(driver);
        await driver.pause(1000);
        if (FORM_DATA.placeOfDeath === 'Other Place of Death') {
            await fillOtherPlaceOfDeathText(driver);
            await driver.pause(1000);
        }
        await fillAncPeriod(driver);
        await driver.pause(1000);
        await fillFundalHeight(driver);
        await driver.pause(1000);

    } else if (FORM_DATA.pregnantWomanAlive === 'Yes') {
        if (hadAbortion) {
            console.log('➡ Flow: Abortion = Yes, Pregnant Woman Alive = Yes');
            await fillAncPeriod(driver);
            await driver.pause(1000);
            await fillFundalHeight(driver);
            await driver.pause(1000);
        } else {
            console.log('➡ Flow: Abortion = No, Pregnant Woman Alive = Yes');
            await fillPregnantWomanDelivered(driver);
            await driver.pause(1000);
            await fillPlaceOfAnc(driver);
            await driver.pause(1000);
            await fillAncPeriod(driver);
            await driver.pause(1000);
            await fillWeight(driver);
            await driver.pause(1000);
            await fillBp(driver);
            await driver.pause(1000);
            await fillHb(driver);
            await driver.pause(1000);
            await fillFundalHeight(driver);
            await driver.pause(1000);
            await fillNoOfIfa(driver);
            await driver.pause(1000);
            await fillHighRiskCondition(driver);
            await driver.pause(1000);
            if (FORM_DATA.highRiskCondition === 'Yes') {
                await fillHighRiskConditionType(driver);
                await driver.pause(1000);
                if (FORM_DATA.highRiskConditionType === 'OTHER') {
                    await fillOtherHighRiskConditionText(driver);
                    await driver.pause(1000);
                }
                await fillReferralFacility(driver);
                await driver.pause(1000);
                await fillIsHrpConfirmed(driver);
                await driver.pause(1000);
                if (FORM_DATA.isHrpConfirmed === 'Yes') {
                    await fillWhoIdentifiedHrp(driver);
                    await driver.pause(1000);
                }
            }
        }
    }

    console.log('--- Finished ANC Form Fill ---');
}

module.exports = { fillAncForm };