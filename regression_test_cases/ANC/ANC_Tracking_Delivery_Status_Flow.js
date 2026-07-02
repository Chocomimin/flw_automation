const { remote } = require('webdriverio');
const { clickDashboardCard } = require("../../maternal_health/Anc_visits");

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true
};

// ── SCROLL HELPERS ────────────────────────────────────────────────────────────

async function scrollDownOnce(driver) {
    const { width, height } = await driver.getWindowSize();
    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0,   x: Math.floor(width / 2), y: Math.floor(height * 0.80) },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 100 },
            { type: 'pointerMove', duration: 800, x: Math.floor(width / 2), y: Math.floor(height * 0.20) },
            { type: 'pointerUp',   button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(1000);
}

async function swipeDown(driver) {
    const screen = await driver.getWindowRect();
    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0,   x: Math.floor(screen.width / 2), y: Math.floor(screen.height * 0.3) },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 200 },
            { type: 'pointerMove', duration: 800, x: Math.floor(screen.width / 2), y: Math.floor(screen.height * 0.7) },
            { type: 'pointerUp',   button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(1000);
}

// ── KEYBOARD HELPER ───────────────────────────────────────────────────────────

async function hideKeyboardSafe(driver) {
    try {
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
            await driver.pause(500);
            if (await driver.isKeyboardShown()) {
                await driver.pressKeyCode(4);
                await driver.pause(500);
            }
        }
    } catch (e) {
        try { await driver.pressKeyCode(4); await driver.pause(500); } catch (err) {}
    }
}

// ── READ ONE CARD ─────────────────────────────────────────────────────────────

/**
 * Reads name, weeks, and Delivery Status switch state from a single card.
 */
async function readCard(card) {
    const result = {
        name:                null,
        weeks:               null,
        hasDeliveryStatus:   false,
        deliverySwitchState: null   // 'true' | 'false' | null
    };

    // Name
    try {
        const el = await card.$(
            './/android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_ec_id"]'
        );
        if (await el.isExisting()) result.name = await el.getText();
    } catch (e) {}

    // Weeks of Pregnancy
    try {
        const el = await card.$(
            './/android.widget.TextView[@text="Weeks Of Pregnancy"]/following-sibling::android.widget.TextView[1]'
        );
        if (await el.isExisting()) result.weeks = parseInt((await el.getText()).trim(), 10);
    } catch (e) {}

    // Delivery Status toggle
    try {
        const switchEl = await card.$(
            './/android.widget.Switch[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/switchDeliveryStatus"]'
        );
        if (await switchEl.isExisting()) {
            result.hasDeliveryStatus   = true;
            result.deliverySwitchState = await switchEl.getAttribute('checked');
        }
    } catch (e) {}

    return result;
}

// ── STEP 2: SELECT BENEFICIARY WITH 23+ WEEKS & DELIVERY STATUS SWITCH ────────

/**
 * Scans all ANC Visit cards to find one with:
 *   - Weeks >= 23
 *   - A Delivery Status switch present (enabled)
 * Returns the first eligible beneficiary found.
 */
async function selectEligibleBeneficiary(driver, minWeeks = 23) {
    const seenNames = new Set();
    const eligible  = [];   // { name, weeks, deliverySwitchState }
    let   noNewCount = 0;
    const MAX_NO_NEW = 3;

    console.log(`\n── STEP 2: Scanning for beneficiary with ${minWeeks}+ weeks & Delivery Status switch ──`);

    while (noNewCount < MAX_NO_NEW) {
        const cards = await driver.$$(
            '//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]'
        );

        let foundNew = false;

        for (const card of cards) {
            const { name, weeks, hasDeliveryStatus, deliverySwitchState } = await readCard(card);

            if (!name || seenNames.has(name)) continue;
            seenNames.add(name);
            foundNew = true;

            const weeksLabel = weeks !== null ? `${weeks} wks` : 'unknown wks';

            if (weeks !== null && weeks >= minWeeks && hasDeliveryStatus) {
                eligible.push({ name, weeks, deliverySwitchState });
                console.log(`✅ "${name}" — ${weeksLabel}, Delivery Status switch: ${deliverySwitchState === 'true' ? 'ON' : 'OFF'}`);
            } else {
                const reason = weeks === null ? 'unknown weeks'
                    : weeks < minWeeks         ? `${weeksLabel} < ${minWeeks}`
                    : 'no Delivery Status switch';
                console.log(`⛔ "${name}" — skipped (${reason})`);
            }
        }

        if (foundNew) {
            noNewCount = 0;
        } else {
            noNewCount++;
            console.log(`ℹ️  No new cards (${noNewCount}/${MAX_NO_NEW})`);
        }

        await scrollDownOnce(driver);
    }

    if (eligible.length === 0) {
        throw new Error(`No beneficiary found with ${minWeeks}+ weeks AND a Delivery Status switch`);
    }

    const picked = eligible[Math.floor(Math.random() * eligible.length)];
    console.log(`\n🎯 Selected: "${picked.name}" (${picked.weeks} wks, switch currently ${picked.deliverySwitchState === 'true' ? 'ON' : 'OFF'})`);
    return picked;
}

// ── STEP 3 + 4 + 5 + 6: VERIFY SWITCH ENABLED → TURN ON → VERIFY POPUP → CLICK YES ──

/**
 * Finds the beneficiary card by name, verifies the Delivery Status switch is
 * present (enabled), turns it ON, confirms the popup, then returns true.
 */
async function toggleDeliveryStatusAndConfirm(driver, beneficiaryName) {
    console.log(`\n── STEP 3: Verifying Delivery Status switch is present for "${beneficiaryName}" ──`);

    // Search for the card by first name
    const searchQuery = beneficiaryName.split(' ')[0];
    try {
        const searchField = await driver.$(
            '//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]'
        );
        await searchField.waitForDisplayed({ timeout: 8000 });
        await searchField.click();
        await driver.pause(300);
        await searchField.clearValue();
        await searchField.setValue(searchQuery);
        await hideKeyboardSafe(driver);
        await driver.pause(2000);
        console.log(`🔎 Searched "${searchQuery}"`);
    } catch (e) {
        console.log(`⚠️  Search field not accessible: ${e.message}`);
    }

    const cards = await driver.$$(
        '//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]'
    );

    for (const card of cards) {
        // Resolve card name
        let cardName = null;
        for (const rid of [
            'org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_ec_id',
            'org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id'
        ]) {
            try {
                const el = await card.$(`.//android.widget.TextView[@resource-id="${rid}"]`);
                if (await el.isExisting()) { cardName = (await el.getText()).trim(); break; }
            } catch (e) {}
        }

        if (!cardName || !cardName.toUpperCase().includes(beneficiaryName.toUpperCase())) continue;
        console.log(`  ✅ Matched card: "${cardName}"`);

        // ── STEP 3: Verify switch exists (is enabled/present) ────────────────
        const switchEl = await card.$(
            './/android.widget.Switch[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/switchDeliveryStatus"]'
        );

        if (!await switchEl.isExisting()) {
            throw new Error(`❌ Delivery Status switch NOT found on card for "${beneficiaryName}"`);
        }

        const switchEnabled = await switchEl.getAttribute('enabled');
        if (switchEnabled !== 'true') {
            throw new Error(`❌ Delivery Status switch is DISABLED for "${beneficiaryName}"`);
        }

        const currentState = await switchEl.getAttribute('checked');
        console.log(`  ✅ STEP 3 PASSED — Delivery Status switch is present and enabled (currently ${currentState === 'true' ? 'ON' : 'OFF'})`);

        // ── STEP 4: Turn switch ON ────────────────────────────────────────────
        console.log(`\n── STEP 4: Turning Delivery Status switch ON ──`);
        if (currentState === 'true') {
            console.log(`  ➡ Switch already ON — turning OFF first to reset, then ON`);
            await switchEl.click();
            await driver.pause(1000);
            // dismiss any dialog from the OFF click
            try {
                const noBtn = await driver.$('//android.widget.Button[@text="NO" or @resource-id="android:id/button2"]');
                if (await noBtn.isExisting()) { await noBtn.click(); await driver.pause(1000); }
            } catch (e) {}
        }

        await switchEl.click();
        await driver.pause(1500);
        console.log(`  ✅ STEP 4 PASSED — Switch tapped (turned ON)`);

        // ── STEP 5: Verify popup 'Has the Pregnant Woman delivered?' appears ──
        console.log(`\n── STEP 5: Verifying confirmation popup appears ──`);
        let popupFound = false;
        for (const popupText of [
            'Has the Pregnant Woman delivered?',
            'Has the Pregnant Woman Delivered?',
            'delivered'
        ]) {
            try {
                const popup = await driver.$(`//*[contains(@text, "${popupText}")]`);
                if (await popup.isExisting()) {
                    console.log(`  ✅ STEP 5 PASSED — Popup found: "${await popup.getText()}"`);
                    popupFound = true;
                    break;
                }
            } catch (e) {}
        }

        if (!popupFound) {
            // Also check for a generic YES/NO dialog as fallback
            try {
                const yesBtn = await driver.$('//android.widget.Button[@text="YES" or @resource-id="android:id/button1"]');
                if (await yesBtn.isExisting()) {
                    console.log(`  ✅ STEP 5 PASSED — YES/NO dialog detected (delivery confirmation)`);
                    popupFound = true;
                }
            } catch (e) {}
        }

        if (!popupFound) {
            throw new Error(`❌ STEP 5 FAILED — Popup 'Has the Pregnant Woman delivered?' did NOT appear`);
        }

        // ── STEP 6: Click YES → verify movement to Delivery Outcome ──────────
        console.log(`\n── STEP 6: Clicking YES and verifying movement to Delivery Outcome ──`);
        try {
            const yesBtn = await driver.$(
                '//android.widget.Button[@text="YES" or @resource-id="android:id/button1"]'
            );
            await yesBtn.waitForDisplayed({ timeout: 5000 });
            await yesBtn.click();
            console.log(`  ✅ Clicked YES on confirmation dialog`);
            await driver.pause(2000);
        } catch (e) {
            throw new Error(`❌ STEP 6 FAILED — Could not click YES: ${e.message}`);
        }

        return true;
    }

    throw new Error(`❌ No matching card found for "${beneficiaryName}" after search`);
}

// ── STEP 6 (cont.): NAVIGATE TO DELIVERY OUTCOME & VERIFY ────────────────────

async function navigateToHome(driver) {
    console.log('\n🏠 Navigating back to Home screen...');
    for (let attempts = 0; attempts < 10; attempts++) {
        try {
            const homeTab = await driver.$$('//android.widget.LinearLayout[@content-desc="Home"]');
            for (const tab of homeTab) {
                if (await tab.getAttribute('selected') === 'true') {
                    console.log('✅ Confirmed on Home screen');
                    await driver.pause(1000);
                    return;
                }
            }
        } catch (e) {}

        try {
            const toolbar = await driver.$(
                '//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_toolbar"]'
            );
            if (await toolbar.isExisting()) {
                const title = (await toolbar.getText()).trim();
                const sectionScreens = ['ANC Visits', 'Maternal Health', 'Delivery Outcome List',
                    'Delivery Outcome', 'PNC Mother List', 'Child Care', 'Disease Control'];
                if (!sectionScreens.includes(title)) {
                    console.log(`✅ Confirmed on Home screen (toolbar: "${title}")`);
                    await driver.pause(1000);
                    return;
                }
            }
        } catch (e) {}

        console.log(`↩️  Not on Home yet, pressing back (attempt ${attempts + 1})...`);
        await driver.pressKeyCode(4);
        await driver.pause(2500);
    }
    console.log('⚠️  Could not confirm Home screen — proceeding anyway');
}

async function clickMaternalHealthFromHome(driver) {
    console.log('\n📋 Clicking "Maternal Health" from Home...');
    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Maternal Health"))`);
        await driver.pause(500);
    } catch (e) {}

    for (const [desc, selector] of [
        ['cv_icon card', '//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_icon"][.//android.widget.TextView[@text="Maternal Health"]]'],
        ['text element', '//android.widget.TextView[@text="Maternal Health"]'],
        ['UiSelector',   'android=new UiSelector().text("Maternal Health")']
    ]) {
        try {
            const el = await driver.$(selector);
            await el.waitForDisplayed({ timeout: 6000 });
            await el.click();
            console.log(`✅ Clicked Maternal Health (via ${desc})`);
            await driver.pause(3000);
            return;
        } catch (e) {}
    }
    throw new Error('❌ Could not click "Maternal Health" on Home');
}

async function clickDeliveryOutcome(driver) {
    console.log('\n📋 Clicking "Delivery Outcome" on Maternal Health screen...');
    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Delivery Outcome"))`);
        await driver.pause(500);
    } catch (e) {}

    for (const [desc, selector] of [
        ['cv_icon card', '//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_icon"][.//android.widget.TextView[@text="Delivery Outcome"]]'],
        ['text element', '//android.widget.TextView[@text="Delivery Outcome"]'],
        ['UiSelector',   'android=new UiSelector().text("Delivery Outcome")']
    ]) {
        try {
            const el = await driver.$(selector);
            await el.waitForDisplayed({ timeout: 6000 });
            await el.click();
            console.log(`✅ Clicked Delivery Outcome (via ${desc})`);
            await driver.pause(3000);
            return;
        } catch (e) {}
    }
    throw new Error('❌ Could not click "Delivery Outcome" card');
}

async function verifyInDeliveryOutcomeList(driver, beneficiaryName) {
    console.log(`\n── STEP 6 (verify): Checking "${beneficiaryName}" in Delivery Outcome List ──`);

    try {
        const toolbar = await driver.$(
            '//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_toolbar" and @text="Delivery Outcome List"]'
        );
        await toolbar.waitForDisplayed({ timeout: 8000 });
        console.log('✅ Confirmed on Delivery Outcome List screen');
    } catch (e) {
        console.log('⚠️  Could not confirm Delivery Outcome List screen — proceeding anyway');
    }

    const searchQuery = beneficiaryName.split(' ')[0];
    try {
        const searchField = await driver.$(
            '//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]'
        );
        await searchField.waitForDisplayed({ timeout: 8000 });
        await searchField.click();
        await driver.pause(500);
        await searchField.clearValue();
        await searchField.setValue(searchQuery);
        await hideKeyboardSafe(driver);
        await driver.pause(2000);
    } catch (e) {
        console.error('❌ Could not interact with search field:', e.message);
        return false;
    }

    const cards = await driver.$$(
        '//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]'
    );

    for (const card of cards) {
        let cardName = null;
        for (const rid of [
            'org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id',
            'org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_ec_id'
        ]) {
            try {
                const el = await card.$(`.//android.widget.TextView[@resource-id="${rid}"]`);
                if (await el.isExisting()) { cardName = (await el.getText()).trim(); break; }
            } catch (e) {}
        }
        if (cardName && cardName.toUpperCase().includes(beneficiaryName.toUpperCase())) {
            console.log(`  ✅ STEP 6 PASSED — "${cardName}" found in Delivery Outcome List`);
            return true;
        }
    }

    console.log(`  ❌ STEP 6 FAILED — "${beneficiaryName}" NOT found in Delivery Outcome List`);
    return false;
}

// ── SCENARIO 2 HELPERS ────────────────────────────────────────────────────────

/**
 * Navigates back to ANC Visits from wherever we currently are.
 */
async function navigateToAncVisits(driver) {
    console.log('\n🔙 Navigating back to ANC Visits screen...');

    // First go home, then re-enter Maternal Health → ANC Visits
    await navigateToHome(driver);

    await clickMaternalHealthFromHome(driver);

    // Click ANC Visits card
    console.log('\n📋 Clicking "ANC Visits" on Maternal Health screen...');
    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("ANC Visits"))`);
        await driver.pause(500);
    } catch (e) {}

    for (const [desc, selector] of [
        ['cv_icon card', '//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_icon"][.//android.widget.TextView[@text="ANC Visits"]]'],
        ['text element', '//android.widget.TextView[@text="ANC Visits"]'],
        ['UiSelector',   'android=new UiSelector().text("ANC Visits")']
    ]) {
        try {
            const el = await driver.$(selector);
            await el.waitForDisplayed({ timeout: 6000 });
            await el.click();
            console.log(`✅ Clicked ANC Visits (via ${desc})`);
            await driver.pause(3000);

            // Confirm toolbar
            try {
                const toolbar = await driver.$(
                    '//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_toolbar" and @text="ANC Visits"]'
                );
                if (await toolbar.isExisting()) {
                    console.log('✅ Confirmed on ANC Visits screen');
                }
            } catch (e) {}
            return;
        } catch (e) {}
    }
    throw new Error('❌ Could not navigate to ANC Visits screen');
}

/**
 * Finds a beneficiary card by name, verifies the Delivery Status switch is
 * present and enabled, turns it ON, verifies the popup appears, then clicks NO.
 * Returns true if NO was clicked successfully.
 */
async function toggleDeliveryStatusAndClickNo(driver, beneficiaryName) {
    console.log(`\n── SCENARIO 2 STEP A: Verifying Delivery Status switch for "${beneficiaryName}" ──`);

    // Search by first name
    const searchQuery = beneficiaryName.split(' ')[0];
    try {
        const searchField = await driver.$(
            '//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]'
        );
        await searchField.waitForDisplayed({ timeout: 8000 });
        await searchField.click();
        await driver.pause(300);
        await searchField.clearValue();
        await searchField.setValue(searchQuery);
        await hideKeyboardSafe(driver);
        await driver.pause(2000);
        console.log(`🔎 Searched "${searchQuery}"`);
    } catch (e) {
        console.log(`⚠️  Search field not accessible: ${e.message}`);
    }

    const cards = await driver.$$(
        '//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]'
    );

    for (const card of cards) {
        let cardName = null;
        for (const rid of [
            'org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_ec_id',
            'org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id'
        ]) {
            try {
                const el = await card.$(`.//android.widget.TextView[@resource-id="${rid}"]`);
                if (await el.isExisting()) { cardName = (await el.getText()).trim(); break; }
            } catch (e) {}
        }

        if (!cardName || !cardName.toUpperCase().includes(beneficiaryName.toUpperCase())) continue;
        console.log(`  ✅ Matched card: "${cardName}"`);

        // Verify switch present & enabled
        const switchEl = await card.$(
            './/android.widget.Switch[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/switchDeliveryStatus"]'
        );
        if (!await switchEl.isExisting()) {
            throw new Error(`❌ Delivery Status switch NOT found on card for "${beneficiaryName}"`);
        }
        const switchEnabled = await switchEl.getAttribute('enabled');
        if (switchEnabled !== 'true') {
            throw new Error(`❌ Delivery Status switch is DISABLED for "${beneficiaryName}"`);
        }

        const currentState = await switchEl.getAttribute('checked');
        console.log(`  ✅ Switch present & enabled (currently ${currentState === 'true' ? 'ON' : 'OFF'})`);

        // ── Turn switch ON ────────────────────────────────────────────────────
        console.log(`\n── SCENARIO 2 STEP B: Turning Delivery Status switch ON ──`);
        if (currentState === 'true') {
            console.log(`  ➡ Switch already ON — resetting to OFF first`);
            await switchEl.click();
            await driver.pause(1000);
            try {
                const noBtn = await driver.$('//android.widget.Button[@text="NO" or @resource-id="android:id/button2"]');
                if (await noBtn.isExisting()) { await noBtn.click(); await driver.pause(1000); }
            } catch (e) {}
        }

        await switchEl.click();
        await driver.pause(1500);
        console.log(`  ✅ Switch tapped (turned ON)`);

        // ── Verify popup appears ──────────────────────────────────────────────
        console.log(`\n── SCENARIO 2 STEP C: Verifying popup appears ──`);
        let popupFound = false;
        for (const popupText of [
            'Has the Pregnant Woman delivered?',
            'Has the Pregnant Woman Delivered?',
            'delivered'
        ]) {
            try {
                const popup = await driver.$(`//*[contains(@text, "${popupText}")]`);
                if (await popup.isExisting()) {
                    console.log(`  ✅ Popup found: "${await popup.getText()}"`);
                    popupFound = true;
                    break;
                }
            } catch (e) {}
        }

        if (!popupFound) {
            try {
                const noBtn = await driver.$('//android.widget.Button[@text="NO" or @resource-id="android:id/button2"]');
                if (await noBtn.isExisting()) {
                    console.log(`  ✅ YES/NO dialog detected (delivery confirmation)`);
                    popupFound = true;
                }
            } catch (e) {}
        }

        if (!popupFound) {
            throw new Error(`❌ Popup 'Has the Pregnant Woman delivered?' did NOT appear for "${beneficiaryName}"`);
        }

        // ── Click NO ─────────────────────────────────────────────────────────
        console.log(`\n── SCENARIO 2 STEP D: Clicking NO on the popup ──`);
        try {
            const noBtn = await driver.$(
                '//android.widget.Button[@text="NO" or @resource-id="android:id/button2"]'
            );
            await noBtn.waitForDisplayed({ timeout: 5000 });
            await noBtn.click();
            console.log(`  ✅ Clicked NO on confirmation dialog`);
            await driver.pause(2000);
        } catch (e) {
            throw new Error(`❌ Could not click NO: ${e.message}`);
        }

        return true;
    }

    throw new Error(`❌ No matching card found for "${beneficiaryName}" after search`);
}

/**
 * Verifies a beneficiary is still present in the ANC Visits list
 * by searching their name and checking the card exists.
 */
async function verifyInAncVisitsList(driver, beneficiaryName) {
    console.log(`\n── SCENARIO 2 STEP E: Verifying "${beneficiaryName}" is still in ANC Visits list ──`);

    const searchQuery = beneficiaryName.split(' ')[0];
    try {
        const searchField = await driver.$(
            '//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]'
        );
        await searchField.waitForDisplayed({ timeout: 8000 });
        await searchField.click();
        await driver.pause(300);
        await searchField.clearValue();
        await searchField.setValue(searchQuery);
        await hideKeyboardSafe(driver);
        await driver.pause(2000);
        console.log(`🔎 Searched "${searchQuery}"`);
    } catch (e) {
        console.log(`⚠️  Search field not accessible: ${e.message}`);
    }

    const cards = await driver.$$(
        '//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]'
    );

    for (const card of cards) {
        let cardName = null;
        for (const rid of [
            'org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_ec_id',
            'org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id'
        ]) {
            try {
                const el = await card.$(`.//android.widget.TextView[@resource-id="${rid}"]`);
                if (await el.isExisting()) { cardName = (await el.getText()).trim(); break; }
            } catch (e) {}
        }
        if (cardName && cardName.toUpperCase().includes(beneficiaryName.toUpperCase())) {
            console.log(`  ✅ SCENARIO 2 PASSED — "${cardName}" is still present in ANC Visits list (NO was clicked, no movement occurred)`);
            return true;
        }
    }

    console.log(`  ❌ SCENARIO 2 FAILED — "${beneficiaryName}" NOT found in ANC Visits list`);
    return false;
}

// ── ENTRY POINT ───────────────────────────────────────────────────────────────

async function runTest() {
    const driver = await remote({ path: '/', port: 4723, capabilities });

    try {
        // ════════════════════════════════════════════════════════════════════
        // SCENARIO 1: Toggle ON → Click YES → Verify moved to Delivery Outcome
        // ════════════════════════════════════════════════════════════════════

        // ── STEP 1: Open ANC Tracking ─────────────────────────────────────────
        console.log('\n══════════════════════════════════════════════════════════════');
        console.log('  SCENARIO 1: Toggle ON → Click YES → Verify in Delivery Outcome');
        console.log('══════════════════════════════════════════════════════════════');

        console.log('\n── STEP 1: Opening ANC Tracking ──');
        await clickDashboardCard(driver, 'Maternal Health');
        await driver.pause(2000);
        await clickDashboardCard(driver, 'ANC Visits');
        await driver.pause(2000);
        console.log('✅ STEP 1 PASSED — ANC Visits screen opened');

        // ── STEP 2: Select beneficiary with 23+ weeks & Delivery Status switch ─
        const beneficiary1 = await selectEligibleBeneficiary(driver, 23);
        console.log(`✅ STEP 2 PASSED — Selected "${beneficiary1.name}" (${beneficiary1.weeks} weeks)`);

        // Scroll back to top before searching
        for (let i = 0; i < 5; i++) await swipeDown(driver);

        // ── STEPS 3–6: Verify switch enabled → Turn ON → Verify popup → Click YES
        await toggleDeliveryStatusAndConfirm(driver, beneficiary1.name);

        // ── STEP 6 (cont.): Navigate to Delivery Outcome and verify presence ──
        await navigateToHome(driver);
        await clickMaternalHealthFromHome(driver);
        await clickDeliveryOutcome(driver);

        const verified1 = await verifyInDeliveryOutcomeList(driver, beneficiary1.name);

        if (verified1) {
            console.log(`\n🎉 SCENARIO 1 PASSED — "${beneficiary1.name}" successfully moved to Delivery Outcome List`);
        } else {
            console.log(`\n❌ SCENARIO 1 FAILED — "${beneficiary1.name}" not found in Delivery Outcome List`);
        }

        // ════════════════════════════════════════════════════════════════════
        // SCENARIO 2: Different beneficiary → Toggle ON → Click NO → Verify still in ANC Visits
        // ════════════════════════════════════════════════════════════════════

        console.log('\n══════════════════════════════════════════════════════════════');
        console.log('  SCENARIO 2: Toggle ON → Click NO → Verify still in ANC Visits');
        console.log('══════════════════════════════════════════════════════════════');

        // Navigate back to ANC Visits to pick a second (different) beneficiary
        await navigateToAncVisits(driver);
        await driver.pause(2000);

        // Scan for a different eligible beneficiary (exclude the first one)
        console.log(`\n── SCENARIO 2: Scanning for a different beneficiary (excluding "${beneficiary1.name}") ──`);
        const allEligible = await selectEligibleBeneficiary(driver, 23);

        // If same name was picked, throw a clear error
        if (allEligible.name.toUpperCase() === beneficiary1.name.toUpperCase()) {
            throw new Error(
                `❌ Only one eligible beneficiary found ("${beneficiary1.name}"). ` +
                `Need a second different beneficiary for Scenario 2.`
            );
        }

        const beneficiary2 = allEligible;
        console.log(`✅ SCENARIO 2 — Selected different beneficiary: "${beneficiary2.name}" (${beneficiary2.weeks} weeks)`);

        // Scroll back to top before searching
        for (let i = 0; i < 5; i++) await swipeDown(driver);

        // Toggle ON → verify popup → click NO
        await toggleDeliveryStatusAndClickNo(driver, beneficiary2.name);

        // Verify beneficiary2 is still present in ANC Visits list
        const stillInAnc = await verifyInAncVisitsList(driver, beneficiary2.name);

        if (stillInAnc) {
            console.log(`\n🎉 SCENARIO 2 PASSED — "${beneficiary2.name}" remains in ANC Visits after clicking NO`);
        } else {
            console.log(`\n❌ SCENARIO 2 FAILED — "${beneficiary2.name}" unexpectedly missing from ANC Visits`);
        }

        // ── Final summary ─────────────────────────────────────────────────────
        console.log('\n══════════════════════════════════════════════════════════════');
        console.log('  TEST SUMMARY');
        console.log('══════════════════════════════════════════════════════════════');
        console.log(`  Scenario 1 (YES → moved to Delivery Outcome) : ${verified1  ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`  Scenario 2 (NO  → stays in ANC Visits)       : ${stillInAnc ? '✅ PASSED' : '❌ FAILED'}`);
        console.log('══════════════════════════════════════════════════════════════\n');

    } catch (err) {
        console.error('\n❌ Test execution failed:', err.message);
    } finally {
        await driver.deleteSession();
    }
}

module.exports = { runTest };
if (require.main === module) { runTest(); }