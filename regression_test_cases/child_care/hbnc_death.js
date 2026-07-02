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
    logLevel: 'info',
    capabilities,
};

const APP_ID = 'org.piramalswasthya.sakhi.saksham.uat';

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

const VALID_REASONS_FOR_DEATH = [
    'Fever', 'Measles', 'Diarrhoea', 'Pneumonia', 'Sepsis',
    'Asphyxia', 'Complications of Prematurity', 'Accident',
    'Infectious Disease', 'Animal Bite Death'
];

const VALID_PLACES_OF_DEATH = [
    'Home', 'Subcenter', 'PHC', 'CHC',
    'District Hospital', 'Private Hospital', 'Any other place'
];

// ── Calendar Helpers ──────────────────────────────────────────────────────────

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

    const formattedDay = String(day);
    const dayToClick = await driver.$(`android=new UiSelector().text("${formattedDay}").clickable(true)`);
    await dayToClick.click();
    await driver.pause(500);

    const okBtn = await driver.$('//android.widget.Button[@text="OK" or @resource-id="android:id/button1"]');
    await okBtn.click();
}

function parseDdMmYyyy(dateString) {
    const parts = dateString.split('-');
    return {
        day: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10),
        year: parseInt(parts[2], 10)
    };
}

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
function ciContains(attrExpr, needle) {
    return `contains(translate(${attrExpr}, '${UPPER}', '${LOWER}'), '${needle.toLowerCase()}')`;
}

// ── Generic Scroll-Into-View Helper ───────────────────────────────────────────

async function scrollUntilVisible(driver, locatorFn, maxAttempts = 5) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const el = await locatorFn();
            if (await el.isExisting() && await el.isDisplayed()) {
                return el;
            }
        } catch (e) { /* not found yet, keep scrolling */ }

        const size = await driver.getWindowRect();
        await driver.performActions([{
            type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: Math.floor(size.width / 2), y: Math.floor(size.height * 0.7) },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 100 },
                { type: 'pointerMove', duration: 600, x: Math.floor(size.width / 2), y: Math.floor(size.height * 0.3) },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
        await driver.releaseActions();
        await driver.pause(1000);
    }
    return null;
}

async function selectFromListDialog(driver, optionText) {
    const optionXPath = `//android.widget.TextView[@resource-id="android:id/text1" and @text="${optionText}"]`;
    const optionElement = await driver.$(optionXPath);

    if (await optionElement.isExisting()) {
        await optionElement.click();
        await driver.pause(800);
        return true;
    }
    return false;
}

// ── App Navigation ─────────────────────────────────────────────────────────────

async function clickChildCare(driver) {
    const childCareXPath = `//android.widget.TextView[@text="Child Care"]/parent::android.view.ViewGroup/parent::android.widget.FrameLayout`;
    const childCareCard = await driver.$(childCareXPath);
    await childCareCard.waitForDisplayed({ timeout: 5000 });
    await childCareCard.click();
    console.log('Successfully clicked on the Child Care module.');
}

async function clickGridModule(driver, moduleName) {
    const moduleXPath = `//android.widget.TextView[@text="${moduleName}"]/parent::android.view.ViewGroup/parent::android.widget.FrameLayout`;
    const moduleCard = await driver.$(moduleXPath);
    await moduleCard.waitForDisplayed({ timeout: 5000 });
    await moduleCard.click();
    console.log(`Successfully clicked on the '${moduleName}' module.`);
}

async function clickDeathReportsModule(driver) {
    const xpath = `//android.widget.TextView[@text="Death Reports" and @resource-id="${APP_ID}:id/textView2"]/ancestor::android.widget.FrameLayout[@resource-id="${APP_ID}:id/cv_icon"]`;
    const el = await scrollUntilVisible(driver, () => driver.$(xpath));
    if (!el) {
        throw new Error('Could not find the "Death Reports" module tile.');
    }
    await el.click();
    console.log('Successfully clicked on the "Death Reports" module.');
    await driver.pause(2000);
}

async function clickChildDeathsCardIfPresent(driver) {
    try {
        const xpath = `//androidx.cardview.widget.CardView[@resource-id="${APP_ID}:id/card_child_deaths"]`;
        const card = await driver.$(xpath);
        if (await card.isExisting()) {
            await card.click();
            console.log('Successfully clicked on the "Child Deaths" card.');
            await driver.pause(1500);
        }
    } catch (e) {
        console.log('ℹ "Child Deaths" card not present on this screen — skipping.');
    }
}

async function goToHome(driver) {
    try {
        const homeBtn = await driver.$(`//android.widget.Button[@content-desc="Go to Home"]`);
        if (await homeBtn.isExisting()) {
            await homeBtn.click();
            console.log('Navigated back to Home.');
            await driver.pause(1500);
        }
    } catch (e) {
        console.log('ℹ "Go to Home" button not found — skipping.');
    }
}

// ── Search ─────────────────────────────────────────────────────────────────────

async function searchBeneficiary(driver, nameToSearch) {
    console.log(`Processing search for name: "${nameToSearch}"...`);

    const searchInputXPath = `//android.widget.EditText[@resource-id="${APP_ID}:id/searchView"]`;
    const searchInput = await driver.$(searchInputXPath);
    await searchInput.waitForDisplayed({ timeout: 5000 });

    await searchInput.click();
    await driver.pause(500);
    await searchInput.clearValue();

    // Typing the name and adding '\n' often triggers the native Android search action
    await searchInput.setValue(nameToSearch + '\n');
    await driver.pause(500);

    // Press the physical Enter key as a fallback to submit the search
    if (await driver.isKeyboardShown()) {
        await driver.pressKeyCode(66); // Android KeyCode for ENTER
        await driver.pause(500);
        await driver.hideKeyboard();   // Hide keyboard to see results
    }

    console.log(`✔ Search for "${nameToSearch}" completed. Waiting for list to update...`);
    await driver.pause(2000);
}

async function clickEligibleHBNCAndRememberName(driver, triedNames, maxScrollAttempts = 15) {
    console.log('Looking for an eligible, not-yet-tried HBNC beneficiary...');

    const eligibleCardXPath = `//android.widget.FrameLayout[@resource-id="${APP_ID}:id/cv_content" and not(.//android.widget.ImageView[@content-desc="Death"])]`;

    for (let scrollAttempt = 0; scrollAttempt <= maxScrollAttempts; scrollAttempt++) {
        const cards = await driver.$$(eligibleCardXPath);

        for (const card of cards) {
            if (!(await card.isDisplayed().catch(() => false))) continue;

            let beneficiaryName = 'Unknown';
            try {
                const nameEl = await card.$(`.//android.widget.TextView[@resource-id="${APP_ID}:id/tv_hh_id"]`);
                beneficiaryName = (await nameEl.getText()).replace(/Not Available/i, '').trim();
            } catch (e) {
                console.warn('⚠ Could not read beneficiary name from card.');
            }

            // Skip beneficiaries we've already attempted this run
            if (triedNames.has(beneficiaryName)) continue;

            let hbncBtn;
            try {
                hbncBtn = await card.$(`.//android.widget.Button[@text="HBNC"]`);
                if (!(await hbncBtn.isExisting())) continue;
            } catch (e) { continue; }

            console.log(`✅ Found untried eligible beneficiary: "${beneficiaryName}". Clicking HBNC...`);
            triedNames.add(beneficiaryName);
            await hbncBtn.click();
            await driver.pause(2000);
            return beneficiaryName;
        }

        console.log(`ℹ No new untried beneficiary visible yet. Scrolling down... (attempt ${scrollAttempt + 1}/${maxScrollAttempts})`);
        const size = await driver.getWindowRect();
        await driver.performActions([{
            type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: Math.floor(size.width / 2), y: Math.floor(size.height * 0.7) },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 100 },
                { type: 'pointerMove', duration: 600, x: Math.floor(size.width / 2), y: Math.floor(size.height * 0.3) },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
        await driver.releaseActions();
        await driver.pause(1000);
    }

    throw new Error('❌ No untried eligible (non-deceased) HBNC beneficiary found after scrolling.');
}

async function navigateBackToNewbornList(driver) {
    try {
        const backBtn = await driver.$('//android.widget.ImageButton[@content-desc="Navigate up"]');
        if (await backBtn.isExisting()) {
            await backBtn.click();
        } else {
            await driver.pressKeyCode(4);
        }
    } catch (e) {
        await driver.pressKeyCode(4).catch(() => {});
    }
    await driver.pause(1500);
}

// ── HBNC Form ─────────────────────────────────────────────────────────────────

async function clickAddVisitForDay(driver, dayText) {
    const addVisitBtnXPath = `//android.widget.TextView[@text="${dayText}"]/parent::android.widget.LinearLayout//android.widget.Button[@text="Add Visit"]`;
    const addVisitBtn = await driver.$(addVisitBtnXPath);

    const isAvailable = await addVisitBtn.waitForDisplayed({ timeout: 5000 }).catch(() => false);
    if (!isAvailable) {
        console.warn(`⚠ No "Add Visit" button found for "${dayText}" on this beneficiary (likely already visited/reported deceased). Skipping.`);
        return false;
    }

    await addVisitBtn.click();
    console.log(`Successfully clicked on the Add Visit button for ${dayText}.`);

    await driver.pause(1500);
    const formLoaded = await scrollUntilVisible(
        driver,
        () => driver.$(`//android.widget.EditText[${ciContains('@hint', 'visit date')}]`),
        3
    );

    if (!formLoaded) {
        console.warn(`⚠ Visit form for "${dayText}" may not have loaded yet — "Select visit date" field not visible after waiting.`);
        return false;
    }

    return true;
}

async function handleVisitDate(driver, expectedDateString) {
    const visitDateXPath = `//android.widget.EditText[${ciContains('@hint', 'visit date')}]`;
    const visitDateInput = await scrollUntilVisible(driver, () => driver.$(visitDateXPath), 5);

    if (!visitDateInput) {
        throw new Error('handleVisitDate: "Select visit date" field not found on screen.');
    }

    const currentDate = await visitDateInput.getText();
    console.log(`Default visit date found: ${currentDate}`);

    const isAlreadyFilled = Boolean(currentDate && currentDate.trim() !== '');

    if (isAlreadyFilled) {
        console.log(`➡ "Select visit date" is already filled ("${currentDate}"). Skipping date selection...`);
    } else {
        console.log(`"Select visit date" is empty. Opening calendar to set date to ${expectedDateString}...`);
        await visitDateInput.click();
        await driver.pause(1000);
        await pickDateFromCalendar(driver, parseDdMmYyyy(expectedDateString));
        console.log(`✔ "Select visit date" set to: ${expectedDateString}`);
    }
}

async function handleIsBabyAlive(driver, expectedInput) {
    console.log(`Processing "Is the Baby alive? *" field... Expected: ${expectedInput}`);

    const targetOption = expectedInput.toLowerCase() === 'no' ? 'No' : 'Yes';
    const radioBtnXPath = `//android.widget.TextView[@text="Is the Baby alive? *"]/following-sibling::android.widget.FrameLayout//android.widget.RadioButton[@text="${targetOption}"]`;
    const radioButton = await driver.$(radioBtnXPath);

    await radioButton.waitForDisplayed({ timeout: 5000 }).catch(() => null);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');

        if (isChecked === 'true') {
            console.log(`➡ Default matches input: "Is the Baby alive?" is already set to "${targetOption}".`);
        } else {
            console.log(`➡ Default does not match input. Clicking "${targetOption}"...`);
            await radioButton.click();
            await driver.pause(500);
            console.log(`✔ "Is the Baby alive?" successfully changed to "${targetOption}".`);
        }
    } else {
        console.error(`❌ Could not find the "${targetOption}" radio button for "Is the Baby alive?".`);
    }
}

async function fillBabyWeight(driver, weightInGrams) {
    console.log(`Processing "Baby Weight (Gram) *" field... Expected: ${weightInGrams}`);

    const weightFieldXPath = `//android.widget.EditText[${ciContains('@hint', 'weight in gram')}]`;
    const weightField = await driver.$(weightFieldXPath);

    await weightField.waitForDisplayed({ timeout: 5000 }).catch(() => null);

    if (await weightField.isExisting()) {
        const currentText = await weightField.getText();
        const hintText = 'Enter weight in gram (e.g. 1000)';

        const needsFill = !currentText || currentText.trim() === '' || currentText.trim() === hintText;
        const alreadyCorrect = currentText.trim() === String(weightInGrams);

        if (!alreadyCorrect) {
            await weightField.click();
            await driver.pause(500);
            await weightField.clearValue();
            await weightField.setValue(String(weightInGrams));
            await driver.pause(500);
            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
            }
            console.log(`✔ "Baby Weight" ${needsFill ? 'filled' : 'updated'} successfully with: ${weightInGrams}g`);
        } else {
            console.log(`➡ Default matches input: "Baby Weight" is already set to ${currentText}g.`);
        }
    } else {
        console.error('❌ Could not find the "Baby Weight (Gram) *" text field.');
    }
}

async function selectRadioOption(driver, fieldLabel, expectedOption) {
    console.log(`Processing "${fieldLabel}" field... Expected: ${expectedOption}`);

    const labelXPath = `//android.widget.TextView[contains(@text, "${fieldLabel}")]`;
    const labelEl = await scrollUntilVisible(driver, () => driver.$(labelXPath));

    if (!labelEl) {
        console.error(`❌ Could not find field label containing: "${fieldLabel}" on the screen.`);
        return;
    }

    const radioBtnXPath = `//android.widget.TextView[contains(@text, "${fieldLabel}")]/following-sibling::android.widget.FrameLayout//android.widget.RadioButton[@text="${expectedOption}"]`;
    const radioButton = await driver.$(radioBtnXPath);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');

        if (isChecked === 'true') {
            console.log(`➡ Default matches input: "${fieldLabel}" is already set to "${expectedOption}".`);
        } else {
            console.log(`➡ Default does not match input. Clicking "${expectedOption}"...`);
            await radioButton.click();
            await driver.pause(500);
            console.log(`✔ "${fieldLabel}" successfully changed to "${expectedOption}".`);
        }
    } else {
        console.error(`❌ Could not find the "${expectedOption}" radio button for "${fieldLabel}".`);
    }
}

async function fillTemperature(driver, tempValue) {
    console.log(`Processing "Temperature *" field... Expected: ${tempValue}`);

    const tempFieldXPath = `//android.widget.EditText[${ciContains('@hint', 'e.g. 98.6')}]`;
    const tempField = await scrollUntilVisible(driver, () => driver.$(tempFieldXPath));

    if (!tempField) {
        console.error('❌ Could not find the "Temperature *" text field.');
        return;
    }

    const currentText = await tempField.getText();
    const alreadyCorrect = currentText.trim() === String(tempValue);

    if (!alreadyCorrect) {
        await tempField.click();
        await driver.pause(500);
        await tempField.clearValue();
        await tempField.setValue(String(tempValue));
        await driver.pause(500);
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }
        console.log(`✔ "Temperature" set to: ${tempValue}`);
    } else {
        console.log(`➡ Default matches input: "Temperature" is already set to ${currentText}.`);
    }
}

async function fillUmbilicalStump(driver, expectedOption) {
    console.log(`Processing "Condition of Umbilical Stump" field... Expected: ${expectedOption}`);

    const fieldXPath = `//android.widget.EditText[${ciContains('@hint', 'umbilical stump')}]`;
    const field = await scrollUntilVisible(driver, () => driver.$(fieldXPath));

    if (!field) {
        console.error(`❌ Could not find "Condition of Umbilical Stump" field on the screen.`);
        return;
    }

    const currentText = await field.getText();

    if (currentText.trim() === expectedOption.trim()) {
        console.log(`➡ Default matches input: "Condition of Umbilical Stump" is already set to "${expectedOption}".`);
    } else {
        await field.click();
        await driver.pause(1500);

        const opened = await selectFromListDialog(driver, expectedOption);
        if (opened) {
            console.log(`✔ "Condition of Umbilical Stump" successfully changed to "${expectedOption}".`);
        } else {
            console.error(`❌ Could not find option "${expectedOption}" in the dialog list.`);
            await driver.pressKeyCode(4);
        }
    }
}

async function verifyDeathFieldsAndCDRFormDisplayed(driver) {
    console.log('Verifying that death-related fields are displayed...');

    const dateOfDeathLabel = await scrollUntilVisible(
        driver,
        () => driver.$(`//android.widget.TextView[${ciContains('@text', 'date of death')}]`)
    );
    const reasonLabel = await scrollUntilVisible(
        driver,
        () => driver.$(`//android.widget.TextView[${ciContains('@text', 'reason for death')}]`)
    );
    const placeLabel = await scrollUntilVisible(
        driver,
        () => driver.$(`//android.widget.TextView[${ciContains('@text', 'place of death')}]`)
    );

    if (dateOfDeathLabel) console.log('✔ "Date of Death" field is displayed.');
    if (reasonLabel) console.log('✔ "Reason for Death" field is displayed.');
    if (placeLabel) console.log('✔ "Place of Death" field is displayed.');

    return Boolean(dateOfDeathLabel) && Boolean(reasonLabel) && Boolean(placeLabel);
}

async function fillDateOfDeath(driver, dateString) {
    console.log(`Processing "Date of Death" field... Expected: ${dateString}`);

    const fieldXPath = `//android.widget.EditText[${ciContains('@hint', 'date of death')}]`;
    const field = await scrollUntilVisible(driver, () => driver.$(fieldXPath));

    if (!field) {
        console.error('❌ Could not find the "Date of Death" field.');
        return;
    }

    const currentText = await field.getText();
    if (currentText === dateString) {
        console.log(`➡ Default matches input: "Date of Death" is already set to ${dateString}.`);
        return;
    }

    await field.click();
    await driver.pause(1000);
    await pickDateFromCalendar(driver, parseDdMmYyyy(dateString));
    console.log(`✔ "Date of Death" set to: ${dateString}`);
}

async function fillReasonOfDeath(driver, reasonText) {
    console.log(`Processing "Reason for Death" field... Expected: ${reasonText}`);

    if (!VALID_REASONS_FOR_DEATH.includes(reasonText)) {
        console.error(`❌ "${reasonText}" is not a valid option.`);
        return;
    }

    const fieldXPath = `//android.widget.EditText[${ciContains('@hint', 'reason for death')}]`;
    const field = await scrollUntilVisible(driver, () => driver.$(fieldXPath));

    if (!field) {
        console.error('❌ Could not find "Reason for Death" field.');
        return;
    }

    const currentText = await field.getText();
    if (currentText.trim() === reasonText.trim()) {
        console.log(`➡ Default matches input: "Reason for Death" is already set to "${reasonText}".`);
        return;
    }

    await field.click();
    await driver.pause(1000);

    const selected = await selectFromListDialog(driver, reasonText);
    if (selected) {
        console.log(`✔ "Reason for Death" set to: ${reasonText}`);
    } else {
        await driver.pressKeyCode(4);
    }
}

async function fillPlaceOfDeath(driver, expectedOption) {
    console.log(`Processing "Place of Death" field... Expected: ${expectedOption}`);

    if (!VALID_PLACES_OF_DEATH.includes(expectedOption)) {
        console.error(`❌ "${expectedOption}" is not a valid option.`);
        return;
    }

    const fieldXPath = `//android.widget.EditText[${ciContains('@hint', 'place of death')}]`;
    const field = await scrollUntilVisible(driver, () => driver.$(fieldXPath));

    if (!field) {
        console.error('❌ Could not find "Place of Death" field.');
        return;
    }

    const currentText = await field.getText();
    if (currentText.trim() === expectedOption.trim()) {
        console.log(`➡ Default matches input: "Place of Death" already set to "${expectedOption}".`);
        return;
    }

    await field.click();
    await driver.pause(1000);

    const selected = await selectFromListDialog(driver, expectedOption);
    if (selected) {
        console.log(`✔ "Place of Death" set to: ${expectedOption}`);
    } else {
        await driver.pressKeyCode(4);
    }
}

async function fillCDRTextField(driver, hintSubstring, value) {
    console.log(`Processing CDR field with hint containing "${hintSubstring}"... Expected: ${value}`);

    const fieldXPath = `//android.widget.EditText[${ciContains('@hint', hintSubstring)}]`;
    const field = await scrollUntilVisible(driver, () => driver.$(fieldXPath));

    if (!field) return;

    const currentText = await field.getText();
    if (currentText.trim() === String(value).trim()) {
        console.log(`➡ Default matches input for "${hintSubstring}".`);
        return;
    }

    await field.click();
    await driver.pause(500);
    await field.clearValue();
    await field.setValue(String(value));
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
    }
    console.log(`✔ CDR field "${hintSubstring}" set to: ${value}`);
}

async function dismissInfantDeathReportedDialog(driver) {
    console.log('Checking for "Infant Death Reported" confirmation dialog...');
    const titleXPath = `//android.widget.TextView[@resource-id="android:id/alertTitle" and @text="Infant Death Reported"]`;
    const okBtnXPath = `//android.widget.Button[@resource-id="android:id/button1" and @text="OK"]`;

    try {
        const titleEl = await driver.$(titleXPath);
        const appeared = await titleEl.waitForDisplayed({ timeout: 5000 }).catch(() => false);

        if (!appeared) return;

        const okBtn = await driver.$(okBtnXPath);
        await okBtn.waitForDisplayed({ timeout: 3000 });
        await okBtn.click();
        console.log('✔ Dismissed "Infant Death Reported" dialog by clicking "OK".');
        await driver.pause(1000);
    } catch (e) {
        // Ignore if not found
    }
}

async function clickSubmit(driver) {
    console.log('Processing Submit button...');
    const submitBtnXPath = `//android.widget.Button[@resource-id="${APP_ID}:id/btnSave" and @text="Submit"]`;
    const submitBtn = await scrollUntilVisible(driver, () => driver.$(submitBtnXPath));

    if (!submitBtn) {
        console.error('❌ Could not find or click the "Submit" button. It might be hidden or disabled.');
        return;
    }

    await submitBtn.click();
    console.log('✔ Successfully clicked the "Submit" button.');
}

// ── Main Test ──────────────────────────────────────────────────────────────────
// ── Main Test ──────────────────────────────────────────────────────────────────

async function runTest() {
    let driver;
    try {
        driver = await remote(wdOpts);

        // 1. Home -> Child Care -> Newborn List
        await clickChildCare(driver);
        await clickGridModule(driver, 'Newborn list');
        await driver.pause(2000);

        const MAX_BENEFICIARY_ATTEMPTS = 5;
        const triedBeneficiaries = new Set();
        let beneficiaryName = null;
        let visitFormOpened = false;

        // 2. Click an eligible HBNC button using the optimized XPath
        for (let attempt = 1; attempt <= MAX_BENEFICIARY_ATTEMPTS && !visitFormOpened; attempt++) {
            console.log(`\n── Beneficiary selection attempt ${attempt} of ${MAX_BENEFICIARY_ATTEMPTS} ──`);

            beneficiaryName = await clickEligibleHBNCAndRememberName(driver, triedBeneficiaries);
            console.log(`📌 Trying beneficiary: "${beneficiaryName}"`);

            visitFormOpened = await clickAddVisitForDay(driver, '1st Day');

            if (!visitFormOpened) {
                console.warn(`⚠ Beneficiary "${beneficiaryName}" has no available "1st Day" visit. Going back to try another...`);
                await navigateBackToNewbornList(driver);
            }
        }

        if (!visitFormOpened) {
            throw new Error(`❌ Could not find a beneficiary with an available "1st Day" visit after ${MAX_BENEFICIARY_ATTEMPTS} attempts.`);
        }

        console.log(`📌 Proceeding with beneficiary: "${beneficiaryName}"`);
        await driver.pause(2000);

        // 4. Fill mandatory HBNC visit details
        await handleVisitDate(driver, '15-02-2026');

        // 5. Baby Alive = No
        const IS_BABY_ALIVE = 'No';
        await handleIsBabyAlive(driver, IS_BABY_ALIVE);
        await driver.pause(800);

        if (IS_BABY_ALIVE.toLowerCase() === 'no') {
            console.log('ℹ Baby is not alive — skipping vitals section and going straight to death fields.');

            const deathSectionVisible = await verifyDeathFieldsAndCDRFormDisplayed(driver);
            if (!deathSectionVisible) {
                console.warn('⚠ Proceeding anyway, but not all death-related fields were confirmed visible.');
            }

            await fillDateOfDeath(driver, '15-02-2026');
            await fillReasonOfDeath(driver, 'Asphyxia');
            await fillPlaceOfDeath(driver, 'Home');
        } else {
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
            await selectRadioOption(driver, 'Jaundice', 'No');
            await fillUmbilicalStump(driver, 'Falling Off');
            await selectRadioOption(driver, 'Is Baby discharge from SNCU?', 'No');
        }

        // 6. Submit
        await clickSubmit(driver);
        await driver.pause(2000);

        // 6b. Dismiss death confirmation if it appears
        if (IS_BABY_ALIVE.toLowerCase() === 'no') {
            await dismissInfantDeathReportedDialog(driver);
        }

        // 9. Go to Home
        await goToHome(driver);

        // 10. Verify Death Report
        if (IS_BABY_ALIVE.toLowerCase() === 'no') {
            console.log('\n── Verifying Death Report ──');

            // Navigate to Death Reports -> Child Deaths
            await clickDeathReportsModule(driver);
            await clickChildDeathsCardIfPresent(driver);

            // Search for the remembered beneficiary name
            await searchBeneficiary(driver, beneficiaryName);

            console.log(`Checking if "${beneficiaryName}" appears in the search results...`);

            // Validate the presence of the name in the results list
            const searchResultXPath = `//android.widget.TextView[@resource-id="${APP_ID}:id/tv_hh_id" and contains(@text, "${beneficiaryName}")]`;
            const searchResult = await driver.$(searchResultXPath);

            const isFound = await searchResult.waitForDisplayed({ timeout: 10000 }).catch(() => false);

            if (isFound) {
                console.log(`✅ TEST PASSED: Beneficiary "${beneficiaryName}" successfully found in the Child Deaths Report!`);
            } else {
                throw new Error(`❌ TEST FAILED: Beneficiary "${beneficiaryName}" was NOT found in the Child Deaths Report after searching.`);
            }
        } else {
            console.log(`✅ Test completed. (Baby reported alive, skipping death report validation).`);
        }

    } catch (error) {
        console.error('Error during test execution:', error);
    } finally {
        if (driver) {
            await driver.pause(2000);
            await driver.deleteSession();
        }
    }
}

runTest();