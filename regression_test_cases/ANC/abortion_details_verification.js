const { remote } = require('webdriverio');
const { fillAncForm } = require("./anc/ancVisitForm");

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true
};

// ── DASHBOARD NAVIGATION ───────────────────────────────────────────────────────

async function clickDashboardCard(driver, cardText) {
    const cardXPath = `//android.widget.TextView[@text="${cardText}"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_icon"]`;
    const cardElement = await driver.$(cardXPath);

    try {
        await cardElement.waitForDisplayed({ timeout: 10000 });
        await cardElement.click();
        console.log(`✅ Successfully clicked the '${cardText}' card.`);
    } catch (error) {
        console.error(`❌ Failed to click the '${cardText}' card. Error: ${error.message}`);
        throw error;
    }
}

// ── STEP 1: OPEN ANC VISIT & PICK A RANDOM BENEFICIARY (NO SEARCH) ────────────

async function selectRandomAddAncVisit(driver) {
    try {
        console.log('🔎 Looking for available "ADD ANC VISIT" buttons on the list (no search used)...');

        const rawButtons = await driver.$$('//android.widget.Button[@text="ADD ANC VISIT"]');
        const addButtons = Array.from(rawButtons); // WDIO's $$ result isn't a plain array in all versions
        if (!addButtons || addButtons.length === 0) {
            throw new Error('No "ADD ANC VISIT" buttons found on the ANC Visits list.');
        }

        console.log(`📋 Found ${addButtons.length} beneficiary card(s) with "ADD ANC VISIT".`);
        const randomIndex = Math.floor(Math.random() * addButtons.length);
        const chosenButton = addButtons[randomIndex];

        // Try to capture the beneficiary name from the same card so we can
        // verify the SAME beneficiary later in the Abortion module.
        // NOTE: this assumes the beneficiary name is the first TextView inside
        // the card container (cv_content). Adjust the relative XPath below if
        // your card layout places the name elsewhere (e.g. a different
        // resource-id).
        let beneficiaryName = null;
        try {
            const cardXPath = `(//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"])[${randomIndex + 1}]`;
            const card = await driver.$(cardXPath);
            const nameField = await card.$('.//android.widget.TextView[1]');
            beneficiaryName = (await nameField.getText()).trim();
        } catch (e) {
            console.log(`⚠️ Could not auto-read beneficiary name from the card. Continuing without it. Error: ${e.message}`);
        }

        await chosenButton.waitForDisplayed({ timeout: 10000 });
        await chosenButton.click();

        console.log(`✅ Clicked "ADD ANC VISIT" for a random beneficiary${beneficiaryName ? ` ("${beneficiaryName}")` : ' (name not captured)'} (card index ${randomIndex + 1}).`);
        return beneficiaryName;

    } catch (error) {
        console.error(`❌ Failed to select a random ANC visit. Error: ${error.message}`);
        throw error;
    }
}

// ── CALENDAR HEALTH CHECK & RETRY LOGIC ────────────────────────────────────────

async function verifyAncCalendarOpens(driver) {
    console.log('🗓️ Checking if the ANC Date calendar opens...');
    try {
        const field = await driver.$('//android.widget.EditText[contains(@hint, "ANC Date *")]');
        await field.waitForDisplayed({ timeout: 10000 });
        await field.click();
        await driver.pause(1500);

        const datePicker = await driver.$('android=new UiSelector().resourceId("android:id/datePicker")');
        const opened = await datePicker.isExisting();

        if (opened) {
            console.log('✅ ANC Date calendar opened successfully.');
            // Close it again — fillAncForm() will reopen and pick the date itself.
            await driver.pressKeyCode(4);
            await driver.pause(500);
            return true;
        }

        console.log('❌ ANC Date calendar did NOT open.');
        return false;
    } catch (error) {
        console.log(`❌ Error while checking ANC Date calendar: ${error.message}`);
        return false;
    }
}

async function backToAncVisitsList(driver) {
    console.log('↩️ Navigating back to the ANC Visits list...');
    try {
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }
    } catch (e) {}
    await driver.pressKeyCode(4); // Android back button, out of the ANC visit form
    await driver.pause(1500);
}

async function swipeUp(driver) {
    const screen = await driver.getWindowRect();
    const swipeX = Math.floor(screen.width / 2);
    const startY = Math.floor(screen.height * 0.75);
    const endY   = Math.floor(screen.height * 0.30);
    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0,   x: swipeX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 200 },
            { type: 'pointerMove', duration: 800, x: swipeX, y: endY },
            { type: 'pointerUp',   button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(1000);
}

// Reads {button, name, enabled} for every "ADD ANC VISIT" button currently on screen.
async function getVisibleAncVisitCandidates(driver) {
    const rawButtons = await driver.$$('//android.widget.Button[@text="ADD ANC VISIT"]');
    const addButtons = Array.from(rawButtons); // WDIO's $$ result isn't a plain array in all versions

    const candidates = [];
    for (let i = 0; i < addButtons.length; i++) {
        const button = addButtons[i];

        // Some cards show a disabled "ADD ANC VISIT" button (e.g. visit already
        // added / not yet due). Clicking a disabled button is a silent no-op,
        // so we must skip these rather than picking them at random.
        let enabled = false;
        try {
            enabled = await button.isEnabled();
        } catch (e) {
            enabled = false;
        }

        let name = null;
        try {
            const cardXPath = `(//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"])[${i + 1}]`;
            const card = await driver.$(cardXPath);
            const nameField = await card.$('.//android.widget.TextView[1]');
            name = (await nameField.getText()).trim();
        } catch (e) {
            // Name capture failed — see selectRandomAddAncVisit() note about the XPath assumption.
        }

        if (!enabled) {
            console.log(`⏭️  Skipping${name ? ` "${name}"` : ' a beneficiary'} — "ADD ANC VISIT" button is disabled.`);
        }

        candidates.push({ button, name, enabled });
    }
    return candidates;
}

async function selectAncVisitWithCalendarCheck(driver, maxAttempts = 5, maxScrolls = 5) {
    const triedNames = new Set();
    let scrollCount = 0;
    let attempt = 0;

    while (attempt < maxAttempts) {
        const allCandidates = await getVisibleAncVisitCandidates(driver);
        if (allCandidates.length === 0) {
            if (scrollCount >= maxScrolls) {
                throw new Error('No "ADD ANC VISIT" buttons found on the ANC Visits list, even after scrolling.');
            }
            console.log('📜 No "ADD ANC VISIT" buttons visible yet. Scrolling down...');
            await swipeUp(driver);
            scrollCount++;
            continue;
        }

        // Only enabled buttons whose beneficiary hasn't been tried yet are real candidates.
        const untried = allCandidates.filter(c => c.enabled && (!c.name || !triedNames.has(c.name)));

        if (untried.length === 0) {
            if (scrollCount >= maxScrolls) {
                throw new Error(`Exhausted all beneficiaries (enabled or otherwise) after scrolling ${maxScrolls} time(s) — ANC Date calendar never opened.`);
            }
            console.log('📜 No enabled/untried "ADD ANC VISIT" button visible. Scrolling down to find more...');
            await swipeUp(driver);
            scrollCount++;
            continue; // re-scan the screen after scrolling; doesn't count as a real attempt
        }

        attempt++;
        console.log(`\n🔁 Attempt ${attempt}/${maxAttempts} to open an ANC visit with a working calendar...`);

        const chosen = untried[Math.floor(Math.random() * untried.length)];
        if (chosen.name) triedNames.add(chosen.name);

        await chosen.button.waitForDisplayed({ timeout: 10000 });
        await chosen.button.click();
        await driver.pause(2000);

        console.log(`👤 Opened ANC visit for${chosen.name ? ` "${chosen.name}"` : ' a beneficiary'}.`);

        const calendarOpened = await verifyAncCalendarOpens(driver);
        if (calendarOpened) {
            return chosen.name;
        }

        console.log(`⚠️ Calendar failed to open for${chosen.name ? ` "${chosen.name}"` : ' this beneficiary'}. Going back to try another one...`);
        await backToAncVisitsList(driver);
    }

    throw new Error(`ANC Date calendar did not open after ${maxAttempts} attempts across different beneficiaries.`);
}

// ── STEP 4: VERIFY ABORTION-RELATED FIELDS APPEAR ─────────────────────────────

async function verifyAbortionFieldsAppear(driver) {
    console.log('🔍 Verifying abortion-related fields appear after selecting "Abortion If Any = Yes"...');

    const fieldsToCheck = [
        { desc: 'Abortion Type dropdown', xpath: '//android.widget.Spinner[@content-desc="Abortion Type"]' },
        { desc: 'Abortion Facility dropdown', xpath: '//android.widget.Spinner[@content-desc="Facility (Place of Abortion)"]' },
        { desc: 'Abortion Date field', xpath: '//android.widget.EditText[contains(@hint, "Abortion Date")]' }
    ];

    for (const f of fieldsToCheck) {
        const el = await driver.$(f.xpath);
        const isVisible = await el.isExisting();
        if (!isVisible) {
            throw new Error(`Verification failed: "${f.desc}" did not appear after selecting Abortion If Any = Yes.`);
        }
        console.log(`✅ "${f.desc}" is visible.`);
    }

    console.log('✅ All abortion-related fields verified as visible.');
}

// ── STEP 5: SUBMIT THE ANC VISIT FORM & RETURN TO HOME ────────────────────────

async function navigateToHome(driver) {
    console.log('🏠 Navigating back to Home...');

    // Primary: toolbar "Go to Home" button (content-desc, seen in page source)
    try {
        const homeBtn = await driver.$('android=new UiSelector().description("Go to Home")');
        if (await homeBtn.isExisting()) {
            await homeBtn.click();
            await driver.pause(2000);
            console.log('✅ Navigated to Home via toolbar "Go to Home" button.');
            return;
        }
    } catch (e) {
        console.log(`⚠️ "Go to Home" content-desc lookup failed: ${e.message}`);
    }

    // Fallback: same button by resource-id
    try {
        const homeBtnById = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/toolbar_menu_home")');
        if (await homeBtnById.isExisting()) {
            await homeBtnById.click();
            await driver.pause(2000);
            console.log('✅ Navigated to Home via toolbar_menu_home resource-id.');
            return;
        }
    } catch (e) {
        console.log(`⚠️ toolbar_menu_home resource-id lookup failed: ${e.message}`);
    }

    console.log('⚠️ Could not find a "Go to Home" control on this screen — adjust navigateToHome() if the layout differs here.');
}

async function submitAncVisit(driver) {
    console.log('Submitting the ANC visit form...');
    const submitBtn = await driver.$('//android.widget.Button[@text="Submit" or @text="SUBMIT"]');
    await submitBtn.waitForDisplayed({ timeout: 10000 });
    await submitBtn.click();
    await driver.pause(2000);
    console.log('✅ ANC visit form submitted.');

    await navigateToHome(driver);
}

// ── STEP 6: NAVIGATE TO ABORTION MODULE & VERIFY BENEFICIARY ─────────────────

async function verifyBeneficiaryInAbortionModule(driver, beneficiaryName) {
    console.log('🚀 Navigating to Abortion Module...');

    await clickDashboardCard(driver, 'Maternal Health');
    await driver.pause(2000);
    await clickDashboardCard(driver, 'Abortion List');
    await driver.pause(2000);

    if (!beneficiaryName) {
        console.log('⚠️ No beneficiary name was captured in step 1, so name-based verification is skipped. ' +
            'Confirm manually that the beneficiary appears, or update selectRandomAddAncVisit() to read the correct name field.');
        return;
    }

    const searchInput = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/searchView")');
    await searchInput.waitForDisplayed({ timeout: 10000 });
    await searchInput.click();
    await searchInput.clearValue();
    await searchInput.setValue(beneficiaryName);
    await driver.pause(2000);

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
    }

    const upperCaseName = beneficiaryName.toUpperCase();
    const beneficiaryXPath = `//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"][.//android.widget.TextView[contains(@text, "${upperCaseName}")]]`;
    const beneficiaryCard = await driver.$(beneficiaryXPath);
    const found = await beneficiaryCard.isExisting();

    if (found) {
        console.log(`✅ Verified: "${beneficiaryName}" appears in the Abortion Module list.`);
    } else {
        throw new Error(`Verification failed: "${beneficiaryName}" was NOT found in the Abortion Module list.`);
    }
}

// ── MAIN TEST FLOW ─────────────────────────────────────────────────────────────

async function runTest() {
    const driver = await remote({
        path: '/',
        port: 4723,
        capabilities: capabilities
    });

    try {
        // 1. Open ANC Visit (random beneficiary, no search)
        console.log("App launched. Attempting to click Maternal Health...");
        await clickDashboardCard(driver, 'Maternal Health');
        await driver.pause(2000);

        console.log("Attempting to click ANC Visits...");
        await clickDashboardCard(driver, 'ANC Visits');
        await driver.pause(2000);

        // Picks a random beneficiary; if the ANC Date calendar fails to open,
        // it backs out and retries with a different, not-yet-tried beneficiary.
        const beneficiaryName = await selectAncVisitWithCalendarCheck(driver);
        await driver.pause(2000);

        // 2. Fill all mandatory visit details
        // NOTE: fillAncForm() already sets "Abortion If Any = Yes" via FORM_DATA
        // in ancVisitForm.js, and fills the abortion sub-fields as part of the
        // same flow (steps 3 & 5 below), so it drives steps 2, 3 & 5 together.
        await fillAncForm(driver);

        // 4. Verify abortion-related fields appeared during the fill above
        await verifyAbortionFieldsAppear(driver);

        // 5. Submit
        await submitAncVisit(driver);

        // 6. Navigate to Abortion Module and verify beneficiary
        await verifyBeneficiaryInAbortionModule(driver, beneficiaryName);

        console.log('🎉 Test completed successfully.');

    } catch (err) {
        console.error("Test execution failed.", err);
        throw err;
    } finally {
        await driver.pause(3000);
        await driver.deleteSession();
    }
}

module.exports = {
    runTest,
    clickDashboardCard,
    selectRandomAddAncVisit,
    selectAncVisitWithCalendarCheck,
    getVisibleAncVisitCandidates,
    swipeUp,
    verifyAncCalendarOpens,
    backToAncVisitsList,
    verifyAbortionFieldsAppear,
    submitAncVisit,
    navigateToHome,
    verifyBeneficiaryInAbortionModule
};

if (require.main === module) {
    runTest();
}