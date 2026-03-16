// ─── Registration Data ────────────────────────────────────────────────────────

const REG_DATA = {
    dateOfRegistration: { day: 10, month: 3, year: 2026 },
    dateOfBirth: { day: 15, month: 6, year: 1995 },
    age: "30",
    fathersName: "RAM SHARMA",
    mothersName: "SITA SHARMA"
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

// ─── Utility Functions ────────────────────────────────────────────────────────

async function swipeHorizontal(driver, direction) {
    const size = await driver.getWindowRect();
    const startX = direction === 'left'
        ? Math.floor(size.width * 0.8)
        : Math.floor(size.width * 0.2);
    const endX = direction === 'left'
        ? Math.floor(size.width * 0.2)
        : Math.floor(size.width * 0.8);
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
            if ((await element.isExisting()) && (await element.isDisplayed())) return;
        } catch (e) { }

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

// ─── Calendar Helpers ─────────────────────────────────────────────────────────

/**
 * Reads month/year from the day cells inside android:id/month_view.
 * These ARE updated when Next/Prev arrows are clicked.
 * (date_picker_header_date is NOT updated — never use it for month detection)
 */
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
                        console.log(`📅 month_view: "${desc}" → Month=${i}, Year=${year}`);
                        return { month: i, year };
                    }
                }
            }
        }
    } catch (e) {
        console.log('   month_view strategy failed:', e.message);
    }

    // Fallback: any View with date content-desc
    try {
        const allViews = await driver.$$('//android.view.View[@content-desc]');
        for (const el of allViews) {
            let desc = '';
            try { desc = await el.getAttribute('content-desc'); } catch (e) { continue; }
            const match = desc.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
            if (match) {
                const monthStr = match[2];
                const year = parseInt(match[3]);
                for (let i = 1; i <= 12; i++) {
                    if (monthStr === MONTH_NAMES[i] || monthStr === MONTH_ABBR[i]) {
                        console.log(`📅 fallback: "${desc}" → Month=${i}, Year=${year}`);
                        return { month: i, year };
                    }
                }
            }
        }
    } catch (e) {
        console.log('   fallback strategy failed:', e.message);
    }

    console.log('⚠️ getCalendarMonthYear: failed.');
    return null;
}

async function selectYear(driver, targetYear) {
    console.log(`⏳ Selecting Year: ${targetYear}...`);

    let currentYear = null;
    try {
        const yearHeader = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_header_year")');
        const txt = await yearHeader.getText();
        currentYear = parseInt(txt);
        console.log(`   Current year: ${currentYear}`);

        if (currentYear === targetYear) {
            console.log(`✅ Already on year ${targetYear}.`);
            return;
        }

        await yearHeader.click();
        await driver.pause(1500);
    } catch (e) {
        console.log('⚠️ Year header click failed:', e.message);
        return;
    }

    const yearXPath = `//android.widget.TextView[@text="${targetYear}"]`;
    let maxSwipes = 60;

    while (maxSwipes > 0) {
        try {
            const yearEl = await driver.$(yearXPath);
            if (await yearEl.isExisting() && await yearEl.isDisplayed()) {
                await yearEl.click();
                console.log(`✅ Year ${targetYear} selected.`);
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

    throw new Error(`Could not find year ${targetYear} in the year picker.`);
}

async function navigateToMonth(driver, targetMonth, targetYear) {
    await selectYear(driver, targetYear);
    await driver.pause(800);

    console.log(`⏳ Navigating to ${MONTH_NAMES[targetMonth]} ${targetYear}...`);

    for (let attempt = 0; attempt < 30; attempt++) {
        const cur = await getCalendarMonthYear(driver);

        if (!cur) {
            console.log('   ⚠️ Could not read month, swiping forward...');
            await swipeHorizontal(driver, 'left');
            await driver.pause(700);
            continue;
        }

        if (cur.month === targetMonth && cur.year === targetYear) {
            console.log(`✅ Reached ${MONTH_NAMES[targetMonth]} ${targetYear}.`);
            return;
        }

        const curTotal = cur.year * 12 + cur.month;
        const targetTotal = targetYear * 12 + targetMonth;
        const goForward = curTotal < targetTotal;

        console.log(`   At ${MONTH_ABBR[cur.month]} ${cur.year} → ${goForward ? '▶ Next' : '◀ Prev'}`);

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
            try {
                const desc = goForward ? 'Next month' : 'Previous month';
                const btn = await driver.$(`//android.widget.ImageButton[@content-desc="${desc}"]`);
                if (await btn.isExisting() && await btn.isDisplayed()) {
                    await btn.click();
                    clicked = true;
                }
            } catch (e) { }
        }

        if (!clicked) {
            console.log('   ⚠️ Arrow not found, swiping...');
            await swipeHorizontal(driver, goForward ? 'left' : 'right');
        }

        await driver.pause(800);
    }

    console.error(`❌ Could not reach ${MONTH_NAMES[targetMonth]} ${targetYear}.`);
}

async function pickDateFromCalendar(driver, dateObj) {
    const { day, month, year } = dateObj;

    try {
        await driver.$('android=new UiSelector().resourceId("android:id/datePicker")')
            .waitForDisplayed({ timeout: 5000 });
    } catch (e) {
        console.log('⚠️ datePicker root not found, continuing...');
    }
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
                console.log(`✅ Tapped day: "${desc}"`);
                break;
            }
        } catch (e) { }
    }

    if (!dayTapped) {
        console.log('   ⚠️ Falling back to text selector...');
        const el = await driver.$(`android=new UiSelector().text("${unpadded}").clickable(true)`);
        await el.waitForDisplayed({ timeout: 5000 });
        await el.click();
        console.log(`✅ Tapped day by text: "${unpadded}"`);
    }

    await driver.pause(500);

    const okBtn = await driver.$('//android.widget.Button[@resource-id="android:id/button1"]');
    await okBtn.waitForDisplayed({ timeout: 3000 });
    await okBtn.click();
    console.log(`✅ Date ${day}/${month}/${year} confirmed.`);
}

// ─── Form Filling Functions ───────────────────────────────────────────────────

async function agreeToConsent(driver) {
    try {
        console.log(`⏳ Waiting for 'Consent Form' popup...`);
        const checkBox = await driver.$('//android.widget.CheckBox[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/checkBox"]');
        await checkBox.waitForDisplayed({ timeout: 10000 });
        await checkBox.click();
        console.log(`✅ Consent checkbox checked.`);
        await driver.pause(500);

        const agreeButton = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_positive" and @text="AGREE"]');
        await agreeButton.waitForDisplayed({ timeout: 5000 });
        await agreeButton.click();
        console.log(`✅ AGREE clicked.`);
        await driver.pause(1000);
    } catch (error) {
        console.error(`❌ Consent form failed: ${error.message}`);
        throw error;
    }
}

async function fillDateOfRegistration(driver) {
    try {
        console.log(`⏳ Processing Date of Registration...`);
        const dateField = await driver.$('//android.widget.EditText[contains(@hint, "Date of Registration")]');
        await dateField.waitForDisplayed({ timeout: 5000 });
        await dateField.click();
        await driver.pause(1000);
        await pickDateFromCalendar(driver, REG_DATA.dateOfRegistration);
        console.log(`✅ Date of Registration set to ${REG_DATA.dateOfRegistration.day}/${REG_DATA.dateOfRegistration.month}/${REG_DATA.dateOfRegistration.year}.`);
        await driver.pause(1000);
    } catch (error) {
        console.error(`❌ Date of Registration failed: ${error.message}`);
        throw error;
    }
}

async function fillDateOfBirth(driver) {
    try {
        console.log(`⏳ Processing Date of Birth...`);
        const dobField = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/et_date" or contains(@hint, "Date of Birth")]');
        await dobField.waitForDisplayed({ timeout: 5000 });
        await dobField.click();
        await driver.pause(1000);
        await pickDateFromCalendar(driver, REG_DATA.dateOfBirth);
        console.log(`✅ Date of Birth set to ${REG_DATA.dateOfBirth.day}/${REG_DATA.dateOfBirth.month}/${REG_DATA.dateOfBirth.year}.`);
        await driver.pause(1000);
    } catch (error) {
        console.error(`❌ Date of Birth failed: ${error.message}`);
        throw error;
    }
}

/**
 * Age field fix:
 * After DOB is set, the app auto-calculates Age and fills/disables the field.
 * Strategy:
 *   1. Wait for the field to appear (it may take time after DOB dialog closes)
 *   2. Scroll down if needed to bring it into view
 *   3. Check if it's already filled with the correct auto-calculated value → skip
 *   4. If editable, clear and type the value
 *   5. If not editable (enabled=false / read-only), skip gracefully — app handles it
 */
async function fillAge(driver) {
    try {
        console.log(`⏳ Processing Age...`);

        // Give the app time to auto-fill age after DOB was set
        await driver.pause(2000);

        const AGE_XPATHS = [
            '//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/et_num"]',
            '//android.widget.EditText[contains(@hint, "Age")]',
            '//android.widget.EditText[contains(@text, "Years") or contains(@text, "years")]',
        ];

        let ageField = null;

        // Try to find the age field, scrolling down up to 3 times if needed
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
            console.log(`   Age field not visible, scrolling down (${scroll + 1}/3)...`);
            await scrollDown(driver);
        }

        if (!ageField) {
            // Age field is not found at all — app may have hidden it or it's auto-managed
            console.log('⚠️ Age field not found. The app may auto-manage it from DOB. Skipping.');
            return;
        }

        // Check if the field is enabled (editable) or disabled (read-only/auto-filled)
        let isEnabled = false;
        try {
            isEnabled = await ageField.isEnabled();
        } catch (e) {
            isEnabled = false;
        }

        // Read the current value to see if app already filled it
        let currentValue = '';
        try {
            currentValue = await ageField.getText();
            if (!currentValue) currentValue = await ageField.getAttribute('text');
        } catch (e) { }

        console.log(`   Age field found. Enabled: ${isEnabled}, Current value: "${currentValue}"`);

        if (!isEnabled) {
            // Field is read-only — app auto-calculated from DOB, nothing to do
            console.log(`✅ Age field is auto-calculated by the app (value: "${currentValue}"). Skipping.`);
            return;
        }

        // Field is editable — clear and fill it
        await ageField.click();
        await driver.pause(400);

        // Re-fetch to avoid stale reference
        ageField = await driver.$(AGE_XPATHS[0]) || await driver.$(AGE_XPATHS[1]);

        try {
            await ageField.clearValue();
        } catch (e) {
            // clearValue can throw on some fields — use keyboard clear instead
            console.log('   clearValue failed, using selectAll + Delete...');
            await driver.execute('mobile: longClickGesture', {
                elementId: ageField.elementId,
                duration: 1000
            });
            await driver.pause(500);
            try {
                const selectAll = await driver.$('//android.widget.TextView[@text="Select all"]');
                if (await selectAll.isExisting()) await selectAll.click();
            } catch (e2) { }
            await driver.pause(300);
        }

        await driver.pause(300);

        // Re-fetch fresh reference before setValue
        try {
            ageField = await driver.$(AGE_XPATHS[0]);
            if (!(await ageField.isExisting())) throw new Error('not found');
        } catch (e) {
            ageField = await driver.$(AGE_XPATHS[1]);
        }

        await ageField.setValue(REG_DATA.age);

        if (await driver.isKeyboardShown()) await driver.hideKeyboard();

        console.log(`✅ Age set to ${REG_DATA.age}.`);
        await driver.pause(1000);

    } catch (error) {
        // Age field errors are non-fatal if the app auto-manages it
        console.warn(`⚠️ Age field warning: ${error.message}`);
        console.log('   Continuing — app may handle age automatically from DOB.');
    }
}

async function fillFathersName(driver) {
    try {
        console.log(`⏳ Processing Father's Name...`);

        // Scroll down to find the Father's Name field
        let fatherField = null;
        for (let scroll = 0; scroll <= 3; scroll++) {
            try {
                fatherField = await driver.$("//android.widget.EditText[contains(@hint, \"Father's Name\")]");
                if (await fatherField.isExisting() && await fatherField.isDisplayed()) break;
            } catch (e) { }
            await scrollDown(driver);
        }

        await fatherField.waitForDisplayed({ timeout: 5000 });
        await fatherField.click();
        await fatherField.clearValue();
        await fatherField.setValue(REG_DATA.fathersName);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        console.log(`✅ Father's Name set to "${REG_DATA.fathersName}".`);
        await driver.pause(1000);
    } catch (error) {
        console.error(`❌ Father's Name failed: ${error.message}`);
        throw error;
    }
}

async function fillMothersName(driver) {
    try {
        console.log(`⏳ Processing Mother's Name...`);

        let motherField = null;
        for (let scroll = 0; scroll <= 3; scroll++) {
            try {
                motherField = await driver.$("//android.widget.EditText[contains(@hint, \"Mother's Name\")]");
                if (await motherField.isExisting() && await motherField.isDisplayed()) break;
            } catch (e) { }
            await scrollDown(driver);
        }

        await motherField.waitForDisplayed({ timeout: 5000 });
        await motherField.click();
        await motherField.clearValue();
        await motherField.setValue(REG_DATA.mothersName);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        console.log(`✅ Mother's Name set to "${REG_DATA.mothersName}".`);
        await driver.pause(1000);
    } catch (error) {
        console.error(`❌ Mother's Name failed: ${error.message}`);
        throw error;
    }
}

async function clickSubmitButton(driver) {
    try {
        console.log(`⏳ Scrolling to and clicking Submit...`);
        await scrollDownToText(driver, "Submit", 5);
        const submitBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit" and @text="Submit"]');
        await submitBtn.waitForDisplayed({ timeout: 5000 });
        await submitBtn.click();
        console.log(`✅ Submit clicked!`);
        await driver.pause(2000);
    } catch (error) {
        console.error(`❌ Submit failed: ${error.message}`);
        throw error;
    }
}
// ─── Preview Screen Functions ─────────────────────────────────────────────────

async function clickPreviewSubmitButton(driver) {
    try {
        console.log(`⏳ Waiting for the Preview Submit button...`);

        // Locate the SUBMIT button using the exact resource-id from the XML
        const submitBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnSubmitPreview"]');

        // Wait for it to be displayed
        await submitBtn.waitForDisplayed({ timeout: 5000 });

        // Click the button
        await submitBtn.click();
        console.log(`✅ Preview Submit clicked successfully!`);

        await driver.pause(2000);
    } catch (error) {
        console.error(`❌ Failed to click Preview Submit: ${error.message}`);
        throw error;
    }
}
// ─── Main Execution Flow ──────────────────────────────────────────────────────

async function formRegistration(driver) {
    console.log("🚀 Starting Family Member Registration Form...");

    await agreeToConsent(driver);
    await driver.pause(1000);

    await fillDateOfRegistration(driver);
    await driver.pause(1000);

    await fillDateOfBirth(driver);
    await driver.pause(1000);

    await fillAge(driver);
    await driver.pause(1000);

    await fillFathersName(driver);
    await driver.pause(1000);

    await fillMothersName(driver);
    await driver.pause(1000);

    await clickSubmitButton(driver);

    await clickPreviewSubmitButton(driver);

    console.log("🎉 Registration form completed successfully!");
}

module.exports = { formRegistration };