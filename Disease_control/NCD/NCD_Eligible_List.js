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

// ==========================================
// UTILITY & NAVIGATION FUNCTIONS
// ==========================================

async function tapByCoordinates(driver, x, y) {
    await driver.performActions([{
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: x, y: y },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 150 },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(500);
}

async function swipeByCoordinates(driver, startX, startY, endX, endY) {
    await driver.performActions([{
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: startX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 200 },
            { type: 'pointerMove', duration: 600, x: endX, y: endY },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(500);
}

// ── SMART BI-DIRECTIONAL SCROLLING ────────────────────────────────────────────

async function smartScrollToId(driver, resourceId) {
    console.log(`[SCROLL] Looking for element ID: ${resourceId}`);

    let el = await driver.$(`//*[@resource-id="${resourceId}"]`);
    if (await el.isExisting() && await el.isDisplayed()) return;

    for (let i = 0; i < 4; i++) {
        await swipeByCoordinates(driver, 540, 1600, 540, 600);
        await driver.pause(1000);
        el = await driver.$(`//*[@resource-id="${resourceId}"]`);
        if (await el.isExisting() && await el.isDisplayed()) return;
    }

    for (let i = 0; i < 8; i++) {
        await swipeByCoordinates(driver, 540, 600, 540, 1600);
        await driver.pause(1000);
        el = await driver.$(`//*[@resource-id="${resourceId}"]`);
        if (await el.isExisting() && await el.isDisplayed()) return;
    }
    console.log(`⚠️ Warning: Could not find element ID: ${resourceId}`);
}

async function smartScrollToText(driver, text) {
    console.log(`[SCROLL] Looking for text: "${text}"`);

    let el = await driver.$(`//*[contains(@text, "${text}") or contains(@hint, "${text}")]`);
    if (await el.isExisting() && await el.isDisplayed()) return;

    for (let i = 0; i < 4; i++) {
        await swipeByCoordinates(driver, 540, 1600, 540, 600);
        await driver.pause(1000);
        el = await driver.$(`//*[contains(@text, "${text}") or contains(@hint, "${text}")]`);
        if (await el.isExisting() && await el.isDisplayed()) return;
    }

    for (let i = 0; i < 8; i++) {
        await swipeByCoordinates(driver, 540, 600, 540, 1600);
        await driver.pause(1000);
        el = await driver.$(`//*[contains(@text, "${text}") or contains(@hint, "${text}")]`);
        if (await el.isExisting() && await el.isDisplayed()) return;
    }
    console.log(`⚠️ Warning: Could not find text: "${text}"`);
}

async function centerElement(driver, elementSelector) {
    try {
        const el = await driver.$(elementSelector);
        if (!(await el.isDisplayed())) return;

        const loc = await el.getLocation();
        const size = await driver.getWindowRect();
        const midY = Math.floor(size.height / 2);

        if (Math.abs(loc.y - midY) > 200) {
            console.log(`[CENTERING] Element is at Y:${loc.y}, centering to middle of screen...`);
            let safeStartY = loc.y;
            if (safeStartY > size.height - 100) safeStartY = size.height - 100;
            if (safeStartY < 100) safeStartY = 100;

            await swipeByCoordinates(driver, 540, safeStartY, 540, midY);
            await driver.pause(1500);
        }
    } catch (e) {}
}

// ──────────────────────────────────────────────────────────────────────────────

async function clickGridItemByText(driver, text) {
    const xpath = `//android.widget.TextView[@text='${text}']/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_icon']`;
    const element = await driver.$(xpath);
    await element.waitForDisplayed({ timeout: 10000 });
    await element.click();
}

async function searchWithKeyboard(driver, searchText) {
    const searchInput = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
    await searchInput.waitForDisplayed({ timeout: 10000 });
    await searchInput.click();
    await searchInput.setValue(searchText);

    try {
        await driver.execute('mobile: performEditorAction', { action: 'search' });
    } catch (e) {
        await driver.pressKeyCode(66);
    }
    await driver.pause(1500);

    try {
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }
    } catch (e) {}
}

async function clickAddCbacForMember(driver, memberName) {
    await smartScrollToText(driver, memberName);
    await driver.pause(1000);

    const addCbacBtnXPath =
        `//android.widget.TextView[contains(translate(@text, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${memberName.toLowerCase()}')]` +
        `/ancestor::android.view.ViewGroup` +
        `//android.widget.Button[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/btn_add_visit' and @text='ADD CBAC']`;

    const addCbacBtn = await driver.$(addCbacBtnXPath);
    await addCbacBtn.waitForDisplayed({ timeout: 5000 });
    await addCbacBtn.click();
}

async function fillCalendarDate(driver, day, month, year, fieldHint) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const targetMonthName = monthNames[month - 1];
    const paddedDay = day < 10 ? '0' + day : day.toString();
    const targetDateDesc = `${paddedDay} ${targetMonthName} ${year}`;

    await smartScrollToText(driver, fieldHint);
    await centerElement(driver, `//android.widget.EditText[@hint='${fieldHint}']`);

    const dateField = await driver.$(`//android.widget.EditText[@hint='${fieldHint}']`);
    await dateField.waitForDisplayed({ timeout: 5000 });
    await dateField.click();
    await driver.pause(1500);

    const yearHeader = await driver.$(`//android.widget.TextView[@resource-id="android:id/date_picker_header_year"]`);
    const currentYearStr = await yearHeader.getText();
    const currentYear = parseInt(currentYearStr, 10);

    if (currentYear !== year) {
        await yearHeader.click();
        await driver.pause(1000);
        const yearScroll = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${year}")`;
        try { await driver.$(`android=${yearScroll}`).click(); } catch (e) {}
        await driver.pause(1000);
    }

    const headerDateText = await driver.$('//android.widget.TextView[@resource-id="android:id/date_picker_header_date"]').getText();

    let currentMonthIndex = -1;
    for (let i = 0; i < shortMonths.length; i++) {
        if (headerDateText.includes(shortMonths[i])) {
            currentMonthIndex = i;
            break;
        }
    }

    const targetMonthIndex = month - 1;
    const monthDiff = targetMonthIndex - currentMonthIndex;

    for (let i = 0; i < Math.abs(monthDiff); i++) {
        if (monthDiff > 0) {
            await swipeByCoordinates(driver, 800, 1200, 200, 1200);
        } else {
            await swipeByCoordinates(driver, 200, 1200, 800, 1200);
        }
        await driver.pause(800);
    }

    const specificDateBtn = await driver.$(`//android.view.View[@content-desc='${targetDateDesc}']`);
    if (await specificDateBtn.isExisting() && await specificDateBtn.isDisplayed()) {
        await specificDateBtn.click();
        const okBtn = await driver.$(`//android.widget.Button[@resource-id="android:id/button1"]`);
        await okBtn.click();
    } else {
        const cancelBtn = await driver.$(`//android.widget.Button[@resource-id="android:id/button2"]`);
        await cancelBtn.click();
    }
}

// ==========================================
// BULLETPROOF DROPDOWN LOGIC
// ==========================================

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList) {
    await centerElement(driver, spinnerSelector);

    // PRE-EMPTIVE KEYBOARD HIDE
    try {
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
            await driver.pause(1000);
        }
    } catch (e) {}

    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc = await spinner.getLocation();
    const size = await spinner.getSize();
    const screen = await driver.getWindowRect();

    // Tap the right-side arrow icon physically to open the menu
    const tapX = Math.floor(loc.x + (size.width * 0.90));
    const tapY = Math.floor(loc.y + (size.height / 2));

    console.log(`📍 Opening dropdown for "${value}" at (${tapX}, ${tapY})...`);
    await tapByCoordinates(driver, tapX, tapY);
    await driver.pause(2000); // Let dropdown animate open

    // FIX: Scope the search STRICTLY inside the ListView to prevent clicking identical options elsewhere on the screen
    try {
        const itemXPath = await driver.$(`//android.widget.ListView//*[@text="${value}"]`);
        if (await itemXPath.isExisting() && await itemXPath.isDisplayed()) {
            await itemXPath.click();
            console.log(`✅ Selected "${value}" via strict ListView XPath`);
            await driver.pause(1000);
            return;
        }
    } catch (e) {
        console.log(`⚠️ Strict XPath failed, falling back to math tap...`);
    }

    // PURE MATH TAP FALLBACK
    const index = optionsList.indexOf(value);
    if (index === -1) {
        throw new Error(`❌ "${value}" was not found in the provided options list: [${optionsList.join(', ')}]`);
    }

    console.log(`⚡ Executing Screen-Aware Math Tap for index ${index}...`);

    const gap = 15;
    const itemHeight = Math.floor(size.height * 0.92);
    const spinnerTop = loc.y;
    const spinnerBottom = loc.y + size.height;

    const spaceBelow = screen.height - spinnerBottom;
    const requiredSpace = (optionsList.length * itemHeight) + gap;

    const finalTapX = Math.floor(loc.x + (size.width / 2));
    let finalTapY;

    if (spaceBelow >= requiredSpace || spaceBelow > spinnerTop) {
        console.log(`📉 Menu opened downwards.`);
        finalTapY = Math.floor(spinnerBottom + gap + (index * itemHeight) + (itemHeight / 2));
    } else {
        console.log(`📈 Menu opened upwards.`);
        const popupBottom = spinnerTop - gap;
        const popupTop = popupBottom - (optionsList.length * itemHeight);
        finalTapY = Math.floor(popupTop + (index * itemHeight) + (itemHeight / 2));
    }

    await tapByCoordinates(driver, finalTapX, finalTapY);
    console.log(`✅ Selected "${value}" via Math Fallback!`);
    await driver.pause(1000);

    await dismissAlertPopupIfPresent(driver);
}

// ==========================================
// POPUP HANDLERS
// ==========================================

async function dismissAlertPopupIfPresent(driver) {
    try {
        const alertText = await driver.$(`//*[contains(@text, "Inform ASHA")]`);
        await alertText.waitForDisplayed({ timeout: 1500 });
        console.log("[INFO] 'Alert !' popup detected. Tapping outside to dismiss...");
        await tapByCoordinates(driver, 540, 200);
        await driver.pause(1000);
    } catch (e) {
        // No alert appeared
    }
}

async function handleReferralPopup(driver, popupChoice = "YES", centerName = "CHC") {
    console.log(`[INFO] Checking for Referral Popup to click '${popupChoice}'...`);

    const btnId = popupChoice.toUpperCase() === "YES" ? "android:id/button1" : "android:id/button2";
    const popupBtn = await driver.$(`//android.widget.Button[@resource-id="${btnId}"]`);

    try {
        await popupBtn.waitForDisplayed({ timeout: 3000 });
        console.log(`[SUCCESS] Referral popup detected! Clicking '${popupChoice.toUpperCase()}'...`);
        await popupBtn.click();
        await driver.pause(1000);
    } catch (e) {
        console.log("[INFO] No referral popup appeared. Continuing...");
        return;
    }

    if (popupChoice.toUpperCase() === "NO") return;

    console.log("[INFO] Waiting for Referral Screen to load...");
    await driver.pause(3000);

    try {
        console.log(`[INFO] Selecting Healthcare Center: ${centerName}`);
        const dropdownSelector = `//android.widget.Spinner[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown"]`;
        const optionsList = ["Apolo", "CHC", "District Hospital", "PHC"];

        if (!optionsList.includes(centerName)) { centerName = "CHC"; }

        await smartScrollToId(driver, "org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown");
        await clickSpinnerAndSelectOption(driver, dropdownSelector, centerName, optionsList);

        console.log("[INFO] Submitting Referral Screen...");
        const submitBtn = await driver.$(`//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]`);
        await submitBtn.click();
    } catch(e) {
         console.log("[WARNING] Referral screen dropdown not found or interaction failed.");
    }

    console.log("[INFO] Waiting for screen to transition...");
    await driver.pause(3000);
}

// ==========================================
// RISK ASSESSMENT & DROPDOWN FUNCTIONS
// ==========================================

async function selectSmokeStatus(driver, statusSelection) {
    console.log(`[INFO] Selecting Smoke Status: ${statusSelection}`);
    const resourceId = "org.piramalswasthya.sakhi.saksham.uat:id/actv_smoke_dropdown";
    await smartScrollToId(driver, resourceId);

    const spinnerSelector = `//android.widget.Spinner[@resource-id="${resourceId}"]`;
    const optionsList = ["Never", "Used to consume in the past sometime", "Daily"];
    await clickSpinnerAndSelectOption(driver, spinnerSelector, statusSelection, optionsList);
}

async function selectAlcoholStatus(driver, statusSelection) {
    console.log(`[INFO] Selecting Alcohol Status: ${statusSelection}`);
    const resourceId = "org.piramalswasthya.sakhi.saksham.uat:id/actv_alcohol_dropdown";
    await smartScrollToId(driver, resourceId);

    const spinnerSelector = `//android.widget.Spinner[@resource-id="${resourceId}"]`;
    const optionsList = ["No", "Yes"];
    await clickSpinnerAndSelectOption(driver, spinnerSelector, statusSelection, optionsList);
}

async function selectWaistMeasurement(driver, measurement) {
    console.log(`[INFO] Selecting Waist Measurement: ${measurement}`);
    const resourceId = "org.piramalswasthya.sakhi.saksham.uat:id/actv_waist_dropdown";
    await smartScrollToId(driver, resourceId);

    const spinnerSelector = `//android.widget.Spinner[@resource-id="${resourceId}"]`;
    const optionsList = ["90 cm or less", "91-100 cm", "More than 100 cm"];
    await clickSpinnerAndSelectOption(driver, spinnerSelector, measurement, optionsList);
}

async function selectPhysicalActivityStatus(driver, activityLevel) {
    console.log(`[INFO] Selecting Physical Activity Status: ${activityLevel}`);
    const resourceId = "org.piramalswasthya.sakhi.saksham.uat:id/actv_pa_dropdown";
    await smartScrollToId(driver, resourceId);

    const spinnerSelector = `//android.widget.Spinner[@resource-id="${resourceId}"]`;
    const optionsList = ["At least 150 minutes in a week", "Less than 150 minutes in a week"];
    await clickSpinnerAndSelectOption(driver, spinnerSelector, activityLevel, optionsList);
}

async function selectFamilyHistoryStatus(driver, dropdownSelection, popupChoice = "YES", centerName = "CHC") {
    console.log(`[INFO] Selecting Family History: ${dropdownSelection}`);
    const resourceId = "org.piramalswasthya.sakhi.saksham.uat:id/actv_fh_dropdown";
    await smartScrollToId(driver, resourceId);

    const spinnerSelector = `//android.widget.Spinner[@resource-id="${resourceId}"]`;
    const optionsList = ["No", "Yes"];
    await clickSpinnerAndSelectOption(driver, spinnerSelector, dropdownSelection, optionsList);

    console.log(`[INFO] Selected '${dropdownSelection}' in Family History. Checking for NCD popup...`);
    await handleReferralPopup(driver, popupChoice, centerName);
}

// ==========================================
// SYMPTOM FUNCTIONS (PARTS B1 & B2)
// ==========================================

async function fillEarlyDetectionSymptoms(driver, symptomAnswers, popupChoice = "YES", centerName = "CHC") {
    for (const [symptomId, answer] of Object.entries(symptomAnswers)) {
        const fullContainerId = `org.piramalswasthya.sakhi.saksham.uat:id/${symptomId}`;
        console.log(`[INFO] Finding and answering ID: ${symptomId} -> ${answer}`);

        await smartScrollToId(driver, fullContainerId);
        await centerElement(driver, `//android.widget.LinearLayout[@resource-id="${fullContainerId}"]`);

        const targetRbId = answer === "Yes" ? "rb_yes" : "rb_no";
        const xpath = `//android.widget.LinearLayout[@resource-id="${fullContainerId}"]//android.widget.RadioButton[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/${targetRbId}"]`;

        const radioBtn = await driver.$(xpath);
        if (await radioBtn.isExisting() && await radioBtn.isDisplayed()) {
            await radioBtn.click();
            await driver.pause(1000);

            await dismissAlertPopupIfPresent(driver);
            await handleReferralPopup(driver, popupChoice, centerName);
        }
    }
}

async function fillSymptomsByText(driver, symptomAnswers, popupChoice = "YES", centerName = "CHC") {
    for (const [symptomText, answer] of Object.entries(symptomAnswers)) {
        console.log(`[INFO] Finding and answering Text: "${symptomText}" -> ${answer}`);

        await smartScrollToText(driver, symptomText);
        await centerElement(driver, `//*[contains(@text, "${symptomText}")]`);

        const xpath = `//android.widget.TextView[contains(@text, "${symptomText}")]/..//android.widget.RadioButton[@text="${answer}"]`;

        const radioBtn = await driver.$(xpath);
        if (await radioBtn.isExisting() && await radioBtn.isDisplayed()) {
            await radioBtn.click();
            await driver.pause(1000);

            await dismissAlertPopupIfPresent(driver);
            await handleReferralPopup(driver, popupChoice, centerName);
        }
    }
}

// ==========================================
// PART C & D: RISK FACTOR & PHQ2 DROPDOWNS
// ==========================================

async function selectFuelType(driver, fuelSelection) {
    console.log(`[INFO] Selecting Fuel Type: ${fuelSelection}`);
    const resourceId = "org.piramalswasthya.sakhi.saksham.uat:id/actv_fuel_dropdown";
    await smartScrollToId(driver, resourceId);

    const spinnerSelector = `//android.widget.Spinner[@resource-id="${resourceId}"]`;
    const optionsList = ["Firewood", "Crop Residue", "Gobar Gas", "Coal", "Kerosene oil", "LPG"];
    await clickSpinnerAndSelectOption(driver, spinnerSelector, fuelSelection, optionsList);
}

async function selectOccupationalExposure(driver, exposureSelection, popupChoice = "YES", centerName = "CHC") {
    console.log(`[INFO] Selecting Occupational Exposure: ${exposureSelection}`);
    const resourceId = "org.piramalswasthya.sakhi.saksham.uat:id/actv_exposure_dropdown";
    await smartScrollToId(driver, resourceId);

    const spinnerSelector = `//android.widget.Spinner[@resource-id="${resourceId}"]`;
    const optionsList = ["Crop residue burning", "Burning of garbage - leaves", "Working in industries"];

    let matchedOption = optionsList.find(opt => exposureSelection.includes(opt)) || optionsList[0];

    await clickSpinnerAndSelectOption(driver, spinnerSelector, matchedOption, optionsList);

    console.log(`[INFO] Selected '${matchedOption}'. Checking for COPD popup...`);
    await handleReferralPopup(driver, popupChoice, centerName);
}

async function selectLittleInterest(driver, selection) {
    console.log(`[INFO] Selecting PHQ2 Little Interest: ${selection}`);
    const resourceId = "org.piramalswasthya.sakhi.saksham.uat:id/actv_li_dropdown";
    await smartScrollToId(driver, resourceId);

    const spinnerSelector = `//android.widget.Spinner[@resource-id="${resourceId}"]`;
    const optionsList = ["Not at all", "Several Days", "More than half the days", "Nearly everyday"];
    await clickSpinnerAndSelectOption(driver, spinnerSelector, selection, optionsList);
}

async function selectFeelingDown(driver, selection) {
    console.log(`[INFO] Selecting PHQ2 Feeling Down: ${selection}`);
    const resourceId = "org.piramalswasthya.sakhi.saksham.uat:id/actv_fd_dropdown";
    await smartScrollToId(driver, resourceId);

    const spinnerSelector = `//android.widget.Spinner[@resource-id="${resourceId}"]`;
    const optionsList = ["Not at all", "Several Days", "More than half the days", "Nearly everyday"];
    await clickSpinnerAndSelectOption(driver, spinnerSelector, selection, optionsList);
}

// ==========================================
// MAIN EXECUTION BLOCK
// ==========================================

async function main() {
    let driver;

    try {
        driver = await remote(wdioOptions);

        console.log("Navigating to NCD Eligible List...");
        await clickGridItemByText(driver, 'NCD');
        await driver.pause(1500);

        await clickGridItemByText(driver, 'NCD Eligible List');
        await driver.pause(1500);

        const targetBeneficiary = 'KAVYA SHARMA';
        await searchWithKeyboard(driver, targetBeneficiary);
        await driver.pause(2000);

        await clickAddCbacForMember(driver, targetBeneficiary);
        await driver.pause(2000);

        console.log("Filling out CBAC Date...");
        await fillCalendarDate(driver, 15, 3, 2026, 'Date');
        await driver.pause(1000);

        console.log("Filling Part A: Risk Assessment...");
        await selectSmokeStatus(driver, "Used to consume in the past sometime");
        await driver.pause(1000);

        await selectAlcoholStatus(driver, "Yes");
        await driver.pause(1000);

        await selectWaistMeasurement(driver, "91-100 cm");
        await driver.pause(1000);

        await selectPhysicalActivityStatus(driver, "At least 150 minutes in a week");
        await driver.pause(1000);

        await selectFamilyHistoryStatus(driver, "Yes", "YES", "CHC");
        await driver.pause(1000);

        console.log("Filling Part B1: Early Detection (Part 1)...");
        const earlyDetectionAnswers = {
            "cbac_histb": "No",
            "cbac_coughing": "No",
            "cbac_blsputum": "Yes",
            "cbac_feverwks": "No",
            "cbac_lsweight": "Yes",
            "cbac_ntswets": "No",
            "cbac_fh_tb": "No",
            "cbac_taking_tb_drug": "Yes",
            "cbac_recurrent_ulceration": "No",
            "cbac_recurrent_tingling": "Yes",
            "cbac_recurrent_cloudy": "No",
            "cbac_recurrent_diffculty_reading": "No",
            "cbac_recurrent_pain_eyes": "Yes",
            "cbac_recurrent_redness_eyes": "No",
            "cbac_recurrent_diff_hearing": "Yes",
            "cbac_breath": "Yes"
        };
        await fillEarlyDetectionSymptoms(driver, earlyDetectionAnswers, "YES", "CHC");
        await driver.pause(1000);

        console.log("Filling Part B1: Early Detection (Part 2)...");
        const continuedSymptoms = {
            "History of fits": "No",
            "Difficulty in opening mouth": "Yes",
            "Ulcers/patch/growth in mouth that has not healed in two weeks": "No",
            "Any change in the tone of your voice": "No",
            "Any Growth in the mouth that has not healed in 2 weeks": "Yes",
            "Any white or red patch in the mouth that has not healed in 2 weeks": "Yes",
            "Pain while chewing": "No",
            "Any hyper pigmented patch or discoloration on skin with loss of sensation": "No",
            "Any thickend skin": "Yes",
            "Any nodules on skin": "No",
            "Recurrent numbness on palm(s) or sole(s)": "Yes",
            "Clawing of fingers in hand(s) or Feet": "No",
            "Tingling or Numbness in hands and or Feet": "Yes",
            "Inability to close eyelid": "No",
            "Difficulty in holding objects with fingers": "Yes"
        };
        await fillSymptomsByText(driver, continuedSymptoms, "YES", "CHC");
        await driver.pause(1000);

        console.log("Filling Part B1: Early Detection (Part 3)...");
        const finalSymptoms = {
            "cbac_Weekness_in_feet": "No",
            "cbac_suspected_leprosy": "No"
        };
        await fillEarlyDetectionSymptoms(driver, finalSymptoms, "YES", "CHC");
        await driver.pause(1000);

        console.log("Filling Part B2: Women Only...");
        const womenOnlySymptoms = {
            "cbac_lumpbrest": "No",
            "cbac_nipple": "No",
            "cbac_breast": "No",
            "cbac_blperiods": "No",
            "cbac_blmenopause": "Yes",
            "cbac_blintercorse": "Yes",
            "cbac_fouldis": "No"
        };
        await fillEarlyDetectionSymptoms(driver, womenOnlySymptoms, "YES", "CHC");
        await driver.pause(1000);

        console.log("Filling Part C: Risk factor for COPD...");
        const fuelChoice = "LPG";
        await selectFuelType(driver, fuelChoice);
        await driver.pause(1000);

        const exposureChoice = "Crop residue burning";
        await selectOccupationalExposure(driver, exposureChoice, "YES", "CHC");
        await driver.pause(1000);

        console.log("Filling Part D: PHQ2...");
        const littleInterestChoice = "Not at all";
        await selectLittleInterest(driver, littleInterestChoice);
        await driver.pause(1000);

        const feelingDownChoice = "Several Days";
        await selectFeelingDown(driver, feelingDownChoice);
        await driver.pause(1000);

        // --- SAVE THE FORM ---
        console.log("Scrolling to Save button...");
        await smartScrollToId(driver, "org.piramalswasthya.sakhi.saksham.uat:id/btn_save");

        const saveButton = await driver.$(`//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_save"]`);
        if (await saveButton.isExisting() && await saveButton.isDisplayed()) {
            await saveButton.click();
            console.log("Clicked Save button! Waiting to handle final referral popup...");

            await driver.pause(2000);

            await handleReferralPopup(driver, "YES", "CHC");

            console.log("CBAC Form Completed successfully!");
        } else {
            console.log("[ERROR] Save button could not be found or clicked.");
        }

    } catch (error) {
        console.error(error.message);
    } finally {
        if (driver) {
            await driver.pause(3000);
            console.log("Ending session...");
            await driver.deleteSession();
        }
    }
}

// At the bottom of NCD_Eligible_List.js and Routine_Immunization.js
module.exports = {
    fillCbacForm: main // or whatever you rename the main function to
};