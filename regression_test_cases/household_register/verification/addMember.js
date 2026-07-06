const { remote } = require('webdriverio');
const { formRegistration } = require("./familyForm");

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

    let finalTapX, finalTapY;

    if (spinnerSelector.includes('actv_rth')) {
        finalTapX = 539;
        if (optionsList.includes('Mother')) {
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
//  CLICK RANDOM ADD MEMBER (NO SEARCH)
// ─────────────────────────────────────────────────────────────
async function clickRandomAddMember(driver) {
    console.log(`⏳ Searching for visible 'Add Member' buttons...`);

    // Find all buttons on the screen that have the text "Add Member"
    const addMemberButtons = await driver.$$('//android.widget.Button[@text="Add Member"]');

    if (addMemberButtons.length === 0) {
        throw new Error("❌ No 'Add Member' buttons found on the current screen.");
    }

    console.log(`✅ Found ${addMemberButtons.length} 'Add Member' button(s) on screen.`);

    // Generate a random index between 0 and the number of buttons found
    const randomIndex = Math.floor(Math.random() * addMemberButtons.length);

    console.log(`📍 Clicking random 'Add Member' button at index ${randomIndex}...`);

    // Click the randomly selected button
    await addMemberButtons[randomIndex].click();

    await driver.pause(2500);
}
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

const RELATION_OPTIONS_FEMALE = ['Mother', 'Sister', 'Wife', 'Niece', 'Daughter', 'Grand Mother', 'Mother in Law', 'Grand Daughter', 'Daughter in Law', 'Sister in Law', 'Other'];
const RELATION_OPTIONS_MALE = ['Father', 'Brother', 'Husband', 'Nephew', 'Son', 'Grand Father', 'Father in Law', 'Grand Son', 'Son in Law', 'Other'];

async function selectRelationWithHof(driver, relation, gender = 'female') {
    const key = gender.toLowerCase();

    // Use the relation string exactly as it is passed from the array,
    // removing the Title Case modification that breaks "in Law"
    const formatted = relation;

    let optionsList = RELATION_OPTIONS_FEMALE;
    if (key === 'male') {
        optionsList = RELATION_OPTIONS_MALE;
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

async function searchAndAddMember(driver, searchName) {
    const searchBar = await driver.$(
        '//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]'
    );
    await searchBar.waitForDisplayed({ timeout: 10000 });

    // CHANGED: Use setValue() instead of clicking and sending array keys
    await searchBar.setValue(searchName);

    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    await driver.pause(2000);

    const formattedName = searchName.toUpperCase();
    const addBtn = await driver.$(
        `//android.widget.TextView[@text="${formattedName}"]` +
        `/ancestor::android.widget.FrameLayout` +
        `[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/parentCard"]` +
        `//android.widget.Button[@text="Add Member"]`
    );
    await addBtn.waitForDisplayed({ timeout: 10000 });
    await addBtn.click();
    console.log(`✅ Clicked "Add Member" for ${formattedName}`);

    await driver.pause(2500);
}

async function runTest(externalDriver = null) {

    const isStandalone = !externalDriver;
    const driver = externalDriver || await remote({ path: '/', port: 4723, capabilities });

    // 1. Randomly pick a gender
    const genderOptions = ['Male', 'Female'];
    const randomGender = genderOptions[Math.floor(Math.random() * genderOptions.length)];

    // 2. Randomly pick a relation based on the selected gender
    let randomRelation = '';
    if (randomGender.toLowerCase() === 'male') {
        randomRelation = RELATION_OPTIONS_MALE[Math.floor(Math.random() * RELATION_OPTIONS_MALE.length)];
    } else {
        randomRelation = RELATION_OPTIONS_FEMALE[Math.floor(Math.random() * RELATION_OPTIONS_FEMALE.length)];
    }

    const TEST = {
        gender: randomGender,
        relation: randomRelation,
    };

    try {
        console.log(`🚀 Starting add member test with random data -> Gender: ${TEST.gender}, Relation: ${TEST.relation}`);

        // 1. Open household list
        await clickDashboardCard(driver, 'All\nHousehold');

        // 2. Click a RANDOM "Add Member" button instead of searching
        await clickRandomAddMember(driver);

        // 3. Interact with dialog using Native Elements
        await selectGender(driver, TEST.gender);
        await driver.pause(800);

        await selectRelationWithHof(driver, TEST.relation, TEST.gender);
        await driver.pause(800);

        await clickOkButton(driver);
        await driver.pause(2500);

        // 4. Handoff to Family Form
        await formRegistration(driver);

    } catch (err) {
        console.error('❌ Test failed:', err);
    } finally {
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