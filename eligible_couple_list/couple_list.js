'use strict';
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

const wdioOptions = {
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities: capabilities,
    logLevel: 'error'
};

// ─────────────────────────────────────────────────────────────
//  FORM DATA
// ─────────────────────────────────────────────────────────────

const FORM_DATA = {
    beneficiaryName: 'PARBIN AHMED',
    dateOfRegistration: { day: 19, month: 8, year: 2025 },
    rchId: '123456789012',
    lmpDate: { day: 15, month: 7, year: 2025 },

    // High Risk Assessment Answers ("Yes" or "No")
    deliveriesMoreThan3: 'Yes',
    timeFromLastDelivery: 'Yes',
    heightShort: 'Yes',
    ageRisk: 'Yes',
    miscarriage: 'Yes',
    homeDelivery: 'Yes',
    medicalIssues: 'Yes',
    pastCSection: 'Yes',
    bankAcNo: '1234567890',
    bankName: 'State Bank of India',
    branchName: 'Main Branch',
    ifscCode: 'SBIN0001234'
};

async function swipeVertical(driver, direction = 'up') {
    const screen = await driver.getWindowRect();
    const swipeX = Math.floor(screen.width / 2);
    const startY = direction === 'up' ? Math.floor(screen.height * 0.70) : Math.floor(screen.height * 0.30);
    const endY = direction === 'up' ? Math.floor(screen.height * 0.30) : Math.floor(screen.height * 0.70);

    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: swipeX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 80 },
            { type: 'pointerMove', duration: 600, x: swipeX, y: endY },
            { type: 'pointerUp', button: 0 },
        ],
    }]);
    await driver.releaseActions();
    await driver.pause(800); // Give UI time to settle
}

async function clickRadio(driver, questionText, answer) {
    console.log(`\n📋 [${answer.toUpperCase()}] → "${questionText}"`);

    const labelXpath = `//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_title"][contains(@text,"${questionText}")]`;
    let isLabelVisible = false;

    // Step 1 — Search Downwards (Swipe Up)
    for (let i = 0; i < 5; i++) {
        const el = await driver.$(labelXpath);
        if (await el.isDisplayed().catch(() => false)) {
            isLabelVisible = true;
            break;
        }
        console.log(`   🔄 Scrolling down to find "${questionText}"...`);
        await swipeVertical(driver, 'up');
    }

    // Step 2 — Search Upwards (Swipe Down) if not found
    if (!isLabelVisible) {
        for (let i = 0; i < 8; i++) {
            const el = await driver.$(labelXpath);
            if (await el.isDisplayed().catch(() => false)) {
                isLabelVisible = true;
                break;
            }
            console.log(`   🔄 Reversing! Scrolling up to find "${questionText}"...`);
            await swipeVertical(driver, 'down');
        }
    }

    if (!isLabelVisible) {
        throw new Error(`Label for "${questionText}" is not visible after bidirectional scroll`);
    }

    // Step 3 — Walk up from the VISIBLE label to its sibling RadioGroup, then to the target RadioButton.
    const btnXpath =
        `//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_title"]` +
        `[contains(@text,"${questionText}")]` +
        `/../../android.widget.RadioGroup[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/rg"]` +
        `/android.widget.RadioButton[@text="${answer}"]`;

    const btn = await driver.$(btnXpath);
    const isBtnVisible = await btn.isDisplayed().catch(() => false);

    if (!isBtnVisible) {
        throw new Error(`RadioButton [${answer}] for "${questionText}" is not visible after scroll`);
    }

    // Step 4 — Edge guard: keep button away from toolbar (y<400) and Submit button (y>2150)
    const loc = await btn.getLocation();
    if (loc.y < 400) {
        console.log(`  ↕️  Edge guard (Y:${loc.y}) — nudging screen down...`);
        await swipeVertical(driver, 'down');
    } else if (loc.y > 2000) {
        console.log(`  ↕️  Edge guard (Y:${loc.y}) — nudging screen up...`);
        await swipeVertical(driver, 'up');
    }

    // Step 5 — Skip if already in the desired state
    const isChecked = String(await btn.getAttribute('checked')) === 'true';
    if (isChecked) {
        console.log(`  ⏩ Already selected [${answer}] — skipping`);
        return;
    }

    // Step 6 — Click, with coordinate-tap fallback for clickable="false" buttons
    try {
        await btn.click();
    } catch (_) {
        console.log(`  ⚠️  Direct click failed — using coordinate tap`);
        const l = await btn.getLocation();
        const s = await btn.getSize();
        await driver.performActions([{
            type: 'pointer', id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: Math.floor(l.x + s.width / 2), y: Math.floor(l.y + s.height / 2) },
                { type: 'pointerDown', button: 0 },
                { type: 'pause',       duration: 120 },
                { type: 'pointerUp',   button: 0 }
            ]
        }]);
        await driver.releaseActions();
    }
    await driver.pause(700);

    // Step 7 — Verify final state
    const checked = String(await btn.getAttribute('checked')) === 'true';
    console.log(checked ? `  ✅ Selected [${answer}]` : `  ⚠️  State unchanged — review manually`);
}
async function clickEligibleCoupleList(driver) {
    console.log('👆 Clicking Eligible Couple List...');
    const el = await driver.$(
        'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/textView2").textContains("Eligible")'
    );
    await el.waitForDisplayed({ timeout: 20000 });
    await el.click();
    await driver.pause(3000);
    console.log('✅ Clicked Eligible Couple List');
}

async function clickEligibleCoupleRegistration(driver) {
    console.log('👆 Clicking Eligible Couple Registration...');
    const el = await driver.$('android=new UiSelector().text("Eligible Couple Registration")');
    await el.waitForDisplayed({ timeout: 20000 });
    await el.click();
    await driver.pause(4000);
    console.log('✅ Clicked Eligible Couple Registration');
}

async function searchAndSelectBeneficiary(driver, name) {
    console.log(`\n🔄 Locating "${name}"...`);
    try {
        await driver.$(
            `android=new UiScrollable(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/rv_any"))` +
            `.setMaxSearchSwipes(20).scrollIntoView(new UiSelector().textContains("${name}"))`
        );
    } catch (_) {
        await driver.$(
            `android=new UiScrollable(new UiSelector().scrollable(true))` +
            `.setMaxSearchSwipes(20).scrollIntoView(new UiSelector().textContains("${name}"))`
        );
    }

    const nameEl = await driver.$(`android=new UiSelector().textContains("${name}")`);
    await nameEl.waitForDisplayed({ timeout: 5000 });

    const xpaths = [
        `//android.widget.TextView[contains(@text,"${name}")]/../..//android.widget.Button[@text="REGISTER"]`,
        `//android.widget.TextView[contains(@text,"${name}")]/../../..//android.widget.Button[@text="REGISTER"]`,
        `//android.widget.TextView[contains(@text,"${name}")]/../..//*[@clickable="true"]`,
        `//android.widget.TextView[contains(@text,"${name}")]/..//*[@clickable="true"]`
    ];

    let clicked = false;
    for (const xpath of xpaths) {
        try {
            const el = await driver.$(xpath);
            if (await el.isDisplayed().catch(() => false)) {
                await el.click();
                clicked = true;
                break;
            }
        } catch (_) {}
    }
    if (!clicked) await nameEl.click();
    await driver.pause(4000);
    console.log(`✅ Opened form for "${name}"`);
}

// ─────────────────────────────────────────────────────────────
//  NAMED FORM WRAPPERS
// ─────────────────────────────────────────────────────────────

async function setDateOfRegistration(driver) {
    const { day, month, year } = FORM_DATA.dateOfRegistration;
    const d = String(day).padStart(2, '0');
    const m = String(month).padStart(2, '0');
    console.log(`\n📅 Setting Date of Registration: ${d}-${m}-${year}`);
    try {
        const dateField = await driver.$('//android.widget.LinearLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/til_edit_text"]//android.widget.EditText');
        await dateField.waitForDisplayed({ timeout: 5000 });
        await dateField.click();
        const okBtn = await driver.$('android=new UiSelector().resourceId("android:id/button1").text("OK")');
        await okBtn.waitForDisplayed({ timeout: 5000 });
        const textBtn = await driver.$('//android.widget.ImageButton[@content-desc="Switch to text input mode"]');
        if (await textBtn.isDisplayed().catch(() => false)) {
            await textBtn.click();
            await driver.pause(1000);
            const inp = await driver.$('android=new UiSelector().className("android.widget.EditText")');
            await inp.clearValue();
            await inp.setValue(`${m}/${d}/${year}`);
            await driver.pause(500);
        }
        await okBtn.click();
        await driver.pause(1500);
        console.log('✅ Date of Registration set');
    } catch (e) {
        console.log(`⚠️  Date of Registration failed: ${e.message}`);
    }
}

async function fillRchId(driver) {
    console.log(`\n✏️  Filling RCH ID: ${FORM_DATA.rchId}`);
    try {
        const f = await driver.$('//android.widget.EditText[@text="RCH ID No. of Woman"]');
        await f.waitForDisplayed({ timeout: 5000 });
        await f.click();
        await f.clearValue();
        await f.setValue(FORM_DATA.rchId);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        console.log('✅ RCH ID filled');
    } catch (e) {
        console.log(`⚠️  RCH ID failed: ${e.message}`);
    }
}

async function setLmpDate(driver) {
    const { day, month, year } = FORM_DATA.lmpDate;
    const d = String(day).padStart(2, '0');
    const m = String(month).padStart(2, '0');
    console.log(`\n📅 Setting LMP Date: ${d}-${m}-${year}`);
    try {
        const lmpField = await driver.$('//android.widget.EditText[@text="LMP Date *"]');
        await lmpField.waitForDisplayed({ timeout: 5000 });
        await lmpField.click();
        const okBtn = await driver.$('android=new UiSelector().resourceId("android:id/button1").text("OK")');
        await okBtn.waitForDisplayed({ timeout: 5000 });
        const textBtn = await driver.$('//android.widget.ImageButton[@content-desc="Switch to text input mode"]');
        if (await textBtn.isDisplayed().catch(() => false)) {
            await textBtn.click();
            await driver.pause(1000);
            const inp = await driver.$('android=new UiSelector().className("android.widget.EditText")');
            await inp.clearValue();
            await inp.setValue(`${m}/${d}/${year}`);
            await driver.pause(500);
        }
        await okBtn.click();
        await driver.pause(1500);
        console.log('✅ LMP Date set');
    } catch (e) {
        console.log(`⚠️  LMP Date failed: ${e.message}`);
    }
}

async function fillHighRiskAssessment(driver) {
    console.log('\n🩺 Processing High Risk Assessment...');

    // Information on Children
    await clickRadio(driver, 'No. of Deliveries is more than 3', FORM_DATA.deliveriesMoreThan3);
    await clickRadio(driver, 'Time from last delivery is less than 18 months', FORM_DATA.timeFromLastDelivery);

    // Physical Observation
    await clickRadio(driver, 'Height is very short or less than 140 cms', FORM_DATA.heightShort);
    await clickRadio(driver, 'Age is less than 18 or more than 35 years', FORM_DATA.ageRisk);

    // Obstetric History
    await clickRadio(driver, 'Miscarriage/abortion', FORM_DATA.miscarriage);
    await clickRadio(driver, 'Home delivery of previous pregnancy', FORM_DATA.homeDelivery);
    await clickRadio(driver, 'During pregnancy or delivery you faced any medical issues', FORM_DATA.medicalIssues);
    await clickRadio(driver, 'Past C', FORM_DATA.pastCSection);
}


async function fillEligibleCoupleForm(driver) {
    try {
        await driver.pause(3000);

        // Navigation
        await clickEligibleCoupleList(driver);
        await clickEligibleCoupleRegistration(driver);
        await searchAndSelectBeneficiary(driver, FORM_DATA.beneficiaryName);

        // Core Form Details
        await setDateOfRegistration(driver);
        await fillRchId(driver);
        await setLmpDate(driver);

        // High Risk Assessment Radio Buttons
        await fillHighRiskAssessment(driver);

        // Bank Details & Submit (NEW)
        await fillBankDetails(driver);
        await clickSubmit(driver);

        console.log('\n🎯 Eligible Couple Registration flow completed successfully.');

    } catch (error) {
        console.error('❌ Execution error in fillEligibleCoupleForm:', error.message);
        throw error;
    }
}

async function fillTextInput(driver, hintText, value) {
    if (!value) return;
    console.log(`\n✏️  Filling "${hintText}": ${value}`);

    const xpath = `//android.widget.EditText[@hint="${hintText}"]`;
    let isVisible = false;

    // Step 1 — Search Downwards
    for (let i = 0; i < 5; i++) {
        const el = await driver.$(xpath);
        if (await el.isDisplayed().catch(() => false)) {
            isVisible = true;
            break;
        }
        await swipeVertical(driver, 'up');
    }

    // Step 2 — Search Upwards if not found
    if (!isVisible) {
        for (let i = 0; i < 8; i++) {
            const el = await driver.$(xpath);
            if (await el.isDisplayed().catch(() => false)) {
                isVisible = true;
                break;
            }
            await swipeVertical(driver, 'down');
        }
    }

    if (!isVisible) {
        throw new Error(`Input field "${hintText}" is not visible after bidirectional scroll`);
    }

    const el = await driver.$(xpath);
    await el.click();
    await el.clearValue();
    await el.setValue(value);

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
    }

    console.log(`  ✅ "${hintText}" filled`);
}

/**
 * Scrolls down to find and click the Submit button.
 */
async function clickSubmit(driver) {
    console.log('\n👆 Clicking Submit...');
    const xpath = `//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]`;
    let isVisible = false;

    for (let i = 0; i < 8; i++) {
        const el = await driver.$(xpath);
        if (await el.isDisplayed().catch(() => false)) {
            isVisible = true;
            break;
        }
        await swipeVertical(driver, 'up');
    }

    if (!isVisible) {
        throw new Error("Submit button not found after scrolling");
    }

    const el = await driver.$(xpath);
    await el.click();
    await driver.pause(3000);
    console.log('  ✅ Form submitted successfully');
}

async function fillBankDetails(driver) {
    console.log('\n🏦 Processing Bank Details...');
    await fillTextInput(driver, 'Bank AC No or Post Office AC No', FORM_DATA.bankAcNo);
    await fillTextInput(driver, 'Bank Name', FORM_DATA.bankName);
    await fillTextInput(driver, 'Branch Name', FORM_DATA.branchName);
    await fillTextInput(driver, 'IFSC Code', FORM_DATA.ifscCode);
}

async function main() {
    console.log("🚀 Starting Appium session...");
    let driver;

    try {
        driver = await remote(wdioOptions);
        await fillEligibleCoupleForm(driver);
    } catch (error) {
        console.error("❌ Fatal Script Error:", error.message);
    } finally {
        if (driver) {
            console.log("🛑 Ending session...");
            await driver.deleteSession();
        }
    }
}

main();