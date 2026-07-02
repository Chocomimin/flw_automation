const { remote } = require('webdriverio');

// ─────────────────────────────────────────────────────────────
//  CAPABILITIES
// ─────────────────────────────────────────────────────────────

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true,
    'appium:uiautomator2ServerInstallTimeout': 60000,
    'appium:uiautomator2ServerLaunchTimeout': 60000,
    'appium:uiautomator2ServerReadTimeout': 60000,
    'appium:adbExecTimeout': 60000,
    'appium:androidInstallTimeout': 120000,
    'appium:newCommandTimeout': 300,
    'appium:shouldTerminateApp': false,
    'appium:skipDeviceInitialization': false,
    'appium:disableWindowAnimation': true,
};

const wdioOptions = {
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities,
    logLevel: 'error',
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
};

const PACKAGE = 'org.piramalswasthya.sakhi.saksham.uat';

// ─────────────────────────────────────────────────────────────
//  FORM DATA (Dates removed as they are now dynamically randomized)
// ─────────────────────────────────────────────────────────────

// EC Tracking form data
const EC_FORM_DATA = {
    isPregnancyTestDone: 'Yes',
    pregnancyTestResult: 'Positive',
    isWomanPregnant:     'Yes',
};

// Pregnancy Registration form data
const PREG_FORM_DATA = {
    rchId:                         '123456789967',
    bloodGroup:                    'B +Ve',
    weight:                        '55',
    height:                        '160',
    previousPregnancies:           '1',
    lastPregnancyComplication:     'Any Other',
    anyOtherComplicationDetails:   'Severe weakness',
    moreThanThreeDeliveries:       'No',
    timeFromLastDelivery:          'No',
    heightShortness:               'Yes',
    ageRiskFactor:                 'Yes',
    rhNegative:                    'Yes',
    homeDeliveryPreviousPregnancy: 'No',
    badObstetricHistory:           'No',
    multiplePregnancy:             'No',
    hrpIdentifier:                 'ANM',
};

// ─────────────────────────────────────────────────────────────
//  SHARED LOW-LEVEL HELPERS
// ─────────────────────────────────────────────────────────────

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

async function scrollFormDown(driver) {
    await driver.execute('mobile: swipeGesture', {
        left: 540, top: 1800, width: 400, height: 400,
        direction: 'up', percent: 0.6
    });
    await driver.pause(1000);
}

async function scrollSpinnerToMiddle(driver, spinnerSelector) {
    try {
        const spinner = await driver.$(spinnerSelector);
        const loc    = await spinner.getLocation();
        const screen = await driver.getWindowRect();
        const midY   = screen.height / 2;

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

    // Strategy 0: XPath
    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`✅ Selected "${value}" via XPath`);
        return;
    } catch (e) { console.log(`⚠️  XPath strategy failed: ${e.message}`); }

    // Strategy 1: UiSelector
    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via UiSelector`);
        return;
    } catch (e) { console.log(`⚠️  UiSelector strategy failed: ${e.message}`); }

    // Strategy 2: Tag-parse XML
    try {
        const source = await driver.getPageSource();
        const nodes  = source.match(/<[^>]+>/g) || [];
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const textRegex    = new RegExp(`(?:text|content-desc)="\\s*${escapedValue}\\s*"`);
        let foundNode = null;
        for (const node of nodes) {
            if (textRegex.test(node) && node.includes('bounds=')) { foundNode = node; break; }
        }
        if (foundNode) {
            const m = foundNode.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
            if (m) {
                await tapByCoords(driver,
                    Math.floor((parseInt(m[1]) + parseInt(m[3])) / 2),
                    Math.floor((parseInt(m[2]) + parseInt(m[4])) / 2)
                );
                console.log(`✅ Selected "${value}" via tag parse`);
                return;
            }
        }
    } catch (e) { console.log(`⚠️  Tag parse failed: ${e.message}`); }

    // Strategy 3: Inline regex
    try {
        const source = await driver.getPageSource();
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex  = new RegExp(`text="${escapedValue}"[^/]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
        const match  = source.match(regex);
        if (match) {
            await tapByCoords(driver,
                Math.floor((parseInt(match[1]) + parseInt(match[3])) / 2),
                Math.floor((parseInt(match[2]) + parseInt(match[4])) / 2)
            );
            console.log(`✅ Selected "${value}" via regex`);
            return;
        }
    } catch (e) { console.log(`⚠️  Regex strategy failed: ${e.message}`); }

    // Strategy 4: Coordinate fallback
    const screen = await driver.getWindowRect();
    const idx    = optionsList.indexOf(value);
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
//  DYNAMIC RANDOM CALENDAR HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Interacts with the visible DatePicker, randomly navigates back a few months,
 * filters for enabled/clickable days, and taps a random one.
 * @param {object} driver - The WebdriverIO instance
 * @param {number} maxMonthsBack - Maximum number of times to hit "Previous Month"
 */
async function pickRandomEnabledDateUI(driver, maxMonthsBack = 0) {
    const datePicker = await driver.$('android=new UiSelector().resourceId("android:id/datePicker")');
    await datePicker.waitForDisplayed({ timeout: 5000 });
    await driver.pause(500);

    // 1. Randomly navigate backwards in months (which naturally changes years too)
    const monthsToGoBack = Math.floor(Math.random() * (maxMonthsBack + 1));
    if (monthsToGoBack > 0) {
        console.log(`   🎲 Navigating back ${monthsToGoBack} month(s)...`);
        for (let i = 0; i < monthsToGoBack; i++) {
            try {
                const prevBtn = await driver.$('//android.widget.ImageButton[@resource-id="android:id/prev"]');
                if (await prevBtn.isDisplayed()) {
                    await prevBtn.click();
                    await driver.pause(700);
                }
            } catch (e) {
                console.log('   ⚠️ Reached earliest accessible month.');
                break;
            }
        }
    }

    // 2. Fetch all day elements currently shown in the calendar grid
    const days = await driver.$$('//android.view.View[@resource-id="android:id/month_view"]/android.view.View');
    let enabledDays = [];

    // 3. Filter for days that are interactable (enabled="true") and have text
    for (const day of days) {
        const isEnabled = await day.getAttribute('enabled');
        const contentDesc = await day.getAttribute('content-desc');

        if (isEnabled === 'true' && contentDesc && contentDesc.trim().length > 0) {
            enabledDays.push({ element: day, desc: contentDesc });
        }
    }

    // 4. Select a completely random date from the valid array
    if (enabledDays.length > 0) {
        const randomSelection = enabledDays[Math.floor(Math.random() * enabledDays.length)];
        console.log(`   👆 Tapping random valid day: "${randomSelection.desc}"`);
        await randomSelection.element.click();
        await driver.pause(600);
    } else {
        console.log('   ⚠️ No enabled dates found in this month. Proceeding with default.');
    }

    // 5. Confirm the selection
    const okBtn = await driver.$('android=new UiSelector().resourceId("android:id/button1")');
    await okBtn.waitForDisplayed({ timeout: 3000 });
    await okBtn.click();
    await driver.pause(800);
}

// ─────────────────────────────────────────────────────────────
//  EC TRACKING FORM HELPERS
// ─────────────────────────────────────────────────────────────

async function selectRadioEC(driver, questionText, optionText) {
    console.log(`\n🔘 "${questionText.substring(0, 60)}" → "${optionText}"`);

    try {
        await driver.execute('mobile: scroll', {
            strategy: '-android uiautomator',
            selector: `new UiSelector().text("${questionText}")`
        });
        await driver.pause(1000);
    } catch (_) {}

    const xp =
        `//android.widget.TextView[@text="${questionText}"]` +
        `/ancestor::android.widget.LinearLayout[@resource-id="${PACKAGE}:id/ll_content"]` +
        `/android.widget.RadioGroup[@resource-id="${PACKAGE}:id/rg"]` +
        `/android.widget.RadioButton[@text="${optionText}"]`;

    const radio = await driver.$(xp);
    await radio.waitForDisplayed({ timeout: 8000 });

    if ((await radio.getAttribute('checked')) === 'true') {
        console.log('   ℹ️  Already selected');
        return;
    }

    await radio.click();
    await driver.pause(1500);
    console.log(`   ✅ "${optionText}" selected`);

    if ((await radio.getAttribute('checked')) !== 'true') {
        console.warn('   ⚠️  Retrying click...');
        await radio.click();
        await driver.pause(1000);
    }
}

async function fillRandomDateFieldEC(driver, hint, maxMonthsBack = 0) {
    console.log(`\n📅 Opening "${hint}" to pick random valid date...`);
    const field = await driver.$(`//android.widget.EditText[@hint="${hint}"]`);
    await field.waitForDisplayed({ timeout: 8000 });
    await field.click();
    await driver.pause(2000);

    await pickRandomEnabledDateUI(driver, maxMonthsBack);
}

// ─────────────────────────────────────────────────────────────
//  RANDOM BENEFICIARY SELECTION + ADD VISIT
// ─────────────────────────────────────────────────────────────

async function getVisibleBeneficiaryNames(driver) {
    const nameElements = await driver.$$(`//*[@resource-id="${PACKAGE}:id/tv_hh_ec_id"]`);
    const names = [];
    for (const el of nameElements) {
        try {
            const txt = await el.getText();
            if (txt && txt.trim().length > 0) names.push(txt.trim());
        } catch (_) {}
    }
    return names;
}

async function tryAddVisitForName(driver, name) {
    console.log(`\n🎯 Trying ADD VISIT for: "${name}"`);

    try {
        await driver.execute('mobile: scroll', {
            strategy: '-android uiautomator',
            selector:
                `new UiScrollable(new UiSelector().resourceId("${PACKAGE}:id/rv_any"))` +
                `.scrollIntoView(new UiSelector().text("${name}"))`
        });
        await driver.pause(1000);
    } catch (_) {}

    const addBtnXPath =
        `//android.widget.TextView[@resource-id="${PACKAGE}:id/tv_hh_ec_id" and @text="${name}"]` +
        `/ancestor::android.widget.FrameLayout[@resource-id="${PACKAGE}:id/cv_content"]` +
        `//android.widget.Button[@resource-id="${PACKAGE}:id/btn_add"]`;

    try {
        const btn       = await driver.$(addBtnXPath);
        const displayed = await btn.isDisplayed().catch(() => false);
        if (!displayed) {
            console.log(`   ⚠️  ADD VISIT button not visible for "${name}"`);
            return false;
        }
        await btn.click();
        await driver.pause(3000);
    } catch (e) {
        console.log(`   ⚠️  Could not click ADD VISIT for "${name}": ${e.message}`);
        return false;
    }

    // Check form opened
    try {
        const field  = await driver.$(`//android.widget.EditText[@hint="Date of Visit *"]`);
        const opened = await field.isDisplayed().catch(() => false);
        if (opened) { console.log(`   ✅ Form opened for "${name}"`); return true; }
    } catch (_) {}

    try {
        const submit = await driver.$(`//android.widget.Button[@resource-id="${PACKAGE}:id/btn_submit"]`);
        const opened = await submit.isDisplayed().catch(() => false);
        if (opened) { console.log(`   ✅ Form opened for "${name}"`); return true; }
    } catch (_) {}

    console.log(`   ❌ Form did NOT open for "${name}" — Back and try next`);
    await driver.back();
    await driver.pause(2000);
    return false;
}

async function selectRandomAndAddVisit(driver) {
    console.log('\n📋 Collecting beneficiary names...');
    const allNames = new Set();

    // Scroll to top
    try {
        await driver.execute('mobile: scroll', {
            strategy: '-android uiautomator',
            selector: `new UiScrollable(new UiSelector().resourceId("${PACKAGE}:id/rv_any")).scrollToBeginning(5)`
        });
        await driver.pause(1500);
    } catch (_) {}

    // Collect names across 5 scroll passes
    for (let pass = 0; pass < 5; pass++) {
        (await getVisibleBeneficiaryNames(driver)).forEach(n => allNames.add(n));
        if (pass < 4) {
            await driver.execute('mobile: swipeGesture', {
                left: 540, top: 1800, width: 400, height: 400,
                direction: 'up', percent: 0.6
            });
            await driver.pause(1000);
        }
    }

    // Scroll back to top
    try {
        await driver.execute('mobile: scroll', {
            strategy: '-android uiautomator',
            selector: `new UiScrollable(new UiSelector().resourceId("${PACKAGE}:id/rv_any")).scrollToBeginning(5)`
        });
        await driver.pause(1500);
    } catch (_) {}

    const nameList = [...allNames];
    console.log(`📊 Found ${nameList.length} beneficiaries: ${nameList.join(', ')}`);
    if (nameList.length === 0) throw new Error('No beneficiaries found in the list');

    // Shuffle
    for (let i = nameList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nameList[i], nameList[j]] = [nameList[j], nameList[i]];
    }

    const triedNames = new Set();
    for (const name of nameList) {
        if (triedNames.has(name)) continue;
        triedNames.add(name);
        const success = await tryAddVisitForName(driver, name);
        if (success) {
            console.log(`\n✅ Proceeding with beneficiary: "${name}"`);
            return name;
        }
    }
    throw new Error('Could not open ADD VISIT form for any beneficiary');
}

// ─────────────────────────────────────────────────────────────
//  EC TRACKING FORM
// ─────────────────────────────────────────────────────────────

async function fillECTrackingForm(driver) {
    console.log('\n📝 Filling EC Tracking Form...');
    console.log('─────────────────────────────────────────');

    // Date of Visit: Stay in current month to avoid "Visit date cannot be future/too old" errors
    await fillRandomDateFieldEC(driver, 'Date of Visit *', 0);

    // LMP Date: Can be older
    await fillRandomDateFieldEC(driver, 'LMP Date *', 6);

    await selectRadioEC(driver, 'Is Pregnancy Test done?', 'Yes');
    await driver.pause(1500);

    console.log('\n📌 Test = Yes → Result = Positive');
    await selectRadioEC(driver, 'Pregnancy Test Result *', 'Positive');
    await driver.pause(1500);

    console.log('\n📌 Result = Positive → Is the woman pregnant? = Yes');
    await selectRadioEC(driver, 'Is the woman pregnant?', 'Yes');
    await driver.pause(1500);

    console.log('\n🚀 Submitting EC Tracking form...');
    await scrollFormDown(driver);
    await driver.pause(500);

    const submitBtn = await driver.$(`//android.widget.Button[@resource-id="${PACKAGE}:id/btn_submit"]`);
    await submitBtn.waitForDisplayed({ timeout: 8000 });
    await submitBtn.click();
    await driver.pause(4000);
    console.log('✅ EC Tracking form submitted!');
}

// ─────────────────────────────────────────────────────────────
//  PREGNANCY REGISTRATION — INDIVIDUAL FIELD FUNCTIONS
// ─────────────────────────────────────────────────────────────

async function getFieldByIndex(driver, index, retries = 5) {
    for (let i = 0; i < retries; i++) {
        const fields = await driver.$$(`android=new UiSelector().resourceId("${PACKAGE}:id/et")`);
        if (fields.length > index) return fields[index];
        await driver.pause(1000);
    }
    throw new Error(`Could not find field at index ${index} after ${retries} retries`);
}

async function isEmpty(field, hintText) {
    try {
        const text = await field.getText();
        return !text || text.trim() === '' || text.trim() === hintText.trim();
    } catch { return true; }
}

async function fillDateOfRegistration(driver) {
    console.log('\n📅 Filling Date of Registration...');
    const field = await getFieldByIndex(driver, 0);
    if (await isEmpty(field, 'Date of Registration *')) {
        await field.click();
        await driver.pause(800);
        await pickRandomEnabledDateUI(driver, 0);
        console.log('✔ Date of Registration filled with random valid date');
    } else {
        console.log('⏭ Date of Registration already filled');
    }
}

async function fillRchId(driver) {
    console.log('\n📝 Filling RCH ID...');
    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("RCH ID"))`);
        await driver.pause(500);
    } catch (_) {}

    const field = await getFieldByIndex(driver, 1);
    if (await isEmpty(field, 'RCH ID')) {
        await field.click();
        await driver.pause(500);
        await field.setValue(PREG_FORM_DATA.rchId);
        if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(500); }
        console.log('✔ RCH ID filled');
    } else {
        console.log('⏭ RCH ID already filled');
    }
}

async function fillLmpDatePreg(driver) {
    console.log('\n📅 Filling LMP Date...');
    const field = await getFieldByIndex(driver, 5);
    if (await isEmpty(field, 'LMP Date *')) {
        await field.click();
        await driver.pause(800);
        await pickRandomEnabledDateUI(driver, 6);
        console.log('✔ LMP Date filled with random valid date');
    } else {
        console.log('⏭ LMP Date already filled');
    }
}

async function fillBloodGroup(driver) {
    console.log('\n🩸 Filling Blood Group...');
    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Blood Group"))');
        await driver.pause(500);
    } catch (_) {}

    const spinnerSelector = 'android=new UiSelector().className("android.widget.Spinner").textContains("Blood Group")';
    const spinner         = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 5000 });
    const currentValue    = await spinner.getText();

    if (!currentValue || currentValue.trim() === 'Blood Group') {
        await clickSpinnerAndSelectOption(
            driver, spinnerSelector, PREG_FORM_DATA.bloodGroup,
            ['A +Ve', 'A -Ve', 'B +Ve', 'B -Ve', 'AB +Ve', 'AB -Ve', 'O +Ve', 'O -Ve']
        );
        console.log(`✔ Blood Group set to ${PREG_FORM_DATA.bloodGroup}`);
    } else {
        console.log(`⏭ Blood Group already: ${currentValue}`);
    }
}

async function fillWeight(driver) {
    console.log('\n⚖️  Filling Weight...');
    await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Weight of PW (Kg) at time Registration"))`);
    await driver.pause(500);

    const field = await driver.$('//android.widget.EditText[@text="Weight of PW (Kg) at time Registration"]');
    await field.waitForDisplayed({ timeout: 5000 });

    if (await isEmpty(field, 'Weight of PW (Kg) at time Registration')) {
        await field.click();
        await driver.pause(500);
        await field.setValue(PREG_FORM_DATA.weight);
        if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(500); }
        console.log('✔ Weight filled');
    } else {
        console.log('⏭ Weight already filled');
    }
}

async function fillHeight(driver) {
    console.log('\n📏 Filling Height...');
    await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Height of PW (Cm)"))`);
    await driver.pause(500);

    const field = await driver.$('//android.widget.EditText[@text="Height of PW (Cm)"]');
    await field.waitForDisplayed({ timeout: 5000 });

    if (await isEmpty(field, 'Height of PW (Cm)')) {
        await field.click();
        await driver.pause(500);
        await field.setValue(PREG_FORM_DATA.height);
        if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(500); }
        console.log('✔ Height filled');
    } else {
        console.log('⏭ Height already filled');
    }
}

async function fillDiseaseInformation(driver) {
    console.log('\n🏥 Filling Disease Information (None)...');
    await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("None"))`);
    const noneCheckbox = await driver.$('android=new UiSelector().className("android.widget.CheckBox").text("None")');
    await noneCheckbox.waitForDisplayed({ timeout: 5000 });
    await noneCheckbox.click();
    console.log('✔ Clicked None');
}

async function fillLastPregnancyComplication(driver) {
    const targetValue = PREG_FORM_DATA.lastPregnancyComplication;
    console.log(`\n🔽 Selecting complication: ${targetValue}`);

    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().hint("Any complications in Last Pregnancy"))');
        await driver.pause(500);
    } catch (_) {}

    // Tap the dropdown arrow of the complication spinner
    try {
        const spinner = await driver.$('android=new UiSelector().hint("Any complications in Last Pregnancy")');
        await spinner.waitForDisplayed({ timeout: 5000 });
        const loc  = await spinner.getLocation();
        const size = await spinner.getSize();
        const tapX = Math.floor(loc.x + size.width - 50);
        const tapY = Math.floor(loc.y + size.height / 2);
        console.log(`📍 Tapping complication spinner arrow at (${tapX}, ${tapY})`);
        await tapByCoords(driver, tapX, tapY);
        await driver.pause(2000);
    } catch (e) {
        console.log('⚠️  Spinner hint fallback:', e.message);
        const allSpinners = await driver.$$(`android=new UiSelector().resourceId("${PACKAGE}:id/actv_rv_dropdown")`);
        const last = allSpinners[allSpinners.length - 1];
        await last.click();
        await driver.pause(2000);
    }

    const optionsList = [
        'None', 'CONVULSIONS', 'APH',
        'PREGNANCY INDUCED HYPERTENSION (PIH)', 'REPEATED ABORTION',
        'STILLBIRTH', 'CONGENITAL ANOMALY', 'CAESAREAN SECTION',
        'BLOOD TRANSFUSION', 'TWINS', 'OBSTRUCTED LABOUR', 'PPH', 'Any Other'
    ];

    let selected = false;

    // Strategy A: CheckedTextView UiSelector
    if (!selected) {
        try {
            const item = await driver.$(
                `android=new UiSelector().resourceId("android:id/text1").className("android.widget.CheckedTextView").text("${targetValue}")`
            );
            await item.waitForDisplayed({ timeout: 5000 });
            await item.click();
            console.log(`✅ Selected "${targetValue}" via CheckedTextView`);
            selected = true;
        } catch (e) { console.log(`⚠️  CheckedTextView failed: ${e.message}`); }
    }

    // Strategy B: XPath
    if (!selected) {
        try {
            const item = await driver.$(
                `//android.widget.CheckedTextView[@text="${targetValue}" and @resource-id="android:id/text1"]`
            );
            await item.waitForDisplayed({ timeout: 4000 });
            await item.click();
            console.log(`✅ Selected "${targetValue}" via XPath`);
            selected = true;
        } catch (e) { console.log(`⚠️  XPath failed: ${e.message}`); }
    }

    // Strategy C: XML bounds
    if (!selected) {
        try {
            const source = await driver.getPageSource();
            const escapedValue = targetValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex    = new RegExp(`class="android\\.widget\\.CheckedTextView"[^>]*?text="${escapedValue}"[^>]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
            const altRegex = new RegExp(`text="${escapedValue}"[^>]*?class="android\\.widget\\.CheckedTextView"[^>]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
            const match    = source.match(regex) || source.match(altRegex);
            if (match) {
                await tapByCoords(driver,
                    Math.floor((parseInt(match[1]) + parseInt(match[3])) / 2),
                    Math.floor((parseInt(match[2]) + parseInt(match[4])) / 2)
                );
                console.log(`✅ Selected "${targetValue}" via XML bounds`);
                selected = true;
            }
        } catch (e) { console.log(`⚠️  XML bounds failed: ${e.message}`); }
    }

    // Strategy D: Coordinate fallback
    if (!selected) {
        const idx = optionsList.indexOf(targetValue);
        if (idx === -1) throw new Error(`"${targetValue}" not in optionsList`);
        const ROW_HEIGHT    = 102;
        const POPUP_START_Y = 759;
        const tapX = 540;
        const tapY = Math.floor(POPUP_START_Y + (idx * ROW_HEIGHT) + (ROW_HEIGHT / 2));
        console.log(`📍 Coordinate fallback → idx=${idx}, tap(${tapX}, ${tapY})`);
        await tapByCoords(driver, tapX, tapY);
        console.log(`✅ Selected "${targetValue}" via coordinate fallback`);
        selected = true;
    }


    if (targetValue === 'Any Other') {
        try {
            await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Any other Complication"))');
            await driver.pause(500);
            const anyOtherField = await driver.$('//android.widget.EditText[contains(@hint, "Any other Complication")]');
            await anyOtherField.waitForDisplayed({ timeout: 5000 });
            await anyOtherField.click();
            await driver.pause(300);

            // Convert the string to uppercase before setting the value
            const uppercaseDetails = PREG_FORM_DATA.anyOtherComplicationDetails.toUpperCase();
            await anyOtherField.setValue(uppercaseDetails);

            if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(500); }
            console.log(`✔ Any Other complication details filled: ${uppercaseDetails}`);
        } catch (e) { console.log('⚠️  Could not fill Any Other details:', e.message); }
    }

    console.log(`✔ Last Pregnancy Complication set to: ${targetValue}`);
}

async function fillFirstPregnancy(driver, answer = 'No') {
    console.log(`\n🤰 Setting "Is this your 1st pregnancy?" = ${answer}`);

    await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Is this your 1st pregnancy?"))`);
    await driver.pause(500);

    const radioBtn = await driver.$(`android=new UiSelector().className("android.widget.RadioButton").text("${answer}")`);
    await radioBtn.waitForDisplayed({ timeout: 5000 });
    await radioBtn.click();
    console.log(`✔ First Pregnancy set to: ${answer}`);

    if (answer === 'No') {
        console.log('📝 Handling previous pregnancy fields...');

        // Total no. of previous pregnancies
        try {
            const prevPregField = await driver.$('//android.widget.EditText[contains(@text, "Total no. of previous Pregnancy")]');
            if (await prevPregField.isExisting()) {
                await prevPregField.click();
                await prevPregField.setValue(PREG_FORM_DATA.previousPregnancies);
                if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(300); }
                console.log(`✔ Previous Pregnancies set to ${PREG_FORM_DATA.previousPregnancies}`);
            }
        } catch (e) { console.log('⚠️  Could not fill previous pregnancies:', e.message); }

        await fillLastPregnancyComplication(driver);
    }
}

async function fillRadioQuestion(driver, questionText, answer) {
    console.log(`\n🔘 "${questionText}" → ${answer}`);
    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${questionText}"))`);
        await driver.pause(500);

        const radioBtnXpath =
            `//android.widget.TextView[@text="${questionText}"]/../` +
            `following-sibling::android.widget.RadioGroup//android.widget.RadioButton[@text="${answer}"]`;
        const radioBtn = await driver.$(radioBtnXpath);
        await radioBtn.waitForDisplayed({ timeout: 5000 });

        if (await radioBtn.getAttribute('checked') === 'true') {
            console.log(`⏭ Already set to ${answer}`);
            return;
        }
        if (await radioBtn.getAttribute('clickable') === 'false' || await radioBtn.getAttribute('enabled') === 'false') {
            console.log(`⏭ Not clickable/disabled — skipping`);
            return;
        }

        await radioBtn.click();
        console.log(`✔ "${questionText}" = ${answer}`);
    } catch (e) {
        console.log(`⚠️  Could not interact with "${questionText}" — skipping`);
    }
}

async function fillHrpAndSubmit(driver) {
    console.log('\n🏷️  Filling HRP Identifier...');

    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Who had identified as HRP"))');
        await driver.pause(500);
    } catch (_) {}

    const spinnerSelector = `android=new UiSelector().resourceId("${PACKAGE}:id/actv_rv_dropdown").textContains("Who had identified as HRP")`;
    const hrpSpinner      = await driver.$(spinnerSelector);
    const isHrpPresent    = await hrpSpinner.isExisting();

    if (isHrpPresent) {
        const currentValue = await hrpSpinner.getText();
        const targetValue  = PREG_FORM_DATA.hrpIdentifier;

        if (currentValue !== targetValue) {
            await clickSpinnerAndSelectOption(
                driver, spinnerSelector, targetValue,
                ['ANM', 'CHO', 'PHC – MO', 'Specialist at Higher Facility']
            );
            console.log(`✔ HRP set to "${targetValue}"`);
        } else {
            console.log(`⏭ HRP already set to "${targetValue}"`);
        }
    } else {
        console.log('⏭ HRP field not present — skipping');
    }

    console.log('\n🚀 Submitting Pregnancy Registration form...');
    const submitBtn = await driver.$(`android=new UiSelector().resourceId("${PACKAGE}:id/btn_submit")`);
    await submitBtn.waitForDisplayed({ timeout: 10000 });
    await submitBtn.click();
    await driver.pause(3000);
    console.log('✅ Pregnancy Registration form submitted!');
}

// ─────────────────────────────────────────────────────────────
//  PREGNANCY REGISTRATION FORM — ORCHESTRATOR
// ─────────────────────────────────────────────────────────────

async function fillPregnancyRegistrationForm(driver) {
    console.log('\n🤰 Checking for Pregnancy Registration form...');
    await driver.pause(3000);

    // Detect if we navigated to the pregnancy registration screen
    let onPregnancyForm = false;
    const indicators = [
        'android=new UiSelector().textContains("Pregnancy Registration")',
        `android=new UiSelector().resourceId("${PACKAGE}:id/et")`,
        'android=new UiSelector().text("Date of Registration *")',
    ];

    for (const sel of indicators) {
        try {
            const el      = await driver.$(sel);
            const visible = await el.isDisplayed().catch(() => false);
            if (visible) {
                onPregnancyForm = true;
                console.log('   ✅ Pregnancy Registration form detected');
                break;
            }
        } catch (_) {}
    }

    if (!onPregnancyForm) {
        console.log('   ℹ️  No Pregnancy Registration form detected — skipping');
        return;
    }

    console.log('\n📋 Filling Pregnancy Registration form...');
    console.log('─────────────────────────────────────────');

    await fillDateOfRegistration(driver);
    await driver.pause(1000);

    await fillRchId(driver);
    await driver.pause(1000);

    await fillLmpDatePreg(driver);
    await driver.pause(1000);

    await fillBloodGroup(driver);
    await driver.pause(1000);

    await fillWeight(driver);
    await driver.pause(1000);

    await fillHeight(driver);
    await driver.pause(1000);

    await fillDiseaseInformation(driver);
    await driver.pause(1000);

    await fillFirstPregnancy(driver, 'No');
    await driver.pause(1000);

    await fillRadioQuestion(driver, 'No. of Deliveries is more than 3',               PREG_FORM_DATA.moreThanThreeDeliveries);
    await driver.pause(1000);

    await fillRadioQuestion(driver, 'Time from last delivery is less than 18 months',  PREG_FORM_DATA.timeFromLastDelivery);
    await driver.pause(1000);

    await fillRadioQuestion(driver, 'Height is very short or less than 140 cms',       PREG_FORM_DATA.heightShortness);
    await driver.pause(1000);

    await fillRadioQuestion(driver, 'Age is less than 18 or more than 35 years',       PREG_FORM_DATA.ageRiskFactor);
    await driver.pause(1000);

    await fillRadioQuestion(driver, 'Rh Negative',                                     PREG_FORM_DATA.rhNegative);
    await driver.pause(1000);

    await fillRadioQuestion(driver, 'Home delivery of previous pregnancy',              PREG_FORM_DATA.homeDeliveryPreviousPregnancy);
    await driver.pause(1000);

    await fillRadioQuestion(driver, 'Bad obstetric history',                            PREG_FORM_DATA.badObstetricHistory);
    await driver.pause(1000);

    await fillRadioQuestion(driver, 'Multiple Pregnancy',                               PREG_FORM_DATA.multiplePregnancy);
    await driver.pause(1000);

    await fillHrpAndSubmit(driver);
}

// ─────────────────────────────────────────────────────────────
//  NAVIGATION HELPERS
// ─────────────────────────────────────────────────────────────

async function clickEligibleCoupleList(driver) {
    console.log('👆 Clicking Eligible Couple List...');
    const el = await driver.$(
        `android=new UiSelector().resourceId("${PACKAGE}:id/textView2").textContains("Eligible")`
    );
    await el.waitForDisplayed({ timeout: 20000 });
    await el.click();
    await driver.pause(3000);
    console.log('✅ Clicked Eligible Couple List');
}

async function clickEligibleCoupleTracking(driver) {
    console.log('👆 Clicking Eligible Couple Tracking...');
    const card = await driver.$(
        `//android.widget.TextView[@text="Eligible Couple Tracking"]` +
        `/ancestor::android.widget.FrameLayout[@resource-id="${PACKAGE}:id/cv_icon"]`
    );
    await card.waitForDisplayed({ timeout: 15000 });
    await card.click();
    await driver.pause(3000);
    console.log('✅ On Eligible Couple Tracking list');
}

// ─────────────────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
    console.log('🚀 Starting Appium session...\n');
    let driver;
    try {
        driver = await remote(wdioOptions);
        await driver.pause(5000);

        // Step 1 — Navigate to EC Tracking list
        await clickEligibleCoupleList(driver);
        await clickEligibleCoupleTracking(driver);

        // Step 2 — Pick a random beneficiary and open ADD VISIT
        const chosenName = await selectRandomAndAddVisit(driver);
        console.log(`\n👤 Selected beneficiary: "${chosenName}"`);

        // Step 3 — Fill EC Tracking form
        await fillECTrackingForm(driver);

        // Step 4 — Fill Pregnancy Registration form (auto-detected after EC submit)
        await fillPregnancyRegistrationForm(driver);

        console.log('\n🎯 Full automation complete!');
    } catch (err) {
        console.error('❌ Test failed:', err.message);
        console.error(err.stack);
        process.exitCode = 1;
    } finally {
        if (driver) {
            console.log('🛑 Closing session...');
            await driver.deleteSession().catch(() => {});
        }
    }
}

main();