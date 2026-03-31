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
}

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
    await driver.pressKeyCode(66);
}

async function clickAddCbacForMember(driver, memberName) {
    const androidScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${memberName}")`;
    try {
        await driver.$(`android=${androidScrollSelector}`).waitForDisplayed({ timeout: 10000 });
    } catch (e) {}

    await driver.pause(1000);

    const addCbacBtnXPath =
        `//android.widget.TextView[@text='${memberName}']` +
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

    const dateFieldXPath = `//android.widget.EditText[@hint='${fieldHint}']`;
    let dateField = await driver.$(dateFieldXPath);

    let isVisible = false;
    try { isVisible = await dateField.isDisplayed(); } catch (e) {}

    if (!isVisible) {
        await swipeByCoordinates(driver, 540, 1800, 540, 600);
        await driver.pause(1000);
        dateField = await driver.$(dateFieldXPath);
    }

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
// POPUP HANDLERS
// ==========================================

async function dismissAlertPopupIfPresent(driver) {
    const alertText = await driver.$(`//*[contains(@text, "Inform ASHA")]`);
    try {
        await alertText.waitForDisplayed({ timeout: 1000 });
        console.log("[INFO] 'Alert !' popup detected. Tapping outside to dismiss...");
        await tapByCoordinates(driver, 540, 200);
        await driver.pause(1000);
    } catch (e) {
        // No alert appeared, silently continue
    }
}

async function handleReferralPopup(driver, popupChoice = "YES", centerName = "CHC") {
    console.log(`[INFO] Checking for Referral Popup to click '${popupChoice}'...`);

    const btnId = popupChoice.toUpperCase() === "YES" ? "android:id/button1" : "android:id/button2";
    const popupBtn = await driver.$(`//android.widget.Button[@resource-id="${btnId}"]`);

    try {
        await popupBtn.waitForDisplayed({ timeout: 4000 });
        console.log(`[SUCCESS] Referral popup detected! Clicking '${popupChoice.toUpperCase()}'...`);
        await driver.pause(500);
        await popupBtn.click();
    } catch (e) {
        console.log("[INFO] No referral popup appeared. Continuing with the form...");
        return;
    }

    if (popupChoice.toUpperCase() === "NO") {
        await driver.pause(1000);
        return;
    }

    console.log("[INFO] Waiting for Referral Screen to load...");
    await driver.pause(3000);

    const dropdown = await driver.$(`//android.widget.Spinner[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown"]`);

    try {
        await dropdown.waitForDisplayed({ timeout: 8000 });
        console.log(`[INFO] Selecting Healthcare Center: ${centerName}`);
        await dropdown.click();
        await driver.pause(1500);

        const centerCoords = {
            "Apolo": { x: 500, y: 300 },
            "CHC": { x: 500, y: 420 },
            "District Hospital": { x: 500, y: 550 },
            "PHC": { x: 500, y: 680 }
        };

        const coords = centerCoords[centerName] || centerCoords["CHC"];
        await tapByCoordinates(driver, coords.x, coords.y);
        await driver.pause(1000);

        console.log("[INFO] Submitting Referral Screen...");
        const submitBtn = await driver.$(`//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]`);
        await submitBtn.click();
    } catch(e) {
         console.log("[WARNING] Referral screen dropdown not found.");
    }

    console.log("[INFO] Waiting for screen to transition...");
    const mainScrollView = await driver.$(`//android.widget.ScrollView`);
    try {
        await mainScrollView.waitForDisplayed({ timeout: 10000 });
        console.log("[SUCCESS] UI is ready.");
    } catch (e) {
        console.log("[WARNING] Main UI transition delay.");
    }

    await driver.pause(2000);
}

// ==========================================
// RISK ASSESSMENT & DROPDOWN FUNCTIONS
// ==========================================

async function selectSmokeStatus(driver, statusSelection) {
    const scrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_smoke_dropdown"))`;
    try { await driver.$(`android=${scrollSelector}`).waitForDisplayed({ timeout: 5000 }); } catch (e) {}

    const spinner = await driver.$(`//android.widget.Spinner[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/actv_smoke_dropdown"]`);
    await spinner.click();
    await driver.pause(1500);

    const coordinatesMap = {
        "Never": { x: 540, y: 1120 },
        "Used to consume in the past sometime": { x: 540, y: 1200 },
        "Daily": { x: 540, y: 1250 }
    };

    const coords = coordinatesMap[statusSelection];
    if (coords) await tapByCoordinates(driver, coords.x, coords.y);
    await driver.pause(1000);
}

async function selectAlcoholStatus(driver, statusSelection) {
    const scrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_alcohol_dropdown"))`;
    try { await driver.$(`android=${scrollSelector}`).waitForDisplayed({ timeout: 5000 }); } catch (e) {}

    const spinner = await driver.$(`//android.widget.Spinner[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/actv_alcohol_dropdown"]`);
    await spinner.click();
    await driver.pause(1500);

    const coordinatesMap = {
        "Yes": { x: 540, y: 1400 },
        "No": { x: 540, y: 1300 }
    };

    const coords = coordinatesMap[statusSelection];
    if (coords) await tapByCoordinates(driver, coords.x, coords.y);
    await driver.pause(1000);
}

async function selectWaistMeasurement(driver, measurement) {
    const scrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_waist_dropdown"))`;
    try { await driver.$(`android=${scrollSelector}`).waitForDisplayed({ timeout: 5000 }); } catch (e) {}

    const spinner = await driver.$(`//android.widget.Spinner[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/actv_waist_dropdown"]`);
    await spinner.click();
    await driver.pause(1500);

    const coordinatesMap = {
        "90 cm or less": { x: 540, y: 1480 },
        "91-100 cm": { x: 540, y: 1580 },
        "More than 100 cm": { x: 540, y: 1680 }
    };

    const coords = coordinatesMap[measurement];
    if (coords) await tapByCoordinates(driver, coords.x, coords.y);
    await driver.pause(1000);
}

async function selectPhysicalActivityStatus(driver, activityLevel) {
    const scrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_pa_dropdown"))`;
    try { await driver.$(`android=${scrollSelector}`).waitForDisplayed({ timeout: 5000 }); } catch (e) {}

    const spinner = await driver.$(`//android.widget.Spinner[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/actv_pa_dropdown"]`);
    await spinner.click();
    await driver.pause(1500);

    const coordinatesMap = {
        "At least 150 minutes in a week": { x: 540, y: 1720 },
        "Less than 150 minutes in a week": { x: 540, y: 1820 }
    };

    const coords = coordinatesMap[activityLevel];
    if (coords) await tapByCoordinates(driver, coords.x, coords.y);
    await driver.pause(1000);
}

async function selectFamilyHistoryStatus(driver, dropdownSelection, popupChoice = "YES", centerName = "CHC") {
    const scrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_fh_dropdown"))`;
    try { await driver.$(`android=${scrollSelector}`).waitForDisplayed({ timeout: 5000 }); } catch (e) {}

    const spinner = await driver.$(`//android.widget.Spinner[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/actv_fh_dropdown"]`);
    await spinner.click();
    await driver.pause(1500);

    const coordinatesMap = {
        "No": { x: 540, y: 1950 },
        "Yes": { x: 540, y: 2070 }
    };

    const coords = coordinatesMap[dropdownSelection];
    if (coords) {
        await tapByCoordinates(driver, coords.x, coords.y);
    }

    await driver.pause(2000);

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

        const scrollSelector = `new UiScrollable(new UiSelector().className("android.widget.ScrollView").scrollable(true)).setMaxSearchSwipes(15).scrollIntoView(new UiSelector().resourceId("${fullContainerId}"))`;

        try {
            await driver.$(`android=${scrollSelector}`).waitForDisplayed({ timeout: 5000 });
        } catch (e) {
            console.log(`[WARNING] Could not scroll to or find symptom: ${symptomId}. Skipping...`);
            continue;
        }

        const targetRbId = answer === "Yes" ? "rb_yes" : "rb_no";
        const xpath = `//android.widget.LinearLayout[@resource-id="${fullContainerId}"]//android.widget.RadioButton[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/${targetRbId}"]`;

        const radioBtn = await driver.$(xpath);
        if (await radioBtn.isExisting() && await radioBtn.isDisplayed()) {
            await radioBtn.click();
            await driver.pause(1500);

            await dismissAlertPopupIfPresent(driver);

            console.log(`[INFO] '${answer}' selected for ${symptomId}. Checking for referral popup...`);
            await handleReferralPopup(driver, popupChoice, centerName);
        }
    }
}

async function fillSymptomsByText(driver, symptomAnswers, popupChoice = "YES", centerName = "CHC") {
    for (const [symptomText, answer] of Object.entries(symptomAnswers)) {
        console.log(`[INFO] Finding and answering Text: "${symptomText}" -> ${answer}`);

        const scrollSelector = `new UiScrollable(new UiSelector().className("android.widget.ScrollView").scrollable(true)).setMaxSearchSwipes(15).scrollTextIntoView("${symptomText}")`;
        try {
            await driver.$(`android=${scrollSelector}`).waitForDisplayed({ timeout: 5000 });
        } catch (e) {
            console.log(`[WARNING] Could not scroll to or find symptom: "${symptomText}"`);
            continue;
        }

        const xpath = `//android.widget.TextView[contains(@text, "${symptomText}")]/..//android.widget.RadioButton[@text="${answer}"]`;

        const radioBtn = await driver.$(xpath);
        if (await radioBtn.isExisting() && await radioBtn.isDisplayed()) {
            await radioBtn.click();
            await driver.pause(1500);

            await dismissAlertPopupIfPresent(driver);

            console.log(`[INFO] '${answer}' selected for "${symptomText}". Checking for referral popup...`);
            await handleReferralPopup(driver, popupChoice, centerName);
        }
    }
}

// ==========================================
// PART C & D: RISK FACTOR & PHQ2 DROPDOWNS
// ==========================================

async function selectFuelType(driver, fuelSelection) {
    console.log(`[INFO] Selecting Fuel Type: ${fuelSelection}`);

    // --- NEW: Fully scroll to the bottom BEFORE interacting with the dropdown ---
    console.log(`[INFO] Scrolling to the absolute bottom of the screen...`);
    const scrollToBottom = `new UiScrollable(new UiSelector().className("android.widget.ScrollView").scrollable(true)).scrollToEnd(5)`;
    try {
        await driver.$(`android=${scrollToBottom}`);
    } catch (e) {
        console.log(`[WARNING] Could not completely scroll to the end of the page.`);
    }
    await driver.pause(1000);

    // After scrolling to bottom, ensure the element is perfectly in view
    const scrollSelector = `new UiScrollable(new UiSelector().className("android.widget.ScrollView").scrollable(true)).setMaxSearchSwipes(10).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_fuel_dropdown"))`;
    try {
        await driver.$(`android=${scrollSelector}`).waitForDisplayed({ timeout: 5000 });
    } catch (e) {
        console.log(`[WARNING] Could not scroll to fuel dropdown.`);
    }

    const spinner = await driver.$(`//android.widget.Spinner[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/actv_fuel_dropdown"]`);
    await spinner.click();
    await driver.pause(1500);

    const coordinatesMap = {
        "Firewood": { x: 540, y: 1350 },
        "Crop Residue": { x: 540, y: 1500 },
        "Gobar Gas": { x: 540, y: 1650 },
        "Coal": { x: 540, y: 1800 },
        "Kerosene oil": { x: 540, y: 1950 },
        "LPG": { x: 540, y: 2100 }
    };

    const coords = coordinatesMap[fuelSelection];
    if (coords) {
        await tapByCoordinates(driver, coords.x, coords.y);
    } else {
        console.log(`[WARNING] Unknown fuel selection: ${fuelSelection}`);
    }
    await driver.pause(1000);
}

async function selectOccupationalExposure(driver, exposureSelection, popupChoice = "YES", centerName = "CHC") {
    console.log(`[INFO] Selecting Occupational Exposure: ${exposureSelection}`);

    const scrollSelector = `new UiScrollable(new UiSelector().className("android.widget.ScrollView").scrollable(true)).setMaxSearchSwipes(10).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_exposure_dropdown"))`;
    try {
        await driver.$(`android=${scrollSelector}`).waitForDisplayed({ timeout: 5000 });
    } catch (e) {
        console.log(`[WARNING] Could not scroll to exposure dropdown.`);
    }

    const spinner = await driver.$(`//android.widget.Spinner[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/actv_exposure_dropdown"]`);
    await spinner.click();
    await driver.pause(1500);

    const coordinatesMap = {
        "Crop residue burning": { x: 540, y: 1350 },
        "Burning of garbage - leaves": { x: 540, y: 1480 },
        "Working in industries": { x: 540, y: 1650 }
    };

    let coords = null;
    for (const [key, value] of Object.entries(coordinatesMap)) {
        if (exposureSelection.includes(key)) {
            coords = value;
            break;
        }
    }

    if (coords) {
        await tapByCoordinates(driver, coords.x, coords.y);
    } else {
        console.log(`[WARNING] Unknown exposure selection: ${exposureSelection}`);
    }

    await driver.pause(1500);

    console.log(`[INFO] Selected '${exposureSelection}'. Checking for COPD popup...`);
    await handleReferralPopup(driver, popupChoice, centerName);
}

async function selectLittleInterest(driver, selection) {
    console.log(`[INFO] Selecting PHQ2 Little Interest: ${selection}`);

    const scrollSelector = `new UiScrollable(new UiSelector().className("android.widget.ScrollView").scrollable(true)).setMaxSearchSwipes(10).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_li_dropdown"))`;
    try {
        await driver.$(`android=${scrollSelector}`).waitForDisplayed({ timeout: 5000 });
    } catch (e) {
        console.log(`[WARNING] Could not scroll to Little Interest dropdown.`);
    }

    const spinner = await driver.$(`//android.widget.Spinner[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/actv_li_dropdown"]`);
    await spinner.click();
    await driver.pause(1500);

    const coordinatesMap = {
        "Not at all": { x: 500, y: 1750 },
        "Several Days": { x: 500, y: 1880 },
        "More than half the days": { x: 500, y: 2000 },
        "Nearly everyday": { x: 500, y: 2120 }
    };

    const coords = coordinatesMap[selection];
    if (coords) {
        await tapByCoordinates(driver, coords.x, coords.y);
    } else {
        console.log(`[WARNING] Unknown selection: ${selection}`);
    }
    await driver.pause(1000);
}

async function selectFeelingDown(driver, selection) {
    console.log(`[INFO] Selecting PHQ2 Feeling Down: ${selection}`);

    const scrollSelector = `new UiScrollable(new UiSelector().className("android.widget.ScrollView").scrollable(true)).setMaxSearchSwipes(10).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_fd_dropdown"))`;
    try {
        await driver.$(`android=${scrollSelector}`).waitForDisplayed({ timeout: 5000 });
    } catch (e) {
        console.log(`[WARNING] Could not scroll to Feeling Down dropdown.`);
    }

    const spinner = await driver.$(`//android.widget.Spinner[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/actv_fd_dropdown"]`);
    await spinner.click();
    await driver.pause(1500);

    const coordinatesMap = {
        "Not at all": { x: 500, y: 1800 },
        "Several Days": { x: 500, y: 1920 },
        "More than half the days": { x: 500, y: 2040 },
        "Nearly everyday": { x: 500, y: 2160 }
    };

    const coords = coordinatesMap[selection];
    if (coords) {
        await tapByCoordinates(driver, coords.x, coords.y);
    } else {
        console.log(`[WARNING] Unknown selection: ${selection}`);
    }
    await driver.pause(1000);
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

        const targetBeneficiary = 'RADHIKA NAYAK';
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
        const saveBtnScroll = `new UiScrollable(new UiSelector().className("android.widget.ScrollView").scrollable(true)).setMaxSearchSwipes(10).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_save"))`;
        try {
            await driver.$(`android=${saveBtnScroll}`).waitForDisplayed({ timeout: 5000 });
        } catch (e) {}

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

main();