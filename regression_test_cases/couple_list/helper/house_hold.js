// householdFormSteps.js
// ✅ Dropdowns use the same openSpinnerAndSelect approach as ancVisitForm.js
// Spinners are located by content-desc (confirmed from UI XML dumps)

// ─────────────────────────────────────────────────────────────
//  DROPDOWN OPTIONS — single source of truth for each spinner
// ─────────────────────────────────────────────────────────────

const DROPDOWN_OPTIONS = {
    typeOfHouse:     ['None', 'Kuchha', 'Pucca', 'Other'],
    typeOfFuel:      ['Firewood', 'Crop Residue', 'Cow dung cake', 'Coal', 'Kerosene', 'LPG', 'Induction', 'Other'],
    waterSource:     ['Tap Water', 'Hand pump inside house', 'Hand pump outside of house', 'Well', 'Tank', 'River', 'Pond', 'Other'],
    electricity:     ['Electricity Supply', 'Generator', 'Solar Power', 'Kerosene Lamp', 'Other'],
    toilet:          ['Flush toilet with running water', 'Flush toilet without water', 'Pit toilet with running water supply', 'Pit toilet without water supply', 'Other', 'None'],
};

function randomPick(list) {
    return list[Math.floor(Math.random() * list.length)];
}

// ─────────────────────────────────────────────────────────────
//  LOW-LEVEL HELPERS
// ─────────────────────────────────────────────────────────────

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

async function hideKeyboardSafe(driver) {
    try {
        let isShown = await driver.isKeyboardShown();
        if (isShown) {
            await driver.hideKeyboard();
            await driver.pause(500);

            isShown = await driver.isKeyboardShown();
            if (isShown) {
                console.log('⚠️ Keyboard still shown, forcing native BACK button...');
                await driver.pressKeyCode(4);
                await driver.pause(500);
            }
        }
    } catch (e) {
        try {
            await driver.pressKeyCode(4);
            await driver.pause(500);
        } catch (err) {
            console.log(`⚠️ Could not hide keyboard: ${err.message}`);
        }
    }
}

// ─────────────────────────────────────────────────────────────
//  CORE SPINNER SELECTOR
//  Identical strategy to ancVisitForm.js openSpinnerAndSelect:
//    • Scrolls the spinner into view by content-desc
//    • Taps the right-side arrow (avoids the unclickable text area)
//    • Detects keyboard pop-up and re-taps if needed
//    • Falls through: CheckedTextView XPath → UiSelector → generic XPath
//      → page-source bounds → coordinate fallback
// ─────────────────────────────────────────────────────────────

async function openSpinnerAndSelect(driver, spinnerContentDesc, optionsList, value) {
    const idx = optionsList.indexOf(value);
    if (idx === -1) {
        throw new Error(`"${value}" not found in options: [${optionsList.join(', ')}]`);
    }

    // Scroll spinner into view
    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().descriptionContains("${spinnerContentDesc}"))`);
        await driver.pause(500);
    } catch (e) {
        console.log(`⚠️  scrollIntoView skipped for "${spinnerContentDesc}": ${e.message}`);
    }

    const spinnerXPath = `//android.widget.Spinner[@content-desc="${spinnerContentDesc}"]`;
    const spinner = await driver.$(spinnerXPath);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();
    console.log(`📍 Spinner "${spinnerContentDesc}" @ (${loc.x}, ${loc.y}), size (${size.width}x${size.height})`);

    // Tap the right-side arrow icon of the spinner
    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);
    console.log(`📍 Tapping dropdown arrow at (${tapX}, ${tapY})`);
    await tapByCoords(driver, tapX, tapY);
    await driver.pause(1000);

    // If keyboard appeared, close it and re-tap
    try {
        if (await driver.isKeyboardShown()) {
            console.log('⚠️ Keyboard opened after clicking dropdown! Closing it...');
            await driver.hideKeyboard();
            await driver.pause(1000);
            console.log('🔄 Clicking dropdown again...');
            await tapByCoords(driver, tapX, tapY);
            await driver.pause(1500);
        }
    } catch (e) {}

    // Strategy 1: CheckedTextView XPath
    try {
        const item = await driver.$(`//android.widget.CheckedTextView[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`✅ Selected "${value}" via CheckedTextView XPath`);
        return;
    } catch (e) {
        console.log(`⚠️  CheckedTextView XPath failed: ${e.message}`);
    }

    // Strategy 2: UiSelector CheckedTextView
    try {
        const item = await driver.$(`android=new UiSelector().className("android.widget.CheckedTextView").text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via UiSelector CheckedTextView`);
        return;
    } catch (e) {
        console.log(`⚠️  UiSelector CheckedTextView failed: ${e.message}`);
    }

    // Strategy 3: Generic XPath by text
    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via generic XPath`);
        return;
    } catch (e) {
        console.log(`⚠️  Generic XPath failed: ${e.message}`);
    }

    // Strategy 4: Page-source bounds
    try {
        const source = await driver.getPageSource();
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const checkedPattern = new RegExp(
            `class="android\\.widget\\.CheckedTextView"[^>]*?text="${escapedValue}"[^>]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
            's'
        );
        const genericPattern = new RegExp(
            `text="${escapedValue}"[^>]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`
        );

        const match = source.match(checkedPattern) || source.match(genericPattern);
        if (match) {
            const bx = Math.floor((parseInt(match[1]) + parseInt(match[3])) / 2);
            const by = Math.floor((parseInt(match[2]) + parseInt(match[4])) / 2);
            console.log(`📍 Found "${value}" in page source → tap(${bx}, ${by})`);
            await tapByCoords(driver, bx, by);
            console.log(`✅ Selected "${value}" via page source bounds`);
            return;
        }
        console.log(`⚠️  "${value}" not found in page source`);
    } catch (e) {
        console.log(`⚠️  Page source strategy failed: ${e.message}`);
    }

    // Strategy 5: Coordinate fallback
    const freshLoc  = await spinner.getLocation();
    const freshSize = await spinner.getSize();
    let screenHeight = 2400;
    let screenWidth  = 1080;
    try {
        const screen = await driver.getWindowRect();
        screenHeight = screen.height;
        screenWidth  = screen.width;
    } catch (e) {}

    const rowHeight     = freshSize.height;
    const spinnerBottom = freshLoc.y + freshSize.height;
    const spaceBelow    = screenHeight - spinnerBottom;
    const opensUpward   = spaceBelow < (optionsList.length * rowHeight);
    const finalTapX     = Math.floor(freshLoc.x + freshSize.width / 2);
    let   finalTapY;

    if (opensUpward) {
        const popupTop = freshLoc.y - (optionsList.length * rowHeight);
        finalTapY = Math.floor(popupTop + (idx * rowHeight) + rowHeight / 2);
    } else {
        finalTapY = Math.floor(spinnerBottom + (idx * rowHeight) + rowHeight / 2);
    }
    finalTapY = Math.max(5, Math.min(finalTapY, screenHeight - 5));

    console.log(`📍 Coordinate fallback → tap(${finalTapX}, ${finalTapY})`);
    await tapByCoords(driver, finalTapX, finalTapY);
    console.log(`✅ Selected "${value}" via coordinates`);
}

// ─────────────────────────────────────────────────────────────
//  TEXT FIELD HELPERS
// ─────────────────────────────────────────────────────────────

async function fillFirstName(driver, firstName) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().className("android.widget.EditText").textContains("First Name"))');
    const f = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("First Name")');
    await f.waitForDisplayed({ timeout: 10000 });
    await f.click();
    await f.setValue(firstName);
    await hideKeyboardSafe(driver);
    console.log('✅ First Name entered successfully');
}

async function fillLastName(driver, lastName) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().className("android.widget.EditText").textContains("Last Name"))');
    const f = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Last Name")');
    await f.waitForDisplayed({ timeout: 10000 });
    await f.click();
    await f.setValue(lastName);
    await hideKeyboardSafe(driver);
    console.log('✅ Last Name entered successfully');
}

async function fillMobileNumber(driver, mobileNumber) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().className("android.widget.EditText").textContains("Mobile No"))');
    const f = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Mobile No")');
    await f.waitForDisplayed({ timeout: 10000 });
    await f.click();
    await f.setValue(mobileNumber);
    await hideKeyboardSafe(driver);
    console.log('✅ Mobile Number entered successfully');
}

async function fillHouseNo(driver, houseNo) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().className("android.widget.EditText").text("House No"))');
    const f = await driver.$('android=new UiSelector().className("android.widget.EditText").text("House No")');
    await f.waitForDisplayed({ timeout: 10000 });
    await f.click();
    await f.setValue(houseNo);
    await hideKeyboardSafe(driver);
    console.log('✅ House Number entered successfully');
}

async function fillWardNo(driver, wardNo) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().className("android.widget.EditText").textContains("Ward No"))');
    const f = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Ward No")');
    await f.waitForDisplayed({ timeout: 10000 });
    await f.click();
    await f.setValue(wardNo);
    await hideKeyboardSafe(driver);
    console.log('✅ Ward Number entered successfully');
}

async function fillWardName(driver, wardName) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().className("android.widget.EditText").textContains("Ward Name"))');
    const f = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Ward Name")');
    await f.waitForDisplayed({ timeout: 10000 });
    await f.click();
    await f.setValue(wardName);
    await hideKeyboardSafe(driver);
    console.log('✅ Ward Name entered successfully');
}

async function fillMohallaName(driver, mohallaName) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Mohalla Name"))');
    const f = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Mohalla Name")');
    await f.waitForDisplayed({ timeout: 10000 });
    await f.click();
    await f.setValue(mohallaName);
    await hideKeyboardSafe(driver);
    console.log('✅ Mohalla Name entered successfully');
}

// ─────────────────────────────────────────────────────────────
//  RADIO BUTTON HELPERS
// ─────────────────────────────────────────────────────────────

async function selectEconomicStatus(driver, status) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Economic Status"))');
    await driver.pause(1000);

    let selector = `android=new UiSelector().className("android.widget.RadioButton").text("${status}")`;
    if (status.toLowerCase() === 'dont know' || status.toLowerCase() === "don't know") {
        selector = `android=new UiSelector().className("android.widget.RadioButton").text("Don't Know")`;
    }
    const btn = await driver.$(selector);
    await btn.waitForDisplayed({ timeout: 10000 });
    await btn.click();
    console.log(`✅ Economic Status selected: ${status}`);
}

async function selectHouseOwnership(driver, value) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("House ownership"))');
    await driver.pause(1000);
    const options = await driver.$$(`android=new UiSelector().text("${value}")`);
    await options[0].click();
    console.log(`✅ House Ownership selected: ${value}`);
}

async function selectSeparateKitchen(driver, value) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Kitchen"))');
    await driver.pause(1000);
    const options = await driver.$$(`android=new UiSelector().text("${value}")`);
    const idx = options.length > 1 ? 1 : 0;
    await options[idx].click();
    console.log(`✅ Separate Kitchen selected: ${value}`);
}

// ─────────────────────────────────────────────────────────────
//  DROPDOWN HELPERS
//  All spinners now use openSpinnerAndSelect with content-desc
//  (confirmed from UI XML dumps: ui_dump_all.xml, ui_dump_all_electrcity.xml,
//   ui_dump_all_fuel.xml, ui_dump_all_source.xml)
// ─────────────────────────────────────────────────────────────

async function selectTypeOfHouse(driver, value) {
    console.log('Processing Type of House Dropdown...');
    await openSpinnerAndSelect(driver, 'Type of house',
        ['None', 'Kuchha', 'Pucca', 'Other'],
        value);
    console.log(`✅ Type of House: ${value}`);
}

async function selectTypeOfFuel(driver, value) {
    console.log('Processing Type of Fuel Dropdown...');
    await openSpinnerAndSelect(driver, 'Type of fuel used for Cooking', DROPDOWN_OPTIONS.typeOfFuel, value);
    console.log(`✅ Type of Fuel: ${value}`);

    if (value === 'Other') {
        try {
            await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Other Type of fuel"))');
            await driver.pause(500);
        } catch (e) {}

        const otherField = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/et").textContains("Other Type of fuel")');
        await otherField.waitForDisplayed({ timeout: 10000 });
        await otherField.click();
        await otherField.setValue('Biogas'); // Replace with your desired test value
        await hideKeyboardSafe(driver);
    }
}

async function selectPrimaryWaterSource(driver, value) {
    console.log('Processing Primary Source of Water Dropdown...');
    await openSpinnerAndSelect(driver, 'Primary Source of Water', DROPDOWN_OPTIONS.waterSource, value);
    console.log(`✅ Primary Water Source: ${value}`);

    if (value === 'Other') {
        // Because text is "null", we rely on the specific layout ID and its child EditText
        const xpath = '//android.widget.LinearLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/til_edit_text"]//android.widget.EditText';
        const otherField = await driver.$(xpath);

        await otherField.waitForDisplayed({ timeout: 10000 });
        await otherField.click();
        await otherField.setValue('Spring Water'); // Replace with your desired test value
        await hideKeyboardSafe(driver);
    }
}

async function selectElectricityAvailability(driver, value) {
    console.log('Processing Availability of Electricity Dropdown...');
    await openSpinnerAndSelect(driver, 'Availability of Electricity', DROPDOWN_OPTIONS.electricity, value);
    console.log(`✅ Electricity: ${value}`);

    if (value === 'Other') {
        try {
            await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Other availability"))');
            await driver.pause(500);
        } catch (e) {}
        const otherField = await driver.$('android=new UiSelector().textContains("Other availability")');
        await otherField.waitForDisplayed({ timeout: 10000 });
        await otherField.click();
        await otherField.setValue('Temporary electricity connection');
        await hideKeyboardSafe(driver);
    }
}

async function selectToiletAvailability(driver, value) {
    console.log('Processing Availability of Toilet Dropdown...');
    await openSpinnerAndSelect(driver, 'Availability of Toilet', DROPDOWN_OPTIONS.toilet, value);
    console.log(`✅ Toilet: ${value}`);

    if (value === 'Other') {
        try {
            await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Other Availability of Toilet"))');
            await driver.pause(500);
        } catch (e) {}

        const otherField = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/et").textContains("Other Availability of Toilet")');
        await otherField.waitForDisplayed({ timeout: 10000 });
        await otherField.click();
        await otherField.setValue('Community Toilet'); // Replace with your desired test value
        await hideKeyboardSafe(driver);
    }
}

// ─────────────────────────────────────────────────────────────
//  MASTER FUNCTION
// ─────────────────────────────────────────────────────────────

async function fillHouseholdFormWithExamples(driver, data = {}) {
    console.log('📝 Filling household form...');

    await fillFirstName(driver, data.firstName || 'rina');
    await fillLastName(driver, data.lastName || 'Singh');
    await fillMobileNumber(driver, data.mobileNumber || '9391345768');

    await fillHouseNo(driver, data.houseNo || '42B');
    await fillWardNo(driver, data.wardNo || '12');
    await fillWardName(driver, data.wardName || 'Market Square');
    await fillMohallaName(driver, data.mohallaName || 'Rajpur Nagar');

    await selectEconomicStatus(driver, data.economicStatus || 'APL');

    await selectTypeOfHouse(driver, data.typeOfHouse || 'Kuchha');

    await selectHouseOwnership(driver, data.houseOwnership || 'Yes');
    await selectSeparateKitchen(driver, data.separateKitchen || 'Yes');
    await selectTypeOfFuel(driver, data.typeOfFuel || randomPick(DROPDOWN_OPTIONS.typeOfFuel));
    await selectPrimaryWaterSource(driver, data.primaryWaterSource || randomPick(DROPDOWN_OPTIONS.waterSource));
    await selectElectricityAvailability(driver, data.electricity || randomPick(DROPDOWN_OPTIONS.electricity));
    await selectToiletAvailability(driver, data.toilet || randomPick(DROPDOWN_OPTIONS.toilet));

    await hideKeyboardSafe(driver);
    await driver.pause(1000);

    console.log('✅ All household form fields filled!');

    console.log('🔍 Clicking Submit...');
    const submitBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit")');
    await submitBtn.waitForDisplayed({ timeout: 10000 });
    await submitBtn.click();

    console.log('⏳ Waiting for ADD Head Of Family popup...');
    const yesBtn = await driver.$('android=new UiSelector().textMatches("(?i)yes")');
    await yesBtn.waitForDisplayed({ timeout: 10000 });
    await yesBtn.click();

    console.log('✅ Clicked Yes — transitioning to Head of Family form...');
}

module.exports = { fillHouseholdFormWithExamples };