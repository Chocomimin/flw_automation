const FORM_DATA = {
    householdName: 'AJOY MAJHI',
    memberName: 'AJOY MAJHI',
    screeningDate: { day: 15, month: 3, year: 2026 },
    beneficiaryStatus: 'Screening',
    deathDetails: {
        date: { day: 10, month: 3, year: 2026 },
        place: 'Facility',
        reason: 'Fever'
    },
    symptoms: {
        feverOverTwoWeeks: 'Yes',
        fluLikeIllness: 'Yes',
        shakingChills: 'Yes',
        headache: 'No',
        muscleAches: 'Yes',
        tiredness: 'No',
        nausea: 'Yes',
        vomiting: 'No',
        diarrhea: 'No'
    },
    testType: 'Both',
    rdtResult: 'Positive',
    rdtDate: { day: 15, month: 3, year: 2026 },
    slideTestValue: 'Pf',
    slideResultValue: 'Positive',
    slideDate: { day: 15, month: 3, year: 2026 }
};

const { remote } = require('webdriverio');

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true,
    'appium:unicodeKeyboard': true,
    'appium:resetKeyboard': true
};

const wdioOptions = {
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities: capabilities
};

// ─────────────────────────────────────────────
// NEW: Robust Dropdown Core Helpers
// ─────────────────────────────────────────────

async function scrollSpinnerToMiddle(driver, spinnerSelector) {
    try {
        const spinner = await driver.$(spinnerSelector);
        const loc = await spinner.getLocation();
        const screen = await driver.getWindowRect();
        const midY = screen.height / 2;

        if (loc.y > midY + 100) {
            console.log(`⬆️  Spinner at y=${loc.y}, scrolling toward middle...`);

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
    console.log(`📍 Spinner @ (${loc.x}, ${loc.y}), size (${size.width}x${size.height})`);

    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);

    console.log(`📍 Tapping dropdown arrow at (${tapX}, ${tapY})`);
    await tapByCoords(driver, tapX, tapY);
    await driver.pause(2000);

    // STRATEGY 0: Direct XPath
    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`✅ Selected "${value}" via XPath`);
        return;
    } catch (e) {
        console.log(`⚠️  XPath strategy failed: ${e.message}`);
    }

    // STRATEGY 1: UiSelector
    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via UiSelector`);
        return;
    } catch (e) {
        console.log(`⚠️  UiSelector strategy failed: ${e.message}`);
    }

    // STRATEGY 2: Tag-by-tag XML parse
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
                const tapX = Math.floor((parseInt(boundsMatch[1]) + parseInt(boundsMatch[3])) / 2);
                const tapY = Math.floor((parseInt(boundsMatch[2]) + parseInt(boundsMatch[4])) / 2);
                console.log(`📍 Found "${value}" in XML (tag parse) → tap(${tapX},${tapY})`);
                await tapByCoords(driver, tapX, tapY);
                console.log(`✅ Selected "${value}" via tag parse`);
                return;
            }
        }
        console.log(`⚠️  "${value}" not found via tag parse, trying regex strategy...`);
    } catch (e) {
        console.log(`⚠️  Tag parse failed: ${e.message}`);
    }

    // STRATEGY 3: Inline regex bounds
    try {
        const source = await driver.getPageSource();
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`text="${escapedValue}"[^/]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
        const match = source.match(regex);

        if (match) {
            const tapX = Math.floor((parseInt(match[1]) + parseInt(match[3])) / 2);
            const tapY = Math.floor((parseInt(match[2]) + parseInt(match[4])) / 2);
            console.log(`📍 Found "${value}" via regex → tap(${tapX},${tapY})`);
            await tapByCoords(driver, tapX, tapY);
            console.log(`✅ Selected "${value}" via regex`);
            return;
        }
        console.log(`⚠️  "${value}" not found via regex, trying coordinate fallback...`);
    } catch (e) {
        console.log(`⚠️  Regex strategy failed: ${e.message}`);
    }

    // STRATEGY 4: Coordinate fallback
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


// ─────────────────────────────────────────────
// Helpers: Navigation & Searching
// ─────────────────────────────────────────────
async function clickGridItemByText(driver, text) {
    console.log(`Looking for Grid Icon with text: '${text}'...`);
    const xpath = `//android.widget.TextView[@text='${text}' and @resource-id='org.piramalswasthya.sakhi.saksham.uat:id/textView2']/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_icon']`;
    const element = await driver.$(xpath);
    await element.waitForDisplayed({ timeout: 10000 });
    await element.click();
    console.log(`✔ Clicked Grid Icon with text: '${text}'`);
}

async function searchAndOpenHouseholdMembers(driver, householdName) {
    console.log(`\n--- Searching and Opening Members for: '${householdName}' ---`);

    console.log(`Typing '${householdName}' into search bar...`);
    const searchBox = await driver.$("//android.widget.EditText[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/searchView']");
    await searchBox.waitForDisplayed({ timeout: 10000 });
    await searchBox.click();
    await driver.pause(500);

    await searchBox.clearValue();
    await driver.pause(300);

    await searchBox.addValue(householdName);
    await driver.pause(500);

    await driver.pressKeyCode(66);
    await driver.pause(800);

    try { await driver.hideKeyboard(); } catch (e) {}
    await driver.pause(2000);

    console.log(`Locating Members button for: ${householdName}...`);
    const membersBtnXPath =
        `//android.widget.TextView[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id' and @text='${householdName}']` +
        `/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/parentCard']` +
        `//android.widget.Button[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/button3']`;
    const membersBtn = await driver.$(membersBtnXPath);
    await membersBtn.waitForDisplayed({ timeout: 10000 });
    await membersBtn.click();
    console.log(`✔ Clicked Members button for '${householdName}'`);
    await driver.pause(2000);
}

async function clickScreeningForMember(driver, memberName) {
    console.log(`\nScrolling to find member: '${memberName}'...`);

    const androidScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${memberName}")`;
    try {
        await driver.$(`android=${androidScrollSelector}`).waitForDisplayed({ timeout: 10000 });
        console.log(`✔ Scrolled to member: '${memberName}'`);
    } catch (e) {
        console.log('Scroll approach failed or element is already visible.');
    }

    await driver.pause(1000);

    const screeningBtnXPath =
        `//android.widget.TextView[contains(@text, '${memberName}')]` +
        `/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_content']` +
        `//android.widget.Button[@text='SCREENING']`;

    const screeningBtn = await driver.$(screeningBtnXPath);

    try {
        await screeningBtn.waitForDisplayed({ timeout: 5000 });
        await screeningBtn.click();
        console.log(`✔ Clicked SCREENING for '${memberName}'`);
    } catch (e) {
        console.log(`✖ Failed to click SCREENING via XPath. Ensure the name is perfectly matched.`);
    }
}

// ─────────────────────────────────────────────
// Helpers: Calendar & Date Picking
// ─────────────────────────────────────────────
async function navigateToMonthYear(driver, targetMonth, targetYear) {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    for (let attempts = 0; attempts < 48; attempts++) {
        const firstDay = await driver.$("//android.view.View[@resource-id='android:id/month_view']/android.view.View[1]");
        const contentDesc = await firstDay.getAttribute('content-desc');
        const parts = contentDesc.split(' ');

        const currentMonth = monthNames.indexOf(parts[1]) + 1;
        const currentYear = parseInt(parts[2]);

        if (currentMonth === targetMonth && currentYear === targetYear) {
            break;
        }

        const targetTotal = targetYear * 12 + targetMonth;
        const currentTotal = currentYear * 12 + currentMonth;

        if (targetTotal < currentTotal) {
            const prevBtn = await driver.$("//android.widget.ImageButton[@resource-id='android:id/prev']");
            await prevBtn.waitForDisplayed({ timeout: 3000 });
            await prevBtn.click();
        } else {
            const nextBtn = await driver.$("//android.widget.ImageButton[@content-desc='Next month']");
            await nextBtn.waitForDisplayed({ timeout: 3000 });
            await nextBtn.click();
        }
        await driver.pause(400);
    }
}

async function fillMalariaScreeningDate(driver, day, month, year) {
    console.log(`\nSetting Malaria Screening Date → ${day}/${month}/${year}`);

    const dateField = await driver.$("//android.widget.EditText[@hint='Maleria Screening Date *']");
    await dateField.waitForDisplayed({ timeout: 10000 });
    await dateField.click();
    await driver.pause(1000);

    await navigateToMonthYear(driver, month, year);
    await driver.pause(300);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const dayPadded = String(day).padStart(2, '0');
    const monthName = monthNames[month - 1];
    const contentDesc = `${dayPadded} ${monthName} ${year}`;

    const dayElement = await driver.$(`//android.view.View[@content-desc='${contentDesc}']`);
    await dayElement.waitForDisplayed({ timeout: 5000 });
    await dayElement.click();
    await driver.pause(500);

    const okButton = await driver.$("//android.widget.Button[@resource-id='android:id/button1']");
    await okButton.waitForDisplayed({ timeout: 5000 });
    await okButton.click();
    await driver.pause(500);
}

async function fillDateOfTest(driver, day, month, year, contextText = null) {
    console.log(`\nSetting Date of Test ${contextText ? `for '${contextText}'` : ''} → ${day}/${month}/${year}`);

    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollForward()`);
        await driver.pause(1000);
    } catch (e) {}

    let dateField;

    if (contextText) {
        const strictXPath = `//android.widget.TextView[contains(@text, '${contextText}')]/ancestor::android.widget.LinearLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cl_ri']/following-sibling::android.view.ViewGroup[1]//android.widget.EditText[@hint='Date of Test *']`;
        dateField = await driver.$(strictXPath);
    }

    if (!dateField || !(await dateField.isExisting())) {
        console.log("ℹ Utilizing fallback target (Last field on screen).");
        const allDateFields = await driver.$$("//android.widget.EditText[@hint='Date of Test *']");

        if (allDateFields.length > 0) {
            dateField = allDateFields[allDateFields.length - 1];
        } else {
            throw new Error("Date of Test field not found on screen.");
        }
    }

    await dateField.waitForDisplayed({ timeout: 10000 });
    await dateField.click();
    await driver.pause(1000);

    await navigateToMonthYear(driver, month, year);
    await driver.pause(300);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const dayPadded = String(day).padStart(2, '0');
    const monthName = monthNames[month - 1];
    const contentDesc = `${dayPadded} ${monthName} ${year}`;

    const dayElement = await driver.$(`//android.view.View[@content-desc='${contentDesc}']`);
    await dayElement.waitForDisplayed({ timeout: 5000 });
    await dayElement.click();
    await driver.pause(500);

    const okButton = await driver.$("//android.widget.Button[@resource-id='android:id/button1']");
    await okButton.waitForDisplayed({ timeout: 5000 });
    await okButton.click();
    await driver.pause(500);
}

async function fillDateOfDeath(driver, day, month, year) {
    console.log(`\nSetting Date of Death → ${day}/${month}/${year}`);

    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollForward()`);
        await driver.pause(1000);
    } catch (e) {}

    const dateField = await driver.$("//android.widget.EditText[contains(@hint, 'Date of death')]");

    await dateField.waitForDisplayed({ timeout: 10000 });
    await dateField.click();
    await driver.pause(1000);

    await navigateToMonthYear(driver, month, year);
    await driver.pause(300);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const dayPadded = String(day).padStart(2, '0');
    const monthName = monthNames[month - 1];
    const contentDesc = `${dayPadded} ${monthName} ${year}`;

    const dayElement = await driver.$(`//android.view.View[@content-desc='${contentDesc}']`);
    await dayElement.waitForDisplayed({ timeout: 5000 });
    await dayElement.click();
    await driver.pause(500);

    const okButton = await driver.$("//android.widget.Button[@resource-id='android:id/button1']");
    await okButton.waitForDisplayed({ timeout: 5000 });
    await okButton.click();
    await driver.pause(500);
}


// ─────────────────────────────────────────────
// ✨ UPDATED: Beneficiary Status & Death Details
// ─────────────────────────────────────────────
async function selectBeneficiaryStatus(driver, option) {
    console.log(`\nSelecting Beneficiary Status: '${option}' from dropdown...`);

    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown"))`);
        await driver.pause(500);
    } catch (e) {}

    // Grab the first dropdown on the screen since Beneficiary Status is at the top
    const spinnerXPath = `(//android.widget.Spinner[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown'])[1]`;

    // Provide a fallback option array for standard statuses just in case
    await clickSpinnerAndSelectOption(driver, spinnerXPath, option, ['Alive', 'Death', 'Migrated']);
}

async function fillDeathDetail(driver, fieldName, option) {
    console.log(`Setting '${fieldName}' to '${option}'...`);

    // Scroll to field
    try {
        const scrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${fieldName}")`;
        await driver.$(`android=${scrollSelector}`).waitForDisplayed({ timeout: 2000 });
    } catch (e) {}

    // Strategy 1: Radio Button
    const rbXPath = `//android.widget.TextView[contains(@text, '${fieldName}')]/ancestor::android.widget.LinearLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cl_ri']//android.widget.RadioButton[@text='${option}']`;
    const rbElement = await driver.$(rbXPath);
    if (await rbElement.isExisting()) {
        await rbElement.click();
        console.log(`✔ Set '${fieldName}' -> '${option}' (Radio Button)`);
        await driver.pause(500);
        return;
    }

    // Strategy 2: ✨ Use the robust dropdown helper for Spinners
    const spinnerXPath = `//android.widget.Spinner[contains(@text, '${fieldName}')]`;
    const spinnerElement = await driver.$(spinnerXPath);
    if (await spinnerElement.isExisting()) {

        // Define coordinate fallbacks accurately from your XML dumps
        let optionsList = [];
        if (fieldName.includes('Place of Death')) optionsList = ['Home', 'Facility', 'Other'];
        if (fieldName.includes('Reason for Death')) optionsList = ['Fever', 'other Disease', 'Other'];

        await clickSpinnerAndSelectOption(driver, spinnerXPath, option, optionsList);
        console.log(`✔ Set '${fieldName}' -> '${option}' (Dropdown)`);
        return;
    }

    // Strategy 3: Standard Text Input
    const inputXPath = `//android.widget.EditText[contains(@hint, '${fieldName}')]`;
    const inputElement = await driver.$(inputXPath);
    if (await inputElement.isExisting()) {
        await inputElement.setValue(option);
        console.log(`✔ Set '${fieldName}' -> '${option}' (Text Input)`);
        await driver.pause(500);
        return;
    }

    console.log(`✖ Could not find interactive element for '${fieldName}'.`);
}


// ─────────────────────────────────────────────
// Helper: Select Yes/No/Options for a specific field
// ─────────────────────────────────────────────
async function selectSymptom(driver, symptomName, answer, timeoutMs = 5000) {
    console.log(`Setting '${symptomName}' to '${answer}'...`);

    try {
        const androidScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${symptomName}")`;
        await driver.$(`android=${androidScrollSelector}`).waitForDisplayed({ timeout: 2000 });
    } catch (e) { }

    const rbXPath = `//android.widget.TextView[@text='${symptomName}']/ancestor::android.widget.LinearLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cl_ri']//android.widget.RadioButton[@text='${answer}']`;
    const rbElement = await driver.$(rbXPath);

    await rbElement.waitForDisplayed({ timeout: timeoutMs });
    await rbElement.click();

    console.log(`✔ Set '${symptomName}' -> '${answer}'`);
    await driver.pause(500);
}

// ─────────────────────────────────────────────
// Main flow: Malaria Navigation -> Search -> Form
// ─────────────────────────────────────────────
async function main() {
    console.log('═══════════════════════════════════════════');
    console.log(' Initializing Appium — Malaria Form Flow');
    console.log('═══════════════════════════════════════════');

    let driver;

    try {
        driver = await remote(wdioOptions);
        console.log('✔ Appium session started\n');

        // 1. Navigate to Disease Control -> Malaria -> Malaria
        await clickGridItemByText(driver, 'Disease Control');
        await driver.pause(1500);
        await clickGridItemByText(driver, 'Malaria');
        await driver.pause(1500);
        await clickGridItemByText(driver, 'Malaria');
        await driver.pause(2000);

        // 2. Search and open member
        await searchAndOpenHouseholdMembers(driver, FORM_DATA.householdName);

        // 3. Scroll to member and start screening
        await clickScreeningForMember(driver, FORM_DATA.memberName);
        await driver.pause(2000);

        // 4. Fill in the Screening Date
        await fillMalariaScreeningDate(driver, FORM_DATA.screeningDate.day, FORM_DATA.screeningDate.month, FORM_DATA.screeningDate.year);

        // 5. Select Beneficiary Status
        const beneficiaryStatus = FORM_DATA.beneficiaryStatus;
        await selectBeneficiaryStatus(driver, beneficiaryStatus);

        // 5.1 Dynamic check for Death Flow
        if (beneficiaryStatus.toLowerCase() === 'death') {
            console.log('\n--- Filling Death Details ---');

            await fillDateOfDeath(driver, FORM_DATA.deathDetails.date.day, FORM_DATA.deathDetails.date.month, FORM_DATA.deathDetails.date.year);
            await fillDeathDetail(driver, 'Place of Death', FORM_DATA.deathDetails.place);
            await fillDeathDetail(driver, 'Reason for Death', FORM_DATA.deathDetails.reason);
        }

        // 6. Fill out Symptoms
        console.log('\n--- Filling out Symptoms ---');
        await selectSymptom(driver, 'Fever for > 2 weeks', FORM_DATA.symptoms.feverOverTwoWeeks);
        await selectSymptom(driver, 'Flu-like illness', FORM_DATA.symptoms.fluLikeIllness);
        await selectSymptom(driver, 'Shaking chills', FORM_DATA.symptoms.shakingChills);
        await selectSymptom(driver, 'Headache', FORM_DATA.symptoms.headache);
        await selectSymptom(driver, 'Muscle aches', FORM_DATA.symptoms.muscleAches);
        await selectSymptom(driver, 'Tiredness', FORM_DATA.symptoms.tiredness);
        await selectSymptom(driver, 'Nausea', FORM_DATA.symptoms.nausea);
        await selectSymptom(driver, 'Vomiting', FORM_DATA.symptoms.vomiting);
        await selectSymptom(driver, 'Diarrhea', FORM_DATA.symptoms.diarrhea);

        // 7. Dynamic Check for 'Malaria Test Type'
        console.log('\n--- Checking for Dynamic Test Fields ---');

        try {
            const submitScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"))`;
            await driver.$(`android=${submitScrollSelector}`).waitForDisplayed({ timeout: 5000 });
        } catch (e) { }

        const desiredTestType = FORM_DATA.testType;
        let selectedTestType = null;

        try {
            const testTypeXPath = `//android.widget.TextView[@text='Malaria Test Type']/ancestor::android.widget.LinearLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cl_ri']//android.widget.RadioButton[@text='${desiredTestType}']`;
            const testTypeBtn = await driver.$(testTypeXPath);

            if (await testTypeBtn.isExisting()) {
                console.log(`✔ 'Malaria Test Type' found! Selecting '${desiredTestType}'...`);
                await testTypeBtn.click();
                selectedTestType = desiredTestType;

                await driver.pause(1000);

                try {
                    await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollForward()`);
                    await driver.pause(1000);
                } catch (scrollErr) { }

            } else {
                console.log("ℹ 'Malaria Test Type' not found. Skipping.");
            }
        } catch (error) {
            console.log("ℹ 'Malaria Test Type' not found. Skipping.");
        }

        // 8. Handle the Conditional Logic based on Test Type
        if (selectedTestType) {

            if (selectedTestType === 'RDT' || selectedTestType === 'Both') {
                try {
                    console.log(`\n✔ Filling RDT flow...`);
                    const rdtResult = FORM_DATA.rdtResult;

                    await selectSymptom(driver, 'Rapid Diagnostic Test (RDT)', rdtResult, 5000);

                    if (rdtResult === 'Positive' || rdtResult === 'Negative') {
                        console.log(`--- RDT Result was '${rdtResult}', filling Date of Test ---`);
                        await fillDateOfTest(driver, FORM_DATA.rdtDate.day, FORM_DATA.rdtDate.month, FORM_DATA.rdtDate.year, 'Rapid Diagnostic Test (RDT)');
                    }
                } catch (error) {
                    console.log("ℹ 'Rapid Diagnostic Test (RDT)' field not found or interactable.");
                }
            }

            if (selectedTestType === 'Slide Test' || selectedTestType === 'Both') {
                try {
                    console.log(`\n✔ Filling Slide Test flow...`);

                    const slideTestValue = FORM_DATA.slideTestValue;
                    const slideResultValue = FORM_DATA.slideResultValue;

                    await selectSymptom(driver, 'Malaria Slide Test', slideTestValue, 5000);

                    const specificSlideField = `Malaria Slide Test ${slideTestValue}`;
                    await selectSymptom(driver, specificSlideField, slideResultValue, 5000);

                    if (slideResultValue === 'Positive' || slideResultValue === 'Negative') {
                        console.log(`--- Slide Test Result was '${slideResultValue}', filling Date of Test ---`);
                        await fillDateOfTest(driver, FORM_DATA.slideDate.day, FORM_DATA.slideDate.month, FORM_DATA.slideDate.year, specificSlideField);
                    }
                } catch (error) {
                    console.log("ℹ Slide Test fields not found or interactable.");
                }
            }
        }

        // 9. Submit the Form
        console.log('\nClicking Submit button...');
        try {
            const submitScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"))`;
            const submitBtn = await driver.$(`android=${submitScrollSelector}`);

            await submitBtn.waitForDisplayed({ timeout: 5000 });
            await submitBtn.click();
            console.log('✔ Form Submitted Successfully!');

            await driver.pause(3000);
        } catch (error) {
            console.log("✖ Could not find or click the Submit button.", error.message);
        }

    } catch (error) {
        console.error('\n✖ Error during Malaria flow:', error.message);
    } finally {
        if (driver) {
            await driver.pause(2000);
            await driver.deleteSession();
            console.log('✔ Session closed.');
        }
    }
}

main();