const assert = require("assert");
const { selectLanguage, login } = require("../../steps/loginSteps");
const { selectVillage } = require("../../steps/villageSteps");
const { clickAllHousehold, acceptConsent } = require("../../steps/householdSteps");

// ─────────────────────────────────────────────
// Helper: scroll spinner into view if below midpoint
// ─────────────────────────────────────────────
async function scrollSpinnerToMiddle(browserInstance, spinnerSelector) {
    try {
        const spinner = await browserInstance.$(spinnerSelector);
        const loc    = await spinner.getLocation();
        const screen = await browserInstance.getWindowRect();
        if (loc.y > screen.height / 2 + 100) {
            const swipeX = Math.floor(screen.width / 2);
            await browserInstance.performActions([{
                type: 'pointer', id: 'finger1',
                parameters: { pointerType: 'touch' },
                actions: [
                    { type: 'pointerMove', duration: 0,    x: swipeX, y: Math.floor(screen.height * 0.7) },
                    { type: 'pointerDown', button: 0 },
                    { type: 'pause',       duration: 200 },
                    { type: 'pointerMove', duration: 1000, x: swipeX, y: Math.floor(screen.height * 0.3) },
                    { type: 'pointerUp',   button: 0 }
                ]
            }]);
            await browserInstance.releaseActions();
            await browserInstance.pause(1500);
        }
    } catch (e) {}
}

// ─────────────────────────────────────────────
// Helper: tap at exact screen coordinates
// ─────────────────────────────────────────────
async function tapByCoords(browserInstance, tapX, tapY) {
    await browserInstance.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0,   x: tapX, y: tapY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 150 },
            { type: 'pointerUp',   button: 0 }
        ]
    }]);
    await browserInstance.releaseActions();
    await browserInstance.pause(500);
}

// ─────────────────────────────────────────────
// Helper: open spinner dropdown and select an option by value
// ─────────────────────────────────────────────
async function clickSpinnerAndSelectOption(browserInstance, spinnerSelector, value, optionsList) {
    await scrollSpinnerToMiddle(browserInstance, spinnerSelector);
    const spinner = await browserInstance.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });
    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();
    await tapByCoords(browserInstance, Math.floor(loc.x + size.width - 40), Math.floor(loc.y + size.height / 2));
    await browserInstance.pause(2000);

    // Strategy 1: XPath text
    try {
        const item = await browserInstance.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        return;
    } catch (e) {}

    // Strategy 2: UiSelector text
    try {
        const item = await browserInstance.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        return;
    } catch (e) {}

    // Strategy 3: coordinate tap based on dropdown position
    const screen  = await browserInstance.getWindowRect();
    const idx     = optionsList.indexOf(value);
    const rowH    = size.height;
    const bottom  = loc.y + size.height;
    const opensUp = (screen.height - bottom) < (optionsList.length * rowH);
    const finalX  = Math.floor(loc.x + size.width / 2);
    let   finalY  = opensUp
        ? Math.floor(loc.y - ((optionsList.length - 1 - idx) * rowH) - rowH / 2)
        : Math.floor(bottom + (idx * rowH) + rowH / 2);
    finalY = Math.max(5, Math.min(finalY, screen.height - 5));
    await tapByCoords(browserInstance, finalX, finalY);
}

async function navigateCalendarToYear(browserInstance, targetYear) {
    const yearHeader = await browserInstance.$('//android.widget.TextView[@resource-id="android:id/date_picker_header_year"]');
    await yearHeader.waitForDisplayed({ timeout: 5000 });

    let currentYear = new Date().getFullYear();
    try {
        const headerText = await yearHeader.getText();
        const parsed = parseInt(headerText, 10);
        if (!isNaN(parsed)) currentYear = parsed;
    } catch (e) {}

    await yearHeader.click();
    await browserInstance.pause(1500);

    const targetStr = targetYear.toString();

    try {
        const yearEl = await browserInstance.$(`//*[@text="${targetStr}"]`);
        if (await yearEl.isDisplayed()) {
            await yearEl.click();
            console.log(`✅ Selected year ${targetStr} without scrolling.`);
            await browserInstance.pause(1000);
            return;
        }
    } catch (e) {}

    console.log(`⚙️ Swiping to find year ${targetStr} (Starting at: ${currentYear})...`);
    const screen = await browserInstance.getWindowRect();
    const swipeX  = Math.floor(screen.width / 2);
    const yTop = Math.floor(screen.height * 0.45);
    const yBottom = Math.floor(screen.height * 0.55);
    const swipeFingerDown = targetYear < currentYear;

    const maxSwipes = 40;
    for (let swipe = 0; swipe < maxSwipes; swipe++) {
        const fromY = swipeFingerDown ? yTop : yBottom;
        const toY   = swipeFingerDown ? yBottom : yTop;

        await browserInstance.performActions([{
            type: 'pointer', id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0,   x: swipeX, y: fromY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause',       duration: 100 },
                { type: 'pointerMove', duration: 600, x: swipeX, y: toY },
                { type: 'pointerUp',   button: 0 }
            ]
        }]);
        await browserInstance.releaseActions();
        await browserInstance.pause(500);

        try {
            const yearEl = await browserInstance.$(`//*[@text="${targetStr}"]`);
            if (await yearEl.isDisplayed()) {
                await yearEl.click();
                console.log(`✅ Selected year ${targetStr} after ${swipe + 1} swipes.`);
                await browserInstance.pause(1000);
                return;
            }
        } catch (e) {}
    }

    throw new Error(`❌ Could not find year ${targetStr} in the date picker after ${maxSwipes} swipes.`);
}

// ─────────────────────────────────────────────
// Helper: scroll + click a random household's Members button
// ─────────────────────────────────────────────
async function openRandomHouseholdMembers(browserInstance) {
    console.log("🚀 Selecting a random household's Members button...");
    const scrollCount = Math.floor(Math.random() * 3);
    for (let i = 0; i < scrollCount; i++) {
        try {
            await browserInstance.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollForward()');
            await browserInstance.pause(1000);
        } catch (e) { break; }
    }

    const btns = await browserInstance.$$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/button3")');
    if (btns.length === 0) throw new Error("❌ No 'Members' buttons found on screen.");
    await btns[Math.floor(Math.random() * btns.length)].click();
    console.log("✅ Clicked a random 'Members' button.");
}

// ─────────────────────────────────────────────
// Helper: iterate households until a female member is found and clicked
// ─────────────────────────────────────────────
async function trySelectFemaleBeneficiary(browserInstance) {
    const maxAttempts = 5;
    for (let i = 1; i <= maxAttempts; i++) {
        console.log(`\n🔍 Attempt ${i}/${maxAttempts} to find a female beneficiary...`);
        await openRandomHouseholdMembers(browserInstance);
        await browserInstance.pause(2000);

        const xp = `//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/gender" and @text="Female"]/ancestor::android.view.ViewGroup[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/contentLayout"]//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id"]`;
        const el = await browserInstance.$(xp);
        if (await el.isExisting()) {
            const name = await el.getText();
            await el.click();
            console.log(`🎉 Clicked female member: '${name}'`);
            return;
        }
        console.log("⚠️ No female member found. Going back...");
        await browserInstance.back();
        await browserInstance.pause(2000);
    }
    throw new Error(`❌ Could not find a female beneficiary after ${maxAttempts} attempts.`);
}

// ─────────────────────────────────────────────
// Helper: change DOB in the already-open edit form
// ─────────────────────────────────────────────
async function changeDobOnOpenForm(browserInstance, targetYear) {
    console.log(`📅 Changing Date of Birth to year ${targetYear}...`);

    try {
        await browserInstance.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/et_date"))');
        await browserInstance.pause(500);
    } catch (e) {}

    const dobField = await browserInstance.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/et_date")');
    await dobField.waitForDisplayed({ timeout: 5000 });
    await dobField.click();
    await browserInstance.pause(1000);

    await navigateCalendarToYear(browserInstance, targetYear);

    const okBtn = await browserInstance.$('android=new UiSelector().resourceId("android:id/button1").text("OK")');
    await okBtn.click();
    console.log(`✅ DOB updated to year ${targetYear}.`);
    await browserInstance.pause(2000);
}

// ─────────────────────────────────────────────
// Helper: scroll down to "Status Of Women" spinner and read its current value
// ─────────────────────────────────────────────
async function readStatusOfWomen(browserInstance) {
    console.log("⬇️ Scrolling to 'Status Of Women' field...");

    try {
        await browserInstance.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().description("Status Of Women"))');
        await browserInstance.pause(1000);
    } catch (e) {
        try {
            await browserInstance.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Status Of Women"))');
            await browserInstance.pause(1000);
        } catch (e2) {
            console.log("⚠️ Could not auto-scroll to Status Of Women — it may already be visible.");
        }
    }

    try {
        const spinner = await browserInstance.$('android=new UiSelector().description("Status Of Women")');
        await spinner.waitForDisplayed({ timeout: 5000 });
        const val = await spinner.getText();
        console.log(`📋 Status Of Women value: "${val}"`);
        return val.trim();
    } catch (e) {
        console.log("⚠️ content-desc locator failed. Trying XPath hint...");
    }

    try {
        const spinner = await browserInstance.$('//android.widget.Spinner[contains(@hint,"Status Of Women")]');
        await spinner.waitForDisplayed({ timeout: 5000 });
        const val = await spinner.getText();
        console.log(`📋 Status Of Women (XPath hint): "${val}"`);
        return val.trim();
    } catch (e) {
        console.log("❌ Could not locate Status Of Women spinner.");
    }

    return null;
}

// ─────────────────────────────────────────────
// Helper: verify the Status Of Women value matches expectation
// ─────────────────────────────────────────────
function checkStatus(actual, expected, testLabel) {
    if (actual === null) {
        console.log(`❌ ${testLabel} — FAILED (could not read Status Of Women)`);
        return false;
    }
    const passed = actual.toLowerCase().includes(expected.toLowerCase());
    if (passed) {
        console.log(`✅ ${testLabel} — PASSED (Status Of Women = "${actual}")`);
    } else {
        console.log(`❌ ${testLabel} — FAILED (expected "${expected}", got "${actual}")`);
    }
    return passed;
}

// ─────────────────────────────────────────────
// Mocha Test Suite
// ─────────────────────────────────────────────

describe('Beneficiary Registration - Status of Women', () => {

    it('(Qase ID: 1345) - Verify Status of Women shows Adolescent Girl for unmarried female 15-19 and Not Applicable for 20-49', async () => {
        const results = { adolescentGirlCheck: false, notApplicableCheck: false };

        // ── Login & navigate to household list ────────────
        await selectLanguage(browser, "English");
        await login(browser, "Bobita", "Test@123");
        await browser.pause(5000);

        await selectVillage(browser, "Oating");
        await browser.pause(2000);

        await clickAllHousehold(browser);
        await browser.pause(3000);

        // ── Find and open a female beneficiary's profile ──
        await trySelectFemaleBeneficiary(browser);
        await browser.pause(2000);

        // ── Open the edit form (FAB) ──────────────────────
        console.log("\n✏️ Opening the edit form...");
        const editFab = await browser.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/fab_edit")');
        await editFab.waitForDisplayed({ timeout: 10000 });
        await editFab.click();
        console.log("✅ Edit FAB clicked.");
        await browser.pause(1500);

        // ── Accept consent ────────────────────────────────
        console.log("📝 Accepting consent...");
        await acceptConsent(browser);
        await browser.pause(3000);

        // ══════════════════════════════════════════════════
        // STEP 1: Set DOB → age 15-19 (year 2009 → age ~17)
        // ══════════════════════════════════════════════════
        console.log("\n" + "─".repeat(55));
        console.log("  STEP 1: Set age 15-19 (DOB year 2009)");
        console.log("─".repeat(55));
        await changeDobOnOpenForm(browser, 2009);

        // ── Set Marital Status → Unmarried ────────────────
        console.log("💍 Setting Marital Status to 'Unmarried'...");
        await browser.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().description("Marital Status"))');
        await browser.pause(1000);

        await clickSpinnerAndSelectOption(
            browser,
            'android=new UiSelector().description("Marital Status")',
            'Unmarried',
            ['Unmarried', 'Married', 'Divorced', 'Separated', 'Widower']
        );
        console.log("✅ Marital Status → Unmarried");
        await browser.pause(2000);

        // ── Scroll down and read Status Of Women ──────────
        const statusStep1 = await readStatusOfWomen(browser);
        results.adolescentGirlCheck = checkStatus(
            statusStep1,
            "Adolescent Girl",
            "TEST 1 (Age 15-19 + Unmarried → Adolescent Girl)"
        );

        // ══════════════════════════════════════════════════
        // STEP 2: On the SAME open form, change DOB → age 20-49 (year 1995 → age ~31)
        // ══════════════════════════════════════════════════
        console.log("\n" + "─".repeat(55));
        console.log("  STEP 2: Change age to 20-49 (DOB year 1995)");
        console.log("─".repeat(55));
        await changeDobOnOpenForm(browser, 1995);
        await browser.pause(2000);

        // ── Scroll down and read Status Of Women again ────
        const statusStep2 = await readStatusOfWomen(browser);
        results.notApplicableCheck = checkStatus(
            statusStep2,
            "Not Applicable",
            "TEST 2 (Age 20-49 + Unmarried → Not Applicable)"
        );

        // ── Back out WITHOUT submitting ───────────────────
        console.log("\n🔙 Backing out of form (no submission)...");
        await browser.back();
        await browser.pause(1500);

        try {
            const discardBtn = await browser.$('//*[@text="DISCARD" or @text="Discard" or @text="YES" or @text="Yes" or @text="OK"]');
            if (await discardBtn.isExisting()) {
                await discardBtn.click();
                console.log("✅ Dismissed discard-changes dialog.");
            }
        } catch (e) {}

        // ── Assertions to formally pass/fail the Mocha test
        console.log("\n╔══════════════════════════════════════════════════╗");
        console.log("║               FINAL TEST RESULTS                 ║");
        console.log("╠══════════════════════════════════════════════════╣");
        console.log(`║ Test 1 — Adolescent Girl  : ${results.adolescentGirlCheck ? "✅ PASSED" : "❌ FAILED"}               ║`);
        console.log(`║ Test 2 — Not Applicable   : ${results.notApplicableCheck  ? "✅ PASSED" : "❌ FAILED"}               ║`);
        console.log("╚══════════════════════════════════════════════════╝");

        assert.ok(results.adolescentGirlCheck, "Test 1 Failed: Status was not 'Adolescent Girl' for age 15-19.");
        assert.ok(results.notApplicableCheck, "Test 2 Failed: Status was not 'Not Applicable' for age 20-49.");
    });
});