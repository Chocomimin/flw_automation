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
    } catch (e) {
        console.log('⚠️ scrollSpinnerToMiddle skipped:', e.message);
    }
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

async function selectRadioOption(driver, fieldLabel, expectedOption) {
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
    const radioButton = await driver.$(`//android.widget.TextView[contains(@text, "${fieldLabel}")]/following-sibling::android.widget.FrameLayout//android.widget.RadioButton[@text="${expectedOption}"]`);
    if (await radioButton.isExisting()) await radioButton.click();
}

// ─── Child Registration Form Helpers ─────────────────────────────────────────

async function getRandomChildNameAndRegister(driver) {
    console.log("⏳ Looking for available children to register...");
    await driver.pause(3000);

    let cards = [];
    let maxScrolls = 5;

    for (let i = 0; i < maxScrolls; i++) {
        cards = await driver.$$('//android.view.ViewGroup[.//android.widget.Button[@text="REGISTER"]]');

        if (cards.length > 0) {
            console.log(`✔ Found ${cards.length} unregistered child(ren) on screen.`);
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

    if (cards.length === 0) {
        throw new Error("❌ No unregistered children found even after scrolling!");
    }

    const randomIndex = Math.floor(Math.random() * cards.length);
    const selectedCard = cards[randomIndex];

    const nameElement = await selectedCard.$('.//android.widget.TextView[1]');
    const childName = await nameElement.getText();
    console.log(`✅ Randomly selected child: ${childName}`);

    const registerBtn = await selectedCard.$('.//android.widget.Button[@text="REGISTER"]');
    await registerBtn.click();
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
        console.log(`⬅️ Clicking 'Previous Month' ${monthsToSubtract} times...`);

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
        console.error(`❌ Failed to interact with the Calendar:`, error.message);
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

    // 1. Hide the keyboard if it's blocking the submit button
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
    }

    // 2. Locate the button using both resource-id and text from your XML
    const submitXPath = `//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit" and @text="Submit"]`;
    const submitBtn = await driver.$(submitXPath);

    try {
        // 3. Wait for it to be visible and click
        await submitBtn.waitForDisplayed({ timeout: 5000 });
        await submitBtn.click();

        console.log(`✅ Successfully clicked the 'Submit' button!`);
        await driver.pause(3000); // Give the app time to process the submission and load the next screen

    } catch (error) {
        console.error(`❌ Failed to click the 'Submit' button. Check if it's visible on screen:`, error.message);
        throw error; // Rethrow to stop the test if submission fails
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

    // Extract just the number (e.g., "3" from "3 Months") to avoid exact-spacing typos
    const monthNum = monthText.match(/\d+/)[0];

    // Find the text containing '3' and 'Month', climb up to its containing LinearLayout,
    // then find the Button with the exact resource-id you provided inside that layout.
    const addVisitBtnXPath = `//android.widget.TextView[contains(@text, "${monthNum}") and contains(@text, "Month")]/ancestor::android.widget.LinearLayout[1]//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnAddVisit" or @text="Add Visit"]`;

    const addVisitBtn = await driver.$(addVisitBtnXPath);

    try {
        // Scroll into view if it's hidden further down the screen
        if (!(await addVisitBtn.isDisplayed().catch(() => false))) {
            const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${monthNum}"))`;
            await driver.$(`android=${scrollable}`).catch(() => {});
        }

        await addVisitBtn.waitForDisplayed({ timeout: 5000 });
        await addVisitBtn.click();

        console.log(`✔ Successfully clicked "Add Visit" for ${monthText}.`);
        await driver.pause(1500); // Wait for the HBYC form to open

    } catch (error) {
        console.error(`❌ Could not find or click the "Add Visit" button for ${monthText}. Check if the visit is already completed or locked.`);
        throw error; // Rethrow to stop the test
    }
}

async function handleVisitDate(driver, expectedDateString) {
    const visitDateInput = await driver.$(`//android.widget.EditText[@hint="Select visit date"]`);
    await visitDateInput.waitForDisplayed({ timeout: 5000 });
    await visitDateInput.click();
    await visitDateInput.clearValue();
    await visitDateInput.setValue(expectedDateString);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
}

async function handleIsBabyAlive(driver, expectedInput) {
    const targetOption = expectedInput.toLowerCase() === 'no' ? 'No' : 'Yes';
    const radioButton = await driver.$(`//android.widget.TextView[contains(@text, "Is the Baby alive?")]/following-sibling::android.widget.FrameLayout//android.widget.RadioButton[@text="${targetOption}"]`);
    await radioButton.waitForDisplayed({ timeout: 5000 });
    const isChecked = await radioButton.getAttribute('checked');
    if (isChecked !== 'true') await radioButton.click();
}

async function fillBabyWeight(driver, weightInGrams) {
    const weightField = await driver.$(`//android.widget.EditText[contains(@hint, "weight in gram")]`);
    await weightField.waitForDisplayed({ timeout: 5000 });
    await weightField.click();
    await weightField.clearValue();
    await weightField.setValue(String(weightInGrams));
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
}

async function fillTemperature(driver, tempValue) {
    const tempField = await driver.$(`//android.widget.EditText[contains(@hint, "e.g. 98.6")]`);
    await tempField.waitForDisplayed({ timeout: 5000 });
    await tempField.click();
    await tempField.clearValue();
    await tempField.setValue(String(tempValue));
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
}

async function uploadMCPCard(driver) {
    const pickImageBtn = await driver.$(`//android.widget.TextView[@text="MCP Card Upload"]/following-sibling::android.widget.FrameLayout//android.widget.Button[@text="PICK IMAGE"]`);
    await pickImageBtn.waitForDisplayed({ timeout: 5000 });
    await pickImageBtn.click();
    await driver.pause(1500);

    const takePhotoBtn = await driver.$(`//*[@text="Take Photo" or @text="Take photo"]`);
    await takePhotoBtn.waitForDisplayed({ timeout: 5000 });
    await takePhotoBtn.click();
    await driver.pause(20000);
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

        const rememberedName = await getRandomChildNameAndRegister(driver);

        // Use the native Android Calendar to select DOB and fill Sex
        await selectDOBViaCalendar(driver);
        await selectSexDropdown(driver, "Female");

        await fillChildRchId(driver, "987654321098");
        await fillBirthCertificateNumber(driver, "B-2026-9876543");
        await selectPlaceOfBirth(driver, "Primary Health Centre");
        await uploadFrontAndBackImages(driver);
        await clickChildRegSubmit(driver);

        // --- STEP 2: NAVIGATE BACK TO HOME ---
        await navigateBackToHome(driver);

        // --- STEP 3: CHILD CARE -> HBYC FLOW ---
        await clickGridModule(driver, "Child Care");
        await clickGridModule(driver, "Child List");

        await searchChild(driver, rememberedName);
        await clickHBYCButton(driver);

        await verifyHBYCScheduledVisits(driver);

        // 3 Months visit logic
        await clickAddVisitForMonth(driver, "3 Months");

        // Use today's date for the visit date, assuming it's a recent HBYC visit check
        const today = new Date();
        const visitDateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
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