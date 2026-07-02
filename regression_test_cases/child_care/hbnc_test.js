/**
 * ─────────────────────────────────────────────────────────────────────────
 *  HBNC END-TO-END FLOW
 *  Merges childRegistration.js + new_born_list.js into a single scenario:
 *
 *   1. Home → Maternal Health → Child Registration
 *   2. Click a RANDOM "REGISTER" card, remember the child's name
 *   3. Fill the registration form (RCH ID, Birth Cert, Place of Birth,
 *      Date of Birth = random day 0–61 days ago, images) → Submit
 *   4. Go back Home → Child Care → Newborn list
 *   5. Search the remembered name → verify "HBNC" button is present
 *   6. Click HBNC → verify ONLY the 7 scheduled visit days are shown
 *      (1st, 3rd, 7th, 14th, 21st, 28th, 42nd Day)
 *   7. Click "Add Visit" on the due day → fill all mandatory HBNC fields
 *   8. Submit the HBNC visit form
 *   9. Verify the visit was saved and the next scheduled visit is unlocked
 *
 *  NOTE ON ASSUMPTIONS (search "TODO" to find and adjust these quickly):
 *   - Home screen module card labels are assumed to be exactly
 *     "Maternal Health" and "Child Care" (same card pattern already used
 *     for "Child Care" in new_born_list.js).
 *   - The Date of Birth field on the registration form isn't present in
 *     either source script or the XML you shared, so its selector is a
 *     best-guess based on the app's EditText/hint pattern used elsewhere
 *     (e.g. "RCH ID No. of Child", "Birth Certificate Number").
 * ─────────────────────────────────────────────────────────────────────────
 */

const { remote } = require('webdriverio');

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true
};

const wdOpts = {
    hostname: process.env.APPIUM_HOST || '127.0.0.1',
    port: parseInt(process.env.APPIUM_PORT, 10) || 4723,
    path: '/',
    logLevel: 'error',
    capabilities,
};

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

// The exact HBNC visit schedule this app supports.
const EXPECTED_VISIT_DAYS = [
    '1st Day', '3rd Day', '7th Day', '14th Day', '21st Day', '28th Day', '42nd Day'
];

// ─────────────────────────────────────────────────────────────
//  GENERIC LOW-LEVEL HELPERS  (from childRegistration.js)
// ─────────────────────────────────────────────────────────────

async function tapByCoords(driver, tapX, tapY) {
    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: tapX, y: tapY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 150 },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(500);
}

async function scrollDownOnce(driver, fraction = { from: 0.7, to: 0.3 }) {
    const size = await driver.getWindowRect();
    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: Math.floor(size.width / 2), y: Math.floor(size.height * fraction.from) },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerMove', duration: 600, x: Math.floor(size.width / 2), y: Math.floor(size.height * fraction.to) },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(1000);
}

/** Scrolls the screen until `locatorFn()` resolves to a displayed element, or gives up. */
async function scrollUntilVisible(driver, locatorFn, maxAttempts = 5) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const el = await locatorFn();
            if (await el.isExisting() && await el.isDisplayed()) return el;
        } catch (e) { /* keep scrolling */ }
        await scrollDownOnce(driver);
    }
    return null;
}

async function scrollSpinnerToMiddle(driver, spinnerSelector) {
    try {
        const spinner = await driver.$(spinnerSelector);
        const loc = await spinner.getLocation();
        const screen = await driver.getWindowRect();
        const midY = screen.height / 2;

        if (loc.y > midY + 100) {
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
    await scrollSpinnerToMiddle(driver, spinnerSelector);

    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc = await spinner.getLocation();
    const size = await spinner.getSize();

    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);

    await tapByCoords(driver, tapX, tapY);
    await driver.pause(2000);

    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`✅ Selected "${value}" via XPath`);
        return;
    } catch (e) { /* fall through */ }

    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via UiSelector`);
        return;
    } catch (e) { /* fall through */ }

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
                const tapX2 = Math.floor((parseInt(boundsMatch[1]) + parseInt(boundsMatch[3])) / 2);
                const tapY2 = Math.floor((parseInt(boundsMatch[2]) + parseInt(boundsMatch[4])) / 2);
                await tapByCoords(driver, tapX2, tapY2);
                console.log(`✅ Selected "${value}" via tag parse`);
                return;
            }
        }
    } catch (e) { /* fall through */ }

    const screen = await driver.getWindowRect();
    const idx = optionsList.indexOf(value);
    if (idx === -1) throw new Error(`"${value}" not in list: [${optionsList.join(', ')}]`);

    const rowHeight = size.height;
    const spinnerBottom = loc.y + size.height;
    const opensUpward = (screen.height - spinnerBottom) < (optionsList.length * rowHeight);
    const finalTapX = Math.floor(loc.x + size.width / 2);
    let finalTapY;

    if (opensUpward) {
        const reversedIdx = (optionsList.length - 1) - idx;
        finalTapY = Math.floor(loc.y - (reversedIdx * rowHeight) - (rowHeight / 2));
    } else {
        finalTapY = Math.floor(spinnerBottom + (idx * rowHeight) + (rowHeight / 2));
    }
    finalTapY = Math.max(5, Math.min(finalTapY, screen.height - 5));

    await tapByCoords(driver, finalTapX, finalTapY);
    console.log(`✅ Selected "${value}" via coordinate fallback`);
}

// ─────────────────────────────────────────────────────────────
//  DATE / CALENDAR HELPERS  (from new_born_list.js)
// ─────────────────────────────────────────────────────────────

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

async function getCalendarMonthYear(driver) {
    try {
        const dayElement = await driver.$('android=new UiSelector().text("15")');
        const contentDesc = await dayElement.getAttribute('content-desc');
        const parts = contentDesc.split(' ');
        return { month: MONTH_NAMES.indexOf(parts[1]), year: parseInt(parts[2]) };
    } catch (error) {
        return null;
    }
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

    const dayToClick = await driver.$(`android=new UiSelector().text("${String(day)}").clickable(true)`);
    await dayToClick.click();
    await driver.pause(500);

    const okBtn = await driver.$('//android.widget.Button[@text="OK" or @resource-id="android:id/button1"]');
    await okBtn.click();
}

/** Random date 0–61 days before today. Returns both a Date object and a dd-mm-yyyy string. */
function generateRandomDob(minDaysAgo = 0, maxDaysAgo = 61) {
    const daysAgo = Math.floor(Math.random() * (maxDaysAgo - minDaysAgo + 1)) + minDaysAgo;
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);

    const day = d.getDate();
    const month = d.getMonth() + 1; // 1-12, matches MONTH_NAMES indexing
    const year = d.getFullYear();
    const dateString = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;

    console.log(`🎲 Generated random DOB: ${dateString} (${daysAgo} days ago)`);
    return { day, month, year, dateString, daysAgo };
}

// ─────────────────────────────────────────────────────────────
//  HOME / NAVIGATION HELPERS
// ─────────────────────────────────────────────────────────────

/** Generic home-screen / grid module card click, reused for Maternal Health, Child Registration, Child Care, Newborn list, etc. */
async function clickGridModule(driver, moduleName) {
    console.log(`⏳ Looking for module: '${moduleName}'...`);
    const moduleXPath = `//android.widget.TextView[@text="${moduleName}"]/parent::android.view.ViewGroup/parent::android.widget.FrameLayout`;

    let moduleCard = await scrollUntilVisible(driver, () => driver.$(moduleXPath));
    if (!moduleCard) {
        // Fallback: plain TextView click if the ViewGroup/FrameLayout wrapper structure differs
        moduleCard = await driver.$(`//android.widget.TextView[@text="${moduleName}"]`);
    }
    await moduleCard.waitForDisplayed({ timeout: 8000 });
    await moduleCard.click();
    console.log(`✅ Clicked on '${moduleName}' module.`);
    await driver.pause(1500);
}

/** Uses the "Go to Home" toolbar icon (content-desc="Go to Home") seen on Infant Details / Child Reg List screens. */
async function goToHome(driver) {
    console.log('⏳ Navigating back to Home...');
    const homeBtn = await driver.$('//android.widget.Button[@content-desc="Go to Home"]');
    await homeBtn.waitForDisplayed({ timeout: 5000 });
    await homeBtn.click();
    console.log('✅ Back on Home screen.');
    await driver.pause(1500);
}

// ─────────────────────────────────────────────────────────────
//  CHILD REGISTRATION FORM  (adapted from childRegistration.js)
// ─────────────────────────────────────────────────────────────

/**
 * Finds all "REGISTER" cards on the Child Registration list, picks one at
 * random, extracts the associated name text, clicks REGISTER, and returns
 * the remembered name.
 */
async function selectRandomChildToRegister(driver) {
    console.log('⏳ Locating all pending REGISTER cards...');

    // Scroll a couple of times to make sure more than one card is loaded, then read the page source.
    let registerButtons = await driver.$$('//android.widget.Button[@text="REGISTER"]');
    let attempts = 0;
    while (registerButtons.length === 0 && attempts < 5) {
        await scrollDownOnce(driver);
        registerButtons = await driver.$$('//android.widget.Button[@text="REGISTER"]');
        attempts++;
    }

    if (registerButtons.length === 0) {
        throw new Error('No REGISTER buttons found on the Child Registration list.');
    }

    const randomIndex = Math.floor(Math.random() * registerButtons.length);
    console.log(`🎲 Picked card #${randomIndex + 1} of ${registerButtons.length}.`);

    const chosenButton = registerButtons[randomIndex];

    // Walk up to the card container and grab the name text (mirrors the
    // "baby of X" / mother-name pattern used elsewhere in the app).
    let childName = null;
    try {
        const nameEl = await chosenButton.$(
            './ancestor::android.view.ViewGroup[1]//android.widget.TextView[contains(@resource-id,"tv_hh_ec_id") or contains(@text,"baby of") or contains(@text,"Baby of")]'
        );
        childName = (await nameEl.getText()).trim();
    } catch (e) {
        console.log('⚠️  Could not read name via ancestor lookup, trying page-source fallback...');
    }

    if (!childName) {
        // Fallback: parse the raw XML around the button's bounds.
        const source = await driver.getPageSource();
        const match = source.match(/text="(baby of [^"]+|Baby of [^"]+)"/);
        childName = match ? match[1] : `Unnamed_${Date.now()}`;
    }

    await chosenButton.click();
    console.log(`✅ Clicked REGISTER for '${childName}'. Name remembered for later search.`);
    await driver.pause(3000);

    return childName;
}

async function fillChildRchId(driver, rchIdNumber) {
    const childRchIdInput = await driver.$(`//android.widget.EditText[@text="RCH ID No. of Child"]`);
    await childRchIdInput.waitForDisplayed({ timeout: 5000 });
    await childRchIdInput.click();
    await childRchIdInput.clearValue();
    await childRchIdInput.setValue(rchIdNumber);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    console.log(`✅ RCH ID filled: '${rchIdNumber}'`);
}

async function fillBirthCertificateNumber(driver, certNumber) {
    const birthCertInput = await driver.$(`//android.widget.EditText[@text="Birth Certificate Number"]`);
    await birthCertInput.waitForDisplayed({ timeout: 5000 });
    await birthCertInput.click();
    await birthCertInput.clearValue();
    await birthCertInput.setValue(certNumber);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    console.log(`✅ Birth Certificate Number filled: '${certNumber}'`);
}

/** Dumps the current page source to a timestamped file for offline debugging. */
async function dumpPageSource(driver, label) {
    try {
        const fs = require('fs');
        const path = require('path');
        const dir = path.join(__dirname, 'debug_dumps');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `${label}_${Date.now()}.xml`);
        const source = await driver.getPageSource();
        fs.writeFileSync(file, source, 'utf8');
        console.log(`🗂️  Page source dumped to: ${file}`);
        return file;
    } catch (e) {
        console.log('⚠️  Could not dump page source:', e.message);
        return null;
    }
}

/** Detects and handles either a native Android DatePickerDialog or a Material Design date picker dialog. */
async function pickDateFromWhicheverCalendarAppeared(driver, dobObj) {
    const nativePicker = await driver.$('android=new UiSelector().resourceId("android:id/datePicker")');
    if (await nativePicker.waitForDisplayed({ timeout: 3000 }).catch(() => false)) {
        console.log('   → Native Android DatePickerDialog detected.');
        await pickDateFromCalendar(driver, dobObj);
        return true;
    }

    // Material Design date picker (com.google.android.material.datepicker) — common alternative.
    const materialHeader = await driver.$('//android.view.ViewGroup[contains(@resource-id,"mtrl_calendar") or contains(@resource-id,"mtrl_picker")]');
    if (await materialHeader.waitForDisplayed({ timeout: 3000 }).catch(() => false)) {
        console.log('   → Material date picker detected. Attempting to select day via visible text...');
        try {
            const dayEl = await driver.$(`android=new UiSelector().text("${dobObj.day}").clickable(true)`);
            if (await dayEl.waitForDisplayed({ timeout: 3000 }).catch(() => false)) {
                await dayEl.click();
                await driver.pause(500);
                const confirmBtn = await driver.$('//android.widget.Button[@text="OK" or @text="Save" or @text="SAVE" or @text="CONFIRM"]');
                if (await confirmBtn.isExisting()) await confirmBtn.click();
                return true;
            }
        } catch (e) { /* fall through */ }
        return false;
    }

    return false; // no dialog of either kind appeared
}

/**
 * The registration form's Date of Birth field wasn't present in the source
 * scripts or XML originally shared, so this tries several strategies in
 * order and logs which one worked (or dumps the page source if none did):
 *   1) Native Android date picker dialog
 *   2) Material Design date picker dialog
 *   3) Plain typeable EditText (type the date string directly)
 */
async function fillDateOfBirth(driver, dobObj) {
    console.log(`\n🎂 Filling Date of Birth: ${dobObj.dateString} (${dobObj.daysAgo} days old)...`);

    const dobFieldXPath = `//android.widget.EditText[contains(@hint,"Date of Birth") or contains(@hint,"date of birth") or contains(@text,"Date of Birth") or contains(@hint,"DOB") or contains(@hint,"dob")]`;

    const dobField = await scrollUntilVisible(driver, () => driver.$(dobFieldXPath));
    if (!dobField) {
        console.error('❌ Could not locate the Date of Birth field at all.');
        await dumpPageSource(driver, 'dob_field_not_found');
        return;
    }

    await dobField.click();
    await driver.pause(1200);

    const handledByDialog = await pickDateFromWhicheverCalendarAppeared(driver, dobObj);

    if (handledByDialog) {
        console.log(`✅ Date of Birth set to ${dobObj.dateString} via calendar dialog.`);
        return;
    }

    console.log('   → No calendar dialog detected. Trying direct text entry into the field...');
    try {
        await dobField.clearValue();
        await dobField.setValue(dobObj.dateString);
        await driver.pause(300);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();

        const resultingText = (await dobField.getText()).trim();
        if (resultingText && resultingText !== '') {
            console.log(`✅ Date of Birth set to "${resultingText}" via direct text entry.`);
            return;
        }
    } catch (e) {
        console.log('⚠️  Direct text entry attempt failed:', e.message);
    }

    console.error('❌ Could not set Date of Birth with any known strategy (native dialog, Material dialog, or direct entry).');
    await dumpPageSource(driver, 'dob_field_unhandled');
}

async function selectPlaceOfBirth(driver, placeName) {
    console.log(`\n🏥 Selecting Place of Birth: '${placeName}'...`);

    const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown"))`;
    await driver.$(`android=${scrollable}`).catch(() => {});
    await driver.pause(1000);

    const optionsList = [
        'District Hospital', 'Community Health Centre', 'Primary Health Centre',
        'Sub Centre', 'Other Public Facility', 'Accredited Private Hospital',
        'Other Private Hospital', 'Home', 'Sub District Hospital',
        'Medical College Hospital', 'In Transit'
    ];

    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown")',
        placeName,
        optionsList
    );
    console.log(`✅ Place of Birth selected as '${placeName}'!`);
}

async function uploadFrontAndBackImages(driver) {
    console.log(`\n📜 Scrolling down to find 'Front Side'...`);
    const scrollFront = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Front Side"))`;
    await driver.$(`android=${scrollFront}`).catch(() => {});
    await driver.pause(1000);

    const frontSideAddBtn = await driver.$(`//android.view.ViewGroup[.//android.widget.TextView[@text="Front Side"]]//android.widget.ImageView[@content-desc="add file"]`);
    await frontSideAddBtn.waitForDisplayed({ timeout: 5000 });
    await frontSideAddBtn.click();

    const pickFromGallery = await driver.$(`//*[@text="Pick from gallery" or @text="Pick from Gallery"]`);
    await pickFromGallery.waitForDisplayed({ timeout: 5000 });
    await pickFromGallery.click();
    await driver.pause(20000);

    console.log(`\n📜 Scrolling down to find 'Back Side'...`);
    const scrollBack = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Back Side"))`;
    await driver.$(`android=${scrollBack}`).catch(() => {});
    await driver.pause(1000);

    const backSideAddBtn = await driver.$(`//android.view.ViewGroup[.//android.widget.TextView[@text="Back Side"]]//android.widget.ImageView[@content-desc="add file"]`);
    await backSideAddBtn.waitForDisplayed({ timeout: 5000 });
    await backSideAddBtn.click();

    const pickFromGalleryBack = await driver.$(`//*[@text="Pick from gallery" or @text="Pick from Gallery"]`);
    await pickFromGalleryBack.waitForDisplayed({ timeout: 5000 });
    await pickFromGalleryBack.click();
    await driver.pause(20000);

    console.log(`✅ Front and Back Side image uploads processed successfully!`);
}

async function clickRegistrationSubmitButton(driver) {
    console.log(`\n✅ Attempting to click registration Submit button...`);
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
    }
    const submitBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit")');
    await submitBtn.waitForDisplayed({ timeout: 5000 });
    await submitBtn.click();
    console.log(`✅ Registration form submitted!`);
    await driver.pause(3000);
}

// ─────────────────────────────────────────────────────────────
//  NEWBORN LIST / HBNC  (from new_born_list.js)
// ─────────────────────────────────────────────────────────────

async function searchName(driver, nameToSearch) {
    console.log(`Processing search for name: "${nameToSearch}"...`);

    const searchInput = await driver.$(`//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]`);
    await searchInput.waitForDisplayed({ timeout: 5000 });
    await searchInput.click();
    await driver.pause(500);
    await searchInput.clearValue();
    await searchInput.setValue(nameToSearch);
    await driver.pause(800);

    // NOTE: We deliberately do NOT tap the ib_search icon here. That icon
    // can toggle between a magnifying glass / clear (X) / mic depending on
    // field state, and tapping it after typing has been observed to
    // sometimes hit a microphone/voice-search icon instead of "search."
    // The list already filters live as text is entered, so we just hide
    // the keyboard and let the RecyclerView update on its own.
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
    }

    console.log(`✔ Search for "${nameToSearch}" completed. Waiting for list to update...`);
    await driver.pause(2000);
}

/** Verifies an "HBNC" button is present for the searched child. Throws if not found. */
async function verifyHBNCButtonAvailable(driver) {
    console.log('🔎 Verifying "HBNC" button is available for the searched child...');
    const hbncButtonXPath = `//android.widget.Button[@text="HBNC"]`;
    const hbncButton = await driver.$(hbncButtonXPath);
    const displayed = await hbncButton.waitForDisplayed({ timeout: 8000 }).catch(() => false);

    if (!displayed) {
        throw new Error('❌ VERIFICATION FAILED: "HBNC" button was not found for the searched child.');
    }
    console.log('✅ VERIFIED: "HBNC" button is present.');
    return true;
}

async function clickHBNCButton(driver) {
    const hbncButton = await driver.$(`//android.widget.Button[@text="HBNC"]`);
    await hbncButton.waitForDisplayed({ timeout: 5000 });
    await hbncButton.click();
    console.log('✅ Clicked the HBNC button.');
    await driver.pause(1500);
}

/**
 * Verifies that the Infant Details / visit schedule screen shows exactly
 * the 7 expected HBNC visit days (1st, 3rd, 7th, 14th, 21st, 28th, 42nd)
 * and no unexpected extra day cards.
 * Based on the "cardVisit" / "tvVisitDay" structure from the Infant
 * Details screen XML.
 */
async function verifyScheduledVisitDays(driver) {
    console.log('🔎 Verifying only the scheduled HBNC visit days are shown...');

    const dayLabelEls = await driver.$$('//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tvVisitDay"]');
    const foundDays = [];
    for (const el of dayLabelEls) {
        foundDays.push((await el.getText()).trim());
    }

    console.log(`   Found visit day cards: [${foundDays.join(', ')}]`);

    const missing = EXPECTED_VISIT_DAYS.filter(d => !foundDays.includes(d));
    const unexpected = foundDays.filter(d => !EXPECTED_VISIT_DAYS.includes(d));

    if (missing.length > 0) {
        throw new Error(`❌ VERIFICATION FAILED: Missing expected visit day(s): [${missing.join(', ')}]`);
    }
    if (unexpected.length > 0) {
        throw new Error(`❌ VERIFICATION FAILED: Unexpected/extra visit day(s) shown: [${unexpected.join(', ')}]`);
    }
    if (foundDays.length !== EXPECTED_VISIT_DAYS.length) {
        throw new Error(`❌ VERIFICATION FAILED: Expected ${EXPECTED_VISIT_DAYS.length} visit cards, found ${foundDays.length}.`);
    }

    console.log('✅ VERIFIED: Exactly the 7 scheduled HBNC visit days (1,3,7,14,21,28,42) are shown, nothing extra.');
    return foundDays;
}

/** Returns the day label of the first card whose container is enabled=true (i.e. currently due/actionable). */
async function getCurrentlyDueVisitDay(driver) {
    const cards = await driver.$$('//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cardVisit"]');
    for (const card of cards) {
        const enabled = await card.getAttribute('enabled');
        if (enabled === 'true') {
            const dayLabel = await card.$('.//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tvVisitDay"]');
            return (await dayLabel.getText()).trim();
        }
    }
    return null;
}

async function clickAddVisitForDay(driver, dayText) {
    const addVisitBtnXPath = `//android.widget.TextView[@text="${dayText}"]/parent::android.widget.LinearLayout//android.widget.Button[@text="Add Visit"]`;
    const addVisitBtn = await driver.$(addVisitBtnXPath);
    await addVisitBtn.waitForDisplayed({ timeout: 5000 });
    await addVisitBtn.click();
    console.log(`✅ Clicked "Add Visit" for ${dayText}.`);
    await driver.pause(1500);
}

async function handleVisitDate(driver, expectedDateString) {
    // Case-insensitive contains on @hint, restricted to enabled fields only
    const visitDateXPath =
        `//android.widget.EditText[` +
        `contains(translate(@hint,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'visit date') ` +
        `and @enabled='true']`;

    let visitDateInput = await scrollUntilVisible(driver, () => driver.$(visitDateXPath));

    if (!visitDateInput) {
        console.error('❌ Could not find the visit date field with the expected or a similar hint.');
        await dumpPageSource(driver, 'visit_date_field_not_found');
        throw new Error('Visit date field not found — see debug_dumps for the page source.');
    }

    const currentDate = await visitDateInput.getText();
    console.log(`Default visit date found: ${currentDate}`);

    if (currentDate === expectedDateString) {
        console.log(`Date matches the expected input (${expectedDateString}). Proceeding without changes...`);
        return;
    }

    console.log(`Date does NOT match. Opening calendar to change date to ${expectedDateString}...`);
    await visitDateInput.click();
    await driver.pause(1000);

    const parts = expectedDateString.split('-');
    const dateObj = {
        day: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10),
        year: parseInt(parts[2], 10)
    };

    const handled = await pickDateFromWhicheverCalendarAppeared(driver, dateObj);
    if (!handled) {
        console.log('   → No calendar dialog detected for visit date. Trying direct text entry...');
        try {
            await visitDateInput.clearValue();
            await visitDateInput.setValue(expectedDateString);
            await driver.pause(300);
            if (await driver.isKeyboardShown()) await driver.hideKeyboard();
            console.log(`✅ Visit date set to "${expectedDateString}" via direct text entry.`);
        } catch (e) {
            console.error('❌ Could not set the visit date with any known strategy.');
            await dumpPageSource(driver, 'visit_date_unhandled');
        }
    }
}

async function handleIsBabyAlive(driver, expectedInput) {
    const targetOption = expectedInput.toLowerCase() === 'no' ? 'No' : 'Yes';
    const radioBtnXPath = `//android.widget.TextView[@text="Is the Baby alive? *"]/following-sibling::android.widget.FrameLayout//android.widget.RadioButton[@text="${targetOption}"]`;
    const radioButton = await driver.$(radioBtnXPath);
    await radioButton.waitForDisplayed({ timeout: 5000 }).catch(() => null);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');
        if (isChecked !== 'true') {
            await radioButton.click();
            await driver.pause(500);
        }
        console.log(`✔ "Is the Baby alive?" = "${targetOption}".`);
    } else {
        console.error(`❌ Could not find the "${targetOption}" radio button for "Is the Baby alive?".`);
    }
}

async function fillBabyWeight(driver, weightInGrams) {
    const weightFieldXPath = `//android.widget.EditText[contains(@hint, "weight in gram")]`;
    const weightField = await driver.$(weightFieldXPath);
    await weightField.waitForDisplayed({ timeout: 5000 }).catch(() => null);

    if (await weightField.isExisting()) {
        const currentText = await weightField.getText();
        const hintText = 'Enter weight in gram (e.g. 1000)';
        if (!currentText || currentText.trim() === '' || currentText.trim() === hintText || currentText.trim() !== String(weightInGrams)) {
            await weightField.click();
            await driver.pause(500);
            await weightField.clearValue();
            await weightField.setValue(String(weightInGrams));
            await driver.pause(500);
            if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        }
        console.log(`✔ "Baby Weight" = ${weightInGrams}g.`);
    } else {
        console.error('❌ Could not find the "Baby Weight (Gram) *" field.');
    }
}

async function selectRadioOption(driver, fieldLabel, expectedOption) {
    const labelXPath = `//android.widget.TextView[contains(@text, "${fieldLabel}")]`;
    const labelEl = await scrollUntilVisible(driver, () => driver.$(labelXPath));
    if (!labelEl) {
        console.error(`❌ Could not find field label containing: "${fieldLabel}".`);
        return;
    }

    const radioBtnXPath = `//android.widget.TextView[contains(@text, "${fieldLabel}")]/following-sibling::android.widget.FrameLayout//android.widget.RadioButton[@text="${expectedOption}"]`;
    const radioButton = await driver.$(radioBtnXPath);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');
        if (isChecked !== 'true') {
            await radioButton.click();
            await driver.pause(500);
        }
        console.log(`✔ "${fieldLabel}" = "${expectedOption}".`);
    } else {
        console.error(`❌ Could not find the "${expectedOption}" radio button for "${fieldLabel}".`);
    }
}

async function fillTemperature(driver, tempValue) {
    console.log(`Processing "Temperature *" field... Expected: ${tempValue}`);

    // Locate by label (tvLabel) + its sibling inputContainer, matching the
    // real structure — same pattern as Baby Weight / Urine passed / etc.
    const tempFieldXPath =
        `//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tvLabel" ` +
        `and contains(@text,"Temperature")]` +
        `/following-sibling::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/inputContainer"]` +
        `//android.widget.EditText`;

    const tempField = await scrollUntilVisible(driver, () => driver.$(tempFieldXPath));

    if (!tempField) {
        console.log('ℹ "Temperature *" field not present on this form — skipping, moving to next field.');
        return; // not an error — field may be conditional/absent, just continue
    }

    const currentText = (await tempField.getText()).trim();
    // Some builds show a hint like "e.g. 98.6" as placeholder text when empty
    const looksEmpty = !currentText || /^e\.g\.?\s*98\.6$/i.test(currentText);

    if (looksEmpty) {
        console.log('➡ Temperature field is empty. Entering value...');
        await tempField.click();
        await driver.pause(500);
        await tempField.clearValue();
        await tempField.setValue(String(tempValue));
        await driver.pause(500);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        console.log(`✔ "Temperature" filled successfully with: ${tempValue}`);
    } else if (currentText === String(tempValue)) {
        console.log(`➡ Default matches input: "Temperature" is already set to ${currentText}.`);
    } else {
        console.log(`➡ Field has a different value (${currentText}). Overwriting with ${tempValue}...`);
        await tempField.click();
        await driver.pause(500);
        await tempField.clearValue();
        await tempField.setValue(String(tempValue));
        await driver.pause(500);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        console.log(`✔ "Temperature" updated successfully to: ${tempValue}`);
    }
}
async function fillUmbilicalStump(driver, expectedOption) {
    const fieldXPath = `//android.widget.EditText[@hint="Select Condition of Umbilical Stump"]`;
    const field = await scrollUntilVisible(driver, () => driver.$(fieldXPath));
    if (!field) {
        console.error(`❌ Could not find "Condition of Umbilical Stump" field.`);
        return;
    }

    const currentText = await field.getText();
    if (currentText.trim() === expectedOption.trim()) {
        console.log(`➡ "Condition of Umbilical Stump" already "${expectedOption}".`);
        return;
    }

    await field.click();
    await driver.pause(1500);
    const optionXPath = `//android.widget.TextView[@resource-id="android:id/text1" and @text="${expectedOption}"]`;
    const optionElement = await driver.$(optionXPath);

    if (await optionElement.isExisting()) {
        await optionElement.click();
        console.log(`✔ "Condition of Umbilical Stump" = "${expectedOption}".`);
        await driver.pause(1000);
    } else {
        console.error(`❌ Could not find option "${expectedOption}" in the dialog list.`);
        await driver.pressKeyCode(4); // Android Back
    }
}

async function clickHbncFormSubmit(driver) {
    const submitBtnXPath = `//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnSave" and @text="Submit"]`;
    const submitBtn = await driver.$(submitBtnXPath);
    await submitBtn.waitForDisplayed({ timeout: 5000 });
    await submitBtn.click();
    console.log('✔ HBNC visit form submitted.');
    await driver.pause(2000);
}

/**
 * After submitting, verifies:
 *  1) The completed day's card now shows a real date (not "-").
 *  2) The next scheduled visit's "Add Visit" button/card is now enabled.
 */
async function verifySavedVisitAndNextSchedule(driver, completedDay) {
    console.log(`🔎 Verifying saved details for "${completedDay}" and next scheduled visit availability...`);

    const completedIndex = EXPECTED_VISIT_DAYS.indexOf(completedDay);
    const nextDay = EXPECTED_VISIT_DAYS[completedIndex + 1] || null;

    // 1) Confirm the completed day's date field is populated.
    const completedDateXPath = `//android.widget.TextView[@text="${completedDay}"]/parent::android.widget.LinearLayout//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tvVisitDate"]`;
    const completedDateEl = await driver.$(completedDateXPath);
    await completedDateEl.waitForDisplayed({ timeout: 8000 }).catch(() => {});
    const completedDateText = (await completedDateEl.getText()).trim();

    if (!completedDateText || completedDateText === '-') {
        throw new Error(`❌ VERIFICATION FAILED: "${completedDay}" still shows no saved visit date.`);
    }
    console.log(`✅ VERIFIED: "${completedDay}" saved with date "${completedDateText}".`);

    // 2) Confirm the next scheduled visit is now unlocked (if there is one).
    if (nextDay) {
        const nextCardXPath = `//android.widget.TextView[@text="${nextDay}"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cardVisit"]`;
        const nextCard = await driver.$(nextCardXPath);
        const nextEnabled = await nextCard.getAttribute('enabled');

        if (nextEnabled !== 'true') {
            throw new Error(`❌ VERIFICATION FAILED: Next scheduled visit "${nextDay}" is not yet enabled/available.`);
        }
        console.log(`✅ VERIFIED: Next scheduled visit "${nextDay}" is now available.`);
    } else {
        console.log('ℹ No further scheduled visit after this one (last in the HBNC schedule).');
    }
}

// ─────────────────────────────────────────────────────────────
//  MASTER FLOW
// ─────────────────────────────────────────────────────────────

async function runTest() {
    let driver;
    let rememberedChildName;

    try {
        console.log('🚀 Starting HBNC End-to-End Flow...');
        driver = await remote(wdOpts);

        // ── 1. Home → Maternal Health → Child Registration ──────────────
        // TODO: confirm these are the exact home-screen card labels in your build.
        await clickGridModule(driver, 'Maternal Health');
        await clickGridModule(driver, 'Child Registration');

        // ── 2. Pick a random pending registration, remember the name ────
        rememberedChildName = await selectRandomChildToRegister(driver);
        console.log(`📌 Remembered name for later search: "${rememberedChildName}"`);

        // ── 3. Fill registration form ────────────────────────────────────
        await fillChildRchId(driver, `${Date.now()}`.slice(-12));
        await fillBirthCertificateNumber(driver, `B-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`);

        const dob = generateRandomDob(0, 61);
        await fillDateOfBirth(driver, dob);

        await selectPlaceOfBirth(driver, 'Primary Health Centre');
        await uploadFrontAndBackImages(driver);
        await clickRegistrationSubmitButton(driver);

        // ── 4. Home → Child Care → Newborn list ──────────────────────────
        await goToHome(driver);
        await clickGridModule(driver, 'Child Care');
        await clickGridModule(driver, 'Newborn list');
        await driver.pause(2000);

        // ── 5. Search remembered name, verify HBNC button ───────────────
        await searchName(driver, rememberedChildName);
        await verifyHBNCButtonAvailable(driver);

        // ── 6. Open HBNC, verify scheduled visit days ────────────────────
        await clickHBNCButton(driver);
        await verifyScheduledVisitDays(driver);

        // ── 7. Add visit on the currently due day, fill mandatory fields ─
        const dueDay = (await getCurrentlyDueVisitDay(driver)) || '1st Day';
        console.log(`📌 Currently due visit day: ${dueDay}`);

        await clickAddVisitForDay(driver, dueDay);
        await driver.pause(2000);

        const today = new Date();
        const visitDateString =
            `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

        await handleVisitDate(driver, visitDateString);
        await handleIsBabyAlive(driver, 'Yes');
        await fillBabyWeight(driver, 2500);

        await selectRadioOption(driver, 'Urine passed', 'Yes');
        await selectRadioOption(driver, 'Stool passed', 'Yes');
        await selectRadioOption(driver, 'Diarrhoea', 'No');
        await selectRadioOption(driver, 'Vomiting', 'No');
        await selectRadioOption(driver, 'Convulsions', 'No');
        await selectRadioOption(driver, 'Activity', 'Good');
        await selectRadioOption(driver, 'Sucking', 'Good');
        await selectRadioOption(driver, 'Breathing', 'Fast');
        await selectRadioOption(driver, 'Chest Indrawing', 'Absent');
        await fillTemperature(driver, 98.6);
        await driver.pause(1000);
        await selectRadioOption(driver, 'Jaundice', 'No');
        await fillUmbilicalStump(driver, 'Falling Off');
        await driver.pause(1000);
        await selectRadioOption(driver, 'Is Baby discharge from SNCU?', 'No');
        await driver.pause(1000);

        // ── 8. Submit ─────────────────────────────────────────────────────
        await clickHbncFormSubmit(driver);

        // ── 9. Verify saved details + next visit unlocked ───────────────
        await verifySavedVisitAndNextSchedule(driver, dueDay);

        console.log('🎉 HBNC End-to-End Flow Completed Successfully!');
        console.log(`   Child registered & tested: "${rememberedChildName}"`);

    } catch (error) {
        console.error('🛑 Test execution stopped due to an error:', error.message);
        if (rememberedChildName) {
            console.error(`   (Failure occurred while working with child: "${rememberedChildName}")`);
        }
        throw error;
    } finally {
        if (driver) {
            await driver.pause(2000);
            await driver.deleteSession();
            console.log('🔌 Appium session closed.');
        }
    }
}

runTest();