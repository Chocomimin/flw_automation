// editRandomHouseholdTest.js
//
// Flow (NO form submission at any point):
//   1. Open edit form for a female beneficiary
//   2. Set DOB → age 15-19 (year 2009) + Marital Status → Unmarried
//   3. Scroll down → read "Status Of Women" spinner → expect "Adolescent Girl" → PASS/FAIL
//   4. On the SAME open form, change DOB → age 20-49 (year 1995)
//   5. Scroll down → read "Status Of Women" spinner → expect "Not Applicable" → PASS/FAIL
//   6. Close / back out — form is never submitted

const { remote } = require("webdriverio");
const { selectLanguage, login } = require("../../steps/loginSteps");
const { selectVillage } = require("../../steps/villageSteps");
const { clickAllHousehold, acceptConsent } = require("../../steps/householdSteps");

// ─────────────────────────────────────────────
// Helper: scroll spinner into view if below midpoint
// ─────────────────────────────────────────────
async function scrollSpinnerToMiddle(driver, spinnerSelector) {
    try {
        const spinner = await driver.$(spinnerSelector);
        const loc    = await spinner.getLocation();
        const screen = await driver.getWindowRect();
        if (loc.y > screen.height / 2 + 100) {
            const swipeX = Math.floor(screen.width / 2);
            await driver.performActions([{
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
            await driver.releaseActions();
            await driver.pause(1500);
        }
    } catch (e) {}
}

// ─────────────────────────────────────────────
// Helper: tap at exact screen coordinates
// ─────────────────────────────────────────────
async function tapByCoords(driver, tapX, tapY) {
    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0,   x: tapX, y: tapY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 150 },
            { type: 'pointerUp',   button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(500);
}

// ─────────────────────────────────────────────
// Helper: open spinner dropdown and select an option by value
// ─────────────────────────────────────────────
async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList) {
    await scrollSpinnerToMiddle(driver, spinnerSelector);
    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });
    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();
    await tapByCoords(driver, Math.floor(loc.x + size.width - 40), Math.floor(loc.y + size.height / 2));
    await driver.pause(2000);

    // Strategy 1: XPath text
    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        return;
    } catch (e) {}

    // Strategy 2: UiSelector text
    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        return;
    } catch (e) {}

    // Strategy 3: coordinate tap based on dropdown position
    const screen  = await driver.getWindowRect();
    const idx     = optionsList.indexOf(value);
    const rowH    = size.height;
    const bottom  = loc.y + size.height;
    const opensUp = (screen.height - bottom) < (optionsList.length * rowH);
    const finalX  = Math.floor(loc.x + size.width / 2);
    let   finalY  = opensUp
        ? Math.floor(loc.y - ((optionsList.length - 1 - idx) * rowH) - rowH / 2)
        : Math.floor(bottom + (idx * rowH) + rowH / 2);
    finalY = Math.max(5, Math.min(finalY, screen.height - 5));
    await tapByCoords(driver, finalX, finalY);
}

async function navigateCalendarToYear(driver, targetYear) {
    // 1. Locate the header
    const yearHeader = await driver.$('//android.widget.TextView[@resource-id="android:id/date_picker_header_year"]');
    await yearHeader.waitForDisplayed({ timeout: 5000 });

    // 2. Read the current year BEFORE clicking, so we know which way to scroll
    let currentYear = new Date().getFullYear();
    try {
        const headerText = await yearHeader.getText();
        const parsed = parseInt(headerText, 10);
        if (!isNaN(parsed)) currentYear = parsed;
    } catch (e) {}

    // 3. Click header to open the year list
    await yearHeader.click();
    await driver.pause(1500);

    const targetStr = targetYear.toString();

    // 4. Quick check: Is the year already visible on screen?
    try {
        const yearEl = await driver.$(`//*[@text="${targetStr}"]`);
        if (await yearEl.isDisplayed()) {
            await yearEl.click();
            console.log(`✅ Selected year ${targetStr} without scrolling.`);
            await driver.pause(1000);
            return;
        }
    } catch (e) {}

    // 5. Manual Swipe Loop (Bypassing the buggy UiScrollable entirely)
    console.log(`⚙️ Swiping to find year ${targetStr} (Starting at: ${currentYear})...`);
    const screen = await driver.getWindowRect();
    const swipeX  = Math.floor(screen.width / 2);

    // REDUCED SWIPE DISTANCE:
    // Using 45% and 55% creates a short, gentle swipe (checking year-by-year)
    // instead of a massive fling that jumps over the target.
    const yTop = Math.floor(screen.height * 0.45);
    const yBottom = Math.floor(screen.height * 0.55);

    // If target (1995) < current (2009) -> Need older years -> Swipe finger DOWN
    const swipeFingerDown = targetYear < currentYear;

    const maxSwipes = 40;
    for (let swipe = 0; swipe < maxSwipes; swipe++) {
        // Set coordinates based on direction
        const fromY = swipeFingerDown ? yTop : yBottom;
        const toY   = swipeFingerDown ? yBottom : yTop;

        // Perform the swipe
        await driver.performActions([{
            type: 'pointer', id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0,   x: swipeX, y: fromY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause',       duration: 100 },
                { type: 'pointerMove', duration: 600, x: swipeX, y: toY }, // 600ms prevents fling/bounce
                { type: 'pointerUp',   button: 0 }
            ]
        }]);
        await driver.releaseActions();
        await driver.pause(500); // Let the UI settle

        // Check if the target year is now on screen
        try {
            const yearEl = await driver.$(`//*[@text="${targetStr}"]`);
            if (await yearEl.isDisplayed()) {
                await yearEl.click();
                console.log(`✅ Selected year ${targetStr} after ${swipe + 1} swipes.`);
                await driver.pause(1000);
                return;
            }
        } catch (e) {}
    }

    throw new Error(`❌ Could not find year ${targetStr} in the date picker after ${maxSwipes} swipes.`);
}

// ─────────────────────────────────────────────
// Helper: scroll + click a random household's Members button
// ─────────────────────────────────────────────
async function openRandomHouseholdMembers(driver) {
    console.log("🚀 Selecting a random household's Members button...");
    const scrollCount = Math.floor(Math.random() * 3);
    for (let i = 0; i < scrollCount; i++) {
        try {
            await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollForward()');
            await driver.pause(1000);
        } catch (e) { break; }
    }

    const btns = await driver.$$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/button3")');
    if (btns.length === 0) throw new Error("❌ No 'Members' buttons found on screen.");
    await btns[Math.floor(Math.random() * btns.length)].click();
    console.log("✅ Clicked a random 'Members' button.");
}

// ─────────────────────────────────────────────
// Helper: iterate households until a female member is found and clicked
// ─────────────────────────────────────────────
async function trySelectFemaleBeneficiary(driver) {
    const maxAttempts = 5;
    for (let i = 1; i <= maxAttempts; i++) {
        console.log(`\n🔍 Attempt ${i}/${maxAttempts} to find a female beneficiary...`);
        await openRandomHouseholdMembers(driver);
        await driver.pause(2000);

        const xp = `//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/gender" and @text="Female"]/ancestor::android.view.ViewGroup[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/contentLayout"]//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id"]`;
        const el = await driver.$(xp);
        if (await el.isExisting()) {
            const name = await el.getText();
            await el.click();
            console.log(`🎉 Clicked female member: '${name}'`);
            return;
        }
        console.log("⚠️ No female member found. Going back...");
        await driver.back();
        await driver.pause(2000);
    }
    throw new Error(`❌ Could not find a female beneficiary after ${maxAttempts} attempts.`);
}

// ─────────────────────────────────────────────
// Helper: change DOB in the already-open edit form
//         (opens the calendar, picks the year, confirms)
// ─────────────────────────────────────────────
async function changeDobOnOpenForm(driver, targetYear) {
    console.log(`📅 Changing Date of Birth to year ${targetYear}...`);

    // Scroll up to ensure the DOB field is reachable
    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/et_date"))');
        await driver.pause(500);
    } catch (e) {}

    const dobField = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/et_date")');
    await dobField.waitForDisplayed({ timeout: 5000 });
    await dobField.click();
    await driver.pause(1000);

    await navigateCalendarToYear(driver, targetYear);

    const okBtn = await driver.$('android=new UiSelector().resourceId("android:id/button1").text("OK")');
    await okBtn.click();
    console.log(`✅ DOB updated to year ${targetYear}.`);
    await driver.pause(2000); // let form react and auto-update Status Of Women
}

// ─────────────────────────────────────────────
// Helper: scroll down to "Status Of Women" spinner and read its current value
// The spinner has content-desc="Status Of Women" (confirmed from UI dump).
// ─────────────────────────────────────────────
async function readStatusOfWomen(driver) {
    console.log("⬇️ Scrolling to 'Status Of Women' field...");

    // Scroll to bring the Status Of Women spinner into view
    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().description("Status Of Women"))');
        await driver.pause(1000);
    } catch (e) {
        // Fallback: scroll by hint text
        try {
            await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Status Of Women"))');
            await driver.pause(1000);
        } catch (e2) {
            console.log("⚠️ Could not auto-scroll to Status Of Women — it may already be visible.");
        }
    }

    // Primary locator: content-desc="Status Of Women" (confirmed in UI dump)
    try {
        const spinner = await driver.$('android=new UiSelector().description("Status Of Women")');
        await spinner.waitForDisplayed({ timeout: 5000 });
        const val = await spinner.getText();
        console.log(`📋 Status Of Women value: "${val}"`);
        return val.trim();
    } catch (e) {
        console.log("⚠️ content-desc locator failed. Trying XPath hint...");
    }

    // Fallback: XPath on hint attribute
    try {
        const spinner = await driver.$('//android.widget.Spinner[contains(@hint,"Status Of Women")]');
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
// Main test runner
// ─────────────────────────────────────────────
async function main() {
    const driver = await remote({
        protocol: "http",
        hostname: "localhost",
        port: 4723,
        path: "/",
        capabilities: {
            platformName: "Android",
            "appium:deviceName": "ZD222X4TDK",
            "appium:automationName": "UiAutomator2",
            "appium:appPackage": "org.piramalswasthya.sakhi.saksham.uat",
            "appium:appActivity": "org.piramalswasthya.sakhi.ui.login_activity.LoginActivity",
            "appium:noReset": false,
            "appium:autoGrantPermissions": true,
            "appium:newCommandTimeout": 300,
            "appium:language": "en",
            "appium:locale": "US",
        }
    });

    console.log("✅ App launched successfully!");

    const results = { adolescentGirlCheck: false, notApplicableCheck: false };

    try {
        // ── Login & navigate to household list ────────────
        await selectLanguage(driver, "English");
        await login(driver, "Bobita", "Test@123");
        await driver.pause(5000);

        await selectVillage(driver, "Oating");
        await driver.pause(2000);

        await clickAllHousehold(driver);
        await driver.pause(3000);

        // ── Find and open a female beneficiary's profile ──
        await trySelectFemaleBeneficiary(driver);
        await driver.pause(2000);

        // ── Open the edit form (FAB) ──────────────────────
        console.log("\n✏️ Opening the edit form...");
        const editFab = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/fab_edit")');
        await editFab.waitForDisplayed({ timeout: 10000 });
        await editFab.click();
        console.log("✅ Edit FAB clicked.");
        await driver.pause(1500);

        // ── Accept consent ────────────────────────────────
        console.log("📝 Accepting consent...");
        await acceptConsent(driver);
        await driver.pause(3000);

        // ══════════════════════════════════════════════════
        // STEP 1: Set DOB → age 15-19 (year 2009 → age ~17)
        // ══════════════════════════════════════════════════
        console.log("\n" + "─".repeat(55));
        console.log("  STEP 1: Set age 15-19 (DOB year 2009)");
        console.log("─".repeat(55));
        await changeDobOnOpenForm(driver, 2009);

        // ── Set Marital Status → Unmarried ────────────────
        console.log("💍 Setting Marital Status to 'Unmarried'...");
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().description("Marital Status"))');
        await driver.pause(1000);

        await clickSpinnerAndSelectOption(
            driver,
            'android=new UiSelector().description("Marital Status")',
            'Unmarried',
            ['Unmarried', 'Married', 'Divorced', 'Separated', 'Widower']
        );
        console.log("✅ Marital Status → Unmarried");
        await driver.pause(2000); // allow form to auto-update Status Of Women

        // ── Scroll down and read Status Of Women ──────────
        const statusStep1 = await readStatusOfWomen(driver);
        results.adolescentGirlCheck = checkStatus(
            statusStep1,
            "Adolescent Girl",
            "TEST 1 (Age 15-19 + Unmarried → Adolescent Girl)"
        );

        // ══════════════════════════════════════════════════
        // STEP 2: On the SAME open form, change DOB → age 20-49 (year 1995 → age ~31)
        //         Marital Status is already Unmarried — no need to change it again.
        // ══════════════════════════════════════════════════
        console.log("\n" + "─".repeat(55));
        console.log("  STEP 2: Change age to 20-49 (DOB year 1995)");
        console.log("─".repeat(55));
        await changeDobOnOpenForm(driver, 1995);
        // Status Of Women should auto-update when DOB changes
        await driver.pause(2000);

        // ── Scroll down and read Status Of Women again ────
        const statusStep2 = await readStatusOfWomen(driver);
        results.notApplicableCheck = checkStatus(
            statusStep2,
            "Not Applicable",
            "TEST 2 (Age 20-49 + Unmarried → Not Applicable)"
        );

        // ── Back out WITHOUT submitting ───────────────────
        console.log("\n🔙 Backing out of form (no submission)...");
        await driver.back();
        await driver.pause(1500);
        // Dismiss any "discard changes?" dialog if it appears
        try {
            const discardBtn = await driver.$('//*[@text="DISCARD" or @text="Discard" or @text="YES" or @text="Yes" or @text="OK"]');
            if (await discardBtn.isExisting()) {
                await discardBtn.click();
                console.log("✅ Dismissed discard-changes dialog.");
            }
        } catch (e) {}

    } catch (error) {
        console.error("❌ Test execution failed:", error);
        try {
            const fs = require('fs');
            const shot = await driver.takeScreenshot();
            fs.writeFileSync(`error-${Date.now()}.png`, shot, 'base64');
            console.log("📸 Screenshot saved for debugging.");
        } catch (e) {}
    } finally {
        // ── Final summary ─────────────────────────────────
        console.log("\n╔══════════════════════════════════════════════════╗");
        console.log("║               FINAL TEST RESULTS                 ║");
        console.log("╠══════════════════════════════════════════════════╣");
        console.log(`║ Test 1 — Adolescent Girl  : ${results.adolescentGirlCheck ? "✅ PASSED" : "❌ FAILED"}               ║`);
        console.log(`║ Test 2 — Not Applicable   : ${results.notApplicableCheck  ? "✅ PASSED" : "❌ FAILED"}               ║`);
        console.log("╚══════════════════════════════════════════════════╝");
        console.log(results.adolescentGirlCheck && results.notApplicableCheck
            ? "\n🎉 ALL TEST CASES PASSED!"
            : "\n⚠️  SOME TEST CASES FAILED. Review logs above.");
        await driver.deleteSession();
    }
}

main().catch(err => {
    console.error("❌ Main crashed:", err);
    process.exit(1);
});