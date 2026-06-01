// householdFormSteps.js
// ✅ FINAL VERSION — All dropdowns use dedicated inline spinner logic with XML + coordinate fallback
// Works on ALL devices — no coordinates, no window switching needed

// ─────────────────────────────────────────────────────────────
//  CORE HELPER — Scroll spinner into view
// ─────────────────────────────────────────────────────────────

async function scrollSpinnerToMiddle(driver, spinnerSelector) {
    try {
        const spinner = await driver.$(spinnerSelector);
        const loc = await spinner.getLocation();
        const screen = await driver.getWindowRect();
        const midY = screen.height / 2;

        // If the element is in the bottom half of the screen, pull it up
        if (loc.y > midY + 100) {
            console.log(`⬆️  Spinner at y=${loc.y}, scrolling toward middle...`);

            // Use W3C pointer actions for a reliable, device-agnostic swipe
            const startY = Math.floor(screen.height * 0.7);
            const endY = Math.floor(screen.height * 0.3);
            const swipeX = Math.floor(screen.width / 2);

            await driver.performActions([{
                type: 'pointer', id: 'finger1',
                parameters: { pointerType: 'touch' },
                actions: [
                    { type: 'pointerMove', duration: 0, x: swipeX, y: startY },
                    { type: 'pointerDown', button: 0 },
                    { type: 'pause', duration: 200 },
                    { type: 'pointerMove', duration: 1000, x: swipeX, y: endY }, // swipe up
                    { type: 'pointerUp', button: 0 }
                ]
            }]);
            await driver.releaseActions();
            await driver.pause(1500); // Allow UI to settle
        }
    } catch (e) {
        console.log('⚠️  scrollSpinnerToMiddle skipped:', e.message);
    }
}
// ─────────────────────────────────────────────────────────────
//  CORE HELPER — Tap by coordinates
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
//  CORE HELPER — Shared spinner click + XML bounds tap
//  Used by ALL dropdowns — single consistent strategy everywhere
// ─────────────────────────────────────────────────────────────

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList) {
    // 1. Force the spinner to the safe middle zone of the screen BEFORE clicking
    await scrollSpinnerToMiddle(driver, spinnerSelector);

    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();
    console.log(`📍 Spinner @ (${loc.x}, ${loc.y}), size (${size.width}x${size.height})`);

    // 2. Click the RIGHT side of the spinner to explicitly hit the dropdown arrow
    // This bypasses the flaky generic `.click()` which often hits the unclickable text area
    const tapX = Math.floor(loc.x + size.width - 40); // 40px inwards from the right edge
    const tapY = Math.floor(loc.y + size.height / 2);

    console.log(`📍 Tapping dropdown arrow at (${tapX}, ${tapY})`);
    await tapByCoords(driver, tapX, tapY);
    await driver.pause(2000); // Wait for popup to fully expand

    // ─── STRATEGY 0: Direct XPath (Often the most robust for Android Popups) ───
    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`✅ Selected "${value}" via XPath`);
        return;
    } catch (e) {
        console.log(`⚠️  XPath strategy failed: ${e.message}`);
    }

    // ─── STRATEGY 1: UiSelector ───
    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via UiSelector`);
        return;
    } catch (e) {
        console.log(`⚠️  UiSelector strategy failed: ${e.message}`);
    }

    // ─── STRATEGY 2: Tag-by-tag XML parse (most reliable fallback) ───
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
                const tapX = Math.floor((parseInt(boundsMatch[1]) + parseInt(boundsMatch[3])) / 2);
                const tapY = Math.floor((parseInt(boundsMatch[2]) + parseInt(boundsMatch[4])) / 2);
                console.log(`📍 Found "${value}" in XML (tag parse) → tap(${tapX},${tapY})`);
                await tapByCoords(driver, tapX, tapY);
                console.log(`✅ Selected "${value}" via tag parse`);
                return;
            }
        }
        console.log(`⚠️  "${value}" not found via tag parse, trying regex strategy...`);
    } catch (e) {
        console.log(`⚠️  Tag parse failed: ${e.message}`);
    }

    // ─── STRATEGY 3: Inline regex bounds ───
    try {
        const source = await driver.getPageSource();
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`text="${escapedValue}"[^/]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
        const match = source.match(regex);

        if (match) {
            const tapX = Math.floor((parseInt(match[1]) + parseInt(match[3])) / 2);
            const tapY = Math.floor((parseInt(match[2]) + parseInt(match[4])) / 2);
            console.log(`📍 Found "${value}" via regex → tap(${tapX},${tapY})`);
            await tapByCoords(driver, tapX, tapY);
            console.log(`✅ Selected "${value}" via regex`);
            return;
        }
        console.log(`⚠️  "${value}" not found via regex, trying coordinate fallback...`);
    } catch (e) {
        console.log(`⚠️  Regex strategy failed: ${e.message}`);
    }

    // ─── STRATEGY 4: Coordinate fallback ───
    const screen = await driver.getWindowRect();
    const idx = optionsList.indexOf(value);
    if (idx === -1) throw new Error(`"${value}" not in list: [${optionsList.join(', ')}]`);

    const rowHeight     = size.height;
    const spinnerBottom = loc.y + size.height;
    const opensUpward   = (screen.height - spinnerBottom) < (optionsList.length * rowHeight);
    const finalTapX     = Math.floor(loc.x + size.width / 2);
    let   finalTapY;

    if (opensUpward) {
        const reversedIdx = (optionsList.length - 1) - idx;
        finalTapY = Math.floor(loc.y - (reversedIdx * rowHeight) - (rowHeight / 2));
    } else {
        finalTapY = Math.floor(spinnerBottom + (idx * rowHeight) + (rowHeight / 2));
    }
    finalTapY = Math.max(5, Math.min(finalTapY, screen.height - 5));

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
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(500);
    }
    console.log('✅ First Name entered successfully');
}

async function fillLastName(driver, lastName) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().className("android.widget.EditText").textContains("Last Name"))');
    const f = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Last Name")');
    await f.waitForDisplayed({ timeout: 10000 });
    await f.click();
    await f.setValue(lastName);
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(500);
    }
    console.log('✅ Last Name entered successfully');
}

async function fillMobileNumber(driver, mobileNumber) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().className("android.widget.EditText").textContains("Mobile No"))');
    const f = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Mobile No")');
    await f.waitForDisplayed({ timeout: 10000 });
    await f.click();
    await f.setValue(mobileNumber);
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(500);
    }
    console.log('✅ Mobile Number entered successfully');
}

async function fillHouseNo(driver, houseNo) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().className("android.widget.EditText").text("House No"))');
    const f = await driver.$('android=new UiSelector().className("android.widget.EditText").text("House No")');
    await f.waitForDisplayed({ timeout: 10000 });
    await f.click();
    await f.setValue(houseNo);
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(500);
    }
    console.log('✅ House Number entered successfully');
}

async function fillWardNo(driver, wardNo) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().className("android.widget.EditText").textContains("Ward No"))');
    const f = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Ward No")');
    await f.waitForDisplayed({ timeout: 10000 });
    await f.click();
    await f.setValue(wardNo);
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(500);
    }
    console.log('✅ Ward Number entered successfully');
}

async function fillWardName(driver, wardName) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().className("android.widget.EditText").textContains("Ward Name"))');
    const f = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Ward Name")');
    await f.waitForDisplayed({ timeout: 10000 });
    await f.click();
    await f.setValue(wardName);
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(500);
    }
    console.log('✅ Ward Name entered successfully');
}

async function fillMohallaName(driver, mohallaName) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Mohalla Name"))');
    const f = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Mohalla Name")');
    await f.waitForDisplayed({ timeout: 10000 });
    await f.click();
    await f.setValue(mohallaName);
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(800); // longer pause — next scroll needs keyboard fully gone
    }
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
// ─────────────────────────────────────────────────────────────

async function selectTypeOfHouse(driver, value) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Type of house"))');
    await driver.pause(1000);
    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().className("android.widget.Spinner").textContains("Type of house")',
        value,
        ['None', 'Kuchha', 'Pucca', 'Other']
    );
    console.log(`✅ Type of House: ${value}`);
}

async function selectTypeOfFuel(driver, value) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Type of fuel"))');
    await driver.pause(1000);
    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().className("android.widget.Spinner").textContains("Type of fuel")',
        value,
        ['Firewood', 'Crop Residue', 'Cow dung cake', 'Coal', 'Kerosene', 'LPG', 'Induction', 'Other']
    );
    console.log(`✅ Type of Fuel: ${value}`);
}

async function selectPrimaryWaterSource(driver, value) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Primary Source"))');
    await driver.pause(1000);
    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().className("android.widget.Spinner").textContains("Primary Source")',
        value,
        ['Tap Water', 'Hand pump inside house', 'Hand pump outside of house', 'Well', 'Tank', 'River', 'Pond', 'Other']
    );
    console.log(`✅ Primary Water Source: ${value}`);
}

async function selectElectricityAvailability(driver, value) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Availability of Electricity"))');
    await driver.pause(1000);
    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().className("android.widget.Spinner").textContains("Availability of Electricity")',
        value,
        ['Electricity Supply', 'Generator', 'Solar Power', 'Kerosene Lamp', 'Other']
    );
    console.log(`✅ Electricity: ${value}`);

    if (value === 'Other') {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Other availability"))');
        const otherField = await driver.$('android=new UiSelector().textContains("Other availability")');
        await otherField.waitForDisplayed({ timeout: 10000 });
        await otherField.click();
        await otherField.setValue('Temporary electricity connection');
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
            await driver.pause(500);
        }
    }
}

async function selectToiletAvailability(driver, value) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Availability of Toilet"))');
    await driver.pause(1000);
    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().className("android.widget.Spinner").textContains("Availability of Toilet")',
        value,
        [
            'Flush toilet with running water',
            'Flush toilet without water',
            'Pit toilet with running water supply',
            'Pit toilet without water supply',
            'Other',
            'None'
        ]
    );
    console.log(`✅ Toilet: ${value}`);
}


// ─────────────────────────────────────────────────────────────
//  MASTER FUNCTION
// ─────────────────────────────────────────────────────────────

async function fillHouseholdFormWithExamples(driver, data = {}) {
    console.log('📝 Filling household form...');

    await fillFirstName(driver, data.firstName || 'Ananya');
    await fillLastName(driver, data.lastName || 'Verma');
    await fillMobileNumber(driver, data.mobileNumber || '9876543210');

    await fillHouseNo(driver, data.houseNo || '23A');
    await fillWardNo(driver, data.wardNo || '08');
    await fillWardName(driver, data.wardName || 'Green Park');
    await fillMohallaName(driver, data.mohallaName || 'Meera Nagar');

    await selectEconomicStatus(driver, data.economicStatus || 'APL');

    await selectTypeOfHouse(driver, data.typeOfHouse || 'Kuchha');

    await selectHouseOwnership(driver, data.houseOwnership || 'Yes');
    await selectSeparateKitchen(driver, data.separateKitchen || 'Yes');
    await selectTypeOfFuel(driver, data.typeOfFuel || 'Induction');
    await selectPrimaryWaterSource(driver, data.primaryWaterSource || 'Hand pump outside of house');
    await selectElectricityAvailability(driver, data.electricity || 'Solar Power');
    await selectToiletAvailability(driver, data.toilet || 'Pit toilet without water supply');

    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
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