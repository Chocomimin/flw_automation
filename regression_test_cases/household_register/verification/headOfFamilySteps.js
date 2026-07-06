// headOfFamilySteps.js
// ✅ FINAL VERSION — Optimized to handle DOB selection via calendar popups cleanly across devices

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

// ─────────────────────────────────────────────────────────────
//  CORE HELPER — Scroll spinner into view
// ─────────────────────────────────────────────────────────────

async function scrollSpinnerToMiddle(driver, spinnerSelector) {
    try {
        const spinner = await driver.$(spinnerSelector);
        const loc = await spinner.getLocation();
        const screen = await driver.getWindowRect();
        const midY = screen.height / 2;

        if (loc.y > midY + 100) {
            console.log(`⬆️  Spinner at y=${loc.y}, scrolling toward middle...`);

            const startY = Math.floor(screen.height * 0.7);
            const endY   = Math.floor(screen.height * 0.3);
            const swipeX = Math.floor(screen.width / 2);

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
//  CORE HELPER — Tap by coordinates
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

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList) {
    // ── APPROACH: mirrors openSpinnerAndSelect() in ancVisitForm.js ──────────
    // 1. Scroll spinner into view & get its live bounds
    // 2. Tap the right-side arrow to open the popup
    // 3. PRIMARY: read getPageSource() → regex for CheckedTextView bounds → tap centre
    //    (getPageSource() returns ALL windows including the Popup Window that
    //     hosts the CheckedTextView options, so bounds are always accurate)
    // 4. FALLBACK: coordinate math using spinner position + row height + index
    // ─────────────────────────────────────────────────────────────────────────

    await scrollSpinnerToMiddle(driver, spinnerSelector);

    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();
    console.log(`📍 Spinner @ (${loc.x}, ${loc.y}), size (${size.width}x${size.height})`);

    // Tap the dropdown arrow on the right side of the spinner
    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);
    console.log(`📍 Tapping dropdown arrow at (${tapX}, ${tapY})`);
    await tapByCoords(driver, tapX, tapY);
    await driver.pause(1000);

    // If keyboard appeared, close it and re-tap
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

    // STRATEGY 1 (PRIMARY): Parse getPageSource() for CheckedTextView bounds and tap centre.
    // getPageSource() in Appium returns the full XML across ALL windows, including the
    // "Popup Window" that opens for these spinners — so the bounds are real screen coords.
    try {
        const source = await driver.getPageSource();
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Match CheckedTextView with exact text first (most precise)
        const checkedPattern = new RegExp(
            `class="android\\.widget\\.CheckedTextView"[^>]*?text="${escapedValue}"[^>]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
            's'
        );
        // Generic fallback: any node with matching text and bounds
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

    // STRATEGY 2 (FALLBACK): Coordinate math using spinner position + row height × index.
    // Uses fresh bounds in case a scroll shifted the spinner since strategy 1.
    const idx = optionsList.indexOf(value);
    if (idx === -1) throw new Error(`"${value}" not in options: [${optionsList.join(', ')}]`);

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
async function getCalendarMonthYear(driver) {
    try {
        const cells = await driver.$$('//android.view.View[@resource-id="android:id/month_view"]/android.view.View');
        for (const cell of cells) {
            const desc = await cell.getAttribute('content-desc').catch(() => '');
            const match = desc.match(/^(\d{2})\s+(\w+)\s+(\d{4})$/);
            if (match) {
                const month = MONTH_NAMES.findIndex(m => m.toLowerCase() === match[2].toLowerCase());
                const year  = parseInt(match[3], 10);
                if (month > 0) {
                    console.log(`   📆 Calendar parsing context: ${MONTH_NAMES[month]} ${year}`);
                    return { month, year };
                }
            }
        }
    } catch (e) {
        console.warn(`   ⚠️  getCalendarMonthYear layout error: ${e.message}`);
    }
    return null;
}

async function swipeHorizontalCalendar(driver, direction) {
    const size   = await driver.getWindowRect();
    const startX = direction === 'left' ? Math.floor(size.width * 0.80) : Math.floor(size.width * 0.20);
    const endX   = direction === 'left' ? Math.floor(size.width * 0.20) : Math.floor(size.width * 0.80);
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
    await driver.pause(800);
}

// NEW: Vertical swipe helper tightly constrained to the center of the screen.
// This ensures we only drag *inside* the calendar popup box, avoiding the background.
async function swipeVerticalInsidePopup(driver, direction) {
    const size = await driver.getWindowRect();
    const startX = Math.floor(size.width / 2);

    // Keep swipe strictly between 40% and 60% of the screen height
    // 'down' pulls older years down into view
    // 'up' pushes newer years up into view
    const topY = Math.floor(size.height * 0.40);
    const bottomY = Math.floor(size.height * 0.60);

    const startY = direction === 'down' ? topY : bottomY;
    const endY   = direction === 'down' ? bottomY : topY;

    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0,   x: startX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 100  },
            { type: 'pointerMove', duration: 500, x: startX, y: endY },
            { type: 'pointerUp',   button: 0 },
        ],
    }]);
    await driver.releaseActions();
    await driver.pause(600);
}

async function navigateCalendarToMonth(driver, targetMonth, targetYear) {
    const yearHeader = await driver.$('//android.widget.TextView[@resource-id="android:id/date_picker_header_year"]');
    await yearHeader.waitForDisplayed({ timeout: 5000 });
    const currentYear = parseInt(await yearHeader.getText(), 10);

    // 1. Select the Year
    if (currentYear !== targetYear) {
        await yearHeader.click();
        await driver.pause(1000);

        let yearFound = false;
        const yearXpath = `//android.widget.TextView[@text="${targetYear}"]`;

        // If target is older (e.g., 1990 < 2011), swipe 'down' to reveal top of list
        const swipeDir = targetYear < currentYear ? 'down' : 'up';

        for (let i = 0; i < 40; i++) {
            const yearEl = await driver.$(yearXpath);
            if (await yearEl.isDisplayed().catch(() => false)) {
                yearFound = true;
                await yearEl.click();
                break;
            }
            console.log(`   🔄 Scrolling ${swipeDir} to find year ${targetYear}...`);
            await swipeVerticalInsidePopup(driver, swipeDir);
        }

        if (!yearFound) {
            throw new Error(`Year ${targetYear} not found after scrolling.`);
        }
        await driver.pause(1000);
    }

    // 2. Select the Month
    //
    // ROOT CAUSE OF CRASHES: calling element.click() on android:id/prev or android:id/next
    // while UiAutomator2 has active element references causes the instrumentation to die.
    // Similarly, querying month_view child elements right after a navigation click races
    // with the ViewPager animation and also crashes it.
    //
    // SAFE APPROACH:
    //   a) Resolve button coordinates ONCE from page source (no live element refs in the loop).
    //   b) Read the current month by parsing page source text (no element queries mid-loop).
    //   c) Tap by coordinates — bypasses the accessibility layer entirely.
    //   d) Wait 1.2s after each tap for the ViewPager animation to finish before next read.

    async function getNavButtonCoords(drv) {
        const src = await drv.getPageSource();
        const prevMatch = src.match(/resource-id="android:id\/prev"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
                       || src.match(/content-desc="Previous month"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
        const nextMatch = src.match(/resource-id="android:id\/next"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
                       || src.match(/content-desc="Next month"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
        if (!prevMatch || !nextMatch) return null;
        return {
            prev: { x: Math.floor((+prevMatch[1] + +prevMatch[3]) / 2), y: Math.floor((+prevMatch[2] + +prevMatch[4]) / 2) },
            next: { x: Math.floor((+nextMatch[1] + +nextMatch[3]) / 2), y: Math.floor((+nextMatch[2] + +nextMatch[4]) / 2) },
        };
    }

    async function getCurrentMonthFromSource(drv) {
        try {
            const src = await drv.getPageSource();
            const match = src.match(/content-desc="(\d{2})\s+(\w+)\s+(\d{4})"/);
            if (match) {
                const month = MONTH_NAMES.findIndex(m => m.toLowerCase() === match[2].toLowerCase());
                const year  = parseInt(match[3], 10);
                if (month > 0) {
                    console.log(`   📆 Source-parsed month: ${MONTH_NAMES[month]} ${year}`);
                    return { month, year };
                }
            }
        } catch (e) {
            console.warn(`   ⚠️  getCurrentMonthFromSource failed: ${e.message}`);
        }
        return null;
    }

    let navCoords = await getNavButtonCoords(driver);
    if (!navCoords) {
        console.warn('   ⚠️  Could not resolve prev/next button coordinates. Skipping month nav.');
    } else {
        for (let i = 0; i < 36; i++) {
            const cur = await getCurrentMonthFromSource(driver);
            if (!cur) { console.warn('   ⚠️  Could not read calendar month — stopping.'); break; }

            const curTotal = cur.year * 12 + cur.month;
            const tgtTotal = targetYear * 12 + targetMonth;
            if (curTotal === tgtTotal) break;

            if (curTotal > tgtTotal) {
                console.log(`   ◀ Tapping Prev (${navCoords.prev.x},${navCoords.prev.y}) — ${MONTH_NAMES[cur.month]} ${cur.year}`);
                await tapByCoords(driver, navCoords.prev.x, navCoords.prev.y);
            } else {
                console.log(`   ▶ Tapping Next (${navCoords.next.x},${navCoords.next.y}) — ${MONTH_NAMES[cur.month]} ${cur.year}`);
                await tapByCoords(driver, navCoords.next.x, navCoords.next.y);
            }
            // Wait for ViewPager animation before next page source read
            await driver.pause(1200);
            navCoords = await getNavButtonCoords(driver) || navCoords;
        }
    }
}
async function handleConsentForm(driver) {
    console.log("⏳ Waiting for Consent Form popup...");
    try {
        const agreeBtn = await driver.$('android=new UiSelector().textMatches("(?i)agree")');
        await agreeBtn.waitForDisplayed({ timeout: 15000 });
        console.log("✅ Consent popup is visible");
        await driver.pause(1000);

        const checkbox = await driver.$('android=new UiSelector().className("android.widget.CheckBox")');
        if (await checkbox.isExisting()) {
            await checkbox.click();
            console.log("✅ Clicked the Consent Checkbox");
        } else {
            console.log("⚠️ Checkbox class not found, clicking the text body instead...");
            const consentText = await driver.$('android=new UiSelector().textContains("I have been explained")');
            await consentText.click();
            console.log("✅ Clicked the text body to check the box");
        }
        await driver.pause(1000);
        await agreeBtn.click();
        console.log("✅ Clicked AGREE on Consent Form");
        await driver.pause(2000);
    } catch (error) {
        console.log("ℹ️ No Consent Form appeared or it was missed. Continuing...");
    }
}

async function handleOtpVerification(driver) {
    console.log("📲 Initiating OTP Verification...");
    try {
        // 1. Find and click the OTP generation/trigger button
        // Update the locator below to match your actual app's 'Get OTP' button
        const otpButton = await driver.$('android=new UiSelector().textContains("OTP")');
        await otpButton.waitForDisplayed({ timeout: 10000 });
        await otpButton.click();
        console.log("✅ Clicked on OTP button. Waiting 20 seconds for entry...");

        // 2. Wait exactly 20 seconds for auto-read or manual entry
        await driver.pause(20000);
        console.log("⏳ 20 seconds elapsed. Proceeding to next step...");

        // 3. Click 'Next', 'Verify', or 'Submit' if required after OTP entry
        // Update the locator below to match your actual 'Next' button
        const nextButton = await driver.$('android=new UiSelector().textContains("Next")');
        if (await nextButton.isExisting()) {
            await nextButton.click();
            console.log("✅ Clicked Next after OTP.");
            await driver.pause(2000); // Brief pause to allow the next screen/layout to load
        }

    } catch (e) {
        console.log(`⚠️ OTP flow encountered an issue: ${e.message}`);
    }
}

async function selectDateOfBirth(driver, dateObj) {
    const { day, month, year } = dateObj;
    console.log(`\n📅 Opening Date of Birth picker to select: ${day}-${month}-${year}`);

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
    }

    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().className("android.widget.EditText").textContains("Date of Birth"))');
        await driver.pause(500);
    } catch (e) {
        console.log("ℹ️ Scroll finished or target already layout visible.");
    }

    const dobField = await driver.$('//android.widget.EditText[contains(@text,"Date of Birth") or contains(@hint,"Date of Birth")]');
    await dobField.waitForDisplayed({ timeout: 10000 });
    await dobField.click();

    console.log("⏳ Adjusting calendar months and headers...");
    await navigateCalendarToMonth(driver, month, year);
    await driver.pause(500);

    const paddedDay  = String(day).padStart(2, '0');
    const monthName  = MONTH_NAMES[month];
    const targetDesc = `${paddedDay} ${monthName} ${year}`;

    console.log(`👆 Locating calendar day cell match: "${targetDesc}"`);
    const dayCell = await driver.$(`//android.view.View[@content-desc="${targetDesc}"]`);
    await dayCell.waitForDisplayed({ timeout: 5000 });
    await dayCell.click();
    await driver.pause(500);

    console.log("✅ Clicking OK on native layout button wrapper");
    const okXpath = '//*[@text="OK" or @resource-id="android:id/button1"]';
    const okBtn = await driver.$(okXpath);
    await okBtn.waitForDisplayed({ timeout: 5000 });
    await okBtn.click();
    await driver.pause(1500);
}

// ─────────────────────────────────────────────────────────────
//  3. Gender Selection
// ─────────────────────────────────────────────────────────────

async function selectGender(driver, gender = "Male") {
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
    }
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Gender"))');
    await driver.pause(500);

    const genderOption = await driver.$(`android=new UiSelector().className("android.widget.RadioButton").text("${gender}")`);
    await genderOption.waitForDisplayed({ timeout: 10000 });
    await genderOption.click();
    console.log(`✅ Gender selected: ${gender}`);
}

// ─────────────────────────────────────────────────────────────
//  4. Marital Status
// ─────────────────────────────────────────────────────────────

async function selectMaritalStatus(driver, value = "Married") {
    console.log(`🔄 Selecting Marital Status: ${value}...`);
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
    }
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Marital Status"))');
    await driver.pause(1000);
    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().className("android.widget.Spinner").textContains("Marital Status")',
        value,
        ['Unmarried', 'Married', 'Divorced', 'Separated', 'Widower']
    );
    console.log(`✅ Marital Status: ${value}`);
}

// ─────────────────────────────────────────────────────────────
//  5. Text Field Helpers
// ─────────────────────────────────────────────────────────────

async function fillFatherName(driver, fatherName) {
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Father\'s Name"))');
    const f = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Father\'s Name")');
    await f.click();
    await f.setValue(fatherName);
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }
    console.log(`✅ Father's Name entered: ${fatherName}`);
}

// headOfFamilySteps.js

async function fillMotherName(driver, motherName) {
    // 🔴 FIX: Do NOT use .textContains(). Use contains(@hint, ...)
    const f = await driver.$('//android.widget.EditText[contains(@hint, "Mother\'s Name")]');

    await f.waitForDisplayed({ timeout: 10000 });
    await f.click();
    await f.clearValue(); // Now safe because the selector is based on @hint
    await f.setValue(motherName);

    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); }
    console.log(`✅ Mother's Name entered: ${motherName}`);
}

async function fillSpouseNameIfExists(driver, spouseName) {
    console.log("🔍 Checking if Husband's or Wife's Name field is present...");
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }

    // ✅ FIX: only scroll if the field isn't already on screen. Scrolling
    // unconditionally here was pushing an already-visible field into a
    // mid-fling/settling position, so the click right after could land
    // before the EditText actually had focus — clearValue/setValue would
    // then silently write into nothing while the field never got the text.
    const wifeCheck = await driver.$('//android.widget.EditText[contains(@hint, "Wife") or contains(@text, "Wife")]');
    const alreadyVisible = await wifeCheck.isExisting() && await wifeCheck.isDisplayed().catch(() => false);

    if (!alreadyVisible) {
        try {
            await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollForward()');
            await driver.pause(500);
        } catch (e) {}
    }

    // ✅ FIX: Use XPath to check both @hint and @text, avoiding apostrophe matching issues
    const wifeField    = await driver.$('//android.widget.EditText[contains(@hint, "Wife") or contains(@text, "Wife")]');
    const husbandField = await driver.$('//android.widget.EditText[contains(@hint, "Husband") or contains(@text, "Husband")]');

    let fieldToFill = null;
    let fieldNameStr = "";

    if (await wifeField.isExisting()) {
        fieldToFill = wifeField;
        fieldNameStr = "Wife's Name";
    } else if (await husbandField.isExisting()) {
        fieldToFill = husbandField;
        fieldNameStr = "Husband's Name";
    }

    if (fieldToFill) {
        console.log(`✅ Found ${fieldNameStr} field. Filling it...`);
        const expected = spouseName.toUpperCase();

        for (let attempt = 1; attempt <= 2; attempt++) {
            await fieldToFill.click();
            await driver.pause(300); // let focus land before clearing/typing

            // Clear any existing value (optional but safe) before setting the new one
            await fieldToFill.clearValue();
            await fieldToFill.setValue(expected);
            await driver.pause(300);

            const actual = await fieldToFill.getText().catch(() => "");
            if (actual && actual.toUpperCase() === expected) {
                if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }
                console.log(`✅ ${fieldNameStr} entered: ${expected}`);
                return;
            }
            console.log(`⚠️ ${fieldNameStr} shows "${actual}" after attempt ${attempt}, expected "${expected}".`);
        }

        console.log(`🚨 VALIDATION CONCERN: Could not confirm ${fieldNameStr} was set to "${expected}" after 2 attempts.`);
    } else {
        console.log("⏭️ Neither Husband's nor Wife's Name field is present. Moving next.");
    }
}

async function fillAgeAtMarriageIfExists(driver, ageAtMarriage) {
    console.log("🔍 Checking if Age At Marriage field is present...");
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }

    const ageMarriageField = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Age at the time of marriage")');

    if (await ageMarriageField.isExisting()) {
        console.log("✅ Found Age At Marriage field. Filling it...");
        await ageMarriageField.click();
        await ageMarriageField.setValue(ageAtMarriage);
        if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }
        console.log(`✅ Age At Marriage entered: ${ageAtMarriage}`);
    } else {
        console.log("⏭️ Age At Marriage field not present. Moving next.");
    }
}

async function fillDateOfMarriageIfExists(driver, dateObj) {
    console.log("🔍 Checking if 'Date of Marriage' field is present...");
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }

    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().className("android.widget.EditText").textContains("Date of Marriage"))');
        await driver.pause(500);
    } catch (e) {}

    const marriageDateField = await driver.$('//android.widget.EditText[contains(@text,"Date of Marriage") or contains(@hint,"Date of Marriage")]');

    if (!(await marriageDateField.isExisting())) {
        console.log("⏭️ 'Date of Marriage' field not present. Moving next.");
        return;
    }

    console.log("✅ Found 'Date of Marriage' field. Opening picker...");
    // Falls back to a sensible default (matches fillAgeAtMarriageIfExists' own
    // default) if the caller doesn't pass an explicit date object.
    const { day, month, year } = dateObj || { day: 15, month: 3, year: 2017 };

    await marriageDateField.click();
    await navigateCalendarToMonth(driver, month, year);
    await driver.pause(500);

    const paddedDay  = String(day).padStart(2, '0');
    const monthName  = MONTH_NAMES[month];
    const targetDesc = `${paddedDay} ${monthName} ${year}`;

    console.log(`👆 Locating calendar day cell match: "${targetDesc}"`);
    const dayCell = await driver.$(`//android.view.View[@content-desc="${targetDesc}"]`);
    await dayCell.waitForDisplayed({ timeout: 5000 });
    await dayCell.click();
    await driver.pause(500);

    const okXpath = '//*[@text="OK" or @resource-id="android:id/button1"]';
    const okBtn = await driver.$(okXpath);
    await okBtn.waitForDisplayed({ timeout: 5000 });
    await okBtn.click();
    await driver.pause(1500);
    console.log(`✅ Date of Marriage set to: ${targetDesc}`);
}

async function fillContactNumberIfExists(driver, contactNumber) {
    console.log("🔍 Checking if beneficiary 'Contact Number' field is present...");
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }

    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().className("android.widget.EditText").textContains("Contact Number"))');
    } catch (e) {}

    const contactField = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Contact Number")');

    if (await contactField.isExisting()) {
        console.log("✅ Found 'Contact Number' field. Filling it...");
        await contactField.click();
        await contactField.clearValue();
        await contactField.setValue(contactNumber);
        if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }
        console.log(`✅ Contact Number entered: ${contactNumber}`);
    } else {
        console.log("⏭️ 'Contact Number' field not present. Moving next.");
    }
}

async function selectHaveChildrenIfExists(driver, hasChildren = "Yes") {
    console.log("🔍 Checking if 'Do you have children?' field is present...");
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }

    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollForward()');
    } catch (e) {}

    const questionText = await driver.$('android=new UiSelector().textContains("Do you have children")');

    if (await questionText.isExisting()) {
        console.log(`✅ Found 'Do you have children?' field. Selecting ${hasChildren}...`);
        const optionBtn = await driver.$(`android=new UiSelector().className("android.widget.RadioButton").text("${hasChildren}")`);
        if (await optionBtn.isExisting()) {
            await optionBtn.click();
            console.log(`✅ Selected '${hasChildren}' for children.`);
        } else {
            console.log(`⚠️ Option '${hasChildren}' not found.`);
        }
    } else {
        console.log("⏭️ 'Do you have children?' field not present. Moving next.");
    }
}

// ─────────────────────────────────────────────────────────────
//  6. Community Selection
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  6. Community Selection (UPDATED)
// ─────────────────────────────────────────────────────────────
async function selectCommunity(driver, value = "General") {
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
    }
    // Scroll until the label is visible
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Community"))');
    await driver.pause(1000);

    // ✅ Use descriptionContains to target the content-desc attribute "Community"
    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().descriptionContains("Community")',
        value,
        ['General', 'SC', 'ST', 'BC', 'OBC', 'OC', 'PVTG – Primitive Vulnerable Tribal Groups', 'Not given']
    );
    console.log(`✅ Community: ${value}`);
}

// ─────────────────────────────────────────────────────────────
//  7. Religion Selection (UPDATED)
// ─────────────────────────────────────────────────────────────
async function selectReligion(driver, value = "Hindu") {
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
    }
    // Scroll until the label is visible
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Religion"))');
    await driver.pause(1000);

    // ✅ Use descriptionContains to target the content-desc attribute "Religion"
    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().descriptionContains("Religion")',
        value,
        ['Hindu', 'Muslim', 'Christian', 'Sikhism', 'Buddhism', 'Jainism', 'Parsi', 'Other', 'Not disclosed']
    );
    console.log(`✅ Religion: ${value}`);
}
async function fillRchIdIfExists(driver, rchId) {
    console.log("🔍 Checking if 'RCH ID' field is present...");
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }

    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollForward()');
    } catch (e) {}

    const rchField = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("RCH ID")');

    if (await rchField.isExisting()) {
        console.log("✅ Found RCH ID field. Filling it...");
        await rchField.click();
        await rchField.setValue(rchId);
        if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }
        console.log(`✅ RCH ID entered: ${rchId}`);
    } else {
        console.log("⏭️ RCH ID field not present. Moving next.");
    }
}

// ─────────────────────────────────────────────────────────────
//  8. STATUS OF WOMEN CHECK HELPER
// ─────────────────────────────────────────────────────────────
async function checkStatusOfWomenField(driver, contextInfo = "Beneficiary") {
    console.log(`\n🔍 Checking 'Status Of Women' field presence for: ${contextInfo}...`);
    try {
        const statusLabel = await driver.$('android=new UiSelector().textContains("Status Of Women")');
        const exists = await statusLabel.isExisting();
        if (exists) {
            console.log(`✅ FIELD REPORT [${contextInfo}]: 'Status Of Women' field IS present.`);
            return true;
        } else {
            console.log(`📋 FIELD REPORT [${contextInfo}]: 'Status Of Women' field is NOT present.`);
            return false;
        }
    } catch (e) {
        console.log(`📋 FIELD REPORT [${contextInfo}]: 'Status Of Women' field is NOT present. (Not Found)`);
        return false;
    }
}
async function selectStatusOfWomenIfExists(driver, value) {
    console.log("🔍 Checking if 'Status Of Women' field is present...");

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
    }

    // Scroll forward slightly to ensure the UI renders the bottom elements
    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollForward()');
    } catch (e) {}

    const statusLabel = await driver.$('android=new UiSelector().textContains("Status Of Women")');

    // Check if the element exists without a massive timeout
    if (await statusLabel.isExisting()) {
        console.log(`✅ Found 'Status Of Women' field. Selecting '${value}'...`);

        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Status Of Women"))');
        await driver.pause(1000);

        // Passed the exact 4 elements seen in the app's dynamic XML layout
        await clickSpinnerAndSelectOption(
            driver,
            'android=new UiSelector().className("android.widget.Spinner").textContains("Status Of Women")',
            value,
            ['Eligible Couple', 'Pregnant Woman', 'Postnatal Mother', 'Permanently Sterilised']
        );
        console.log(`✅ Status Of Women: ${value}`);
    } else {
        console.log("⏭️ 'Status Of Women' field not present. Moving next.");
    }
}
async function submitFinalForm(driver) {
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
    }

    console.log("🔍 Looking for the First Submit button (Main Form)...");
    try {
        const firstSubmitButton = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit")');
        await firstSubmitButton.waitForDisplayed({ timeout: 5000 });
        await firstSubmitButton.click();
        console.log("✅ First Submit button clicked. Waiting for Preview screen...");
        await driver.pause(2000);
    } catch (e) {
        console.log("❌ Could not find the First Submit button!");
        return;
    }

    console.log("🔍 Looking for the Final Submit button (Preview Screen)...");
    try {
        const finalSubmitButton = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btnSubmitPreview")');
        await finalSubmitButton.waitForDisplayed({ timeout: 5000 });
        await finalSubmitButton.click();
        console.log("Final Submit button clicked (Preview Screen)");
    } catch (e) {
        console.log("❌ Could not find the Final Submit button on Preview Screen!");
    }
}

async function handleAddSpousePopup(driver) {
    console.log("🔍 Checking for 'Add Spouse' popup...");
    try {
        // Wait for the "No" button using the exact resource-id and text from the XML
        const noButton = await driver.$('android=new UiSelector().resourceId("android:id/button2").text("No")');
        await noButton.waitForDisplayed({ timeout: 5000 }); // 5 seconds should be enough for the dialog to transition
        await noButton.click();
        console.log("✅ Clicked 'No' on the Add Spouse popup.");
        await driver.pause(1500); // Brief pause to let the dialog dismiss
    } catch (e) {
        console.log("ℹ️ 'Add Spouse' popup did not appear. Continuing...");
    }
}
async function fillHeadOfFamilyFormWithExamples(driver, targetMaritalStatus = "Married", gender = "Female", identity = {}) {
    console.log(`📝 Filling Head of Family form for a ${gender} (Status: ${targetMaritalStatus})...`);

    // ✅ Random/caller-supplied identity fields — falls back to the original
    // hardcoded examples if nothing is passed, so existing callers keep working.
    const fatherName = identity.fatherName || "Rajendra Kumar";
    const motherName = identity.motherName || "Meera Kumari";
    const spouseName = identity.spouseName || (gender === "Male" ? "Sita Kumari" : "Krupal Singh");
    const ageAtMarriage = identity.ageAtMarriage || "24";

    await handleConsentForm(driver);
    await handleOtpVerification(driver);

    // Explicitly handles DOB choice using the automated calendar popup loops
    const exampleDOB = identity.dob || { day: 15, month: 3, year: 1985 };
    await selectDateOfBirth(driver, exampleDOB);

    // ✅ Passes the dynamic gender parameter
    await selectGender(driver, gender);
    await selectMaritalStatus(driver, targetMaritalStatus);

    await fillFatherName(driver, fatherName);
    await fillMotherName(driver, motherName);

    // ✅ Dynamically provides a Wife or Husband name based on the gender profile
    await fillSpouseNameIfExists(driver, spouseName);

    await fillAgeAtMarriageIfExists(driver, ageAtMarriage);
    await fillDateOfMarriageIfExists(driver, identity.dateOfMarriage);

    // ✅ Bypasses 'Children' column for Male beneficiaries
    if (gender === "Female") {
        await selectHaveChildrenIfExists(driver, "Yes");
    }

    await fillContactNumberIfExists(driver, identity.mobileNumber || "9876543210");

    await selectCommunity(driver, "OBC");
    await selectReligion(driver, "Christian");

    // ✅ Bypasses 'Status Of Women' column for Male beneficiaries
    // AFTER
let statusOfWomenFound = false;

if (gender === "Female") {
    statusOfWomenFound = await checkStatusOfWomenField(driver, `${gender}`); // ✅ Check BEFORE selecting
    await selectStatusOfWomenIfExists(driver, "Pregnant Woman");
    const randomRchId = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    await fillRchIdIfExists(driver, randomRchId);
}

console.log("✅ Head of Family form filled successfully!");
await submitFinalForm(driver);
await handleAddSpousePopup(driver);

return statusOfWomenFound; // ✅ Return it so the main file can use it
}

// ── REPLACE the existing module.exports at the bottom of headOfFamilySteps.js ──

module.exports = {
  // Master wrapper (used by existing tests)
  fillHeadOfFamilyFormWithExamples,

  // Individual steps (needed by maleHouseholdTest.js / fillHeadOfFamilyFormRandom)
  handleConsentForm,
  handleOtpVerification,
  selectDateOfBirth,
  selectGender,
  selectMaritalStatus,
  fillFatherName,
  fillMotherName,
  fillSpouseNameIfExists,
  fillAgeAtMarriageIfExists,
  fillDateOfMarriageIfExists,
  fillContactNumberIfExists,
  selectHaveChildrenIfExists,
  selectCommunity,
  selectReligion,
  selectStatusOfWomenIfExists,
  submitFinalForm,
  handleAddSpousePopup,
  checkStatusOfWomenField,
fillRchIdIfExists,
};