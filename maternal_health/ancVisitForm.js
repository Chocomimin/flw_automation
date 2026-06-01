'use strict';

const RID = 'org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown';

const POPUP_ROW_HEIGHT = 102;

// ─────────────────────────────────────────────────────────────
//  FORM DATA
// ─────────────────────────────────────────────────────────────

const FORM_DATA = {
    ancDate: { day: 13, month: 5, year: 2026 },
    placeOfAnc: 'CHC',
    ancPeriod: '7',

    abortionIfAny: 'Yes',
    abortionType: 'Spontaneous',
    facilityPlaceOfAbortion: 'CHC',
    abortionDate: { day: 10, month: 2, year: 2026 },

    isWomanAlive: 'No',
    probableCauseOfDeath: 'Other Maternal Death',
    placeOfDeath: 'CHC',
    otherPlaceOfDeath: 'On the way to hospital',
    deathDate: { day: 22, month: 2, year: 2026 },

    delivered: 'Yes',

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
    identifiedAsHrp: 'ANM',
};

const OPTIONS = {
    placeOfAnc:              ['Sub-Centre', 'VHND/VHSND', 'PHC', 'PMSMA Visit', 'CHC', 'District Hospital', 'Medical College Hospital'],
    ancPeriod:               ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    reasonForDeath:          ['ECLAMPSIA', 'HAEMORRHAGE', 'HIGH FEVER', 'ABORTION', 'Accident', 'Other Maternal Death'],
    placeOfDeath:            ['Home', 'Subcenter', 'PHC', 'CHC', 'District Hospital', 'Medical College Hospital', 'Private Hospital', 'In Transit', 'Other Place of Death'],
    abortionType:            ['Induced', 'Spontaneous', 'Incomplete'],
    facilityPlaceOfAbortion: ['Home', 'Subcenter', 'PHC', 'CHC', 'District Hospital', 'Medical College Hospital', 'Private Hospital', 'In Transit', 'Other Place of Abortion'],
};

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December',
];

// ─────────────────────────────────────────────────────────────
//  HINT-BASED SPINNER SELECTORS
//
//  The RecyclerView is virtualized — instance() counts only the
//  spinners currently rendered in the viewport, so it breaks
//  the moment any scrolling happens.
//
//  Every spinner has a unique `hint` attribute in the XML.
//  We locate each by hint — this works regardless of scroll
//  position, abortion branch, or deceased branch.
// ─────────────────────────────────────────────────────────────

function spinnerByHint(hintSubstring) {
    // UiSelector on the Spinner widget itself, matching hint text.
    return `android=new UiSelector().resourceId("${RID}").descriptionContains("${hintSubstring}")`;
}

// Spinners use the `hint` attribute in XML but UiAutomator2 exposes
// the hint as `content-desc` on Spinner when no value is selected,
// and as the text when a value IS selected.  The most reliable way
// to find a specific spinner by its label is to search the page
// source for the hint, then tap its bounds — handled in
// findSpinnerByHint() below.

async function findSpinnerByHint(driver, hintSubstring) {
    // First try: UiSelector with hint text directly on the Spinner
    // (works when spinner shows the hint placeholder i.e. no value selected yet)
    try {
        const sel = `android=new UiSelector().resourceId("${RID}").textContains("${hintSubstring}")`;
        const el = await driver.$(sel);
        if (await el.isExisting() && await el.isDisplayed()) {
            return el;
        }
    } catch (e) { /* continue */ }

    // Second try: parse page source for a Spinner whose hint matches
    const source = await driver.getPageSource();
    const escapedHint = hintSubstring.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match Spinner nodes that contain the hint substring
    const spinnerRegex = new RegExp(
        `<android\\.widget\\.Spinner[^>]*?hint="[^"]*${escapedHint}[^"]*"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
        'i'
    );
    let match = source.match(spinnerRegex);

    // Also try reverse attribute order
    if (!match) {
        const spinnerRegex2 = new RegExp(
            `<android\\.widget\\.Spinner[^>]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"[^>]*?hint="[^"]*${escapedHint}[^"]*"`,
            'i'
        );
        match = source.match(spinnerRegex2);
    }

    if (match) {
        const x1 = parseInt(match[1]), y1 = parseInt(match[2]);
        const x2 = parseInt(match[3]), y2 = parseInt(match[4]);
        // Return a synthetic object with the same getLocation/getSize interface
        return {
            _synthetic: true,
            _cx: Math.floor((x1 + x2) / 2),
            _cy: Math.floor((y1 + y2) / 2),
            _x: x1, _y: y1,
            _w: x2 - x1, _h: y2 - y1,
            async getLocation() { return { x: x1, y: y1 }; },
            async getSize()     { return { width: x2 - x1, height: y2 - y1 }; },
            async waitForDisplayed() { return true; },
            async isExisting()  { return true; },
            async isDisplayed() { return true; },
        };
    }

    throw new Error(`❌ Spinner with hint "${hintSubstring}" not found in page source.`);
}


// ─────────────────────────────────────────────────────────────
//  CORE HELPERS
// ─────────────────────────────────────────────────────────────

async function dismissKeyboardIfVisible(driver) {
    try {
        const isShown = await driver.isKeyboardShown();
        if (isShown) {
            console.log('⌨️  Keyboard visible — dismissing before opening dropdown…');
            try { await driver.hideKeyboard(); }
            catch (e) { await driver.pressKeyCode(4); }
            await driver.pause(800);
        }
    } catch (e) {
        console.log('⚠️  dismissKeyboardIfVisible skipped:', e.message);
    }
}

async function scrollToSpinner(driver, hintSubstring) {
    // Scroll the form until the spinner with this hint is visible on screen.
    const xpath = `//*[contains(@hint,"${hintSubstring}") or contains(@text,"${hintSubstring}")]`;
    for (let i = 0; i < 6; i++) {
        try {
            const el = await driver.$(xpath);
            if (await el.isExisting() && await el.isDisplayed()) {
                // Check it's not too close to bottom edge
                const loc = await el.getLocation();
                const screen = await driver.getWindowRect();
                if (loc.y < screen.height - 150) return; // visible enough
            }
        } catch { /* not yet visible */ }
        await scrollPage(driver, 'up');
    }
}

async function tapByCoords(driver, tapX, tapY) {
    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0,   x: tapX, y: tapY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 150 },
            { type: 'pointerUp',   button: 0 },
        ],
    }]);
    await driver.releaseActions();
    await driver.pause(500);
}

// Core dropdown interaction — finds spinner by hint, opens it, selects value.
async function selectFromDropdown(driver, hintSubstring, value, optionsList = []) {
    console.log(`▶ selectFromDropdown: hint="${hintSubstring}" value="${value}"`);

    // 1. Scroll until the spinner is visible
    await scrollToSpinner(driver, hintSubstring);
    await dismissKeyboardIfVisible(driver);
    await driver.pause(300);

    // 2. Find spinner by hint
    const spinner = await findSpinnerByHint(driver, hintSubstring);
    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();
    console.log(`📍 Spinner @ (${loc.x}, ${loc.y}), size (${size.width}×${size.height})`);

    // 3. Tap the dropdown arrow (right edge of spinner)
    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);
    console.log(`📍 Tapping dropdown arrow at (${tapX}, ${tapY})`);
    await tapByCoords(driver, tapX, tapY);
    await driver.pause(2000);

    // 4. Verify popup opened (CheckedTextView items appear)
    let source = await driver.getPageSource();
    if (!source.includes('CheckedTextView')) {
        console.log('🔄 Dropdown did not open on first tap — retrying…');
        await tapByCoords(driver, tapX, tapY);
        await driver.pause(2000);
        source = await driver.getPageSource();
    }

    if (!source.includes('CheckedTextView')) {
        console.log('⚠️  Popup still not open — trying center tap…');
        const cx = Math.floor(loc.x + size.width / 2);
        const cy = Math.floor(loc.y + size.height / 2);
        await tapByCoords(driver, cx, cy);
        await driver.pause(2000);
    }

    // 5. Select the option — CheckedTextView strategies first
    await selectOptionFromOpenDropdown(driver, value, loc, size, optionsList);
}

async function selectOptionFromOpenDropdown(driver, value, spinnerLoc, spinnerSize, optionsList) {
    // ── Strategy 0: CheckedTextView UiSelector ────────────────
    try {
        const item = await driver.$(
            `android=new UiSelector().className("android.widget.CheckedTextView").text("${value}")`
        );
        await item.waitForDisplayed({ timeout: 4000 });
        const iloc = await item.getLocation();
        const isz  = await item.getSize();
        const icx  = Math.floor(iloc.x + isz.width  / 2);
        const icy  = Math.floor(iloc.y + isz.height / 2);
        console.log(`📍 Found "${value}" via CheckedTextView UiSelector → tap(${icx},${icy})`);
        await tapByCoords(driver, icx, icy);
        console.log(`✅ Selected "${value}" via CheckedTextView UiSelector`);
        return;
    } catch (e) {
        console.log(`⚠️  CheckedTextView UiSelector failed: ${e.message}`);
    }

    // ── Strategy 1: XPath restricted to CheckedTextView ───────
    try {
        const item = await driver.$(`//android.widget.CheckedTextView[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        const iloc = await item.getLocation();
        const isz  = await item.getSize();
        const icx  = Math.floor(iloc.x + isz.width  / 2);
        const icy  = Math.floor(iloc.y + isz.height / 2);
        console.log(`📍 Found "${value}" via XPath CheckedTextView → tap(${icx},${icy})`);
        await tapByCoords(driver, icx, icy);
        console.log(`✅ Selected "${value}" via XPath CheckedTextView`);
        return;
    } catch (e) {
        console.log(`⚠️  XPath CheckedTextView failed: ${e.message}`);
    }

    // ── Strategy 2: UiSelector text + resource-id guard ───────
    try {
        const item  = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        const resId = await item.getAttribute('resource-id');
        if (resId !== 'android:id/text1') {
            throw new Error(`Matched non-popup element (resource-id="${resId}") — skipping`);
        }
        const iloc = await item.getLocation();
        const isz  = await item.getSize();
        const icx  = Math.floor(iloc.x + isz.width  / 2);
        const icy  = Math.floor(iloc.y + isz.height / 2);
        console.log(`📍 Found "${value}" via UiSelector+guard → tap(${icx},${icy})`);
        await tapByCoords(driver, icx, icy);
        console.log(`✅ Selected "${value}" via UiSelector+guard`);
        return;
    } catch (e) {
        console.log(`⚠️  UiSelector+guard failed: ${e.message}`);
    }

    // ── Strategy 3: XML tag parse — CheckedTextView only ──────
    try {
        const source       = await driver.getPageSource();
        const nodes        = source.match(/<[^>]+>/g) || [];
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const textRegex    = new RegExp(`(?:text|content-desc)="\\s*${escapedValue}\\s*"`);
        let foundNode      = null;
        for (const node of nodes) {
            if (node.includes('CheckedTextView') && textRegex.test(node) && node.includes('bounds=')) {
                foundNode = node;
                break;
            }
        }
        if (foundNode) {
            const bm = foundNode.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
            if (bm) {
                const cx = Math.floor((parseInt(bm[1]) + parseInt(bm[3])) / 2);
                const cy = Math.floor((parseInt(bm[2]) + parseInt(bm[4])) / 2);
                console.log(`📍 Found "${value}" via CheckedTextView tag parse → tap(${cx},${cy})`);
                await tapByCoords(driver, cx, cy);
                console.log(`✅ Selected "${value}" via CheckedTextView tag parse`);
                return;
            }
        }
        console.log(`⚠️  "${value}" not found via CheckedTextView tag parse`);
    } catch (e) {
        console.log(`⚠️  Tag parse failed: ${e.message}`);
    }

    // ── Strategy 4: Coordinate fallback ───────────────────────
    if (!optionsList.length) {
        throw new Error(`❌ Could not select "${value}" — all strategies failed and no optionsList provided.`);
    }
    const screen = await driver.getWindowRect();
    const idx    = optionsList.indexOf(value);
    if (idx === -1) throw new Error(`"${value}" not in optionsList: [${optionsList.join(', ')}]`);

    const spinnerBottom = spinnerLoc.y + spinnerSize.height;
    const spaceBelow    = screen.height - spinnerBottom;
    const opensUpward   = spaceBelow < (optionsList.length * POPUP_ROW_HEIGHT);
    const finalX        = Math.floor(spinnerLoc.x + spinnerSize.width / 2);
    let   finalY;

    if (opensUpward) {
        const reversedIdx = (optionsList.length - 1) - idx;
        finalY = Math.floor(spinnerLoc.y - (reversedIdx * POPUP_ROW_HEIGHT) - (POPUP_ROW_HEIGHT / 2));
    } else {
        finalY = Math.floor(spinnerBottom + (idx * POPUP_ROW_HEIGHT) + (POPUP_ROW_HEIGHT / 2));
    }
    finalY = Math.max(5, Math.min(finalY, screen.height - 5));
    console.log(`📍 Coordinate fallback (opensUpward=${opensUpward}) → tap(${finalX},${finalY})`);
    await tapByCoords(driver, finalX, finalY);
    console.log(`✅ Selected "${value}" via coordinates`);
}


// ─────────────────────────────────────────────────────────────
//  SCROLL HELPERS
// ─────────────────────────────────────────────────────────────

async function scrollPage(driver, direction = 'up') {
    const screen = await driver.getWindowRect();
    const swipeX = Math.floor(screen.width / 2);
    const startY = direction === 'up'
        ? Math.floor(screen.height * 0.70)
        : Math.floor(screen.height * 0.30);
    const endY = direction === 'up'
        ? Math.floor(screen.height * 0.30)
        : Math.floor(screen.height * 0.70);

    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0,   x: swipeX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 80  },
            { type: 'pointerMove', duration: 600, x: swipeX, y: endY   },
            { type: 'pointerUp',   button: 0 },
        ],
    }]);
    await driver.releaseActions();
    await driver.pause(700);
}

async function scrollDownToText(driver, text, maxScrolls = 5) {
    const xpath = `//*[contains(@text,"${text}") or contains(@hint,"${text}")]`;
    for (let i = 0; i < maxScrolls; i++) {
        try {
            const el = await driver.$(xpath);
            if (await el.isExisting() && await el.isDisplayed()) return;
        } catch { /* not yet visible */ }
        await scrollPage(driver, 'up');
    }
}


// ─────────────────────────────────────────────────────────────
//  NAMED DROPDOWN WRAPPERS  (all hint-based — no instance())
// ─────────────────────────────────────────────────────────────

async function selectAbortionType(driver, value) {
    await selectFromDropdown(driver, 'Abortion Type', value, OPTIONS.abortionType);
}

async function selectFacilityPlaceOfAbortion(driver, value) {
    await selectFromDropdown(driver, 'Place of Abortion', value, OPTIONS.facilityPlaceOfAbortion);
}

async function selectReasonForDeath(driver, value) {
    await selectFromDropdown(driver, 'Reason for Death', value, OPTIONS.reasonForDeath);
}

async function selectPlaceOfDeath(driver, value) {
    await selectFromDropdown(driver, 'Place of Death', value, OPTIONS.placeOfDeath);
}

async function selectPlaceOfAnc(driver, value) {
    console.log(`▶ selectPlaceOfAnc: value="${value}"`);

    // 1. Scroll until the spinner is visible
    await scrollToSpinner(driver, 'Place of ANC');
    await driver.pause(300);

    // 2. Find spinner by hint
    const spinner = await findSpinnerByHint(driver, 'Place of ANC');
    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();

    // 3. Tap the dropdown arrow
    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);
    console.log(`📍 Tapping Place of ANC dropdown arrow at (${tapX}, ${tapY})`);
    await tapByCoords(driver, tapX, tapY);
    await driver.pause(1500); // Give the UI time to react (open keyboard/dropdown)

    // 4. Check if keyboard opened after the click and close it
    try {
        if (await driver.isKeyboardShown()) {
            console.log('⌨️  Keyboard opened after click — dismissing...');
            try {
                await driver.hideKeyboard();
            } catch (e) {
                await driver.pressKeyCode(4);
            }
            await driver.pause(1500); // Wait for the keyboard animation to fully finish
        }
    } catch (e) {
        console.log('⚠️  Keyboard check failed:', e.message);
    }

    // 5. SECURE OPEN LOOP: Check state using the structural end-icon attribute
    let isOpen = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!isOpen && attempts < maxAttempts) {
        try {
            const source = await driver.getPageSource();

            // Check if the drop down end icon button is in a checked="true" state in the XML
            if (source.includes('resource-id="org.piramalswasthya.sakhi.saksham.uat:id/text_input_end_icon"') &&
                source.includes('checked="true"')) {
                isOpen = true;
                break;
            }

            // Backwards compatibility fallback check
            if (source.includes('CheckedTextView')) {
                isOpen = true;
                break;
            }
        } catch (e) {
            console.log('⚠️ Error checking dropdown layout state:', e.message);
        }

        if (!isOpen) {
            attempts++;
            console.log(`🔄 Dropdown is closed structurally (Attempt ${attempts}/${maxAttempts}). Tapping to open...`);
            await tapByCoords(driver, tapX, tapY);
            await driver.pause(2000); // Wait for dropdown layer to populate
        }
    }

    if (!isOpen) {
        console.log('⚠️ Verification loop timed out, attempting selection phase anyway...');
    } else {
        console.log('✅ Dropdown popup verified open via icon status.');
    }

    // 6. Select the option from the open dropdown
    await selectOptionFromOpenDropdown(driver, value, loc, size, OPTIONS.placeOfAnc);
}

async function selectAncPeriod(driver, value) {
    await selectFromDropdown(driver, 'ANC Period', value, OPTIONS.ancPeriod);
}

async function selectHighRiskCondition(driver, value) {
    await selectFromDropdown(driver, 'High Risk', value, []);
}

async function selectReferralFacility(driver, value) {
    console.log(`▶ selectReferralFacility: value="${value}"`);

    // 1. Scroll until the spinner is visible
    await scrollToSpinner(driver, 'Referral Facility');
    await driver.pause(300);

    // 2. Find spinner by hint
    // Note: The XML shows the text is "Referral Facility"
    const spinner = await findSpinnerByHint(driver, 'Referral Facility');
    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();

    // 3. Tap the dropdown arrow
    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);
    console.log(`📍 Tapping Referral Facility dropdown arrow at (${tapX}, ${tapY})`);
    await tapByCoords(driver, tapX, tapY);
    await driver.pause(1500); // Give the UI time to react (open keyboard/dropdown)

    // 4. Check if keyboard opened after the click and close it
    try {
        if (await driver.isKeyboardShown()) {
            console.log('⌨️  Keyboard opened after click — dismissing...');
            try {
                await driver.hideKeyboard();
            } catch (e) {
                await driver.pressKeyCode(4);
            }
            await driver.pause(1500); // Wait for the keyboard animation to fully finish
        }
    } catch (e) {
        console.log('⚠️  Keyboard check failed:', e.message);
    }

    // 5. SECURE OPEN LOOP: Check state using the structural end-icon attribute
    let isOpen = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!isOpen && attempts < maxAttempts) {
        try {
            const source = await driver.getPageSource();

            // Check if the drop down end icon button is in a checked="true" state in the XML
            if (source.includes('resource-id="org.piramalswasthya.sakhi.saksham.uat:id/text_input_end_icon"') &&
                source.includes('checked="true"')) {
                isOpen = true;
                break;
            }

            // Backwards compatibility fallback check
            if (source.includes('CheckedTextView')) {
                isOpen = true;
                break;
            }
        } catch (e) {
            console.log('⚠️ Error checking dropdown layout state:', e.message);
        }

        if (!isOpen) {
            attempts++;
            console.log(`🔄 Dropdown is closed structurally (Attempt ${attempts}/${maxAttempts}). Tapping to open...`);
            await tapByCoords(driver, tapX, tapY);
            await driver.pause(2000); // Wait for dropdown layer to populate
        }
    }

    if (!isOpen) {
        console.log('⚠️ Verification loop timed out, attempting selection phase anyway...');
    } else {
        console.log('✅ Dropdown popup verified open via icon status.');
    }

    // 6. Select the option from the open dropdown
    const referralOptions = [
        'Primary Health Centre',
        'Community Health Centre',
        'District Hospital',
        'Other Private Hospital'
    ];
    await selectOptionFromOpenDropdown(driver, value, loc, size, referralOptions);
}

async function selectIdentifiedAsHrp(driver, value) {
    console.log(`▶ selectIdentifiedAsHrp: value="${value}"`);

    // 1. Scroll until the spinner is visible
    await scrollToSpinner(driver, 'Who had identified as HRP?');
    await driver.pause(300);

    // 2. Find spinner by hint
    const spinner = await findSpinnerByHint(driver, 'Who had identified as HRP?');
    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();

    // 3. Tap the dropdown arrow (right edge of spinner)
    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);
    console.log(`📍 Tapping Identified as HRP dropdown arrow at (${tapX}, ${tapY})`);
    await tapByCoords(driver, tapX, tapY);
    await driver.pause(1500);

    // 4. Dismiss keyboard if it appeared
    try {
        if (await driver.isKeyboardShown()) {
            console.log('⌨️  Keyboard opened — dismissing...');
            try { await driver.hideKeyboard(); }
            catch (e) { await driver.pressKeyCode(4); }
            await driver.pause(1500);
        }
    } catch (e) {
        console.log('⚠️  Keyboard check failed:', e.message);
    }

    // 5. Wait for the popup window to appear — poll until CheckedTextView
    //    items are reachable via UiAutomator (they live in a separate window
    //    so getPageSource() misses them; UiSelector searches ALL windows).
    let popupOpen = false;
    for (let attempt = 0; attempt < 4; attempt++) {
        try {
            const probe = await driver.$(
                `android=new UiSelector().className("android.widget.CheckedTextView").index(0)`
            );
            if (await probe.isExisting()) {
                popupOpen = true;
                break;
            }
        } catch (e) { /* not yet visible */ }

        console.log(`🔄 Popup not open yet (attempt ${attempt + 1}/4) — tapping again...`);
        await tapByCoords(driver, tapX, tapY);
        await driver.pause(1500);
    }

    if (!popupOpen) {
        console.log('⚠️  Popup still not detected — attempting selection anyway...');
    } else {
        console.log('✅ Popup confirmed open via UiSelector CheckedTextView probe.');
    }

    // 6. Select the item — UiSelector searches ALL windows including the popup
    const hrpOptions = ['ANM', 'CHO', 'PHC – MO', 'Specialist at Higher Facility'];

    // Strategy A: UiSelector by text across all windows (most reliable for multi-window popups)
    try {
        const item = await driver.$(
            `android=new UiSelector().className("android.widget.CheckedTextView").text("${value}")`
        );
        await item.waitForExist({ timeout: 3000 });
        const iloc = await item.getLocation();
        const isz  = await item.getSize();
        const icx  = Math.floor(iloc.x + isz.width  / 2);
        const icy  = Math.floor(iloc.y + isz.height / 2);
        console.log(`📍 Found "${value}" via UiSelector CheckedTextView → tap(${icx},${icy})`);
        await tapByCoords(driver, icx, icy);
        console.log(`✅ Selected "${value}" via UiSelector CheckedTextView`);
        return;
    } catch (e) {
        console.log(`⚠️  UiSelector CheckedTextView failed: ${e.message}`);
    }

    // Strategy B: XPath — also searches all windows in UIA2
    try {
        const item = await driver.$(`//android.widget.CheckedTextView[@text="${value}"]`);
        await item.waitForExist({ timeout: 3000 });
        const iloc = await item.getLocation();
        const isz  = await item.getSize();
        const icx  = Math.floor(iloc.x + isz.width  / 2);
        const icy  = Math.floor(iloc.y + isz.height / 2);
        console.log(`📍 Found "${value}" via XPath CheckedTextView → tap(${icx},${icy})`);
        await tapByCoords(driver, icx, icy);
        console.log(`✅ Selected "${value}" via XPath CheckedTextView`);
        return;
    } catch (e) {
        console.log(`⚠️  XPath CheckedTextView failed: ${e.message}`);
    }

    // Strategy C: android:id/text1 resource-id (popup items always use this id)
    try {
        const item = await driver.$(
            `android=new UiSelector().resourceId("android:id/text1").text("${value}")`
        );
        await item.waitForExist({ timeout: 3000 });
        const iloc = await item.getLocation();
        const isz  = await item.getSize();
        const icx  = Math.floor(iloc.x + isz.width  / 2);
        const icy  = Math.floor(iloc.y + isz.height / 2);
        console.log(`📍 Found "${value}" via android:id/text1 → tap(${icx},${icy})`);
        await tapByCoords(driver, icx, icy);
        console.log(`✅ Selected "${value}" via android:id/text1`);
        return;
    } catch (e) {
        console.log(`⚠️  android:id/text1 strategy failed: ${e.message}`);
    }

    // Strategy D: Hard-coded bounds from XML — popup is ALWAYS at [94,1418][1037,1860]
    //             ANM row: [94,1435][1037,1537]  → centre (565, 1486)
    //             CHO row: [94,1537][1037,1639]  → centre (565, 1588)
    //             PHC – MO: [94,1639][1037,1741] → centre (565, 1690)
    //             Specialist: [94,1741][1037,1843]→ centre (565, 1792)
    const hardcodedCoords = {
        'ANM':                          { x: 565, y: 1486 },
        'CHO':                          { x: 565, y: 1588 },
        'PHC \u2013 MO':               { x: 565, y: 1690 },  // PHC – MO (en-dash)
        'Specialist at Higher Facility':{ x: 565, y: 1792 },
    };
    if (hardcodedCoords[value]) {
        const { x, y } = hardcodedCoords[value];
        console.log(`📍 Using hardcoded popup coords for "${value}" → tap(${x},${y})`);
        await tapByCoords(driver, x, y);
        console.log(`✅ Selected "${value}" via hardcoded coords`);
        return;
    }

    // Strategy E: Last-resort index-based coordinate fallback
    const idx = hrpOptions.indexOf(value);
    if (idx === -1) throw new Error(`"${value}" not in hrpOptions`);
    const POPUP_TOP    = 1435;
    const ROW_HEIGHT   = 102;
    const fallbackX    = 565;
    const fallbackY    = POPUP_TOP + (idx * ROW_HEIGHT) + Math.floor(ROW_HEIGHT / 2);
    console.log(`📍 Index-based fallback for "${value}" → tap(${fallbackX},${fallbackY})`);
    await tapByCoords(driver, fallbackX, fallbackY);
    console.log(`✅ Selected "${value}" via index-based fallback`);
}

async function swipeHorizontal(driver, direction) {
    const size   = await driver.getWindowRect();
    const startX = direction === 'left'
        ? Math.floor(size.width * 0.80)
        : Math.floor(size.width * 0.20);
    const endX   = direction === 'left'
        ? Math.floor(size.width * 0.20)
        : Math.floor(size.width * 0.80);
    const midY   = Math.floor(size.height * 0.50);

    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0,   x: startX, y: midY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 80  },
            { type: 'pointerMove', duration: 450, x: endX,   y: midY },
            { type: 'pointerUp',   button: 0 },
        ],
    }]);
    await driver.releaseActions();
    await driver.pause(900);
}

async function getCalendarMonthYear(driver) {
    try {
        const firstDay = await driver.$(
            'android=new UiSelector().resourceId("android:id/month_view")' +
            '.childSelector(new UiSelector().clickable(true))'
        );
        const desc  = await firstDay.getAttribute('content-desc');
        const parts = desc.trim().split(' ');
        return { month: MONTH_NAMES.indexOf(parts[1]), year: parseInt(parts[2], 10) };
    } catch (e) {
        console.error('getCalendarMonthYear failed:', e.message);
        return null;
    }
}

async function navigateToMonth(driver, targetMonth, targetYear) {
    const yearHeader = await driver.$(
        'android=new UiSelector().resourceId("android:id/date_picker_header_year")'
    );
    await yearHeader.waitForDisplayed({ timeout: 3000 });
    const currentYear = parseInt(await yearHeader.getText(), 10);

    if (currentYear !== targetYear) {
        await yearHeader.click();
        await driver.pause(1000);
        const yearEl = await driver.$(
            `android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${targetYear}")`
        );
        await yearEl.click();
        await driver.pause(1000);
    }

    const prevBtn = await driver.$('android=new UiSelector().resourceId("android:id/prev")');
    for (let i = 0; i < 24; i++) {
        const cur = await getCalendarMonthYear(driver);
        if (!cur) break;
        const curTotal = cur.year * 12 + cur.month;
        const tgtTotal = targetYear * 12 + targetMonth;
        if (curTotal === tgtTotal) break;
        if (curTotal > tgtTotal) await prevBtn.click();
        else await swipeHorizontal(driver, 'left');
        await driver.pause(800);
    }
}

async function pickDateFromCalendar(driver, dateObj) {
    const { day, month, year } = dateObj;
    const datePicker = await driver.$(
        'android=new UiSelector().resourceId("android:id/datePicker")'
    );
    await datePicker.waitForDisplayed({ timeout: 5000 });
    await navigateToMonth(driver, month, year);
    await driver.pause(500);

    const paddedDay  = String(day).padStart(2, '0');
    const monthName  = MONTH_NAMES[month];
    const targetDesc = `${paddedDay} ${monthName} ${year}`;

    const dayEl = await driver.$(`android=new UiSelector().description("${targetDesc}")`);
    await dayEl.waitForDisplayed({ timeout: 3000 });
    await dayEl.click();
    await driver.pause(500);

    const okBtn = await driver.$('android=new UiSelector().resourceId("android:id/button1")');
    await okBtn.click();
    console.log(`✔ Date selected: ${targetDesc}`);

    await driver.waitUntil(
        async () => !(await datePicker.isExisting()),
        { timeout: 5000, timeoutMsg: 'Calendar dialog did not close.' }
    );
    await driver.pause(1000);
}


async function fillTextInput(driver, hintText, value, scrollLabel, maxScrolls = 5) {
    console.log(`Processing "${scrollLabel || hintText}"…`);

    const xpath = `//android.widget.EditText[contains(@hint,"${hintText}")]`;
    let field = await driver.$(xpath);
    let isVisible = (await field.isExisting()) && (await field.isDisplayed());

    // 1. Search downwards (swiping 'up' on the screen moves the view down)
    let attemptsDown = 0;
    while (!isVisible && attemptsDown < maxScrolls) {
        console.log(`🔄 "${hintText}" not found. Scrolling down...`);
        await scrollPage(driver, 'up');

        field = await driver.$(xpath);
        isVisible = (await field.isExisting()) && (await field.isDisplayed());
        attemptsDown++;
    }

    // 2. Search upwards (swiping 'down' on the screen moves the view up)
    // We do (attemptsDown + maxScrolls) to cover the distance we just scrolled down, plus extra.
    let attemptsUp = 0;
    let maxUpScrolls = attemptsDown + maxScrolls;

    while (!isVisible && attemptsUp < maxUpScrolls) {
        console.log(`🔄 "${hintText}" not found. Reversing! Scrolling up...`);
        await scrollPage(driver, 'down');

        field = await driver.$(xpath);
        isVisible = (await field.isExisting()) && (await field.isDisplayed());
        attemptsUp++;
    }

    // 3. Final Check
    if (!isVisible) {
        console.error(`❌ Field "${hintText}" not found after scanning both down and up.`);
        return;
    }

    // 4. Fill the field
    const current = (await field.getText() || '').trim();
    if (current === String(value).trim()) {
        console.log(`➡  Already "${value}".`);
        return;
    }

    await field.click();
    await field.clearValue();
    await field.setValue(value);

    // Hide keyboard if it pops up
    try {
        await driver.pause(500);
        if (await driver.isKeyboardShown()) {
            try { await driver.hideKeyboard(); }
            catch (e) { await driver.pressKeyCode(4); }
            await driver.pause(1000);
        }
    } catch (e) {
        console.log('⚠️  Could not hide keyboard:', e.message);
    }

    console.log(`✔ "${scrollLabel || hintText}" set to "${value}".`);
}

async function fillAncDate(driver) {
    console.log('Processing ANC Date…');
    const field = await driver.$(
        '//android.widget.EditText[@text="ANC Date *" or @hint="ANC Date *"]'
    );
    await field.waitForDisplayed({ timeout: 5000 });
    const current = (await field.getText() || '').trim();
    if (!current || current === 'ANC Date *') {
        await field.click();
        await driver.pause(1000);
        await pickDateFromCalendar(driver, FORM_DATA.ancDate);
    } else {
        console.log('➡  ANC Date already filled.');
    }
}

async function fillAbortionIfAny(driver) {
    console.log('Processing "Abortion If Any"…');
    await scrollDownToText(driver, 'Abortion If Any', 3);
    const xpath =
        `//android.widget.TextView[@text="Abortion If Any"]` +
        `/parent::android.widget.LinearLayout` +
        `/following-sibling::android.widget.RadioGroup` +
        `/android.widget.RadioButton[@text="${FORM_DATA.abortionIfAny}"]`;
    const btn = await driver.$(xpath);
    if (await btn.isExisting()) {
        if ((await btn.getAttribute('checked')) !== 'true') {
            await btn.click();
            console.log(`✔ "Abortion If Any" set to "${FORM_DATA.abortionIfAny}".`);
            await driver.pause(1500);
        } else { console.log('➡  Already set.'); }
    } else {
        console.error('❌ "Abortion If Any" radio not found.');
    }
}

async function fillAbortionDate(driver) {
    console.log('Processing Abortion Date…');
    await scrollDownToText(driver, 'Abortion Date', 3);
    const field = await driver.$(
        '//android.widget.EditText[contains(@text,"Abortion Date") or contains(@hint,"Abortion Date")]'
    );
    if (await field.isExisting() && await field.isDisplayed()) {
        const current = (await field.getText() || '').trim();
        if (!current || current.includes('Abortion Date')) {
            await field.click();
            await driver.pause(1000);
            await pickDateFromCalendar(driver, FORM_DATA.abortionDate);
        } else { console.log('➡  Abortion Date already filled.'); }
    }
}

async function fillAbortionSection(driver) {
    await fillAbortionIfAny(driver);
    if (FORM_DATA.abortionIfAny === 'Yes') {
        await selectAbortionType(driver, FORM_DATA.abortionType);
        await selectFacilityPlaceOfAbortion(driver, FORM_DATA.facilityPlaceOfAbortion);
        await fillAbortionDate(driver);
    }
}

async function fillMaternalDeath(driver) {
    console.log('Processing "Is the Pregnant Woman alive?"…');
    await scrollDownToText(driver, 'Is the Pregnant Woman alive?', 2);
    const xpath =
        `//android.widget.TextView[@text="Is the Pregnant Woman alive?"]` +
        `/parent::android.widget.LinearLayout` +
        `/following-sibling::android.widget.RadioGroup` +
        `/android.widget.RadioButton[@text="${FORM_DATA.isWomanAlive}"]`;
    const btn = await driver.$(xpath);
    if (await btn.isExisting()) {
        if ((await btn.getAttribute('checked')) !== 'true') {
            await btn.click();
            console.log(`✔ "Is the Pregnant Woman alive?" set to "${FORM_DATA.isWomanAlive}".`);
            await driver.pause(1500);
        } else { console.log('➡  Already set.'); }
    } else {
        console.error('❌ "Is the Pregnant Woman alive?" radio not found.');
    }
}

async function fillDeathDate(driver) {
    console.log('Processing Death Date…');
    await scrollDownToText(driver, 'Date of death', 2);
    const field = await driver.$(
        '//android.widget.EditText[@text="Date of death *" or @hint="Date of death *"' +
        ' or @text="Death Date *" or @hint="Death Date *"]'
    );
    if (await field.isExisting() && await field.isDisplayed()) {
        const current = (await field.getText() || '').trim();
        if (!current || current.includes('Date of death') || current.includes('Death Date')) {
            await field.click();
            await driver.pause(1000);
            await pickDateFromCalendar(driver, FORM_DATA.deathDate);
        } else { console.log('➡  Death Date already filled.'); }
    } else {
        console.error('❌ Death Date field not found.');
    }
}

async function fillHasDelivered(driver) {
    console.log('Processing "Has the pregnant woman delivered?"…');
    await scrollDownToText(driver, 'Has the pregnant woman delivered?', 2);
    const xpath =
        `//android.widget.TextView[@text="Has the pregnant woman delivered?"]` +
        `/parent::android.widget.LinearLayout` +
        `/following-sibling::android.widget.RadioGroup` +
        `/android.widget.RadioButton[@text="${FORM_DATA.delivered}"]`;
    const btn = await driver.$(xpath);
    if (await btn.isExisting()) {
        if ((await btn.getAttribute('checked')) !== 'true') {
            await btn.click();
            console.log(`✔ Delivered set to "${FORM_DATA.delivered}".`);
        } else { console.log('➡  Already set.'); }
    }
}

async function fillHighRisk(driver) {
    console.log('Processing "Any High Risk conditions"…');
    await scrollDownToText(driver, 'Any High Risk conditions', 3);
    const xpath =
        `//android.widget.TextView[@text="Any High Risk conditions"]` +
        `/parent::android.widget.LinearLayout` +
        `/following-sibling::android.widget.RadioGroup` +
        `/android.widget.RadioButton[@text="${FORM_DATA.highRisk}"]`;
    const btn = await driver.$(xpath);
    if (await btn.isExisting()) {
        if ((await btn.getAttribute('checked')) !== 'true') {
            await btn.click();
            console.log(`✔ High Risk set to "${FORM_DATA.highRisk}".`);
            await driver.pause(1000);
        } else { console.log('➡  Already set.'); }
    }
}

async function fillHrpConfirmed(driver) {
    console.log('Processing "Is HRP Confirmed?"…');
    await scrollDownToText(driver, 'Is HRP Confirmed?', 3);
    const xpath =
        `//android.widget.TextView[@text="Is HRP Confirmed?"]` +
        `/parent::android.widget.LinearLayout` +
        `/following-sibling::android.widget.RadioGroup` +
        `/android.widget.RadioButton[@text="${FORM_DATA.hrpConfirmed}"]`;
    const btn = await driver.$(xpath);
    if (await btn.isExisting()) {
        if ((await btn.getAttribute('checked')) !== 'true') {
            await btn.click();
            console.log(`✔ HRP Confirmed set to "${FORM_DATA.hrpConfirmed}".`);
            await driver.pause(1000);
        } else { console.log('➡  Already set.'); }
    }
}

async function uploadMcpCard(driver, sideName) {
    console.log(`Processing MCP Card (${sideName})…`);
    await scrollDownToText(driver, sideName, 2);
    const addFileBtn = await driver.$(
        `//android.widget.TextView[@text="${sideName}"]` +
        `/following-sibling::android.widget.ImageView[@content-desc="add file"]`
    );
    if (await addFileBtn.isExisting() && await addFileBtn.isDisplayed()) {
        await addFileBtn.click();
        await driver.pause(1500);
        const galleryBtn = await driver.$(
            '//android.widget.Button[@text="Pick from Gallery"] | ' +
            '//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnGallery"]'
        );
        if (await galleryBtn.isExisting()) {
            await galleryBtn.click();
            console.log(`✔ Clicked "Pick from Gallery" for ${sideName}. Waiting 20 s…`);
            await driver.pause(20000);
        }
    }
}

async function clickSubmitButton(driver) {
    console.log('Clicking Submit…');
    await scrollDownToText(driver, 'Submit', 2);
    const btn = await driver.$(
        '//android.widget.Button[@text="Submit"] | ' +
        '//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]'
    );
    if (await btn.isExisting()) {
        await btn.click();
        await driver.pause(3000);
        console.log('✔ Submit clicked.');
    } else {
        throw new Error('❌ Submit button not found.');
    }
}


// ─────────────────────────────────────────────────────────────
//  MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────

async function fillAncForm(driver) {
    const isDeceased = FORM_DATA.isWomanAlive === 'No';

    await fillAncDate(driver);
    await fillAbortionSection(driver);
    await fillMaternalDeath(driver);

    if (isDeceased) {
        await selectReasonForDeath(driver, FORM_DATA.probableCauseOfDeath);
        await fillDeathDate(driver);
        await selectPlaceOfDeath(driver, FORM_DATA.placeOfDeath);

        if (FORM_DATA.placeOfDeath === 'Other Place of Death') {
            await fillTextInput(
                driver,
                'Other Place of Death',
                FORM_DATA.otherPlaceOfDeath,
                'Other Place of Death'
            );
        }

        await selectPlaceOfAnc(driver, FORM_DATA.placeOfAnc);
        await selectAncPeriod(driver, FORM_DATA.ancPeriod);
        await fillTextInput(driver, 'No. of IFA Tabs given', FORM_DATA.ifaTabs);
        await fillTextInput(driver, 'Fundal Height',         FORM_DATA.fundalHeight);

    } else {
        await selectPlaceOfAnc(driver, FORM_DATA.placeOfAnc);
        await selectAncPeriod(driver, FORM_DATA.ancPeriod);

        // ⬇️ --- CHANGED PART: MOVED HERE --- ⬇️
        await fillTextInput(driver, 'No. of IFA Tabs given', FORM_DATA.ifaTabs);
        await fillTextInput(driver, 'Fundal Height',         FORM_DATA.fundalHeight);
        // ⬆️ -------------------------------- ⬆️

        await fillHasDelivered(driver);
        await fillTextInput(driver, 'Weight of PW',          FORM_DATA.weight);
        await fillTextInput(driver, 'BP of PW',              FORM_DATA.bp);
        await fillTextInput(driver, 'HB',                    FORM_DATA.hb);

        await fillHighRisk(driver);
        if (FORM_DATA.highRisk === 'Yes') {
            await selectHighRiskCondition(driver, FORM_DATA.highRiskCondition);
            await fillTextInput(driver, 'Any other High Risk', FORM_DATA.otherHighRisk);
        }

        await selectReferralFacility(driver, FORM_DATA.referralFacility);
        await fillHrpConfirmed(driver);
        if (FORM_DATA.hrpConfirmed === 'Yes') {
            await selectIdentifiedAsHrp(driver, FORM_DATA.identifiedAsHrp);
        }
    }

    await uploadMcpCard(driver, 'Front Side');
    await uploadMcpCard(driver, 'Back Side');
    await clickSubmitButton(driver);
}

module.exports = { fillAncForm };