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

// ─────────────────────────────────────────────────────────────
//  CORE HELPER — Shared spinner click + XML bounds tap
// ─────────────────────────────────────────────────────────────

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList) {
    await scrollSpinnerToMiddle(driver, spinnerSelector);

    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();
    console.log(`📍 Spinner @ (${loc.x}, ${loc.y}), size (${size.width}x${size.height})`);

    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);

    console.log(`📍 Tapping dropdown arrow at (${tapX}, ${tapY})`);
    await tapByCoords(driver, tapX, tapY);
    await driver.pause(2000);

    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`✅ Selected "${value}" via XPath`);
        return;
    } catch (e) {
        console.log(`⚠️  XPath strategy failed: ${e.message}`);
    }

    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via UiSelector`);
        return;
    } catch (e) {
        console.log(`⚠️  UiSelector strategy failed: ${e.message}`);
    }

    const screen = await driver.getWindowRect();
    const idx = optionsList.indexOf(value);
    if (idx === -1) throw new Error(`"${value}" not in list: [${optionsList.join(', ')}]`);

    const rowHeight     = size.height;
    const spinnerBottom = loc.y + size.height;
    const opensUpward   = (screen.height - spinnerBottom) < (optionsList.length * rowHeight);
    const finalTapX     = Math.floor(loc.x + size.width / 2);
    let   finalTapY;

    if (opensUpward) {
        const reversedIdx = (optionsList.length - 1) - idx;
        finalTapY = Math.floor(loc.y - (reversedIdx * rowHeight) - (rowHeight / 2));
    } else {
        finalTapY = Math.floor(spinnerBottom + (idx * rowHeight) + (rowHeight / 2));
    }
    finalTapY = Math.max(5, Math.min(finalTapY, screen.height - 5));

    console.log(`📍 Coordinate fallback → tap(${finalTapX}, ${finalTapY})`);
    await tapByCoords(driver, finalTapX, finalTapY);
    console.log(`✅ Selected "${value}" via coordinates`);
}

// ─────────────────────────────────────────────────────────────
//  CALENDAR UTILITIES
// ─────────────────────────────────────────────────────────────

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
    const prevBtn = await driver.$('//android.widget.ImageButton[@resource-id="android:id/prev"]');
    for (let i = 0; i < 36; i++) {
        const cur = await getCalendarMonthYear(driver);
        if (!cur) break;
        const curTotal = cur.year * 12 + cur.month;
        const tgtTotal = targetYear * 12 + targetMonth;

        if (curTotal === tgtTotal) break;
        if (curTotal > tgtTotal) {
            await prevBtn.click();
        } else {
            await swipeHorizontalCalendar(driver, 'left');
        }
        await driver.pause(600);
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

// ─────────────────────────────────────────────────────────────
//  2. Date of Birth Picker Handler (Replacing Age Input Flow)
// ─────────────────────────────────────────────────────────────

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

async function fillMotherName(driver, motherName) {
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Mother\'s Name"))');
    const f = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Mother\'s Name")');
    await f.click();
    await f.setValue(motherName);
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }
    console.log(`✅ Mother's Name entered: ${motherName}`);
}

async function fillSpouseNameIfExists(driver, spouseName) {
    console.log("🔍 Checking if Husband's or Wife's Name field is present...");
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }

    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollForward()');
    } catch (e) {}

    const wifeField    = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Wife\'s Name")');
    const husbandField = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Husband\'s Name")');

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
        await fieldToFill.click();
        await fieldToFill.setValue(spouseName.toUpperCase());
        if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }
        console.log(`✅ ${fieldNameStr} entered: ${spouseName.toUpperCase()}`);
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

async function selectCommunity(driver, value = "General") {
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
    }
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Community"))');
    await driver.pause(1000);
    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().className("android.widget.Spinner").textContains("Community")',
        value,
        ['General', 'SC', 'ST', 'BC', 'OBC', 'OC', 'PVTG – Primitive Vulnerable Tribal Groups', 'Not given']
    );
    console.log(`✅ Community: ${value}`);
}

// ─────────────────────────────────────────────────────────────
//  7. Religion Selection
// ─────────────────────────────────────────────────────────────

async function selectReligion(driver, value = "Hindu") {
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
    }
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Religion"))');
    await driver.pause(1000);
    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().className("android.widget.Spinner").textContains("Religion")',
        value,
        ['Hindu', 'Muslim', 'Christian', 'Sikhism', 'Buddhism', 'Jainism', 'Parsi', 'Other', 'Not disclosed']
    );
    console.log(`✅ Religion: ${value}`);
}

// ─────────────────────────────────────────────────────────────
//  8. Status Of Women Selection
// ─────────────────────────────────────────────────────────────

async function selectStatusOfWomen(driver, value = "Eligible Couple") {
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
    }
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Status Of Women"))');
    await driver.pause(1000);
    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().className("android.widget.Spinner").textContains("Status Of Women")',
        value,
        ['Eligible Couple', 'Pregnant Woman', 'Postnatal Mother', 'Permanently Sterilised']
    );
    console.log(`✅ Status Of Women: ${value}`);
}

// ─────────────────────────────────────────────────────────────
//  9. Final Submission
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
//  10. Master Function
// ─────────────────────────────────────────────────────────────

async function fillHeadOfFamilyFormWithExamples(driver, targetMaritalStatus = "Married") {
    console.log("📝 Filling Head of Family form with updated example data...");

    await handleConsentForm(driver);

    // Explicitly handles DOB choice using the automated calendar popup loops
    const exampleDOB = { day: 29, month: 5, year: 1990 };
    await selectDateOfBirth(driver, exampleDOB);

    await selectGender(driver, "Female");
    await selectMaritalStatus(driver, targetMaritalStatus);

    await fillFatherName(driver, "Sandeep Singh");
    await fillMotherName(driver, "Rekha Singh");

    await fillSpouseNameIfExists(driver, "Pooja Singh");
    await fillAgeAtMarriageIfExists(driver, "24");
    await selectHaveChildrenIfExists(driver, "No");

    await selectCommunity(driver, "OBC");
    await selectReligion(driver, "Christian");
    await selectStatusOfWomen(driver, "Pregnant Woman");

    console.log("✅ Head of Family form filled successfully!");
    await submitFinalForm(driver);
}

module.exports = {
    fillHeadOfFamilyFormWithExamples
};