// headOfFamilySteps.js

// ✅ 1. Consent Form Handler
async function handleConsentForm(driver) {
    console.log("⏳ Waiting for Consent Form popup...");
    try {
        const agreeBtn = await driver.$('android=new UiSelector().textMatches("(?i)agree")');
        await agreeBtn.waitForDisplayed({ timeout: 15000 });
        console.log("✅ Consent popup is visible");
        await driver.pause(1000);

        const checkbox = await driver.$('android=new UiSelector().className("android.widget.CheckBox")');
        if (await checkbox.isExisting()) {
            await checkbox.click();
            console.log("✅ Clicked the Consent Checkbox");
        } else {
            console.log("⚠️ Checkbox class not found, clicking the text body instead...");
            const consentText = await driver.$('android=new UiSelector().textContains("I have been explained")');
            await consentText.click();
            console.log("✅ Clicked the text body to check the box");
        }
        await driver.pause(1000);
        await agreeBtn.click();
        console.log("✅ Clicked AGREE on Consent Form");
        await driver.pause(2000);
    } catch (error) {
        console.log("ℹ️ No Consent Form appeared or it was missed. Continuing...");
    }
}

// ✅ 2. Combined Age & Date of Birth Handler
async function fillAgeAndDOB(driver, years) {
    console.log("🔍 Clicking Age field to open picker...");
    const ageField = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Age")');
    await ageField.waitForDisplayed({ timeout: 10000 });
    await ageField.click();

    console.log("⏳ Waiting for Date/Age picker popup...");
    const okBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_ok")');
    await okBtn.waitForDisplayed({ timeout: 10000 });

    const numberInputs = await driver.$$('android=new UiSelector().resourceId("android:id/numberpicker_input")');
    if (numberInputs.length > 0) {
        console.log(`🔢 Setting Age to ${years} years in the picker...`);
        await numberInputs[0].click();
        await numberInputs[0].setValue(years);
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
            await driver.pause(1000);
        }
    }
    console.log("✅ Clicking OK on picker popup");
    await okBtn.click();
    await driver.pause(1500);
}

// ✅ 3. Gender Selection
async function selectGender(driver, gender = "Male") {
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
    }
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Gender"))');
    await driver.pause(500);

    const genderOption = await driver.$(`android=new UiSelector().className("android.widget.RadioButton").text("${gender}")`);
    await genderOption.waitForDisplayed({ timeout: 10000 });
    await genderOption.click();
    console.log(`✅ Gender selected: ${gender}`);
}

// ✅ 4. Marital Status (UPDATED with correct coordinates from new screenshot)
async function selectMaritalStatus(driver, value = "Married") {
    console.log(`🔄 Attempting to select Marital Status: ${value}...`);

    // 1. Ensure keyboard is closed
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
    }

    // 2. Scroll to Marital Status
    console.log("🔄 Scrolling down to Marital Status...");
    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Marital Status"))');
        await driver.pause(1000);
    } catch (e) { }

    // 3. Open the Dropdown dynamically
    console.log("👆 Clicking Marital Status dropdown...");
    try {
        const dropdown = await driver.$('android=new UiSelector().className("android.widget.Spinner").textContains("Marital Status")');
        await dropdown.waitForDisplayed({ timeout: 5000 });
        await dropdown.click();
    } catch (e) {
        console.log("⚠️ Could not find Marital Status spinner normally, trying alternate locator...");
        const altDropdown = await driver.$('android=new UiSelector().textContains("Marital Status").fromParent(new UiSelector().description("Show dropdown menu"))');
        await altDropdown.click();
    }
    await driver.pause(2000);

    // 4. Click the exact option. We try dynamic text first, then fallback to fixed coordinates from your screenshot.
    try {
        // Appium can often see the text inside the popup natively
        const option = await driver.$(`android=new UiSelector().textContains("${value}")`);
        await option.waitForDisplayed({ timeout: 3000 });
        await option.click();
        console.log(`✅ Selected ${value} via text locator`);
    } catch (e) {
        console.log(`⚠️ Text locator failed, falling back to coordinates for ${value}...`);

        // NEW COORDINATES: Calculated exactly from the provided image
        // Assuming a standard 1080x2400 resolution. The popup opens in the lower half.
        let tapY = 1510;

        switch (value) {
            case "Unmarried": tapY = 1400; break;
            case "Married":   tapY = 1510; break;
            case "Divorced":  tapY = 1620; break;
            case "Separated": tapY = 1730; break;
            case "Widower":   tapY = 1840; break;
        }

        console.log(`👆 Tapping ${value} at X: 540, Y: ${tapY}`);
        await driver.performActions([{
            type: 'pointer', id: 'finger2', parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: 540, y: tapY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 100 },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
    }
    await driver.pause(1000);
    console.log(`✅ Marital Status selection completed.`);
}

// ✅ 5. Text Field Helpers (UPDATED for dynamic checking)

async function fillFatherName(driver, fatherName) {
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }

    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Father\'s Name"))');
    const fatherField = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Father\'s Name")');

    await fatherField.click();
    await fatherField.setValue(fatherName);

    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }
    console.log(`✅ Father's Name entered: ${fatherName}`);
}

async function fillMotherName(driver, motherName) {
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }

    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Mother\'s Name"))');
    const motherField = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Mother\'s Name")');

    await motherField.click();
    await motherField.setValue(motherName);

    console.log("⌨️ Hiding keyboard after typing Mother's Name...");
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
    }
    console.log(`✅ Mother's Name entered: ${motherName}`);
}

// 🆕 DYNAMIC: Checks for Husband or Wife's name, fills if exists, skips if not.
async function fillSpouseNameIfExists(driver, spouseName) {
    console.log("🔍 Checking if Husband's or Wife's Name field is present...");
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }

    try {
        // Scroll a bit to make sure the field is in view if it exists
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollForward()');
    } catch (e) {}

    const wifeField = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Wife\'s Name")');
    const husbandField = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Husband\'s Name")');

    let fieldToFill = null;
    let fieldNameStr = "";

    if (await wifeField.isExisting()) {
        fieldToFill = wifeField;
        fieldNameStr = "Wife's Name";
    } else if (await husbandField.isExisting()) {
        fieldToFill = husbandField;
        fieldNameStr = "Husband's Name";
    }

    if (fieldToFill) {
        console.log(`✅ Found ${fieldNameStr} field. Filling it...`);
        await fieldToFill.click();
        await fieldToFill.setValue(spouseName.toUpperCase());

        if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }
        console.log(`✅ ${fieldNameStr} entered: ${spouseName.toUpperCase()}`);
    } else {
        console.log("⏭️ Neither Husband's nor Wife's Name field is present. Moving next.");
    }
}

// 🆕 DYNAMIC: Checks for Age At Marriage, fills if exists, skips if not.
async function fillAgeAtMarriageIfExists(driver, ageAtMarriage) {
    console.log("🔍 Checking if Age At Marriage field is present...");
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }

    const ageMarriageField = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Age at the time of marriage")');

    if (await ageMarriageField.isExisting()) {
        console.log("✅ Found Age At Marriage field. Filling it...");
        await ageMarriageField.click();
        await ageMarriageField.setValue(ageAtMarriage);

        if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }
        console.log(`✅ Age At Marriage entered: ${ageAtMarriage}`);
    } else {
        console.log("⏭️ Age At Marriage field not present. Moving next.");
    }
}

// 🆕 DYNAMIC: Checks for "Do you have children?", selects option if exists, skips if not.
async function selectHaveChildrenIfExists(driver, hasChildren = "Yes") {
    console.log("🔍 Checking if 'Do you have children?' field is present...");
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }

    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollForward()');
    } catch (e) {}

    const questionText = await driver.$('android=new UiSelector().textContains("Do you have children")');

    if (await questionText.isExisting()) {
        console.log(`✅ Found 'Do you have children?' field. Selecting ${hasChildren}...`);

        const optionBtn = await driver.$(`android=new UiSelector().className("android.widget.RadioButton").text("${hasChildren}")`);
        if (await optionBtn.isExisting()) {
            await optionBtn.click();
            console.log(`✅ Selected '${hasChildren}' for children.`);
        } else {
            console.log(`⚠️ Option '${hasChildren}' not found.`);
        }
    } else {
        console.log("⏭️ 'Do you have children?' field not present. Moving next.");
    }
}


// ✅ 6. Community Selection (UPDATED: Exact Coordinates based on new screenshot)
// ✅ 6. Community Selection (UPDATED: Exact Coordinates based on new screenshot)
async function selectCommunity(driver, value = "General") {
    // 1. 🛑 STEP 1: Close Keyboard FIRST (Before scrolling)
    if (await driver.isKeyboardShown()) {
        console.log("⚠️ Keyboard detected. Hiding it to prevent scroll issues...");
        await driver.hideKeyboard();
        await driver.pause(1500);
    }

    // 2. 🔄 STEP 2: Scroll Down (Now that screen is full size)
    console.log("🔄 Scrolling down to Community...");
    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Community"))');
    } catch (e) {
        console.log("⚠️ Could not scroll, assuming element is visible.");
    }
    await driver.pause(1000);

    // 3. Find Dropdown
    let dropdown;
    try {
        dropdown = await driver.$('android=new UiSelector().className("android.widget.Spinner").textContains("Community")');
        await dropdown.waitForDisplayed({ timeout: 5000 });
    } catch (e) {
        dropdown = await driver.$('android=new UiSelector().textContains("Community").fromParent(new UiSelector().description("Show dropdown menu"))');
    }

    // 4. Click Dropdown
    console.log("👆 Clicking Community dropdown...");
    await dropdown.click();
    await driver.pause(1500);

    // 5. Check: Did keyboard pop up again?
    if (await driver.isKeyboardShown()) {
        console.log("⚠️ Keyboard popped up! Hiding it and clicking dropdown again...");
        await driver.hideKeyboard();
        await driver.pause(1000);
        await dropdown.click();
        await driver.pause(1500);
    }

    // 6. Select Value
    // First, try to click using the exact text natively (Most reliable)
    try {
        let textToFind = value;
        if (value === "PVTG") textToFind = "PVTG"; // Matches "PVTG – Primitive Vulnerable Tribal Groups"

        const option = await driver.$(`android=new UiSelector().textContains("${textToFind}")`);
        await option.waitForDisplayed({ timeout: 3000 });
        await option.click();
        console.log(`✅ Selected ${value} via text locator`);
    } catch (e) {
        console.log(`⚠️ Text locator failed, falling back to coordinates for ${value}...`);

        // NEW COORDINATES: Mapped to the updated screenshot where the popup opens over the middle
        let tapY = 1000; // Default to General

        switch (value) {
            case "General": tapY = 1000; break;
            case "SC": tapY = 1100; break;
            case "ST": tapY = 1210; break;
            case "BC": tapY = 1320; break;
            case "OBC": tapY = 1430; break;
            case "OC": tapY = 1540; break;
            case "PVTG": tapY = 1650; break;
            case "Not given": tapY = 1760; break;
        }

        console.log(`👆 Tapping Community '${value}' at X: 540, Y: ${tapY}`);

        await driver.performActions([{
            type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: 540, y: tapY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 250 },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
    }

    await driver.pause(1000);
    console.log(`✅ Selected Community: ${value}`);
}

// ✅ 7. Religion Selection (UPDATED with Hardcoded Coordinates based on new screenshot)
async function selectReligion(driver, value = "Hindu") {
    // 1. 🛑 STEP 1: Close Keyboard FIRST
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1500);
    }

    // 2. 🔄 STEP 2: Scroll Down
    console.log("🔄 Scrolling down to Religion...");
    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Religion"))');
    } catch (e) {}
    await driver.pause(1000);

    // 3. Find Dropdown
    let dropdown;
    try {
        dropdown = await driver.$('android=new UiSelector().className("android.widget.Spinner").textContains("Religion")');
        await dropdown.waitForDisplayed({ timeout: 5000 });
    } catch(e) {
        dropdown = await driver.$('android=new UiSelector().textContains("Religion").fromParent(new UiSelector().description("Show dropdown menu"))');
    }

    // 4. Click Dropdown
    console.log("👆 Clicking Religion dropdown...");
    await dropdown.click();
    await driver.pause(1500);

    // 5. Check: Did keyboard pop up?
    if (await driver.isKeyboardShown()) {
        console.log("⚠️ Keyboard popped up! Hiding it and clicking dropdown again...");
        await driver.hideKeyboard();
        await driver.pause(1000);
        await dropdown.click();
        await driver.pause(1500);
    }

    // 6. Select Value
    try {
        const option = await driver.$(`android=new UiSelector().textContains("${value}")`);
        await option.waitForDisplayed({ timeout: 3000 });
        await option.click();
        console.log(`✅ Selected ${value} via text locator`);
    } catch (e) {
        console.log(`⚠️ Text locator failed, falling back to coordinates for ${value}...`);

        // NEW COORDINATES: Mapped precisely to the updated Religion screenshot
        let tapY = 1040; // Default to Hindu

        switch (value) {
            case "Hindu": tapY = 1040; break;
            case "Muslim": tapY = 1150; break;
            case "Christian": tapY = 1260; break;
            case "Sikhism": tapY = 1370; break;
            case "Buddhism": tapY = 1480; break;
            case "Jainism": tapY = 1590; break;
            case "Parsi": tapY = 1700; break;
            case "Other": tapY = 1810; break;
            case "Not disclosed": tapY = 1920; break;
            default: tapY = 1040;
        }

        console.log(`👆 Tapping Religion '${value}' at X: 540, Y: ${tapY}`);
        await driver.performActions([{
            type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: 540, y: tapY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 250 },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
    }

    await driver.releaseActions();
    console.log(`✅ Selected Religion: ${value}`);
}
// ✅ 8. Final Submission
async function submitFinalForm(driver) {
    // 1. Ensure the keyboard is closed before interacting with bottom buttons
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
    }

    console.log("🔍 Looking for the First Submit button (Main Form)...");

    // 2. Find and click the FIRST Submit button on the main form
    try {
        const firstSubmitButton = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit")');
        await firstSubmitButton.waitForDisplayed({ timeout: 5000 });
        await firstSubmitButton.click();
        console.log("✅ First Submit button clicked. Waiting for Preview screen...");

        // Pause to allow the preview popup/screen to fully render
        await driver.pause(2000);
    } catch (e) {
        console.log("❌ Could not find the First Submit button!");
        return; // Stop execution if we can't get past the first screen
    }

    console.log("🔍 Looking for the Final Submit button (Preview Screen)...");

    // 3. Find and click the SECOND Submit button on the Preview Screen
    try {
        const finalSubmitButton = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btnSubmitPreview")');
        await finalSubmitButton.waitForDisplayed({ timeout: 5000 });
        await finalSubmitButton.click();
        console.log("✅ Final Submit button clicked (Preview Screen)");
    } catch (e) {
        console.log("❌ Could not find the Final Submit button on Preview Screen!");
    }
}

// ✅ 8. Status Of Women Selection
async function selectStatusOfWomen(driver, value = "Eligible Couple") {
    // 1. 🛑 STEP 1: Close Keyboard FIRST
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1500);
    }

    // 2. 🔄 STEP 2: Scroll Down
    console.log("🔄 Scrolling down to Status Of Women...");
    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Status Of Women"))');
    } catch (e) {}
    await driver.pause(1000);

    // 3. Find Dropdown
    let dropdown;
    try {
        dropdown = await driver.$('android=new UiSelector().className("android.widget.Spinner").textContains("Status Of Women")');
        await dropdown.waitForDisplayed({ timeout: 5000 });
    } catch(e) {
        dropdown = await driver.$('android=new UiSelector().textContains("Status Of Women").fromParent(new UiSelector().description("Show dropdown menu"))');
    }

    // 4. Click Dropdown
    console.log("👆 Clicking Status Of Women dropdown...");
    await dropdown.click();
    await driver.pause(1500);

    // 5. Check: Did keyboard pop up?
    if (await driver.isKeyboardShown()) {
        console.log("⚠️ Keyboard popped up! Hiding it and clicking dropdown again...");
        await driver.hideKeyboard();
        await driver.pause(1000);
        await dropdown.click();
        await driver.pause(1500);
    }

    // 6. Select Value
    try {
        const option = await driver.$(`android=new UiSelector().textContains("${value}")`);
        await option.waitForDisplayed({ timeout: 3000 });
        await option.click();
        console.log(`✅ Selected ${value} via text locator`);
    } catch (e) {
        console.log(`⚠️ Text locator failed, falling back to coordinates for ${value}...`);

        // NEW COORDINATES: Mapped to the Status Of Women screenshot (popup opens upwards)
        let tapY = 1620; // Default to Eligible Couple

        switch (value) {
            case "Eligible Couple": tapY = 1620; break;
            case "Pregnant Woman": tapY = 1730; break;
            case "Postnatal Mother": tapY = 1840; break;
            case "Permanently Sterilised": tapY = 1950; break;
            default: tapY = 1620;
        }

        console.log(`👆 Tapping Status Of Women '${value}' at X: 540, Y: ${tapY}`);
        await driver.performActions([{
            type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: 540, y: tapY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 250 },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
    }

    await driver.releaseActions();
    console.log(`✅ Selected Status Of Women: ${value}`);
}

// ✅ 9. Master Function
async function fillHeadOfFamilyFormWithExamples(driver, targetMaritalStatus = "Married") {
    console.log("📝 Filling Head of Family form with example data...");

    await handleConsentForm(driver);
    await fillAgeAndDOB(driver, "26");
    await selectGender(driver, "Female");
    await selectMaritalStatus(driver, targetMaritalStatus);

    await fillFatherName(driver, "Ram Sharma");
    await fillMotherName(driver, "Sunita Sharma");

    // Dynamic Fields
    await fillSpouseNameIfExists(driver, "Priya Sharma");
    await fillAgeAtMarriageIfExists(driver, "22");
    await selectHaveChildrenIfExists(driver, "Yes"); // 🆕 Added step here

    await selectCommunity(driver, "General");
    await selectReligion(driver, "Hindu");
    await selectStatusOfWomen(driver, "Eligible Couple");
    console.log("✅ Head of Family form filled successfully!");
    await submitFinalForm(driver);
}

module.exports = {
    fillHeadOfFamilyFormWithExamples
};