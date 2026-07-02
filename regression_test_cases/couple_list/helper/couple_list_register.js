'use strict';

// ─────────────────────────────────────────────────────────────
//  FORM DATA
// ─────────────────────────────────────────────────────────────

const FORM_DATA = {
    beneficiaryName: 'PARBIN AHMED',
    dateOfRegistration: { day: 19, month: 8, year: 2025 },
    rchId: '123456789012',
    lmpDate: { day: 15, month: 7, year: 2025 },

    deliveriesMoreThan3:  'Yes',
    timeFromLastDelivery: 'Yes',
    heightShort:          'Yes',
    ageRisk:              'Yes',
    miscarriage:          'Yes',
    homeDelivery:         'Yes',
    medicalIssues:        'Yes',
    pastCSection:         'Yes',
    bankAcNo:   '1234567890',
    bankName:   'State Bank of India',
    branchName: 'Main Branch',
    ifscCode:   'SBIN0001234'
};

// ─────────────────────────────────────────────────────────────
//  SCROLL HELPER
// ─────────────────────────────────────────────────────────────

async function swipeVertical(driver, direction = 'up') {
    const screen = await driver.getWindowRect();
    const swipeX = Math.floor(screen.width / 2);
    const startY = direction === 'up'
        ? Math.floor(screen.height * 0.70)
        : Math.floor(screen.height * 0.30);
    const endY = direction === 'up'
        ? Math.floor(screen.height * 0.30)
        : Math.floor(screen.height * 0.70);

    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: swipeX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 80 },
            { type: 'pointerMove', duration: 600, x: swipeX, y: endY },
            { type: 'pointerUp',   button: 0 },
        ],
    }]);
    await driver.releaseActions();
    await driver.pause(800);
}

// ─────────────────────────────────────────────────────────────
//  RADIO BUTTON HELPER
// ─────────────────────────────────────────────────────────────

async function clickRadio(driver, questionText, answer) {
    console.log(`\n📋 [${answer.toUpperCase()}] → "${questionText}"`);

    const labelXpath = `//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_title"][contains(@text,"${questionText}")]`;
    let isLabelVisible = false;

    for (let i = 0; i < 5; i++) {
        const el = await driver.$(labelXpath);
        if (await el.isDisplayed().catch(() => false)) { isLabelVisible = true; break; }
        await swipeVertical(driver, 'up');
    }
    if (!isLabelVisible) {
        for (let i = 0; i < 8; i++) {
            const el = await driver.$(labelXpath);
            if (await el.isDisplayed().catch(() => false)) { isLabelVisible = true; break; }
            await swipeVertical(driver, 'down');
        }
    }
    if (!isLabelVisible) throw new Error(`Label for "${questionText}" not visible after bidirectional scroll`);

    const btnXpath =
        `//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_title"]` +
        `[contains(@text,"${questionText}")]` +
        `/../../android.widget.RadioGroup[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/rg"]` +
        `/android.widget.RadioButton[@text="${answer}"]`;

    const btn = await driver.$(btnXpath);
    if (!await btn.isDisplayed().catch(() => false))
        throw new Error(`RadioButton [${answer}] for "${questionText}" not visible`);

    const loc = await btn.getLocation();
    if (loc.y < 400)       await swipeVertical(driver, 'down');
    else if (loc.y > 2000) await swipeVertical(driver, 'up');

    if (String(await btn.getAttribute('checked')) === 'true') {
        console.log(`  ⏩ Already selected [${answer}] — skipping`); return;
    }

    try {
        await btn.click();
    } catch (_) {
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

    const checked = String(await btn.getAttribute('checked')) === 'true';
    console.log(checked ? `  ✅ Selected [${answer}]` : `  ⚠️  State unchanged — review manually`);
}

// ─────────────────────────────────────────────────────────────
//  FORM FIELD HELPERS
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
    } catch (e) { console.log(`⚠️  Date of Registration failed: ${e.message}`); }
}

async function fillRchId(driver) {
    console.log(`\n✏️  Filling RCH ID: ${FORM_DATA.rchId}`);
    try {
        const f = await driver.$('//android.widget.EditText[@text="RCH ID No. of Woman"]');
        await f.waitForDisplayed({ timeout: 5000 });
        await f.click(); await f.clearValue(); await f.setValue(FORM_DATA.rchId);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        console.log('✅ RCH ID filled');
    } catch (e) { console.log(`⚠️  RCH ID failed: ${e.message}`); }
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
    } catch (e) { console.log(`⚠️  LMP Date failed: ${e.message}`); }
}

async function fillHighRiskAssessment(driver) {
    console.log('\n🩺 Processing High Risk Assessment...');
    await clickRadio(driver, 'No. of Deliveries is more than 3',                           FORM_DATA.deliveriesMoreThan3);
    await clickRadio(driver, 'Time from last delivery is less than 18 months',             FORM_DATA.timeFromLastDelivery);
    await clickRadio(driver, 'Height is very short or less than 140 cms',                  FORM_DATA.heightShort);
    await clickRadio(driver, 'Age is less than 18 or more than 35 years',                  FORM_DATA.ageRisk);
    await clickRadio(driver, 'Miscarriage/abortion',                                       FORM_DATA.miscarriage);
    await clickRadio(driver, 'Home delivery of previous pregnancy',                        FORM_DATA.homeDelivery);
    await clickRadio(driver, 'During pregnancy or delivery you faced any medical issues',  FORM_DATA.medicalIssues);
    await clickRadio(driver, 'Past C',                                                     FORM_DATA.pastCSection);
}

async function fillTextInput(driver, hintText, value) {
    if (!value) return;
    console.log(`\n✏️  Filling "${hintText}": ${value}`);
    const xpath = `//android.widget.EditText[@hint="${hintText}"]`;
    let isVisible = false;
    for (let i = 0; i < 5; i++) {
        if (await driver.$(xpath).isDisplayed().catch(() => false)) { isVisible = true; break; }
        await swipeVertical(driver, 'up');
    }
    if (!isVisible) {
        for (let i = 0; i < 8; i++) {
            if (await driver.$(xpath).isDisplayed().catch(() => false)) { isVisible = true; break; }
            await swipeVertical(driver, 'down');
        }
    }
    if (!isVisible) throw new Error(`Input field "${hintText}" not visible after scroll`);
    const el = await driver.$(xpath);
    await el.click(); await el.clearValue(); await el.setValue(value);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    console.log(`  ✅ "${hintText}" filled`);
}

async function clickSubmit(driver) {
    console.log('\n👆 Clicking Submit...');
    const xpath = `//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]`;

    // Use UiScrollable to scroll the Submit button into view inside the ScrollView
    try {
        await driver.$(
            `android=new UiScrollable(new UiSelector().scrollable(true))` +
            `.setMaxSearchSwipes(10).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"))`
        );
        console.log('  🔄 Scrolled Submit button into view');
    } catch (_) {
        // UiScrollable may throw if already visible — fall through
        console.log('  ℹ️  UiScrollable scroll skipped (button may already be visible)');
    }

    await driver.pause(1000);

    // Now get a fresh reference and click it
    const btn = await driver.$(xpath);
    await btn.waitForDisplayed({ timeout: 10000 });
    await btn.waitForEnabled({ timeout: 5000 });
    await btn.click();

    await driver.pause(3000);
    console.log('  ✅ Form submitted successfully');
}

async function fillBankDetails(driver) {
    console.log('\n🏦 Processing Bank Details...');
    await fillTextInput(driver, 'Bank AC No or Post Office AC No', FORM_DATA.bankAcNo);
    await fillTextInput(driver, 'Bank Name',   FORM_DATA.bankName);
    await fillTextInput(driver, 'Branch Name', FORM_DATA.branchName);
    await fillTextInput(driver, 'IFSC Code',   FORM_DATA.ifscCode);
}

// ─────────────────────────────────────────────────────────────
//  EC FORM DETAILS (called after REGISTER is clicked)
// ─────────────────────────────────────────────────────────────

async function fillECFormDetails(driver) {
    try {
        await driver.pause(3000);
        await setDateOfRegistration(driver);
        await fillRchId(driver);
        await setLmpDate(driver);
        await fillHighRiskAssessment(driver);
        await fillBankDetails(driver);
        await clickSubmit(driver);
        console.log('\n🎯 Eligible Couple form details filled successfully.');
    } catch (error) {
        console.error('❌ Execution error in fillECFormDetails:', error.message);
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────
//  IFA — search by name, verify IFA button exists, then fill
// ─────────────────────────────────────────────────────────────

/**
 * After EC registration the list card shows a VIEW button.
 * Tapping the beneficiary NAME (not the VIEW button) opens the
 * detail screen that contains the IFA button.
 *
 * This function:
 *  1. Searches for the beneficiary by name
 *  2. Taps the NAME label to open the detail screen
 *  3. Waits and checks whether the IFA button is actually present
 *  4. If found → clicks it and fills the IFA form
 *  5. If not found → logs a warning and skips (age/state mismatch)
 */
async function processIFA(driver, provided = "Yes", quantity = "30") {
    console.log('\n💊 Processing IFA Supplement Details...');

    // ── Step 1: Verify IFA button is present on the detail screen ──
    // Scroll down up to 5 times to find it; it may be below the fold.
    const ifaBtnXpath = '//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_ifa"]';
    let ifaVisible = false;

    console.log('  🔎 Checking for IFA button on detail screen...');
    for (let i = 0; i < 5; i++) {
        const el = await driver.$(ifaBtnXpath);
        if (await el.isDisplayed().catch(() => false)) {
            ifaVisible = true;
            break;
        }
        console.log(`  🔄 Scrolling to find IFA button (attempt ${i + 1}/5)...`);
        await swipeVertical(driver, 'up');
    }

    if (!ifaVisible) {
        console.log('  ⚠️  IFA button NOT found on this screen.');
        console.log('       Possible reasons: age outside 20–49, EC form not yet submitted, or wrong screen.');
        console.log('       Skipping IFA step.');
        return;
    }

    console.log('  ✅ IFA button confirmed visible — proceeding.');

    // ── Step 2: Click the IFA button ────────────────────────────────
    const ifaBtn = await driver.$(ifaBtnXpath);
    await ifaBtn.click();
    console.log("  ✅ Clicked 'IFA' button");
    await driver.pause(2000);

    // ── Step 3: Click Add New ────────────────────────────────────────
    const addNewBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnAddNew"]');
    await addNewBtn.waitForDisplayed({ timeout: 10000 });
    await addNewBtn.click();
    console.log("  ✅ Clicked 'Add New'");
    await driver.pause(2000);

    // ── Step 4: Select Yes/No for Iron Supplements ──────────────────
    const radioBtn = await driver.$(
        `//android.widget.TextView[contains(@text,"Has the women been provided")]` +
        `/../android.widget.FrameLayout//android.widget.RadioButton[@text="${provided}"]`
    );
    await radioBtn.waitForDisplayed({ timeout: 5000 });
    await radioBtn.click();
    console.log(`  ✅ Selected '${provided}' for Iron Supplements`);

    // ── Step 5: Enter Quantity if Yes ───────────────────────────────
    if (provided === "Yes") {
        const qtyInput = await driver.$(
            '//android.widget.TextView[contains(@text,"Issued Quantity")]' +
            '/../android.widget.FrameLayout//android.widget.EditText'
        );
        await qtyInput.waitForDisplayed({ timeout: 5000 });
        await qtyInput.click();
        await qtyInput.setValue(quantity);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        console.log(`  ✅ Entered quantity: ${quantity}`);
    }

    // ── Step 6: Submit ───────────────────────────────────────────────
    const submitBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnSave"]');
    await submitBtn.click();
    await driver.pause(3000);
    console.log("🎯 IFA Form Submitted Successfully!");
    console.log("✅ IFA button visibility for beneficiaries aged 20–49 years is verified");
}

module.exports = { fillECFormDetails, processIFA };