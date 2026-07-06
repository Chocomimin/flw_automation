// ─── Registration Data ────────────────────────────────────────────────────────

const REG_DATA = {
    // Leave firstName / lastName as "" to test the "skip if not filled" rule.
    // NOTE: gender / firstName / lastName / fathersName / mothersName /
    // husbandsName / wifesName below are just fallback defaults — call
    // randomizeRegData() before a run to have all of these picked randomly.
    firstName: "VIKRAM",
    lastName: "PATEL",
    dateOfRegistration: { day: 22, month: 2, year: 2026 },
    // dateOfBirth / dateOfMarriage are chosen at RUNTIME by the random
    // calendar picker (see fillDateOfBirth / fillDateOfMarriage) because the
    // calendar widget may only expose a subset of months/years/dates on a
    // given screen. They are written back onto REG_DATA once picked so
    // later steps (age calculations, etc.) can reference the actual value.
    dateOfBirth: null,
    dateOfMarriage: null,
    age: "27",
    gender: "Female",
    fathersName: "VIKRAM PATEL",
    mothersName: "NEHA PATEL",
    husbandsName: "RAHUL PATEL",   // used only when gender=Female & ever-married
    wifesName: "PRIYA PATEL",      // used only when gender=Male & ever-married
    maritalStatus: "Married",
    haveChildren: "Yes",
    mobileBelongsTo: "Family Head",
    community: "OBC",
    religion: "Christian",
    rchId: "123456789012",
    statusOfWomen: "Eligible Couple",

    // ── Child-beneficiary fields ──
    // Set beneficiaryType to 'Child' to run the Child registration flow
    // instead of the Adult (gender/marital-status driven) flow.
    beneficiaryType: "Adult",      // 'Adult' | 'Child'
    isChildRegisteredAtSchool: "No",
    birthCertificateNo: "BC-2026-000123",
    placeOfBirth: "Home"
};

// ─── Random Data Generators (gender, HOF relation, names) ─────────────────────

const MALE_FIRST_NAMES = ['Rahul', 'Amit', 'Vikram', 'Rajesh', 'Suresh', 'Arjun', 'Sanjay', 'Manoj', 'Ravi', 'Anil', 'Deepak', 'Ashok', 'Vijay', 'Sunil', 'Naveen', 'Prakash', 'Sandeep', 'Ramesh', 'Rakesh', 'Karan'];
const FEMALE_FIRST_NAMES = ['Priya', 'Neha', 'Anjali', 'Pooja', 'Sunita', 'Kavita', 'Meena', 'Sangeeta', 'Rekha', 'Anita', 'Shalini', 'Deepa', 'Geeta', 'Lata', 'Nisha', 'Swati', 'Radha', 'Kiran', 'Suman', 'Asha'];
const LAST_NAMES = ['Patel', 'Sharma', 'Verma', 'Kumar', 'Singh', 'Gupta', 'Yadav', 'Reddy', 'Nair', 'Iyer', 'Chauhan', 'Mehta', 'Joshi', 'Rao', 'Desai', 'Pillai', 'Kapoor', 'Malhotra', 'Bose', 'Das'];

// Relation-with-Head-of-Family options, keyed by the beneficiary's own
// gender (single source of truth — imported by add_family_verification.js
// instead of duplicating these lists).
//
// IMPORTANT: these lists must mirror the REAL on-screen dropdown order
// exactly, including 'Wife' / 'Husband' — the coordinate-fallback tap
// math (used when a text-based element lookup fails) computes each
// item's row position from its index in this array, so if an entry is
// removed here that still exists on the real screen, every item after it
// gets tapped one row off (this is what caused "Grand Mother" to actually
// select "Daughter"). To keep 'Wife'/'Husband' out of the *randomly
// chosen* test relation without breaking tap coordinates, they are
// filtered out separately in randomRelationOptionsForGender() below.
const RELATION_OPTIONS_FEMALE = ['Mother', 'Sister', 'Wife', 'Niece', 'Daughter', 'Grand Mother', 'Mother in Law', 'Grand Daughter', 'Daughter in Law', 'Sister in Law', 'Other'];
const RELATION_OPTIONS_MALE = ['Father', 'Brother', 'Husband', 'Nephew', 'Son', 'Grand Father', 'Father in Law', 'Grand Son', 'Son in Law', 'Other'];
const RELATION_OPTIONS_TRANSGENDER = ['Brother', 'Husband', 'Nephew', 'Son', 'Grand Father', 'Father in Law', 'Grand Son', 'Son in Law', 'Other'];

function relationOptionsForGender(gender) {
    const key = (gender || '').toLowerCase();
    if (key === 'male') return RELATION_OPTIONS_MALE;
    if (key === 'transgender' || key === 'trans') return RELATION_OPTIONS_TRANSGENDER;
    return RELATION_OPTIONS_FEMALE;
}

// Same list as above, minus 'Wife' (for Female) / 'Husband' (for Male) —
// used ONLY when picking a random relation for test data, so the full,
// real, on-screen-accurate list above stays untouched for tap coordinates.
function randomRelationOptionsForGender(gender) {
    return relationOptionsForGender(gender).filter(r => r !== 'Wife' && r !== 'Husband');
}

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomFullName(genderKey) {
    const first = genderKey === 'female' ? randomItem(FEMALE_FIRST_NAMES) : randomItem(MALE_FIRST_NAMES);
    return `${first} ${randomItem(LAST_NAMES)}`.toUpperCase();
}

// Picks a fresh random Gender + Relation-with-HOF + First/Last/Father's/
// Mother's/Husband's/Wife's name, writes them onto REG_DATA, and returns
// { gender, relation } so the caller can drive the "Add Member" dialog
// (selectGender / selectRelationWithHof) before formRegistration() takes
// over on the registration screen itself.
//
// Transgender is intentionally left out of the random pool: the
// registration form's spouse-name field (Husband's Name / Wife's Name)
// only has a defined mapping for Male/Female beneficiaries.
function randomizeRegData() {
    const gender = randomItem(['Male', 'Female']);
    const genderKey = gender.toLowerCase();
    const relation = randomItem(randomRelationOptionsForGender(gender));
    const lastName = randomItem(LAST_NAMES);

    REG_DATA.gender = gender;
    REG_DATA.relation = relation;
    REG_DATA.firstName = randomItem(genderKey === 'female' ? FEMALE_FIRST_NAMES : MALE_FIRST_NAMES);
    REG_DATA.lastName = lastName;
    REG_DATA.fathersName = randomFullName('male');
    REG_DATA.mothersName = randomFullName('female');
    REG_DATA.husbandsName = randomFullName('male');
    REG_DATA.wifesName = randomFullName('female');
    REG_DATA.dateOfBirth = null;
    REG_DATA.dateOfMarriage = null;

    console.log(`🎲 Randomized beneficiary → Gender: ${gender}, Relation to HOF: ${relation}, Name: ${REG_DATA.firstName} ${REG_DATA.lastName}`);
    return { gender, relation };
}

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

// ─── Random / Availability-Aware Calendar Picker ──────────────────────────────
// The calendar dialog is not guaranteed to expose every month/year/date —
// depending on min/max date constraints configured for a given field, only
// a subset may actually be reachable or clickable. These helpers discover
// what is genuinely available on-screen and pick randomly from that,
// instead of assuming a fixed day/month/year always exists.

function calculateAge(fromDate, toDate) {
    let age = toDate.year - fromDate.year;
    const monthDiff = toDate.month - fromDate.month;
    if (monthDiff < 0 || (monthDiff === 0 && toDate.day < fromDate.day)) {
        age--;
    }
    return age;
}

function todayAsDateObj() {
    const now = new Date();
    return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
}

// Scans the current page source for day cells and returns only the ones
// that are genuinely clickable/enabled right now, parsed into {day, month, year}.
async function getClickableDaysInView(driver) {
    const source = await driver.getPageSource();
    const nodeRegex = /<android\.view\.View[^>]*content-desc="(\d{1,2}) ([A-Za-z]+) (\d{4})"[^>]*\/?>/g;
    const days = [];
    let m;
    while ((m = nodeRegex.exec(source)) !== null) {
        const nodeStr = m[0];
        const clickable = /clickable="true"/.test(nodeStr);
        const disabled = /enabled="false"/.test(nodeStr);
        if (!clickable || disabled) continue;

        const day = parseInt(m[1]);
        const monthStr = m[2];
        const year = parseInt(m[3]);
        let month = null;
        for (let i = 1; i <= 12; i++) {
            if (monthStr === MONTH_NAMES[i] || monthStr === MONTH_ABBR[i]) { month = i; break; }
        }
        if (month) days.push({ day, month, year });
    }
    return days;
}

// Opens a calendar-backed EditText, navigates toward a random year/month
// inside [minYear, maxYear] (tolerating the calendar not being able to
// reach it, e.g. because of app-enforced min/max date bounds), then picks
// a random day from whatever is actually clickable in the view it lands
// on. Returns the {day, month, year} that was actually selected.
async function pickRandomAvailableDate(driver, dateFieldSelectorOrElement, options = {}) {
    const dateField = typeof dateFieldSelectorOrElement === 'string'
        ? await driver.$(dateFieldSelectorOrElement)
        : dateFieldSelectorOrElement;

    await dateField.waitForDisplayed({ timeout: 5000 });
    await dateField.click();
    await driver.pause(1000);

    let anchorYear = new Date().getFullYear();
    try {
        const yearHeader = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_header_year")');
        anchorYear = parseInt(await yearHeader.getText()) || anchorYear;
    } catch (e) { }

    const lo = Math.min(options.minYear ?? (anchorYear - 60), options.maxYear ?? anchorYear);
    const hi = Math.max(options.minYear ?? (anchorYear - 60), options.maxYear ?? anchorYear);

    const targetYear = lo + Math.floor(Math.random() * (hi - lo + 1));
    const targetMonth = 1 + Math.floor(Math.random() * 12);

    console.log(`🎲 Random calendar target → ${MONTH_NAMES[targetMonth]} ${targetYear} (allowed range ${lo}-${hi})`);

    // navigateToMonth already tolerates an unreachable target by swiping/
    // clicking prev/next as far as the dialog allows, then giving up —
    // afterwards we simply read whatever month actually ended up on screen.
    await navigateToMonth(driver, targetMonth, targetYear);
    await driver.pause(300);

    let landed = await getCalendarMonthYear(driver);
    if (!landed) {
        const t = todayAsDateObj();
        landed = { month: t.month, year: t.year };
    }

    let availableDays = await getClickableDaysInView(driver);
    if (availableDays.length === 0) {
        // One more nudge in case the view hadn't settled yet.
        await driver.pause(500);
        availableDays = await getClickableDaysInView(driver);
    }
    if (availableDays.length === 0) {
        throw new Error(`No selectable dates found in the calendar for ${MONTH_NAMES[landed.month]} ${landed.year}.`);
    }

    const pick = availableDays[Math.floor(Math.random() * availableDays.length)];
    const padded = String(pick.day).padStart(2, '0');

    let clicked = false;
    for (const desc of [`${padded} ${MONTH_NAMES[pick.month]} ${pick.year}`, `${pick.day} ${MONTH_NAMES[pick.month]} ${pick.year}`]) {
        try {
            const el = await driver.$(`//android.view.View[@content-desc="${desc}"]`);
            if (await el.isExisting() && await el.isDisplayed()) {
                await el.click();
                clicked = true;
                break;
            }
        } catch (e) { }
    }
    if (!clicked) {
        const el = await driver.$(`android=new UiSelector().text("${pick.day}").clickable(true)`);
        await el.waitForDisplayed({ timeout: 5000 });
        await el.click();
    }
    await driver.pause(400);

    const okBtn = await driver.$('//android.widget.Button[@resource-id="android:id/button1"]');
    await okBtn.waitForDisplayed({ timeout: 3000 });
    await okBtn.click();
    await driver.pause(500);

    console.log(`✅ Random date selected → ${pick.day}-${pick.month}-${pick.year}`);
    return pick;
}

async function fillOtherRelationToHead(driver, customRelation) {
    console.log(`⏳ Processing 'Other - Enter relation to head'...`);
    await scrollDownToText(driver, "Other - Enter relation to head");

    const field = await driver.$('//android.widget.EditText[contains(@hint, "Other - Enter relation to head")]');

    try {
        await field.waitForDisplayed({ timeout: 5000 });
        await field.click();
        try { await field.clearValue(); } catch (e) { }

        await field.setValue(customRelation.toUpperCase());
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();

        await driver.pause(300);
        console.log(`✅ 'Other - Enter relation to head' → "${customRelation.toUpperCase()}"`);
    } catch (e) {
        console.log(`⚠️ 'Other - Enter relation to head' field not found, skipping.`);
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

// Step 5 & 6: Verify Consent Popup is displayed, then Agree and proceed.
async function agreeToConsent(driver) {
    console.log(`⏳ Waiting for 'Consent Form' popup...`);
    try {
        const checkBox = await driver.$('//android.widget.CheckBox[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/checkBox"]');
        await checkBox.waitForDisplayed({ timeout: 10000 });
        console.log(`✅ Consent Popup is displayed.`);
        await checkBox.click();

        const agreeButton = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_positive" and @text="AGREE"]');
        await agreeButton.waitForDisplayed({ timeout: 5000 });
        await agreeButton.click();
        console.log(`✅ Selected Agree and proceeded.`);
        await driver.pause(1000);
    } catch (error) {
        console.log(`⚠️ Consent Popup was not displayed (may already be accepted for this device): ${error.message}`);
    }
}

// Local copy of the text-field filler (also exists in addMember.js) so this
// module can fill First Name / Last Name without a circular require.
async function fillFieldByPlaceholder(driver, placeholder, value) {
    if (!value && value !== 0) return;
    await scrollDownToText(driver, placeholder);
    const field = await driver.$(`android=new UiSelector().className("android.widget.EditText").textContains("${placeholder}")`);
    await field.waitForDisplayed({ timeout: 10000 });
    await field.click();
    try { await field.clearValue(); } catch (e) {}
    await field.setValue(value);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    await driver.pause(300);
    console.log(`✅ "${placeholder}" → "${value}"`);
}

// Step 4: Verify gender-specific fields are displayed accordingly.
// "Do you have children?" and "Status Of Women" only appear for a
// Female beneficiary who has ever been married.
async function verifyGenderSpecificField(driver, fieldLabel, shouldBeVisible) {
    console.log(`⏳ Verifying gender-specific field "${fieldLabel}" (expected visible: ${shouldBeVisible})...`);
    await scrollDownToText(driver, fieldLabel, 4);

    let isVisible = false;
    try {
        const el = await driver.$(`//*[contains(@text,"${fieldLabel}") or contains(@hint,"${fieldLabel}") or contains(@content-desc,"${fieldLabel}")]`);
        isVisible = (await el.isExisting()) && (await el.isDisplayed());
    } catch (e) {}

    if (isVisible === shouldBeVisible) {
        console.log(`✅ Verified: "${fieldLabel}" visibility is correct for this gender/marital status.`);
    } else {
        console.log(`❌ MISMATCH: "${fieldLabel}" visible=${isVisible}, expected=${shouldBeVisible}.`);
    }
    return isVisible === shouldBeVisible;
}

// Step 9: Verify mandatory field validations by attempting to submit
// the form before any of the required fields have been filled in.
async function verifyMandatoryFieldValidation(driver) {
    console.log(`⏳ Verifying mandatory field validation (submitting form with empty required fields)...`);
    try {
        const submitBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]');
        await submitBtn.waitForDisplayed({ timeout: 5000 });
        await submitBtn.click();
        await driver.pause(1500);

        // If validation is working, the app should NOT progress to the
        // preview/submit screen, and/or should show inline field errors.
        let reachedPreview = false;
        try {
            const previewBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnSubmitPreview"]');
            reachedPreview = await previewBtn.isExisting();
        } catch (e) {}

        let hasFieldError = false;
        try {
            const errorEl = await driver.$('//*[contains(@text,"required") or contains(@text,"Required") or contains(@text,"mandatory")]');
            hasFieldError = await errorEl.isExisting();
        } catch (e) {}

        if (!reachedPreview) {
            console.log(`✅ Validation PASSED: form did not submit with empty mandatory fields${hasFieldError ? ' (inline error shown).' : '.'}`);
        } else {
            console.log(`❌ Validation FAILED: form proceeded to preview despite empty mandatory fields.`);
        }
    } catch (e) {
        console.log(`⚠️ Could not complete mandatory field validation check: ${e.message}`);
    }
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
    console.log(`⏳ Processing Date of Birth (random, availability-aware selection)...`);
    const dobSelector = '//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/et_date" or contains(@hint, "Date of Birth")]';
    const picked = await pickRandomAvailableDate(driver, dobSelector, {
        minYear: new Date().getFullYear() - 80,
        maxYear: new Date().getFullYear()
    });
    REG_DATA.dateOfBirth = picked;
    await driver.pause(1000);
    return picked;
}

async function fillAgeAtMarriage(driver, dob, marriageDate) {
    console.log(`⏳ Processing Age at the time of marriage...`);
    await scrollDownToText(driver, "Age at the time of marriage");
    const field = await driver.$('//android.widget.EditText[contains(@hint, "Age at the time of marriage")]');
    await field.waitForDisplayed({ timeout: 5000 });

    let isEnabled = true;
    try { isEnabled = await field.isEnabled(); } catch (e) { }
    if (!isEnabled) {
        console.log(`✅ "Age at the time of marriage" is auto-calculated by the app. Skipping.`);
        return;
    }

    let age;
    if (marriageDate) {
        age = calculateAge(dob, marriageDate);
    } else {
        // 1. Generate a valid age FIRST to unlock the Date of Marriage field
        const currentAge = dob ? calculateAge(dob, todayAsDateObj()) : 25;
        const minAge = 18;
        // 2. Cap the max age at 49 based on the app's internal validation rule
        const maxAge = Math.min(49, currentAge);

        if (currentAge < minAge) {
            age = currentAge;
        } else {
            age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
        }
    }

    await field.click();
    try { await field.clearValue(); } catch (e) { }
    await field.setValue(String(age));
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();

    // Give the UI time to reveal or auto-calculate the Date of Marriage field
    await driver.pause(1000);
    console.log(`✅ Age at the time of marriage → ${age}`);
}

async function fillDateOfMarriage(driver, dob) {
    console.log(`⏳ Processing Date of Marriage...`);

    await scrollDownToText(driver, "Date of Marriage");
    const dateSelector = '//android.widget.EditText[contains(@hint, "Date of Marriage")]';
    const dateField = await driver.$(dateSelector);

    await dateField.waitForDisplayed({ timeout: 5000 });

    let isEnabled = true;
    try { isEnabled = await dateField.isEnabled(); } catch (e) {}

    let currentText = '';
    try { currentText = await dateField.getText(); } catch(e) {}

    // If filling the age automatically populated the date (and/or disabled it), skip the calendar
    if (!isEnabled || (currentText && currentText.includes('-') && !currentText.includes('Date'))) {
        console.log(`✅ Date of Marriage is already populated/auto-calculated: ${currentText}`);
        return null;
    }

    // Otherwise, pick a date from the calendar
    const MIN_MARRIAGE_AGE = 18;
    const nowYear = new Date().getFullYear();
    const minYear = Math.min(dob.year + MIN_MARRIAGE_AGE, nowYear);

    const picked = await pickRandomAvailableDate(driver, dateSelector, {
        minYear,
        maxYear: nowYear
    });

    REG_DATA.dateOfMarriage = picked;
    await driver.pause(1000);
    return picked;
}

async function fillTextFieldIfEmpty(driver, hintSubstring, value, fieldLabel = hintSubstring) {
    console.log(`⏳ Checking ${fieldLabel} field...`);
    await scrollDownToText(driver, hintSubstring);

    const field = await driver.$(`android=new UiSelector().className("android.widget.EditText").textContains("${hintSubstring}")`);

    // 1. Try to wait for the element. If it times out, it's likely already filled with a real name.
    try {
        await field.waitForDisplayed({ timeout: 5000 });
    } catch (error) {
        console.log(`✅ ${fieldLabel} not found by placeholder text (likely already filled). Moving to next field.`);
        return; // Skip and move to the next field
    }

    let currentText = '';
    let hintAttr = '';
    try { currentText = (await field.getText()) || ''; } catch (e) { }
    try { hintAttr = (await field.getAttribute('hint')) || ''; } catch (e) { }

    const normalized = currentText.trim().toLowerCase();
    const normalizedHint = hintAttr.trim().toLowerCase();

    const isPlaceholderOnly = normalizedHint && normalized === normalizedHint;
    const isEmpty = !normalized || isPlaceholderOnly;

    if (!isEmpty) {
        console.log(`✅ ${fieldLabel} already filled ("${currentText}"). Skipping.`);
        return;
    }
    if (!value) return;

    await field.click();
    try { await field.clearValue(); } catch (e) { }
    await field.setValue(value);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    await driver.pause(300);
    console.log(`✅ ${fieldLabel} → "${value}"`);
}

async function fillHusbandNameIfEmpty(driver, value) {
    return fillTextFieldIfEmpty(driver, "Husband's Name", value, "Husband's Name");
}

async function fillWifeNameIfEmpty(driver, value) {
    return fillTextFieldIfEmpty(driver, "Wife's Name", value, "Wife's Name");
}

// Rule: for a Child beneficiary, First Name / Last Name are only typed in
// if the field is not already populated (some records may already carry
// a name); if it's already filled, leave it as-is.
async function fillFirstNameIfEmpty(driver, value) {
    return fillTextFieldIfEmpty(driver, "First Name", value, "First Name");
}

async function fillLastNameIfEmpty(driver, value) {
    return fillTextFieldIfEmpty(driver, "Last Name", value, "Last Name");
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

// ─── CHILD-BENEFICIARY FIELD FILLERS ───────────────────────────────────────────

// Rule: "Is the Child registered at School" is only filled if the field is
// actually present on this screen (it may not be, e.g. below a certain age).
async function fillIsChildRegisteredAtSchool(driver, option) {
    console.log(`⏳ Checking "Is the Child registered at School" field...`);
    try {
        await scrollDownToText(driver, "Is the Child registered at School", 3);
        const spinner = await driver.$('android=new UiSelector().className("android.widget.Spinner").description("Is the Child registered at School")');
        const present = await spinner.isExisting();
        if (!present) {
            console.log(`⚠️ "Is the Child registered at School" field not present on screen. Skipping.`);
            return;
        }
        const spinnerSelector = 'android=new UiSelector().className("android.widget.Spinner").description("Is the Child registered at School")';
        await clickSpinnerAndSelectOption(driver, spinnerSelector, option, ['Yes', 'No']);
    } catch (e) {
        console.log(`⚠️ "Is the Child registered at School" field not present on screen. Skipping.`);
    }
}

async function fillBirthCertificateNo(driver, value) {
    console.log(`⏳ Processing Birth Certificate No....`);
    if (!value) return;
    await scrollDownToText(driver, "Birth Certificate No.", 2);
    const field = await driver.$('//android.widget.EditText[contains(@hint, "Birth Certificate No.")]');
    try {
        await field.waitForDisplayed({ timeout: 4000 });
        await field.click();
        try { await field.clearValue(); } catch (e) { }
        await field.setValue(value);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        await driver.pause(300);
        console.log(`✅ Birth Certificate No. → "${value}"`);
    } catch (e) {
        console.log(`⚠️ Birth Certificate No. field not present on screen. Skipping.`);
    }
}

const PLACE_OF_BIRTH_OPTIONS = ['Home', 'Sub-Centre', 'PHC', 'CHC', 'Sub-District Hospital', 'District Hospital', 'Medical College Hospital', 'In Transit', 'Private Hospital', 'Accredited Private Hospital', 'Other'];

async function fillPlaceOfBirth(driver, place) {
    console.log(`⏳ Processing Place of birth...`);
    await scrollDownToText(driver, "Place of birth", 3);
    const spinnerSelector = 'android=new UiSelector().className("android.widget.Spinner").description("Place of birth")';
    await clickSpinnerAndSelectOption(driver, spinnerSelector, place, PLACE_OF_BIRTH_OPTIONS);
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

async function formRegistration(driver) {
    console.log("🚀 Starting Family Member Registration Form...");

    // Step 5 & 6: Consent popup verification + Agree
    await agreeToConsent(driver);
    await driver.pause(1000);

    // Step 9: Verify mandatory field validations BEFORE any field is filled
    await verifyMandatoryFieldValidation(driver);

    // Step 8: Fill all mandatory fields with valid details.
    const isChild = REG_DATA.beneficiaryType === 'Child';

    // Rule: First Name / Last Name are only typed in if not already filled
    // on screen — if the field already carries a value, leave it as-is and
    // move on to the next field. Applies to both Adult and Child beneficiaries.
    await fillFirstNameIfEmpty(driver, REG_DATA.firstName);
    await fillLastNameIfEmpty(driver, REG_DATA.lastName);

    await fillDateOfRegistration(driver);

    const isFemale = REG_DATA.gender && REG_DATA.gender.toLowerCase() === 'female';
    const isMale = REG_DATA.gender && REG_DATA.gender.toLowerCase() === 'male';
    let dob = null;
    let isEverMarried = false;

    if (isChild) {
        // Rule: a Child (under-15) beneficiary's screen has no DOB / Marital
        // Status — instead it shows an "Age *" field (e.g. "3 Months, 21
        // Days"), followed by parentage details. This applies regardless of
        // gender, so a female under-15 beneficiary never sees Marital Status.
        await fillAge(driver);
        await fillFathersName(driver);
        await fillMothersName(driver);
    } else if (isFemale || isMale) {
        // Rule: Date of Birth, Marital Status, Father's Name and Mother's
        // Name are collected for Male or Female (Adult) beneficiaries.

        dob = await fillDateOfBirth(driver);

        // 1. Conditionally fill Marital Status based on the HOF Relation
        if (REG_DATA.maritalStatus && REG_DATA.relation !== 'Other') {
            await fillMaritalStatus(driver, REG_DATA.maritalStatus);
        } else if (REG_DATA.relation === 'Other') {
            console.log(`✅ Skipping Marital Status (Relation to HOF is 'Other').`);
        }

        await fillFathersName(driver);
        await fillMothersName(driver);

        // 2. Only consider them ever-married if the relation isn't 'Other' AND they have a married status
        isEverMarried = REG_DATA.relation !== 'Other' && ['Married', 'Divorced', 'Separated', 'Widow'].includes(REG_DATA.maritalStatus);

        if (isEverMarried) {
            // Rule: Husband's/Wife's Name is only filled if it isn't already populated
            if (isFemale) await fillHusbandNameIfEmpty(driver, REG_DATA.husbandsName);
            if (isMale) await fillWifeNameIfEmpty(driver, REG_DATA.wifesName);

            await fillAgeAtMarriage(driver, dob, null);
            const marriageDate = await fillDateOfMarriage(driver, dob);
            await fillAgeAtMarriage(driver, dob, marriageDate);
        }
    } else {
        console.log(`✅ Skipping Date of Birth / Marital Status / Father's & Mother's Name (gender is neither Male nor Female).`);
    }

    // --- NEW CONDITIONAL RELATION BLOCK ---
    // Rule: If relation to head of family is "Other", fill the conditionally displayed field.
    if (REG_DATA.relation === 'Other') {
        // Passing the placeholder text to enter when "Other" is selected
        await fillOtherRelationToHead(driver, "COUSIN");
    }
    // --------------------------------------

    if (!isChild) {
        // Step 4: Verify "Do you have children?" gender-specific field
        await verifyGenderSpecificField(driver, "Do you have children?", isFemale && isEverMarried);

        // Conditional: "Do you have children?"
        if (isFemale && isEverMarried) {
            if (REG_DATA.haveChildren) await fillHaveChildren(driver, REG_DATA.haveChildren);
        }
    }

    // Standard dropdowns (common to Adult and Child)
    if (REG_DATA.mobileBelongsTo) await fillMobileNumberBelongsTo(driver, REG_DATA.mobileBelongsTo);
    if (REG_DATA.community) await fillCommunity(driver, REG_DATA.community);
    if (REG_DATA.religion) await fillReligion(driver, REG_DATA.religion);

    // RCH ID -> only filled if the field is actually present on screen.
    if (REG_DATA.rchId) {
        await fillRchId(driver, REG_DATA.rchId);
    }

    if (isChild) {
        // Rule: "Is the Child registered at School" -> only if present;
        // then Birth Certificate No. and Place of birth.
        await fillIsChildRegisteredAtSchool(driver, REG_DATA.isChildRegisteredAtSchool);
        await fillBirthCertificateNo(driver, REG_DATA.birthCertificateNo);
        await fillPlaceOfBirth(driver, REG_DATA.placeOfBirth);
    } else {
        // Rule: Status Of Women only applies to an ever-married female whose
        // current age falls within the 15–49 reproductive-age bracket; skip if
        // she is Unmarried, or her current age is below 15 or above 49.
        const currentAge = dob ? calculateAge(dob, todayAsDateObj()) : null;
        const skipStatusOfWomen =
            !isFemale ||
            REG_DATA.maritalStatus === 'Unmarried' ||
            currentAge === null ||
            currentAge < 15 ||
            currentAge > 49;

        // Step 4 (continued): Verify "Status Of Women" gender-specific field
        await verifyGenderSpecificField(driver, "Status Of Women", !skipStatusOfWomen);

        // Conditional: "Status of Women"
        if (!skipStatusOfWomen) {
            if (REG_DATA.statusOfWomen) await fillStatusOfWomen(driver, REG_DATA.statusOfWomen);
        } else {
            console.log(`✅ Skipping Status of Women (not Female, Unmarried, or age ${currentAge} outside the 15–49 range).`);
        }
    }

    // Step 10: Submit the form successfully
    await clickSubmitButton(driver);
    await clickPreviewSubmitButton(driver);

    console.log("🎉 Registration form completed successfully!");
}

module.exports = {
    formRegistration,
    REG_DATA,
    randomizeRegData,
    relationOptionsForGender,
    randomRelationOptionsForGender,
    RELATION_OPTIONS_FEMALE,
    RELATION_OPTIONS_MALE,
    RELATION_OPTIONS_TRANSGENDER,
    fillIsChildRegisteredAtSchool,
    fillBirthCertificateNo,
    fillPlaceOfBirth,
    PLACE_OF_BIRTH_OPTIONS
};