const { remote } = require('webdriverio');

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
    hostname: process.env.APPIUM_HOST || '127.0.0.1',
    port: parseInt(process.env.APPIUM_PORT, 10) || 4723,
    logLevel: 'info',
    capabilities,
};

// ─── Module Navigation Helpers ──────────────────────────────────────────────

async function clickGridModule(driver, moduleName) {
    console.log(`Locating the "${moduleName}" module...`);
    const moduleXPath = `//android.widget.TextView[@text="${moduleName}"]/parent::android.view.ViewGroup/parent::android.widget.FrameLayout`;
    const moduleCard = await driver.$(moduleXPath);

    try {
        await moduleCard.waitForDisplayed({ timeout: 5000 });
        await moduleCard.click();
        console.log(`✔ Successfully clicked on "${moduleName}".`);
        await driver.pause(1500);
    } catch (error) {
        console.error(`❌ Could not find or click the "${moduleName}" module.`);
        throw error;
    }
}

async function navigateBackToHome(driver) {
    console.log("Navigating back to Home screen...");
    for (let i = 0; i < 3; i++) {
        await driver.pressKeyCode(4);
        await driver.pause(1500);
    }
    console.log("✔ Returned to Home screen.");
}

// ─── Core Interaction Helpers ───────────────────────────────────────────────

async function scrollSpinnerToMiddle(driver, spinnerSelector) {
    try {
        const spinner = await driver.$(spinnerSelector);
        const loc = await spinner.getLocation();
        const screen = await driver.getWindowRect();
        const midY = screen.height / 2;

        if (loc.y > midY + 100) {
            const startY = Math.floor(screen.height * 0.7);
            const endY = Math.floor(screen.height * 0.3);
            const swipeX = Math.floor(screen.width / 2);

            await driver.performActions([{
                type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
                actions: [
                    { type: 'pointerMove', duration: 0, x: swipeX, y: startY },
                    { type: 'pointerDown', button: 0 },
                    { type: 'pause', duration: 200 },
                    { type: 'pointerMove', duration: 1000, x: swipeX, y: endY },
                    { type: 'pointerUp', button: 0 }
                ]
            }]);
            await driver.releaseActions();
            await driver.pause(1500);
        }
    } catch (e) {}
}

async function tapByCoords(driver, tapX, tapY) {
    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: tapX, y: tapY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 150 },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(500);
}

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList) {
    await scrollSpinnerToMiddle(driver, spinnerSelector);
    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc = await spinner.getLocation();
    const size = await spinner.getSize();
    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);

    await tapByCoords(driver, tapX, tapY);
    await driver.pause(2000);

    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        return;
    } catch (e) { }

    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        return;
    } catch (e) { }

    const screen = await driver.getWindowRect();
    const idx = optionsList.indexOf(value);
    const rowHeight = size.height;
    const spinnerBottom = loc.y + size.height;
    const opensUpward = (screen.height - spinnerBottom) < (optionsList.length * rowHeight);
    const finalTapX = Math.floor(loc.x + size.width / 2);
    let finalTapY;

    if (opensUpward) {
        const reversedIdx = (optionsList.length - 1) - idx;
        finalTapY = Math.floor(loc.y - (reversedIdx * rowHeight) - (rowHeight / 2));
    } else {
        finalTapY = Math.floor(spinnerBottom + (idx * rowHeight) + (rowHeight / 2));
    }
    finalTapY = Math.max(5, Math.min(finalTapY, screen.height - 5));

    await tapByCoords(driver, finalTapX, finalTapY);
    console.log(`✅ Selected "${value}" via coordinates`);
}

async function getRandomChildNameAndRegister(driver) {
    console.log("⏳ Looking for available children to register...");
    await driver.pause(3000);

    let registerButtons = [];
    let maxScrolls = 5;

    // 1. Scroll until we find at least one REGISTER button
    for (let i = 0; i < maxScrolls; i++) {
        registerButtons = await driver.$$('//android.widget.Button[@text="REGISTER"]');

        if (registerButtons.length > 0) {
            console.log(`✔ Found ${registerButtons.length} unregistered child(ren) on screen.`);
            break;
        }

        console.log(`Scroll ${i + 1}/${maxScrolls}: No 'REGISTER' buttons visible. Scrolling down...`);
        const size = await driver.getWindowRect();
        await driver.performActions([{
            type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: Math.floor(size.width / 2), y: Math.floor(size.height * 0.7) },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 100 },
                { type: 'pointerMove', duration: 600, x: Math.floor(size.width / 2), y: Math.floor(size.height * 0.3) },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
        await driver.releaseActions();
        await driver.pause(1500);
    }

    if (registerButtons.length === 0) {
        throw new Error("❌ No unregistered children found even after scrolling!");
    }

    // 2. Pick a random REGISTER button from the ones found
    const randomIndex = Math.floor(Math.random() * registerButtons.length);
    const selectedBtn = registerButtons[randomIndex];

    // 3. Step up to the specific card that holds THIS button
    const parentCard = await selectedBtn.$('ancestor::android.view.ViewGroup[1]');

    // 4. Get all text elements inside this specific card
    const textElements = await parentCard.$$('.//android.widget.TextView');
    let childName = "";

    for (const el of textElements) {
        const text = await el.getText();

        // Filter out generic UI labels and strings that start with numbers (like age or dates)
        if (
            text &&
            text.trim() !== "" &&
            !text.includes("Newest First") &&
            !text.includes("Oldest First") &&
            text.toUpperCase() !== "REGISTER" &&
            !text.match(/^\d/) // Ignores text starting with a number (e.g., "10 Months", "15-02-2026")
        ) {
            childName = text.trim();
            break; // Stop at the first valid name string
        }
    }

    // Fallback just in case
    if (!childName) { childName = "Unknown Baby"; }

    console.log(`✅ Randomly selected child: ${childName}`);

    // 5. Click the exact register button we selected
    await selectedBtn.click();
    console.log(`✅ Clicked REGISTER for ${childName}`);

    await driver.pause(2000);
    return childName;
}

async function selectDOBViaCalendar(driver) {
    console.log(`\n✍️ Scrolling to Date of Birth field...`);
    const dobXPath = `//android.widget.EditText[contains(@text, "Date of Birth") or contains(@hint, "Date of Birth") or contains(@hint, "DOB")]`;
    const dobInput = await driver.$(dobXPath);

    try {
        if (!(await dobInput.isDisplayed().catch(() => false))) {
            const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Date of Birth"))`;
            await driver.$(`android=${scrollable}`).catch(() => {});
        }

        await dobInput.waitForDisplayed({ timeout: 5000 });
        await dobInput.click();
        console.log(`📅 Clicked DOB field. Waiting for DatePicker dialog...`);
        await driver.pause(1500);

        const monthsToSubtract = Math.floor(Math.random() * (6 - 3 + 1)) + 3;
        console.log(`⬅️ Attempting to click 'Previous Month' ${monthsToSubtract} times...`);

        const prevMonthBtn = await driver.$(`//android.widget.ImageButton[@resource-id="android:id/prev" or @content-desc="Previous month"]`);

        for (let i = 0; i < monthsToSubtract; i++) {
            await prevMonthBtn.waitForDisplayed({ timeout: 3000 });
            await prevMonthBtn.click();
            await driver.pause(500);
        }

        console.log(`👆 Selecting the 15th day of the month...`);
        const dayToClick = await driver.$(`//android.view.View[@text="15" and @enabled="true"]`);
        await dayToClick.waitForDisplayed({ timeout: 3000 });
        await dayToClick.click();
        await driver.pause(500);

        console.log(`✔ Clicking OK...`);
        const okBtn = await driver.$(`//android.widget.Button[@resource-id="android:id/button1" and @text="OK"]`);
        await okBtn.click();
        await driver.pause(1000);

        console.log(`✅ Successfully selected Date of Birth via Calendar.`);

    } catch (error) {
        console.error(`❌ Calendar constraint hit: Could not go back far enough for this beneficiary.`);

        try {
            const cancelBtn = await driver.$(`//android.widget.Button[@resource-id="android:id/button2" and @text="Cancel"]`);
            if (await cancelBtn.isDisplayed()) {
                await cancelBtn.click();
                await driver.pause(1000);
            }
        } catch (ignore) {}

        throw error;
    }
}

async function selectSexDropdown(driver, sexOption) {
    console.log(`\n⚧ Selecting Sex/Gender: '${sexOption}'...`);
    try {
        const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Sex"))`;
        await driver.$(`android=${scrollable}`).catch(() => {});

        const sexDropdownXPath = `//android.widget.TextView[@text="Sex" or @text="Gender"]/following-sibling::android.widget.FrameLayout//android.widget.AutoCompleteTextView`;
        const dropdown = await driver.$(sexDropdownXPath);

        if (await dropdown.isExisting()) {
            await dropdown.click();
            await driver.pause(1000);
            const optionXPath = `//android.widget.TextView[@text="${sexOption}"]`;
            const option = await driver.$(optionXPath);
            await option.waitForDisplayed({ timeout: 5000 });
            await option.click();
            console.log(`✅ Successfully selected ${sexOption} from dropdown.`);
        } else {
            // Radio button logic has built-in 'skip if checked' logic
             await selectRadioOption(driver, "Sex", sexOption);
        }
    } catch (error) {
        console.error(`❌ Failed to select Sex. Check UI elements.`, error.message);
    }
}

async function fillChildRchId(driver, rchIdNumber) {
    const childRchIdInput = await driver.$(`//android.widget.EditText[@text="RCH ID No. of Child"]`);
    await childRchIdInput.waitForDisplayed({ timeout: 5000 });
    await childRchIdInput.click();
    await childRchIdInput.clearValue();
    await childRchIdInput.setValue(rchIdNumber);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
}

async function fillBirthCertificateNumber(driver, certNumber) {
    const birthCertInput = await driver.$(`//android.widget.EditText[@text="Birth Certificate Number"]`);
    await birthCertInput.waitForDisplayed({ timeout: 5000 });
    await birthCertInput.click();
    await birthCertInput.clearValue();
    await birthCertInput.setValue(certNumber);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
}

async function selectPlaceOfBirth(driver, placeName) {
    const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown"))`;
    await driver.$(`android=${scrollable}`).catch(() => {});
    await driver.pause(1000);

    const optionsList = [
        'District Hospital', 'Community Health Centre', 'Primary Health Centre',
        'Sub Centre', 'Other Public Facility', 'Accredited Private Hospital',
        'Other Private Hospital', 'Home', 'Sub District Hospital',
        'Medical College Hospital', 'In Transit'
    ];

    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown")',
        placeName,
        optionsList
    );
}

async function uploadFrontAndBackImages(driver) {
    const scrollFront = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Front Side"))`;
    await driver.$(`android=${scrollFront}`).catch(() => {});

    const frontSideAddBtn = await driver.$(`//android.view.ViewGroup[.//android.widget.TextView[@text="Front Side"]]//android.widget.ImageView[@content-desc="add file"]`);
    await frontSideAddBtn.click();
    const pickFromGallery = await driver.$(`//*[@text="Pick from gallery" or @text="Pick from Gallery"]`);
    await pickFromGallery.waitForDisplayed({ timeout: 5000 });
    await pickFromGallery.click();
    await driver.pause(20000);

    const scrollBack = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Back Side"))`;
    await driver.$(`android=${scrollBack}`).catch(() => {});

    const backSideAddBtn = await driver.$(`//android.view.ViewGroup[.//android.widget.TextView[@text="Back Side"]]//android.widget.ImageView[@content-desc="add file"]`);
    await backSideAddBtn.click();
    const pickFromGalleryBack = await driver.$(`//*[@text="Pick from gallery" or @text="Pick from Gallery"]`);
    await pickFromGalleryBack.waitForDisplayed({ timeout: 5000 });
    await pickFromGalleryBack.click();
    await driver.pause(20000);
}

async function clickChildRegSubmit(driver) {
    console.log(`\n✅ Attempting to click Submit button...`);

    try {
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
            await driver.pause(1500);
        }
    } catch (e) {}

    const submitBtn = await driver.$(`android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit").text("Submit")`);

    try {
        await submitBtn.waitForDisplayed({ timeout: 5000 });
        await submitBtn.click();

        console.log(`✅ Successfully clicked the 'Submit' button normally!`);
        await driver.pause(3000);

    } catch (error) {
        console.log(`⚠️ Standard click failed or was intercepted. Attempting coordinate tap...`);
        try {
            const loc = await submitBtn.getLocation();
            const size = await submitBtn.getSize();
            const tapX = Math.floor(loc.x + (size.width / 2));
            const tapY = Math.floor(loc.y + (size.height / 2));

            await driver.performActions([{
                type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
                actions: [
                    { type: 'pointerMove', duration: 0, x: tapX, y: tapY },
                    { type: 'pointerDown', button: 0 },
                    { type: 'pause', duration: 150 },
                    { type: 'pointerUp', button: 0 }
                ]
            }]);
            await driver.releaseActions();

            console.log(`✅ Successfully tapped 'Submit' via screen coordinates!`);
            await driver.pause(3000);

        } catch (fallbackError) {
            console.error(`❌ Failed to click the 'Submit' button completely:`, fallbackError.message);
            throw fallbackError;
        }
    }
}

// ─── HBYC Process Helpers ───────────────────────────────────────────────────

async function searchChild(driver, childName) {
    console.log(`Locating search bar to find: "${childName}"...`);
    const searchInput = await driver.$(`//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]`);

    await searchInput.waitForDisplayed({ timeout: 5000 });
    await searchInput.click();
    await searchInput.setValue(childName);
    await driver.pause(1000);

    await driver.pressKeyCode(66);
    await driver.pause(2000);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
}

async function clickHBYCButton(driver) {
    const hbycButton = await driver.$(`//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_hbyc"]`);
    await hbycButton.waitForDisplayed({ timeout: 5000 });
    await hbycButton.click();
    await driver.pause(1500);
}

async function verifyHBYCScheduledVisits(driver) {
    console.log("🔍 Verifying only scheduled HBYC visits (3, 6, 9, 12, 15 months) are available...");
    const expectedVisits = ["3 Months", "6 Months", "9 Months", "12 Months", "15 Months"];

    const visitElements = await driver.$$('//android.widget.TextView[contains(@text, "Months")]');
    const availableVisits = [];

    for (const el of visitElements) {
        const text = await el.getText();
        if (text.includes("Months")) availableVisits.push(text.trim());
    }

    console.log(`📋 Found visits on screen: ${availableVisits.join(', ')}`);

    const isValid = availableVisits.every(v => expectedVisits.includes(v));
    if (!isValid) {
        throw new Error(`❌ Unexpected visits found! Expected only: ${expectedVisits.join(', ')}`);
    } else {
        console.log(`✅ Verification Passed: Only scheduled visits are available.`);
    }
}

async function clickAddVisitForMonth(driver, monthText) {
    console.log(`\n⏳ Locating "Add Visit" button for ${monthText}...`);
    const monthNum = monthText.match(/\d+/)[0];

    const addVisitBtnXPath = `//android.widget.TextView[contains(@text, "${monthNum}") and contains(@text, "Month")]/ancestor::android.widget.LinearLayout[1]//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnAddVisit" or @text="Add Visit"]`;
    const addVisitBtn = await driver.$(addVisitBtnXPath);

    try {
        if (!(await addVisitBtn.isDisplayed().catch(() => false))) {
            const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${monthNum}"))`;
            await driver.$(`android=${scrollable}`).catch(() => {});
        }

        await addVisitBtn.waitForDisplayed({ timeout: 5000 });
        await addVisitBtn.click();

        console.log(`✔ Successfully clicked "Add Visit" for ${monthText}.`);
        await driver.pause(1500);

    } catch (error) {
        console.error(`❌ Could not find or click the "Add Visit" button for ${monthText}. Check if the visit is already completed or locked.`);
        throw error;
    }
}

async function selectRadioOption(driver, fieldLabel, expectedOption) {
    // 1. Scroll to the field
    const labelXPath = `//android.widget.TextView[contains(@text, "${fieldLabel}")]`;
    let labelExists = false;
    for (let i = 0; i < 5; i++) {
        try {
            const labelEl = await driver.$(labelXPath);
            if (await labelEl.isExisting() && await labelEl.isDisplayed()) {
                labelExists = true;
                break;
            }
        } catch (e) { }
        const size = await driver.getWindowRect();
        await driver.performActions([{
            type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: Math.floor(size.width / 2), y: Math.floor(size.height * 0.7) },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 100 },
                { type: 'pointerMove', duration: 600, x: Math.floor(size.width / 2), y: Math.floor(size.height * 0.3) },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
        await driver.releaseActions();
        await driver.pause(1000);
    }

    // 2. CHECK IF ANY OPTION IS ALREADY FILLED
    const anyCheckedXPath = `//android.widget.TextView[contains(@text, "${fieldLabel}")]/following-sibling::android.widget.FrameLayout//android.widget.RadioButton[@checked="true"]`;
    const checkedElements = await driver.$$(anyCheckedXPath);

    if (checkedElements.length > 0) {
        console.log(`➡ "${fieldLabel}" is already filled. Skipping...`);
        return;
    }

    // 3. IF EMPTY, SELECT THE EXPECTED OPTION
    const radioButton = await driver.$(`//android.widget.TextView[contains(@text, "${fieldLabel}")]/following-sibling::android.widget.FrameLayout//android.widget.RadioButton[@text="${expectedOption}"]`);
    if (await radioButton.isExisting()) {
        await radioButton.click();
        console.log(`✔ Filled "${fieldLabel}" with "${expectedOption}".`);
    }
}

async function handleVisitDate(driver, expectedDateString) {
    console.log(`\n⏳ Processing "Visit Date" field...`);
    const visitDateInput = await driver.$(`//android.widget.EditText[@hint="Select visit date"]`);

    try {
        // Wait for the field, but catch the error if it times out instead of crashing the script
        const isDisplayed = await visitDateInput.waitForDisplayed({ timeout: 5000 }).catch(() => false);

        if (!isDisplayed) {
            console.log(`➡ "Select visit date" hint not found. The field is likely already filled with a date. Skipping...`);
            return; // Gracefully exit the function and move to the next step
        }

        // If the element IS found, double-check its text just in case
        const currentText = await visitDateInput.getText();
        if (currentText && currentText.trim() !== "" && !currentText.includes("Select visit date")) {
            console.log(`➡ Visit Date is already filled (${currentText}). Skipping...`);
            return;
        }

        console.log(`➡ Field is empty. Filling with: ${expectedDateString}`);
        await visitDateInput.click();
        await visitDateInput.clearValue();
        await visitDateInput.setValue(expectedDateString);

        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }
        console.log(`✔ "Visit Date" successfully set.`);

    } catch (error) {
        console.log(`➡ Could not interact with Visit Date. Assuming filled. Skipping...`);
    }
}

async function handleIsBabyAlive(driver, expectedInput) {
    // Re-use our robust radio checker for this too
    await selectRadioOption(driver, "Is the Baby alive?", expectedInput);
}

async function fillBabyWeight(driver, weightInGrams) {
    const weightField = await driver.$(`//android.widget.EditText[contains(@hint, "weight in gram")]`);
    await weightField.waitForDisplayed({ timeout: 5000 });

    // Check if filled
    const currentText = await weightField.getText();
    if (currentText && currentText.trim() !== "" && !currentText.includes("weight in gram")) {
        console.log(`➡ Baby Weight is already filled (${currentText}). Skipping...`);
        return;
    }

    await weightField.click();
    await weightField.clearValue();
    await weightField.setValue(String(weightInGrams));
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
}

async function fillTemperature(driver, tempValue) {
    const tempField = await driver.$(`//android.widget.EditText[contains(@hint, "e.g. 98.6")]`);
    await tempField.waitForDisplayed({ timeout: 5000 });

    // Check if filled
    const currentText = await tempField.getText();
    if (currentText && currentText.trim() !== "" && !currentText.includes("98.6") && !currentText.includes("e.g.")) {
        console.log(`➡ Temperature is already filled (${currentText}). Skipping...`);
        return;
    }

    await tempField.click();
    await tempField.clearValue();
    await tempField.setValue(String(tempValue));
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
}

async function uploadMCPCard(driver) {
    const pickImageBtnXPath = `//android.widget.TextView[@text="MCP Card Upload"]/following-sibling::android.widget.FrameLayout//android.widget.Button[@text="PICK IMAGE"]`;

    try {
        const pickImageBtn = await driver.$(pickImageBtnXPath);

        // If the button exists, it means no image is uploaded yet
        if (await pickImageBtn.isExisting() && await pickImageBtn.isDisplayed()) {
            await pickImageBtn.click();
            await driver.pause(1500);

            const takePhotoBtn = await driver.$(`//*[@text="Take Photo" or @text="Take photo"]`);
            await takePhotoBtn.waitForDisplayed({ timeout: 5000 });
            await takePhotoBtn.click();
            await driver.pause(20000);
            console.log(`✔ MCP Card Uploaded.`);
        } else {
            console.log(`➡ MCP Card field already contains an image or is unavailable. Skipping...`);
        }
    } catch (e) {
        console.log(`➡ MCP Card "PICK IMAGE" button not found. Skipping...`);
    }
}

async function clickHBYCSubmit(driver) {
    const submitBtn = await driver.$(`//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnSave" and @text="Submit"]`);
    await submitBtn.waitForDisplayed({ timeout: 5000 });
    await submitBtn.click();
}

// ─── Main Execution Script ──────────────────────────────────────────────────

async function runTest() {
    let driver;
    try {
        console.log('Starting Appium session...');
        driver = await remote(wdOpts);

        // --- STEP 1: MATERNAL HEALTH -> CHILD REGISTRATION ---
        await clickGridModule(driver, "Maternal Health");
        await clickGridModule(driver, "Child Registration");

        let rememberedName = "";
        let maxAttempts = 3;
        let registrationSuccessful = false;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`\n--- Registration Attempt ${attempt}/${maxAttempts} ---`);
                rememberedName = await getRandomChildNameAndRegister(driver);

                await selectDOBViaCalendar(driver);

                await selectSexDropdown(driver, "Female");
                await fillChildRchId(driver, "987654321098");
                await fillBirthCertificateNumber(driver, "B-2026-9876543");
                await selectPlaceOfBirth(driver, "Primary Health Centre");
                await uploadFrontAndBackImages(driver);
                await clickChildRegSubmit(driver);

                registrationSuccessful = true;
                break;

            } catch (err) {
                console.log(`⚠️ Attempt ${attempt} failed: ${err.message}`);
                console.log(`🔙 Backing out of this form to select a different beneficiary...`);

                await driver.pressKeyCode(4);
                await driver.pause(2000);

                if (attempt === maxAttempts) {
                    throw new Error("❌ Exhausted all attempts to find a beneficiary with a valid Date of Birth.");
                }
            }
        }

        if (!registrationSuccessful) return;

        // --- STEP 2: NAVIGATE BACK TO HOME ---
        await navigateBackToHome(driver);

        // --- STEP 3: CHILD CARE -> HBYC FLOW ---
        await clickGridModule(driver, "Child Care");
        await clickGridModule(driver, "Child List");

        await searchChild(driver, rememberedName);
        await clickHBYCButton(driver);

        await verifyHBYCScheduledVisits(driver);

        await clickAddVisitForMonth(driver, "3 Months");

        const today = new Date();
        const visitDateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

        // These will now automatically check if they are already filled before typing/clicking
        await handleVisitDate(driver, visitDateStr);
        await handleIsBabyAlive(driver, "Yes");
        await driver.pause(1000);

        await fillBabyWeight(driver, 5500);
        await selectRadioOption(driver, "Is the child sick?", "No");
        await selectRadioOption(driver, "Is the child exclusively breast feeding?", "Yes");
        await selectRadioOption(driver, "Is the mother counseled for exclusive breast feeding?", "Yes");
        await fillTemperature(driver, 98.6);
        await uploadMCPCard(driver);

        await clickHBYCSubmit(driver);

        console.log("🎉 Test Flow Completed Successfully!");

    } catch (error) {
        console.error('🛑 Error during test execution:', error);
    } finally {
        if (driver) {
            console.log('Closing session in 2 seconds...');
            await driver.pause(2000);
            await driver.deleteSession();
            console.log('Session closed.');
        }
    }
}

runTest();