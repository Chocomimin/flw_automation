const { remote } = require('webdriverio');

const { clickAllHousehold, clickNewHouseholdRegistration, acceptConsent } = require("../../steps/householdSteps");
const { fillHouseholdFormWithExamples } = require("../../steps/householdFormSteps");
const { fillHeadOfFamilyFormWithExamples } = require("../../steps/headOfFamilySteps");
const { runTest } = require("../../maternal_health/Anc_visits");

// Appium Capabilities
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
    hostname: '127.0.0.1',
    port: 4723,
    logLevel: 'error',
    capabilities,
};

// ─────────────────────────────────────────────
// Tap at exact pixel coordinates (modern API)
// Uses W3C Actions — works with WebdriverIO v8/v9
// ─────────────────────────────────────────────
async function tapAt(driver, x, y) {
    await driver.performActions([
        {
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x, y },
                { type: 'pointerDown', button: 0 },
                { type: 'pause',       duration: 100 },
                { type: 'pointerUp',   button: 0 },
            ],
        },
    ]);
    await driver.releaseActions();
}

// ─────────────────────────────────────────────
// Launch app if not already in foreground
// ─────────────────────────────────────────────
async function launchAppIfNotRunning() {
    const driver = await remote(wdOpts);
    const appPackage = capabilities['appium:appPackage'];
    const appState = await driver.queryAppState(appPackage);

    if (appState !== 4) {
        console.log(`App is not in the foreground (State: ${appState}). Launching app...`);
        await driver.activateApp(appPackage);
    } else {
        console.log("App is already running in the foreground.");
    }

    return driver;
}

// ─────────────────────────────────────────────
// Click a card on the Home dashboard grid by text
// ─────────────────────────────────────────────
async function clickDashboardCard(driver, cardText) {
    const cardXPath = `//android.widget.TextView[@text="${cardText}"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_icon"]`;
    const cardElement = await driver.$(cardXPath);
    await cardElement.waitForDisplayed({ timeout: 10000 });
    await cardElement.click();
}

async function typeInSearchBar(driver, text) {
    console.log(`⌨️  Entering search text: "${text}"`);

    // ── 1. Find and focus the search field ──────────────────────────
    const searchBar = await driver.$(
        '//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]'
    );
    await searchBar.waitForDisplayed({ timeout: 5000 });
    await searchBar.click();
    await driver.pause(600);

    // ── 2. Clear then type ──────────────────────────────────────────
    await searchBar.clearValue();
    await driver.pause(300);
    await searchBar.setValue(text);
    await driver.pause(800);

    // ── 3. Trigger Native Keyboard Search ───────────────────────────
    // This simulates pressing the 'Search' or 'Enter' key on the soft keyboard
    try {
        console.log("🔎 Triggering native editor search action...");
        // Changed to driver.execute() which accepts objects directly
        await driver.execute('mobile: performEditorAction', { action: 'search' });
    } catch (err) {
        // Fallback to Android Enter key (KEYCODE_ENTER = 66)
        console.log("⚠️  Editor action failed, falling back to KEYCODE_ENTER");
        await driver.execute('mobile: pressKey', { keycode: 66 });
    }

    await driver.pause(1000);

    // ── 4. Hide keyboard to ensure clean view for assertions ───────
    try { await driver.hideKeyboard(); } catch (_) { /* already hidden */ }
    await driver.pause(1000);
}

// ─────────────────────────────────────────────
// Verify a newly created household record exists
// ─────────────────────────────────────────────
async function verifyHouseholdRecord(driver, expectedName) {
    console.log(`🔍 Searching for household record: ${expectedName}...`);

    await typeInSearchBar(driver, expectedName);

    const nameLocator =
        `//android.widget.TextView` +
        `[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id"` +
        ` and @text="${expectedName}"]`;

    const el      = await driver.$(nameLocator);
    const isFound = await el.isExisting();

    if (isFound) {
        console.log(`✅ Verification Passed: Record for "${expectedName}" was found.`);
    } else {
        console.error(`❌ Verification Failed: Record for "${expectedName}" could not be found.`);
    }
}

// ─────────────────────────────────────────────
// Verify 'ADD ANC VISIT' button is disabled/gone
// ─────────────────────────────────────────────
async function verifyAncVisitDisabled(driver, searchName) {
    console.log(`🔍 Verifying ANC visit status for: ${searchName}...`);

    await typeInSearchBar(driver, searchName);

    const addAncXPath =
        `//android.widget.TextView[@text="${searchName}"]` +
        `/ancestor::android.widget.FrameLayout` +
        `[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]` +
        `//android.widget.Button[@text="ADD ANC VISIT"]`;

    const addAncButton = await driver.$(addAncXPath);
    const exists       = await addAncButton.isExisting();

    if (!exists) {
        console.log(`✅ Verification Successful: 'ADD ANC VISIT' button is no longer present for ${searchName}.`);
        return true;
    }

    const isEnabled = await addAncButton.isEnabled();
    if (!isEnabled) {
        console.log(`✅ Verification Successful: 'ADD ANC VISIT' button is correctly DISABLED for ${searchName}.`);
        return true;
    }

    console.error(`❌ Verification Failed: 'ADD ANC VISIT' button is still ENABLED for ${searchName}!`);
    return false;
}

// ─────────────────────────────────────────────
// Navigate back to the Home dashboard
// ─────────────────────────────────────────────
async function navigateBackToHome(driver) {
    console.log("🏠 Navigating back to Home...");
    const homeButton = await driver.$('id:org.piramalswasthya.sakhi.saksham.uat:id/toolbar_menu_home');
    await homeButton.waitForDisplayed({ timeout: 5000 });
    await homeButton.click();
    await driver.pause(1500);
    console.log("✅ Returned to Home dashboard.");
}

// ─────────────────────────────────────────────
// Main automation runner
// ─────────────────────────────────────────────
async function runAutomation() {
    let driver;

    try {
        driver = await launchAppIfNotRunning();
        console.log("Ready to automate!");

        // ── PART 1: HOUSEHOLD REGISTRATION ──────────────────────────
        // await clickAllHousehold(driver);
        // await clickNewHouseholdRegistration(driver);
        // await acceptConsent(driver);

        // console.log("🚀 Starting to fill the first form (Household)...");
        // await fillHouseholdFormWithExamples(driver);
        // await driver.pause(3000);

        // console.log("🚀 Starting to fill the second form (Head of Family)...");

        // await fillHeadOfFamilyFormWithExamples(driver);
        // console.log("🎉 Household registration completed successfully!");
        // const createdHoFName = "RIVA VIK";
        // // Household Verification
        // await clickAllHousehold(driver);
        // await verifyHouseholdRecord(driver, createdHoFName);

        // // Go back home
        // await navigateBackToHome(driver);

        // ── PART 2: MATERNAL HEALTH / ANC VISIT ─────────────────────
        await runTest(driver);

        // ── PART 3: POST-RUN VISIT VERIFICATION ─────────────────────
        await navigateBackToHome(driver);

        console.log("Opening Maternal Health for verification suite...");
        await clickDashboardCard(driver, 'Maternal Health');
        await driver.pause(1500);

        await clickDashboardCard(driver, 'ANC Visits');
        await driver.pause(1500);

        await verifyAncVisitDisabled(driver, 'KIYA H');

        // Clean finish
        await navigateBackToHome(driver);

    } catch (err) {
        console.error("❌ An error occurred during the automation run:", err);
    } finally {
        if (driver) {
            // await driver.deleteSession();
        }
    }
}

runAutomation();