// ─── Registration Data ────────────────────────────────────────────────────────

const REG_DATA = {
    dateOfRegistration: { day: 22, month: 2, year: 2026 },
    dateOfBirth: { day: 8, month: 11, year: 1998 },
    age: "27",
    gender: "Male",
    fathersName: "VIKRAM PATEL",
    mothersName: "NEHA PATEL",
    maritalStatus: "Married",
    haveChildren: "Yes",
    mobileBelongsTo: "Family Head",
    community: "OBC",
    religion: "Christian",
    rchId: "123456789012",
    statusOfWomen: "Eligible Couple"
};

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

const MONTH_ABBR = [
    '', 'Jan', 'Feb', 'Mar', 'Apr',
    'May', 'Jun', 'Jul', 'Aug', 'Sep',
    'Oct', 'Nov', 'Dec'
];

// ─── Utility & Scroll Functions ───────────────────────────────────────────────

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
    const elementXPath = `//*[contains(@text, "${text}") or contains(@hint, "${text}") or contains(@content-desc, "${text}")]`;
    for (let i = 0; i < maxScrolls; i++) {
        try {
            const element = await driver.$(elementXPath);
            if ((await element.isExisting()) && (await element.isDisplayed())) return;
        } catch (e) { }

        await scrollDown(driver);
    }
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
    await driver.pause(800);
}

// ─── ROBUST DROPDOWN HELPERS ──────────────────────────────────────────────────

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
    } catch (e) {}
}

async function tapByCoords(driver, tapX, tapY) {
    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: tapX, y: tapY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 150 },
            { type: 'pointerUp',   button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(500);
}

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList) {
    await scrollSpinnerToMiddle(driver, spinnerSelector);

    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();
    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);

    await tapByCoords(driver, tapX, tapY);
    await driver.pause(2000);

    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`✅ Selected "${value}"`);
        return;
    } catch (e) {}

    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}"`);
        return;
    } catch (e) {}

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

    await tapByCoords(driver, finalTapX, finalTapY);
    console.log(`✅ Selected "${value}" via coordinates fallback`);
}

// ─── Calendar Helpers ─────────────────────────────────────────────────────────

async function getCalendarMonthYear(driver) {
    try {
        const dayViews = await driver.$$('//android.view.View[@resource-id="android:id/month_view"]/android.view.View');
        for (const el of dayViews) {
            let desc = '';
            try { desc = await el.getAttribute('content-desc'); } catch (e) { continue; }
            const match = desc.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
            if (match) {
                const monthStr = match[2];
                const year = parseInt(match[3]);
                for (let i = 1; i <= 12; i++) {
                    if (monthStr === MONTH_NAMES[i] || monthStr === MONTH_ABBR[i]) {
                        return { month: i, year };
                    }
                }
            }
        }
    } catch (e) { }
    return null;
}

async function selectYear(driver, targetYear) {
    let currentYear = null;
    try {
        const yearHeader = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_header_year")');
        const txt = await yearHeader.getText();
        currentYear = parseInt(txt);

        if (currentYear === targetYear) return;

        await yearHeader.click();
        await driver.pause(1500);
    } catch (e) { return; }

    const yearXPath = `//android.widget.TextView[@text="${targetYear}"]`;
    let maxSwipes = 60;

    while (maxSwipes > 0) {
        try {
            const yearEl = await driver.$(yearXPath);
            if (await yearEl.isExisting() && await yearEl.isDisplayed()) {
                await yearEl.click();
                await driver.pause(1000);
                return;
            }
        } catch (e) { }

        const size = await driver.getWindowRect();
        const startX = Math.floor(size.width / 2);
        let startY, endY;

        if (targetYear < (currentYear || 2026)) {
            startY = Math.floor(size.height * 0.47);
            endY = Math.floor(size.height * 0.63);
        } else {
            startY = Math.floor(size.height * 0.63);
            endY = Math.floor(size.height * 0.47);
        }

        await driver.performActions([{
            type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: startX, y: startY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 80 },
                { type: 'pointerMove', duration: 280, x: startX, y: endY },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
        await driver.releaseActions();
        await driver.pause(320);
        maxSwipes--;
    }
}

async function navigateToMonth(driver, targetMonth, targetYear) {
    await selectYear(driver, targetYear);
    await driver.pause(800);

    for (let attempt = 0; attempt < 30; attempt++) {
        const cur = await getCalendarMonthYear(driver);

        if (!cur) {
            await swipeHorizontal(driver, 'left');
            await driver.pause(700);
            continue;
        }

        if (cur.month === targetMonth && cur.year === targetYear) return;

        const curTotal = cur.year * 12 + cur.month;
        const targetTotal = targetYear * 12 + targetMonth;
        const goForward = curTotal < targetTotal;

        let clicked = false;
        try {
            const btnResId = goForward ? 'android:id/next' : 'android:id/prev';
            const btn = await driver.$(`android=new UiSelector().resourceId("${btnResId}")`);
            if (await btn.isExisting() && await btn.isDisplayed()) {
                await btn.click();
                clicked = true;
            }
        } catch (e) { }

        if (!clicked) {
            await swipeHorizontal(driver, goForward ? 'left' : 'right');
        }
        await driver.pause(800);
    }
}

async function pickDateFromCalendar(driver, dateObj) {
    const { day, month, year } = dateObj;
    await driver.pause(500);
    await navigateToMonth(driver, month, year);
    await driver.pause(300);

    const padded = String(day).padStart(2, '0');
    const unpadded = String(day);
    const possibleDescs = [
        `${padded} ${MONTH_NAMES[month]} ${year}`,
        `${unpadded} ${MONTH_NAMES[month]} ${year}`,
        `${padded} ${MONTH_ABBR[month]} ${year}`,
        `${unpadded} ${MONTH_ABBR[month]} ${year}`,
    ];

    let dayTapped = false;
    for (const desc of possibleDescs) {
        try {
            const el = await driver.$(`//android.view.View[@content-desc="${desc}"]`);
            if (await el.isExisting() && await el.isDisplayed()) {
                await el.click();
                dayTapped = true;
                break;
            }
        } catch (e) { }
    }

    if (!dayTapped) {
        const el = await driver.$(`android=new UiSelector().text("${unpadded}").clickable(true)`);
        await el.waitForDisplayed({ timeout: 5000 });
        await el.click();
    }

    await driver.pause(500);

    const okBtn = await driver.$('//android.widget.Button[@resource-id="android:id/button1"]');
    await okBtn.waitForDisplayed({ timeout: 3000 });
    await okBtn.click();
}

// ─── Form Filling Functions ───────────────────────────────────────────────────

async function agreeToConsent(driver) {
    try {
        console.log(`⏳ Waiting for 'Consent Form' popup...`);
        const checkBox = await driver.$('//android.widget.CheckBox[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/checkBox"]');
        await checkBox.waitForDisplayed({ timeout: 10000 });
        await checkBox.click();
        const agreeButton = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_positive" and @text="AGREE"]');
        await agreeButton.waitForDisplayed({ timeout: 5000 });
        await agreeButton.click();
        await driver.pause(1000);
    } catch (error) {}
}

async function fillDateOfRegistration(driver) {
    console.log(`⏳ Processing Date of Registration...`);
    const dateField = await driver.$('//android.widget.EditText[contains(@hint, "Date of Registration")]');
    await dateField.waitForDisplayed({ timeout: 5000 });
    await dateField.click();
    await driver.pause(1000);
    await pickDateFromCalendar(driver, REG_DATA.dateOfRegistration);
    await driver.pause(1000);
}

async function fillDateOfBirth(driver) {
    console.log(`⏳ Processing Date of Birth...`);
    const dobField = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/et_date" or contains(@hint, "Date of Birth")]');
    await dobField.waitForDisplayed({ timeout: 5000 });
    await dobField.click();
    await driver.pause(1000);
    await pickDateFromCalendar(driver, REG_DATA.dateOfBirth);
    await driver.pause(1000);
}

async function fillAge(driver) {
    console.log(`⏳ Processing Age...`);
    await driver.pause(2000);

    const AGE_XPATHS = [
        '//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/et_num"]',
        '//android.widget.EditText[contains(@hint, "Age")]',
        '//android.widget.EditText[contains(@text, "Years") or contains(@text, "years")]',
    ];

    let ageField = null;
    for (let scroll = 0; scroll <= 3; scroll++) {
        for (const xpath of AGE_XPATHS) {
            try {
                const el = await driver.$(xpath);
                if (await el.isExisting() && await el.isDisplayed()) {
                    ageField = el;
                    break;
                }
            } catch (e) { }
        }
        if (ageField) break;
        await scrollDown(driver);
    }

    if (!ageField) return;

    let isEnabled = false;
    try { isEnabled = await ageField.isEnabled(); } catch (e) { }

    if (!isEnabled) {
        console.log(`✅ Age field is auto-calculated by the app. Skipping.`);
        return;
    }

    await ageField.click();
    await driver.pause(400);

    ageField = await driver.$(AGE_XPATHS[0]) || await driver.$(AGE_XPATHS[1]);

    try {
        await ageField.clearValue();
    } catch (e) {
        await driver.execute('mobile: longClickGesture', { elementId: ageField.elementId, duration: 1000 });
        await driver.pause(500);
        try {
            const selectAll = await driver.$('//android.widget.TextView[@text="Select all"]');
            if (await selectAll.isExisting()) await selectAll.click();
        } catch (e2) { }
        await driver.pause(300);
    }

    try {
        ageField = await driver.$(AGE_XPATHS[0]);
        if (!(await ageField.isExisting())) throw new Error('not found');
    } catch (e) {
        ageField = await driver.$(AGE_XPATHS[1]);
    }

    await ageField.setValue(REG_DATA.age);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    await driver.pause(1000);
}

async function fillFathersName(driver) {
    console.log(`⏳ Processing Father's Name...`);
    await scrollDownToText(driver, "Father's Name");
    const fatherField = await driver.$('//android.widget.EditText[contains(@hint, "Father\'s Name")]');
    await fatherField.waitForDisplayed({ timeout: 5000 });
    await fatherField.click();
    await fatherField.clearValue();
    await fatherField.setValue(REG_DATA.fathersName);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
}

async function fillMothersName(driver) {
    console.log(`⏳ Processing Mother's Name...`);
    await scrollDownToText(driver, "Mother's Name");
    const motherField = await driver.$('//android.widget.EditText[contains(@hint, "Mother\'s Name")]');
    await motherField.waitForDisplayed({ timeout: 5000 });
    await motherField.click();
    await motherField.clearValue();
    await motherField.setValue(REG_DATA.mothersName);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
}

// ─── DROPDOWN & CONDITIONAL FORM FILLERS ──────────────────────────────────────

async function fillMaritalStatus(driver, status) {
    console.log(`⏳ Processing Marital Status...`);
    await scrollDownToText(driver, "Marital Status");
    const spinnerSelector = 'android=new UiSelector().className("android.widget.Spinner").description("Marital Status")';
    await clickSpinnerAndSelectOption(driver, spinnerSelector, status, ['Unmarried', 'Married', 'Divorced', 'Separated', 'Widow']);
}

async function fillHaveChildren(driver, option) {
    console.log(`⏳ Processing Do you have children?...`);
    await scrollDownToText(driver, "Do you have children?");
    const rb = await driver.$(`//android.widget.RadioButton[@text="${option}"]`);
    await rb.waitForDisplayed({ timeout: 5000 });
    await rb.click();
    await driver.pause(500);
}

async function fillMobileNumberBelongsTo(driver, belongsTo) {
    console.log(`⏳ Processing Mobile Number Belongs To...`);
    await scrollDownToText(driver, "Mobile Number belongs to");
    const spinnerSelector = 'android=new UiSelector().className("android.widget.Spinner").description("Mobile Number belongs to")';
    await clickSpinnerAndSelectOption(driver, spinnerSelector, belongsTo, ['Family Head', 'Self', 'Other Family Member', 'Other']);
}

async function fillCommunity(driver, community) {
    console.log(`⏳ Processing Community...`);
    await scrollDownToText(driver, "Community");
    const spinnerSelector = 'android=new UiSelector().className("android.widget.Spinner").description("Community")';
    await clickSpinnerAndSelectOption(driver, spinnerSelector, community, ['General', 'SC', 'ST', 'BC', 'OBC', 'OC', 'PVTG – Primitive Vulnerable Tribal Groups', 'Not given']);
}

async function fillReligion(driver, religion) {
    console.log(`⏳ Processing Religion...`);
    await scrollDownToText(driver, "Religion");
    const spinnerSelector = 'android=new UiSelector().className("android.widget.Spinner").description("Religion")';
    await clickSpinnerAndSelectOption(driver, spinnerSelector, religion, ['Hindu', 'Muslim', 'Christian', 'Sikhism', 'Buddhism', 'Jainism', 'Parsi', 'Other', 'Not disclosed']);
}

async function fillRchId(driver, rchId) {
    console.log(`⏳ Processing RCH ID...`);

    // Scroll a bit to make sure it's in view
    await scrollDownToText(driver, "RCH ID", 2);
    const rchField = await driver.$('//android.widget.EditText[@text="RCH ID" or contains(@hint, "RCH ID")]');

    try {
        // Safe check: Only interact if the field is actually present on the UI
        await rchField.waitForDisplayed({ timeout: 4000 });
        await rchField.click();
        await rchField.clearValue();

        await driver.keys([...String(rchId)]);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        await driver.pause(500);
        console.log(`✅ Filled RCH ID: ${rchId}`);
    } catch (e) {
        console.log(`⚠️ RCH ID field not present on screen. Skipping.`);
    }
}

async function fillStatusOfWomen(driver, status) {
    console.log(`⏳ Processing Status Of Women...`);
    await scrollDownToText(driver, "Status Of Women");
    const spinnerSelector = 'android=new UiSelector().className("android.widget.Spinner").description("Status Of Women")';
    await clickSpinnerAndSelectOption(driver, spinnerSelector, status, ['Eligible Couple', 'Pregnant Woman', 'Postnatal Mother', 'Permanently Sterilised']);
}

// ─── SUBMISSION ───────────────────────────────────────────────────────────────

async function clickSubmitButton(driver) {
    console.log(`⏳ Scrolling to and clicking Submit...`);
    await scrollDownToText(driver, "Submit", 5);
    const submitBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit" and @text="Submit"]');
    await submitBtn.waitForDisplayed({ timeout: 5000 });
    await submitBtn.click();
    console.log(`✅ Submit clicked!`);
    await driver.pause(2000);
}

async function clickPreviewSubmitButton(driver) {
    console.log(`⏳ Waiting for the Preview Submit button...`);
    const submitBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnSubmitPreview"]');
    await submitBtn.waitForDisplayed({ timeout: 5000 });
    await submitBtn.click();
    console.log(`✅ Preview Submit clicked successfully!`);
    await driver.pause(2000);
}

// ─── Main Execution Flow ──────────────────────────────────────────────────────

async function formRegistration(driver) {
    console.log("🚀 Starting Family Member Registration Form...");

    await agreeToConsent(driver);
    await driver.pause(1000);

    await fillDateOfRegistration(driver);
    await fillDateOfBirth(driver);

    await fillFathersName(driver);
    await fillMothersName(driver);

    // Marital Status
    if (REG_DATA.maritalStatus) {
        await fillMaritalStatus(driver, REG_DATA.maritalStatus);
    }

    // Determine conditions
    const isFemale = REG_DATA.gender && REG_DATA.gender.toLowerCase() === 'female';
    const isEverMarried = ['Married', 'Divorced', 'Separated', 'Widow'].includes(REG_DATA.maritalStatus);

    // Conditional: "Do you have children?"
    if (isFemale && isEverMarried) {
        if (REG_DATA.haveChildren) await fillHaveChildren(driver, REG_DATA.haveChildren);
    }

    // Standard dropdowns
    if (REG_DATA.mobileBelongsTo) await fillMobileNumberBelongsTo(driver, REG_DATA.mobileBelongsTo);
    if (REG_DATA.community) await fillCommunity(driver, REG_DATA.community);
    if (REG_DATA.religion) await fillReligion(driver, REG_DATA.religion);

    // RCH ID -> Executed regardless of Gender or Marital Status
    if (REG_DATA.rchId) {
        await fillRchId(driver, REG_DATA.rchId);
    }

    // Conditional: "Status of Women"
    if (isFemale && isEverMarried) {
        if (REG_DATA.statusOfWomen) await fillStatusOfWomen(driver, REG_DATA.statusOfWomen);
    } else {
        console.log(`✅ Skipping Status of Women (Beneficiary is Unmarried or not Female)`);
    }

    // Submit sequence
    await clickSubmitButton(driver);
    await clickPreviewSubmitButton(driver);

    console.log("🎉 Registration form completed successfully!");
}

module.exports = { formRegistration };