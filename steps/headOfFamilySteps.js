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
    const okBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/btn_ok")');
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

// ✅ 4. Marital Status
// ✅ 4. Marital Status (STRICT COORDINATES from 1080x2400 Screenshot)
async function selectMaritalStatus(driver, value = "Married") {
    console.log(`🔄 Attempting to select Marital Status: ${value} via strict coordinates...`);

    // 1. Ensure keyboard is closed so the screen doesn't shift
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
    }

    // 2. Click the Spinner to open the dropdown
    // This taps the center of the Marital Status box (Bounds: [50,1124][1030,1255])
    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: 540, y: 1190 },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(2000); // Wait for the dropdown animation to finish

    // 3. Tap the specific option based on exact Y-coordinates
    let tapY = 1450; // Default to Married

    switch (value) {
        case "Unmarried": tapY = 1320; break;
        case "Married":   tapY = 1450; break;
        case "Divorced":  tapY = 1580; break;
        case "Separated": tapY = 1710; break; // This is exactly where the yellow box is in your image
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
    await driver.releaseActions();
    await driver.pause(1000);
    console.log(`✅ Selected ${value}`);
}

// ✅ 5. Text Field Helpers
async function fillWifesName(driver, wifeName) {
    const upperCaseWifeName = wifeName.toUpperCase();
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }

    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Wife\'s Name"))');
    const wifeField = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Wife\'s Name")');

    await wifeField.click();
    await wifeField.setValue(upperCaseWifeName);

    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }
    console.log(`✅ Wife's Name entered: ${upperCaseWifeName}`);
}

async function fillAgeAtMarriage(driver, ageAtMarriage) {
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }

    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Age At Marriage"))');
    const ageMarriageField = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Age At Marriage")');

    await ageMarriageField.click();
    await ageMarriageField.setValue(ageAtMarriage);

    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }
    console.log(`✅ Age At Marriage entered: ${ageAtMarriage}`);
}

async function fillFatherName(driver, fatherName) {
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }

    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Father\'s Name"))');
    const fatherField = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Father\'s Name")');

    await fatherField.click();
    await fatherField.setValue(fatherName);

    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }
    console.log(`✅ Father's Name entered: ${fatherName}`);
}

// ✅ 5. Text Field Helpers (Updated to close keyboard immediately)
async function fillMotherName(driver, motherName) {
    // 1. Check/Hide keyboard before starting
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(1000); }

    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Mother\'s Name"))');
    const motherField = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Mother\'s Name")');

    await motherField.click();
    await motherField.setValue(motherName);

    // 2. 🛑 IMPORTANT: Close keyboard immediately after typing!
    // This prevents the "scroll up" issue in the next step.
    console.log("⌨️ Hiding keyboard after typing Mother's Name...");
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
    }
    console.log(`✅ Mother's Name entered: ${motherName}`);
}

// ✅ 6. Community Selection (FIXED: Close Keyboard -> Then Scroll)
async function selectCommunity(driver, value = "General") {
    // 1. 🛑 STEP 1: Close Keyboard FIRST (Before scrolling)
    if (await driver.isKeyboardShown()) {
        console.log("⚠️ Keyboard detected. Hiding it to prevent scroll issues...");
        await driver.hideKeyboard();
        await driver.pause(1500); // Wait for screen to expand back to full size
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

    // 6. Select Value (Coordinates)
    const { width, height } = await driver.getWindowRect();
    const x = Math.floor(width / 2);
    let y;

    switch (value) {
        case "General": y = height * 0.40; break;
        case "SC": y = height * 0.47; break;
        case "ST": y = height * 0.54; break;
        case "BC": y = height * 0.61; break;
        case "OBC": y = height * 0.68; break;
        case "OC": y = height * 0.75; break;
        case "PVTG": y = height * 0.82; break;
        case "Not given": y = height * 0.88; break;
        default: y = height * 0.40;
    }

    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x, y: Math.floor(y) },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 250 },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    console.log(`✅ Selected Community: ${value}`);
}

// ✅ 7. Religion Selection (FIXED: Close Keyboard -> Then Scroll)
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
    const { width, height } = await driver.getWindowRect();
    const x = Math.floor(width / 2);
    let y;

    switch (value) {
        case "Hindu": y = height * 0.40; break;
        case "Muslim": y = height * 0.47; break;
        case "Christian": y = height * 0.54; break;
        case "Sikhism": y = height * 0.61; break;
        case "Buddhism": y = height * 0.68; break;
        case "Jainism": y = height * 0.75; break;
        case "Parsi": y = height * 0.82; break;
        case "Other": y = height * 0.89; break;
        case "Not disclosed": y = height * 0.92; break;
        default: y = height * 0.40;
    }

    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x, y: Math.floor(y) },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 250 },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
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
        const firstSubmitButton = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/btn_submit")');
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
        const finalSubmitButton = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/btnSubmitPreview")');
        await finalSubmitButton.waitForDisplayed({ timeout: 5000 });
        await finalSubmitButton.click();
        console.log("✅ Final Submit button clicked (Preview Screen)");
    } catch (e) {
        console.log("❌ Could not find the Final Submit button on Preview Screen!");
    }
}
// ✅ 9. Master Function
async function fillHeadOfFamilyFormWithExamples(driver, targetMaritalStatus = "Married") {
    console.log("📝 Filling Head of Family form with example data...");

    await handleConsentForm(driver);
    await fillAgeAndDOB(driver, "26");
    await selectGender(driver, "Male");
    await selectMaritalStatus(driver, targetMaritalStatus);

    const requiresSpouseDetails = ["Married", "Divorced", "Widower"].includes(targetMaritalStatus);

    if (requiresSpouseDetails) {
        console.log(`ℹ️ Marital status is ${targetMaritalStatus}, filling spouse details...`);
        await fillWifesName(driver, "priya sharma");
        await fillAgeAtMarriage(driver, "22");
    } else {
        console.log(`ℹ️ Marital status is ${targetMaritalStatus}, skipping Wife's Name and Age At Marriage.`);
    }

    await fillFatherName(driver, "Ram Sharma");
    await fillMotherName(driver, "Sunita Sharma");
    await selectCommunity(driver, "General");
    await selectReligion(driver, "Hindu");

    console.log("✅ Head of Family form filled successfully!");
    await submitFinalForm(driver);
}

module.exports = {
    fillHeadOfFamilyFormWithExamples
};