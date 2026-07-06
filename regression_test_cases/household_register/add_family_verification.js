const { remote } = require('webdriverio');
const {
    formRegistration,
    REG_DATA,
    randomizeRegData,
    RELATION_OPTIONS_FEMALE,
    RELATION_OPTIONS_MALE,
    RELATION_OPTIONS_TRANSGENDER
} = require("./add_family/add_family_form.js");



const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true
};

// ─────────────────────────────────────────────────────────────
//  CORE — tap a coordinate
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

// ─────────────────────────────────────────────────────────────
//  CORE — scroll until text visible (only used OUTSIDE dialogs)
// ─────────────────────────────────────────────────────────────

async function scrollToText(driver, textToFind) {
    try {
        const sel = `android=new UiScrollable(new UiSelector().scrollable(true))` +
                    `.scrollIntoView(new UiSelector().textContains("${textToFind}"))`;
        await driver.$(sel).waitForExist({ timeout: 3000 });
    } catch (_) {}
    await driver.pause(500);
}

// ─────────────────────────────────────────────────────────────
//  CORE — scroll spinner into middle zone then open it
// ─────────────────────────────────────────────────────────────

async function scrollSpinnerToMiddle(driver, spinnerSelector) {
    try {
        const spinner = await driver.$(spinnerSelector);
        const loc    = await spinner.getLocation();
        const screen = await driver.getWindowRect();
        if (loc.y > screen.height / 2 + 100) {
            const swipeX = Math.floor(screen.width / 2);
            const startY = Math.floor(screen.height * 0.7);
            const endY   = Math.floor(screen.height * 0.3);
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

// ─────────────────────────────────────────────────────────────
//  CORE — open a form spinner and tap an item
//  (Using the 5-Strategy Fallback Approach)
// ─────────────────────────────────────────────────────────────

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList, shouldScroll = true) {
    if (shouldScroll) {
        await scrollSpinnerToMiddle(driver, spinnerSelector);
    }

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

    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`✅ Selected "${value}" via XPath`);
        return;
    } catch (e) {}

    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via UiSelector`);
        return;
    } catch (e) {}

    try {
        const source = await driver.getPageSource();
        const nodes = source.match(/<[^>]+>/g) || [];
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const textRegex = new RegExp(`(?:text|content-desc)="\\s*${escapedValue}\\s*"`);
        let foundNode = null;

        for (const node of nodes) {
            if (textRegex.test(node) && node.includes('bounds=')) {
                foundNode = node;
                break;
            }
        }

        if (foundNode) {
            const boundsMatch = foundNode.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
            if (boundsMatch) {
                const tX = Math.floor((parseInt(boundsMatch[1]) + parseInt(boundsMatch[3])) / 2);
                const tY = Math.floor((parseInt(boundsMatch[2]) + parseInt(boundsMatch[4])) / 2);
                console.log(`📍 Found "${value}" in XML (tag parse) → tap(${tX},${tY})`);
                await tapByCoords(driver, tX, tY);
                console.log(`✅ Selected "${value}" via tag parse`);
                return;
            }
        }
    } catch (e) {}

    try {
        const source = await driver.getPageSource();
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`text="${escapedValue}"[^/]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
        const match = source.match(regex);

        if (match) {
            const tX = Math.floor((parseInt(match[1]) + parseInt(match[3])) / 2);
            const tY = Math.floor((parseInt(match[2]) + parseInt(match[4])) / 2);
            console.log(`📍 Found "${value}" via regex → tap(${tX},${tY})`);
            await tapByCoords(driver, tX, tY);
            console.log(`✅ Selected "${value}" via regex`);
            return;
        }
    } catch (e) {}

    const screen = await driver.getWindowRect();
    const idx = optionsList.indexOf(value);
    if (idx === -1) throw new Error(`"${value}" not in list: [${optionsList.join(', ')}]`);

    // Strategy 5: derive the tap position from the ACTUAL rendered row
    // bounds instead of a hardcoded row-height formula. The 'actv_rth'
    // dropdown doesn't expose item text to any accessibility query (every
    // text-based strategy above fails even for items that do exist), so a
    // fixed "baseY + idx * rowHeight" formula silently drifts by a row
    // whenever the real spacing isn't perfectly uniform — which is exactly
    // how "Grand Mother" once selected "Daughter", and now "Daughter in
    // Law" selects "Grand Daughter". Reading real row bounds and tapping
    // the idx-th one sidesteps that guesswork entirely.
    if (spinnerSelector.includes('actv_rth')) {
        try {
            const source = await driver.getPageSource();
            const boundsRegex = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g;
            const candidates = [];
            let m;
            while ((m = boundsRegex.exec(source)) !== null) {
                const x1 = parseInt(m[1]), y1 = parseInt(m[2]), x2 = parseInt(m[3]), y2 = parseInt(m[4]);
                const width = x2 - x1, height = y2 - y1;
                // Dropdown list rows are wide, shallow bands (~100px tall,
                // spanning most of the dialog width) — filter to just those.
                if (width > 400 && width < 1080 && height > 60 && height < 140) {
                    candidates.push({ y1, cx: Math.floor((x1 + x2) / 2), cy: Math.floor((y1 + y2) / 2) });
                }
            }
            candidates.sort((a, b) => a.y1 - b.y1);
            // Dedupe nested/overlapping bounds that describe the same row.
            const rows = [];
            for (const c of candidates) {
                if (!rows.some(r => Math.abs(r.y1 - c.y1) < 20)) rows.push(c);
            }
            if (rows.length >= optionsList.length && rows[idx]) {
                const { cx, cy } = rows[idx];
                console.log(`📍 Positional fallback (row ${idx} of ${rows.length} detected rows) → tap(${cx}, ${cy})`);
                await tapByCoords(driver, cx, cy);
                console.log(`✅ Selected "${value}" via positional row match`);
                return;
            }
            console.log(`⚠️ Positional fallback found ${rows.length} rows, expected ${optionsList.length} — falling back to fixed formula.`);
        } catch (e) {}
    }

    let finalTapX, finalTapY;

    if (spinnerSelector.includes('actv_rth')) {
        finalTapX = 539;
        if (optionsList === RELATION_OPTIONS_TRANSGENDER) {
            // 9-item list, "Brother" (idx 0) centers at y≈506 per the Transgender UI dump
            finalTapY = 506 + (idx * 102);
        } else if (optionsList.includes('Mother')) {
            finalTapY = 302 + (idx * 102);
        } else {
            finalTapY = 404 + (idx * 102);
        }
    } else {
        const rowHeight     = size.height;
        const spinnerBottom = loc.y + size.height;
        const opensUpward   = (screen.height - spinnerBottom) < (optionsList.length * rowHeight);

        finalTapX = Math.floor(loc.x + size.width / 2);

        if (opensUpward) {
            const reversedIdx = (optionsList.length - 1) - idx;
            finalTapY = Math.floor(loc.y - (reversedIdx * rowHeight) - (rowHeight / 2));
        } else {
            finalTapY = Math.floor(spinnerBottom + (idx * rowHeight) + (rowHeight / 2));
        }
        finalTapY = Math.max(5, Math.min(finalTapY, screen.height - 5));
    }

    console.log(`📍 Coordinate fallback → tap(${finalTapX}, ${finalTapY})`);
    await tapByCoords(driver, finalTapX, finalTapY);
    console.log(`✅ Selected "${value}" via coordinates`);
}


// ─────────────────────────────────────────────────────────────
//  DIALOG INTERACTION
// ─────────────────────────────────────────────────────────────

async function selectGender(driver, genderInput) {
    const key = genderInput.toLowerCase();
    let resId = '';

    if (key === 'male') resId = 'rb_male';
    else if (key === 'female') resId = 'rb_female';
    else if (key === 'transgender' || key === 'trans') resId = 'rb_trans';
    else throw new Error(`Unknown gender "${genderInput}"`);

    console.log(`⏳ Tapping gender "${genderInput}" via explicit element click...`);
    await driver.pause(1000);

    const rb = await driver.$(`android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/${resId}")`);
    await rb.waitForDisplayed({ timeout: 5000 });
    await rb.click();

    console.log(`✅ Gender → "${genderInput}"`);
}

async function selectRelationWithHof(driver, relation, gender = 'female') {
    const key = gender.toLowerCase();
    // Rule: use the relation string exactly as given — it already comes
    // straight from RELATION_OPTIONS_FEMALE/MALE/TRANSGENDER, matching the
    // on-screen text verbatim (e.g. "Daughter in Law", "Mother in Law").
    // Blindly title-casing every word here previously turned "in"/"of" into
    // "In"/"Of", which broke lookups for any multi-word relation.
    const formatted = relation;

    let optionsList = RELATION_OPTIONS_FEMALE;
    if (key === 'male') {
        optionsList = RELATION_OPTIONS_MALE;
    } else if (key === 'transgender' || key === 'trans') {
        optionsList = RELATION_OPTIONS_TRANSGENDER;
    }

    console.log(`⏳ Opening Relation dropdown for "${formatted}"...`);

    const spinnerSelector = 'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rth")';

    await clickSpinnerAndSelectOption(driver, spinnerSelector, formatted, optionsList, false);

    console.log(`✅ Relation → "${formatted}"`);
}

async function clickOkButton(driver) {
    console.log(`⏳ Clicking Ok button...`);
    const okBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_ok")');
    await okBtn.waitForDisplayed({ timeout: 5000 });
    await okBtn.click();
    console.log(`✅ Clicked Ok`);
}

// ─────────────────────────────────────────────────────────────
//  FAMILY REGISTRATION FORM SPINNERS
// ─────────────────────────────────────────────────────────────

const MARITAL_OPTIONS = ['Unmarried', 'Married', 'Divorced', 'Separated', 'Widow'];

async function selectMaritalStatus(driver, status) {
    console.log(`⏳ Selecting Marital Status: "${status}"...`);
    await scrollToText(driver, 'Marital Status');
    const sel = 'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown").instance(0)';
    await clickSpinnerAndSelectOption(driver, sel, status, MARITAL_OPTIONS);
}

const EDUCATION_OPTIONS = [
    'Illiterate', 'Below Primary', 'Primary', 'Middle', 'Matric/Secondary',
    'Hr. Secondary', 'Graduate', 'Post Graduate', 'Other'
];

async function selectEducation(driver, education) {
    console.log(`⏳ Selecting Education: "${education}"...`);
    await scrollToText(driver, 'Education');
    const sel = 'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown").instance(0)';
    await clickSpinnerAndSelectOption(driver, sel, education, EDUCATION_OPTIONS);
}

const CASTE_OPTIONS = ['SC', 'ST', 'OBC', 'General', 'Other'];

async function selectCaste(driver, caste) {
    console.log(`⏳ Selecting Caste: "${caste}"...`);
    await scrollToText(driver, 'Caste');
    const sel = 'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown").instance(0)';
    await clickSpinnerAndSelectOption(driver, sel, caste, CASTE_OPTIONS);
}

const RELIGION_OPTIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'];

async function selectReligion(driver, religion) {
    console.log(`⏳ Selecting Religion: "${religion}"...`);
    await scrollToText(driver, 'Religion');
    const sel = 'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown").instance(0)';
    await clickSpinnerAndSelectOption(driver, sel, religion, RELIGION_OPTIONS);
}

const STATUS_OF_WOMEN_OPTIONS = [
    'Eligible Couple', 'Pregnant Woman', 'Postnatal Mother', 'Permanently Sterilised'
];

async function selectStatusOfWomen(driver, status) {
    console.log(`⏳ Selecting Status Of Women: "${status}"...`);
    await scrollToText(driver, 'Status Of Women');
    const sel = 'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown").instance(0)';
    await clickSpinnerAndSelectOption(driver, sel, status, STATUS_OF_WOMEN_OPTIONS);
}

async function fillFieldByPlaceholder(driver, placeholder, value) {
    if (!value && value !== 0) return;
    await scrollToText(driver, placeholder);
    const field = await driver.$(`android=new UiSelector().className("android.widget.EditText").textContains("${placeholder}")`);
    await field.waitForDisplayed({ timeout: 10000 });

    // CHANGED: Use setValue() instead of clearValue() + keys()
    await field.setValue(value);

    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    await driver.pause(300);
    console.log(`✅ "${placeholder}" → "${value}"`);
}

async function clickDashboardCard(driver, cardText) {
    const card = await driver.$(
        `//android.widget.TextView[@text="${cardText}"]` +
        `/ancestor::android.widget.FrameLayout` +
        `[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_icon"]`
    );
    await card.waitForDisplayed({ timeout: 10000 });
    await card.click();
    console.log(`✅ Clicked card: "${cardText.replace('\n', ' ')}"`);
}

async function clickRandomAddMember(driver) {
    console.log('⏳ Selecting a random household to click "Add Member" on...');
    await driver.pause(1000);

    // Make sure at least a few cards are loaded/visible before we look.
    await scrollToText(driver, 'Add Member');

    let addButtons = await driver.$$('//android.widget.Button[@text="Add Member"]');

    // If nothing is visible yet, try a couple more scrolls.
    let attempts = 0;
    while (addButtons.length === 0 && attempts < 3) {
        await scrollToText(driver, 'Add Member');
        addButtons = await driver.$$('//android.widget.Button[@text="Add Member"]');
        attempts++;
    }

    if (addButtons.length === 0) {
        throw new Error('No "Add Member" buttons found on the household list.');
    }

    const randomIndex = Math.floor(Math.random() * addButtons.length);
    const chosenBtn = addButtons[randomIndex];

    await chosenBtn.waitForDisplayed({ timeout: 5000 });
    await chosenBtn.click();
    console.log(`✅ Clicked "Add Member" (random pick ${randomIndex + 1} of ${addButtons.length})`);

    await driver.pause(2500);
}

async function searchInBeneficiaryList(driver, searchName) {
    console.log(`⏳ Navigating to All Beneficiaries to verify "${searchName}"...`);

    // Go back to the Home dashboard first (may already be there after submit).
    try {
        const homeBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/toolbar_menu_home")');
        if (await homeBtn.isExisting()) {
            await homeBtn.click();
            await driver.pause(1500);
        }
    } catch (e) {}

    await clickDashboardCard(driver, 'All\nBeneficiaries');
    await driver.pause(1500);

    const searchBar = await driver.$(
        '//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]'
    );
    await searchBar.waitForDisplayed({ timeout: 10000 });

    // 1. Click the field to gain focus
    await searchBar.click();
    try { await searchBar.clearValue(); } catch (e) {}
    await driver.pause(500);

    console.log(`⏳ Typing search term: "${searchName}"...`);

    // 2. Simulate actual keystrokes so the app's search filter triggers
    await driver.keys([...searchName]);

    if (await driver.isKeyboardShown()) await driver.hideKeyboard();

    // Give the app's search function a moment to filter the list
    await driver.pause(2000);

    const formattedName = searchName.trim().toUpperCase();
    try {
        const resultCard = await driver.$(`//android.widget.TextView[contains(@text,"${formattedName}")]`);
        await resultCard.waitForDisplayed({ timeout: 5000 });
        console.log(`✅ Verified: "${formattedName}" found in the Beneficiary list.`);
        return true;
    } catch (e) {
        console.log(`❌ "${formattedName}" was NOT found in the Beneficiary list.`);
        return false;
    }
}

async function runTest(externalDriver = null) {

    const isStandalone = !externalDriver;
    const driver = externalDriver || await remote({ path: '/', port: 4723, capabilities });

    // Rule: Gender, Relation with Head of Family, First/Last Name,
    // Father's/Mother's Name and Husband's/Wife's Name are all randomized
    // for every run. randomizeRegData() writes the name fields onto
    // REG_DATA (consumed later by formRegistration) and returns the
    // gender/relation pair needed to drive the "Add Member" dialog below.
    const TEST = randomizeRegData();

    try {
        console.log('🚀 Starting add member test...');

        // 1. Open household list
        await clickDashboardCard(driver, 'All\nHousehold');

        // 2. Click "Add Member" on a random household (no search)
        await clickRandomAddMember(driver);

        // 3. Interact with dialog using Native Elements for static buttons, Robust List for dropdown
        await selectGender(driver, TEST.gender);
        await driver.pause(800);

        await selectRelationWithHof(driver, TEST.relation, TEST.gender);
        await driver.pause(800);

        await clickOkButton(driver);
        await driver.pause(2500);

        // 4. Handoff to Family Form (fills form, verifies gender-specific
        //    fields, verifies mandatory-field validation, submits)
        await formRegistration(driver);

        // 5. Step 11 — Search the newly added family member in the beneficiary list.
        // Rule: the test case is only considered complete once the newly
        // registered member is confirmed to exist in "All Beneficiaries" —
        // finding them there is the pass/fail signal for the whole run.
        const newMemberName = `${REG_DATA.firstName || ''} ${REG_DATA.lastName || ''}`.trim();
        if (newMemberName) {
            const found = await searchInBeneficiaryList(driver, newMemberName);
            if (!found) {
                throw new Error(`Registration verification failed: "${newMemberName}" was not found in All Beneficiaries after submit.`);
            }
            console.log('🎉 Test case completed successfully — beneficiary found in All Beneficiaries.');
        } else {
            console.log('⏭️ Skipping beneficiary-list search: First/Last name were not provided.');
        }

    } catch (err) {
        console.error('❌ Test failed:', err);
    } finally {
        // ONLY delete the session if this script created it!
        if (isStandalone) {
            console.log('🧹 Ending standalone session...');
            await driver.pause(3000);
            await driver.deleteSession();
        } else {
            console.log('⏭️ Finishing add member module, handing session back to main script...');
        }
    }
}
// Export the function so it can be required in another file
module.exports = { runTest };

// Execute only if this file is run directly via node (e.g., `node testFile.js`)
if (require.main === module) {
    runTest();
}