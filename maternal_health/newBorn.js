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
    hostname: process.env.APPIUM_HOST || 'localhost',
    port: parseInt(process.env.APPIUM_PORT, 10) || 4723,
    logLevel: 'error',
    capabilities,
};

async function clickNewbornRegistration(driver) {
    try {
        console.log("⏳ Looking for 'Newborn Registration' icon...");
        const newbornRegElement = await driver.$("//android.widget.TextView[@text='Newborn Registration']");
        await newbornRegElement.waitForDisplayed({ timeout: 5000 });
        await newbornRegElement.click();
        console.log("✅ Successfully clicked on 'Newborn Registration'");
    } catch (error) {
        console.error("❌ Failed to click on 'Newborn Registration':", error.message);
        throw error;
    }
}

async function scrollAndRegisterBaby(driver, targetName) {
    try {
        console.log(`⏳ Scrolling through the list to find '${targetName}'...`);

        const androidScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${targetName}")`;
        const nameElement = await driver.$(`android=${androidScrollSelector}`);

        await nameElement.waitForDisplayed({ timeout: 15000 });
        console.log(`✅ Found '${targetName}' on the screen!`);

        console.log(`⏳ Locating the specific REGISTER button for '${targetName}'...`);

        const specificRegisterButtonXPath = `//android.view.ViewGroup[.//android.widget.TextView[@text="${targetName}"]]//android.widget.Button[@text="REGISTER"]`;

        const registerButton = await driver.$(specificRegisterButtonXPath);
        await registerButton.waitForDisplayed({ timeout: 5000 });

        await registerButton.click();
        console.log(`✅ Successfully clicked the 'REGISTER' button for '${targetName}'`);

    } catch (error) {
        console.error(`❌ Failed during Scroll and Register for '${targetName}':`, error.message);
        throw error;
    }
}

// ─── BULLETPROOF RADIO BUTTON HANDLER ──────────────────────────────────────────
async function selectRadioOption(driver, questionText, answerText) {
    try {
        console.log(`⏳ Selecting '${answerText}' for '${questionText}'...`);

        // 1. Scroll the specific question into view first
        const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${questionText}"))`;
        await driver.$(`android=${scrollable}`).catch(() => {});

        // Wait a second for the scrolling animation to fully stop
        await driver.pause(1000);

        // 2. BULLETPROOF XPATH: Find the exact Question Text, navigate up to its specific container block, and find the Radio Button inside THAT block only.
        const radioButtonXPath = `//android.widget.TextView[contains(@text, "${questionText}")]/ancestor::android.widget.LinearLayout[.//android.widget.RadioGroup][1]//android.widget.RadioButton[@text="${answerText}"]`;

        const radioButton = await driver.$(radioButtonXPath);
        await radioButton.waitForDisplayed({ timeout: 5000 });

        // 3. Click the properly scoped radio button
        await radioButton.click();

        // 4. Brief pause to allow the app UI to generate dependent fields
        await driver.pause(1500);

        // 5. Verification step
        const isChecked = await radioButton.getAttribute("checked");
        if (String(isChecked) !== "true") {
             console.log(`⚠️ Warning: '${answerText}' did not register as checked. Trying a fallback click...`);
             await radioButton.click();
             await driver.pause(1500);
        }

        console.log(`✅ Successfully selected '${answerText}' for '${questionText}'.`);
    } catch (error) {
        console.error(`❌ Failed to select '${answerText}' for '${questionText}':`, error.message);
        throw error;
    }
}
// ──────────────────────────────────────────────────────────────────────────────

async function selectDefectByCoordinates(driver, defectName) {
    const coordinatesMap = {
        "Cleft Lip / Cleft Palate": { x: 540, y: 1550 },
        "Club Foot": { x: 540, y: 1650 },
        "Down's Syndrome": { x: 540, y: 1750 },
        "Hydrocephalus": { x: 540, y: 1850 },
        "Imperforate Anus": { x: 540, y: 1950 },
        "Neural Tube Defect (Spinal Bifida)": { x: 540, y: 2050 },
        "Other": { x: 540, y: 2150 }
    };

    try {
        if (!coordinatesMap[defectName]) {
            throw new Error(`Defect '${defectName}' not found in the coordinates map.`);
        }

        const targetCoords = coordinatesMap[defectName];
        console.log(`⏳ Opening the 'Defect seen at birth' dropdown...`);

        const dropdownIcon = await driver.$('//android.widget.ImageButton[@content-desc="Show dropdown menu"]');
        await dropdownIcon.waitForDisplayed({ timeout: 5000 });
        await dropdownIcon.click();

        console.log(`⏳ Waiting for dropdown menu to appear...`);
        await driver.pause(1500);

        console.log(`👇 Tapping '${defectName}' at coordinates (X: ${targetCoords.x}, Y: ${targetCoords.y})...`);

        await driver.action('pointer')
            .move({ x: targetCoords.x, y: targetCoords.y })
            .down()
            .pause(100)
            .up()
            .perform();

        console.log(`✅ Successfully selected '${defectName}'.`);
    } catch (error) {
        console.error(`❌ Failed to select defect using coordinates:`, error.message);
        throw error;
    }
}

async function fillBirthWeight(driver, weightInGrams) {
    try {
        console.log(`⏳ Entering Birth Weight: ${weightInGrams} grams...`);

        // 1. Scroll down to ensure the weight field is visible
        const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Weight at Birth"))`;
        await driver.$(`android=${scrollable}`).catch(() => {});
        await driver.pause(1000);

        // 2. Find the input field using its hint text
        const weightInput = await driver.$('//android.widget.EditText[contains(@hint, "Weight at Birth")]');

        await weightInput.waitForDisplayed({ timeout: 5000 });

        // 3. Clear any existing value and set the new weight
        await weightInput.click();
        await weightInput.clearValue();
        await weightInput.setValue(weightInGrams);

        // 4. Hide the keyboard so it doesn't block other elements
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }

        console.log(`✅ Successfully entered Birth Weight: ${weightInGrams}`);
        await driver.pause(1000); // Brief pause before moving to the next element

    } catch (error) {
        console.error(`❌ Failed to enter Birth Weight:`, error.message);
        throw error;
    }
}

async function addDischargeSummaries(driver) {
    try {
        console.log("📝 Adding Delivery Discharge Summaries...");

        for (let i = 1; i <= 4; i++) {
            const summaryTitle = `Delivery Discharge Summary ${i}`;
            console.log(`\n⏳ Processing '${summaryTitle}'...`);

            // 1. Scroll down until the specific summary block is visible
            const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${summaryTitle}"))`;
            await driver.$(`android=${scrollable}`).catch(() => {});
            await driver.pause(1000); // Allow UI to settle

            // 2. Locate the "add file" button associated with this specific summary title
            const addFileBtnXPath = `//android.view.ViewGroup[.//android.widget.TextView[@text="${summaryTitle}"]]//android.widget.ImageView[@content-desc="add file"]`;
            const addFileBtn = await driver.$(addFileBtnXPath);

            await addFileBtn.waitForDisplayed({ timeout: 5000 });
            await addFileBtn.click();
            console.log(`✅ Clicked 'add file' for ${summaryTitle}`);

            // 3. Wait for the popup to appear and click "Pick from Gallery"
            const pickFromGalleryBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btnGallery")');
            await pickFromGalleryBtn.waitForDisplayed({ timeout: 5000 });
            await pickFromGalleryBtn.click();
            console.log(`✅ Clicked 'Pick from Gallery'`);

            // 4. Wait 20 seconds for manual selection
            console.log("⏳ You have 20 seconds to manually pick the file from the gallery...");
            await driver.pause(20000);

            console.log(`✅ Finished processing ${summaryTitle}`);
        }

        console.log("\n🎉 All 4 Delivery Discharge Summaries processed!");
    } catch (error) {
        console.error(`❌ Failed while adding Discharge Summaries:`, error.message);
        throw error;
    }
}

async function clickSubmitButton(driver) {
    try {
        console.log("⏳ Scrolling down to find the 'Submit' button...");

        // 1. Scroll the specific Submit button into view
        const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"))`;
        await driver.$(`android=${scrollable}`).catch(() => {});
        await driver.pause(1000); // Allow UI to settle

        // 2. Locate the Submit button using its resource ID
        const submitBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit")');

        await submitBtn.waitForDisplayed({ timeout: 5000 });

        // 3. Click the Submit button
        await submitBtn.click();

        console.log("✅ Successfully clicked the 'Submit' button!");
        await driver.pause(2000); // Pause to allow the next screen to load

    } catch (error) {
        console.error(`❌ Failed to click the 'Submit' button:`, error.message);
        throw error;
    }
}
async function runTest() {
    let driver;
    try {
        console.log("🚀 Starting Test Flow...");
        driver = await remote(wdOpts);

        await clickNewbornRegistration(driver);
        await driver.pause(3000);
        await scrollAndRegisterBaby(driver, "1st baby of RUKSAR");

        // Dynamic form inputs
        await selectRadioOption(driver, "Was Corticosteroid Inj", "Yes");
        await selectRadioOption(driver, "Sex of Infant", "Female");

        const didBabyCry = "No";
        await selectRadioOption(driver, "Baby Cried Immediately", didBabyCry);

        if (didBabyCry === "No") {
            await selectRadioOption(driver, "Resuscitation Done", "Yes");
        }

        await selectRadioOption(driver, "Any birth defect seen", "Yes");
        await driver.pause(2000);
        await selectDefectByCoordinates(driver, "Hydrocephalus");

        await fillBirthWeight(driver, "3200");

        await selectRadioOption(driver, "Breast feeding started within 1 hour", "Yes");

        await selectRadioOption(driver, "Is the Baby admitted to the SNCU", "Yes");

        // The file upload loop we added previously
        await addDischargeSummaries(driver);

        // ---> Add the submit function here
        await clickSubmitButton(driver);

        console.log("🎉 Test Flow Completed Successfully!");

    } catch (error) {
        console.error("🛑 Test execution stopped due to an error:", error.message);
    } finally {
        if (driver) {
            await driver.deleteSession();
            console.log("🔌 Appium session closed.");
        }
    }
}
runTest();