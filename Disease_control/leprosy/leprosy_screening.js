const { remote } = require('webdriverio');

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true,
    'appium:unicodeKeyboard': true,
    'appium:resetKeyboard': true
};

const wdioOptions = {
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities: capabilities
};

// ─────────────────────────────────────────────
// Helpers: Navigation & Interaction
// ─────────────────────────────────────────────

// NEW HELPER: W3C compliant coordinate tapping
async function tapByCoordinates(driver, x, y) {
    await driver.performActions([{
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: x, y: y },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 }, // Short pause to simulate a real tap
            { type: 'pointerUp', button: 0 }
        ]
    }]);

    // Release the action to clean up the state
    await driver.releaseActions();
}

async function clickGridItemByText(driver, text) {
    console.log(`Looking for Grid Icon with text: '${text}'...`);
    const xpath = `//android.widget.TextView[@text='${text}']/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_icon']`;
    const element = await driver.$(xpath);
    await element.waitForDisplayed({ timeout: 10000 });
    await element.click();
    console.log(`✔ Clicked Grid Icon with text: '${text}'`);
}

async function searchWithKeyboard(driver, searchText) {
    console.log(`\nSearching for: '${searchText}'...`);
    const searchInput = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
    await searchInput.waitForDisplayed({ timeout: 10000 });
    await searchInput.click();
    await searchInput.setValue(searchText);
    await driver.pressKeyCode(66);
    console.log(`✔ Typed '${searchText}' and pressed Enter`);
}

async function clickMembersForHousehold(driver, householdName) {
    console.log(`\nLooking for the 'Members' button for household: '${householdName}'...`);
    const membersBtnXPath =
        `//android.widget.TextView[@text='${householdName}']` +
        `/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/parentCard']` +
        `//android.widget.Button[contains(@text, 'Members')]`;

    const membersBtn = await driver.$(membersBtnXPath);
    await membersBtn.waitForDisplayed({ timeout: 10000 });
    await membersBtn.click();
    console.log(`✔ Clicked 'Members' button for '${householdName}'`);
}

async function clickScreeningForMember(driver, memberName) {
    console.log(`\nScrolling to find member: '${memberName}'...`);

    const androidScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${memberName}")`;
    try {
        await driver.$(`android=${androidScrollSelector}`).waitForDisplayed({ timeout: 10000 });
        console.log(`✔ Scrolled to member: '${memberName}'`);
    } catch (e) {
        console.log('Scroll approach failed or element is already visible.');
    }

    await driver.pause(1000);

    const screeningBtnXPath =
        `//android.widget.LinearLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/ll_title_tb_screening_list_bar']` +
        `/android.widget.TextView[@text='${memberName}']` +
        `/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_content']` +
        `//android.widget.Button[@text='SCREENING']`;

    const screeningBtn = await driver.$(screeningBtnXPath);

    try {
        await screeningBtn.waitForDisplayed({ timeout: 5000 });
        await screeningBtn.click();
        console.log(`✔ Clicked 'SCREENING' for '${memberName}'`);
    } catch (e) {
        console.log(`✖ Failed to click 'SCREENING'. Ensure the name is perfectly matched.`);
    }
}

async function fillHomeVisitDate(driver, targetDateDesc = null) {
    console.log(`\nFilling Home Visit (Screening Date)...`);

    const dateFieldXPath = `//android.widget.EditText[@hint='Home Visit Date (Screening Date) *']`;
    const dateField = await driver.$(dateFieldXPath);
    await dateField.waitForDisplayed({ timeout: 10000 });
    await dateField.click();
    console.log(`✔ Clicked the Date field to open picker`);

    const okBtnXPath = `//android.widget.Button[@resource-id='android:id/button1']`;
    const okBtn = await driver.$(okBtnXPath);
    await okBtn.waitForDisplayed({ timeout: 5000 });

    if (targetDateDesc) {
        const specificDateXPath = `//android.view.View[@content-desc='${targetDateDesc}']`;
        const specificDateBtn = await driver.$(specificDateXPath);
        if (await specificDateBtn.isExisting()) {
            await specificDateBtn.click();
            console.log(`✔ Selected specific date: ${targetDateDesc}`);
        } else {
            console.log(`⚠ Target date '${targetDateDesc}' not found in current view. Proceeding with default/selected date.`);
        }
    }

    await okBtn.click();
    console.log(`✔ Clicked 'OK' on Date Picker`);
}

async function selectSymptom(driver, questionSubstring, answer) {
    console.log(`Looking for: '${questionSubstring}'...`);

    const uiSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${questionSubstring}"))`;
    try {
        await driver.$(`android=${uiSelector}`).waitForDisplayed({ timeout: 5000 });
    } catch (e) {
        // Element might already be visible
    }

    const radioButtonXPath =
        `//android.widget.TextView[contains(@text, "${questionSubstring}")]` +
        `/parent::android.widget.LinearLayout` +
        `/following-sibling::android.widget.RadioGroup` +
        `/android.widget.RadioButton[@text='${answer}']`;

    const radioBtn = await driver.$(radioButtonXPath);

    try {
        await radioBtn.waitForDisplayed({ timeout: 5000 });
        await radioBtn.click();
        console.log(`✔ Selected '${answer}'`);
    } catch (e) {
        console.log(`✖ Failed to find or click '${answer}' for '${questionSubstring}'`);
    }
}

// ─────────────────────────────────────────────
// UPDATED: Handle "Referred To" Dropdown
// ─────────────────────────────────────────────
async function handleReferredTo(driver, optionToSelect, otherText = null) {
    console.log(`\nHandling 'Referred To' dropdown — selecting: '${optionToSelect}'...`);

    // 1. Scroll the Spinner into view
    const scrollToSpinner = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown"))`;
    try {
        await driver.$(`android=${scrollToSpinner}`).waitForDisplayed({ timeout: 8000 });
    } catch (e) {
        console.log('Spinner already visible or scroll failed — continuing.');
    }
    await driver.pause(800);

    // 2. Tap the Spinner to open the dropdown using the new W3C helper
    await tapByCoordinates(driver, 540, 2139);
    console.log('✔ Tapped Spinner to open dropdown');
    await driver.pause(1000);

    // 3. Map each option label to its approximate Y-coordinate.
    const optionCoordinates = {
        'Primary Health Centre':        { x: 540, y: 1395 },
        'Community Health Centre':      { x: 540, y: 1500 },
        'District Hospital':            { x: 540, y: 1610 },
        'Medical College and Hospital': { x: 540, y: 1715 },
        'Referral Hospital':            { x: 540, y: 1820 },
        'Other Private Hospital':       { x: 540, y: 1925 },
        'Other':                        { x: 540, y: 2030 },
    };

    const coords = optionCoordinates[optionToSelect];
    if (!coords) {
        console.log(`✖ Unknown option '${optionToSelect}'. Known options: ${Object.keys(optionCoordinates).join(', ')}`);
        return;
    }

    // 4. Tap the option by coordinate using the new W3C helper
    await tapByCoordinates(driver, coords.x, coords.y);
    console.log(`✔ Tapped option '${optionToSelect}' at (${coords.x}, ${coords.y})`);
    await driver.pause(800);

    // 5. If "Other" was selected, fill the free-text field that appears
    if (optionToSelect === 'Other') {
        if (!otherText) {
            console.log('⚠  "Other" selected but no otherText provided — leaving field blank.');
            return;
        }

        console.log(`Filling 'Other' text field with: '${otherText}'`);

        // Try XPath first for robustness; fall back to coordinate tap
        let otherField;
        try {
            otherField = await driver.$(`//android.widget.EditText[@hint='Other *']`);
            await otherField.waitForDisplayed({ timeout: 5000 });
        } catch (e) {
            // Fallback: tap by coordinate using the new W3C helper
            await tapByCoordinates(driver, 540, 2294);
            await driver.pause(500);
            otherField = await driver.$(`//android.widget.EditText[@hint='Other *']`);
        }

        await otherField.click();
        await otherField.clearValue();
        await otherField.setValue(otherText);
        await driver.pressKeyCode(66); // hide keyboard
        console.log(`✔ Filled 'Other' field with '${otherText}'`);
    }
}

// ─────────────────────────────────────────────
// Main flow
// ─────────────────────────────────────────────
async function main() {
    console.log('═══════════════════════════════════════════');
    console.log(' Initializing Appium — Leprosy Search Flow ');
    console.log('═══════════════════════════════════════════');

    let driver;

    try {
        driver = await remote(wdioOptions);
        console.log('✔ Appium session started\n');

        // 1. Navigate to Disease Control
        await clickGridItemByText(driver, 'Disease Control');
        await driver.pause(1500);

        // 2. Navigate to Leprosy
        await clickGridItemByText(driver, 'Leprosy');
        await driver.pause(1500);

        // 3. Navigate to Leprosy Screening
        await clickGridItemByText(driver, 'Leprosy Screening');
        await driver.pause(2000);

        // 4. Search for household
        const targetHousehold = 'DEBA KARMAKAR';
        await searchWithKeyboard(driver, targetHousehold);
        await driver.pause(2000);

        // 5. Click Members
        await clickMembersForHousehold(driver, targetHousehold);
        await driver.pause(2000);

        // 6. Click Screening for member
        const targetMember = 'DEBA KARMAKAR';
        await clickScreeningForMember(driver, targetMember);
        await driver.pause(2000);

        // 7. Fill Home Visit Date
        await fillHomeVisitDate(driver);
        await driver.pause(1000);

        // 8. Fill Symptoms form
        console.log('\nFilling out Symptoms Check form...');
        await selectSymptom(driver, 'Recurrent ulceration on palm or sole', 'No');
        await selectSymptom(driver, 'Recurrent tingling on palm(s) or sole (s)', 'No');
        await selectSymptom(driver, 'Any hyper pigmented patch or discoloration on skin', 'No');
        await selectSymptom(driver, 'Any thickend skin', 'No');
        await selectSymptom(driver, 'Any nodules on skin', 'Yes');
        await selectSymptom(driver, 'Recurrent numbness on palm(s) or sole(s)', 'No');
        await selectSymptom(driver, 'Clawing of fingers in hand(s) or Feet', 'No');
        await selectSymptom(driver, 'Tingling or Numbness in hands and or Feet', 'Yes');
        await selectSymptom(driver, 'Inability to close eyelid', 'No');
        await selectSymptom(driver, 'Difficulty in holding objects with fingers', 'Yes');
        await selectSymptom(driver, 'Weakness in feet that causes difficulty in walking', 'No');
        await selectSymptom(driver, 'Any Leprosy Symptoms Present?', 'Yes');

        // 9. Handle "Referred To" dropdown
        await handleReferredTo(driver, 'Other', 'District Leprosy Officer');

        await driver.pause(1000);
        console.log('\n✔ Flow completed successfully!');

    } catch (error) {
        console.error('\n✖ Error during execution flow:', error.message);
    } finally {
        if (driver) {
            await driver.pause(3000);
            await driver.deleteSession();
            console.log('✔ Session closed.');
        }
    }
}

main();