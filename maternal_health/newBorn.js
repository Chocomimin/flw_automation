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

/**
 * Clicks on the "Newborn Registration" option in the grid view.
 */
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

/**
 * Types the target name into the search bar, waits for the list to filter,
 * and clicks the specific REGISTER button for that card.
 */
/**
 * Scrolls down the list until it finds the target baby's name,
 * then clicks their specific Register button.
 */
async function scrollAndRegisterBaby(driver, targetName) {
    try {
        console.log(`⏳ Scrolling through the list to find '${targetName}'...`);

        // 1. Tell Android's UIAutomator to scroll down automatically until the text is in view
        // Note: The list must be inside a scrollable view (like a RecyclerView) for this to work.
        const androidScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${targetName}")`;
        const nameElement = await driver.$(`android=${androidScrollSelector}`);

        // Wait for the text element to be fully displayed after scrolling
        await nameElement.waitForDisplayed({ timeout: 15000 });
        console.log(`✅ Found '${targetName}' on the screen!`);

        console.log(`⏳ Locating the specific REGISTER button for '${targetName}'...`);

        // 2. Locate the Register button linked to the parent ViewGroup containing the target text
        const specificRegisterButtonXPath = `//android.view.ViewGroup[.//android.widget.TextView[@text="${targetName}"]]//android.widget.Button[@text="REGISTER"]`;

        const registerButton = await driver.$(specificRegisterButtonXPath);
        await registerButton.waitForDisplayed({ timeout: 5000 });

        // 3. Click the register button
        await registerButton.click();
        console.log(`✅ Successfully clicked the 'REGISTER' button for '${targetName}'`);

    } catch (error) {
        console.error(`❌ Failed during Scroll and Register for '${targetName}':`, error.message);
        throw error;
    }
}
/**
 * Selects 'Yes' or 'No' for the "Was Corticosteroid Inj. given?" question.
 * @param {object} driver - The Appium driver instance
 * @param {string} answer - "Yes" or "No"
 */
async function selectCorticosteroidInjection(driver, answer) {
    try {
        console.log(`⏳ Selecting '${answer}' for Corticosteroid Injection...`);

        // This XPath finds the specific question, then goes to its parent layout,
        // and finally finds the RadioButton with your desired answer.
        const radioButtonXPath = `//android.widget.LinearLayout[.//android.widget.TextView[@text="Was Corticosteroid Inj. given?"]]//android.widget.RadioButton[@text="${answer}"]`;

        const radioButton = await driver.$(radioButtonXPath);

        // Wait for the radio button to be displayed and clickable
        await radioButton.waitForDisplayed({ timeout: 5000 });
        await radioButton.click();

        console.log(`✅ Successfully selected '${answer}' for Corticosteroid Injection.`);
    } catch (error) {
        console.error(`❌ Failed to select '${answer}' for Corticosteroid Injection:`, error.message);
        throw error;
    }
}
/**
 * Selects the sex of the infant ("Male" or "Female").
 * @param {object} driver - The Appium driver instance
 * @param {string} sex - "Male" or "Female"
 */
async function selectInfantSex(driver, sex) {
    try {
        console.log(`⏳ Selecting '${sex}' for Sex of Infant...`);

        // Locate the parent LinearLayout containing the exact question, then find the specific RadioButton inside it
        const radioButtonXPath = `//android.widget.LinearLayout[.//android.widget.TextView[@text="Sex of Infant *"]]//android.widget.RadioButton[@text="${sex}"]`;

        const radioButton = await driver.$(radioButtonXPath);

        // Wait for it to be displayed and then click
        await radioButton.waitForDisplayed({ timeout: 5000 });
        await radioButton.click();

        console.log(`✅ Successfully selected '${sex}' for Sex of Infant.`);
    } catch (error) {
        console.error(`❌ Failed to select '${sex}' for Sex of Infant:`, error.message);
        throw error;
    }
}
/**
 * Selects 'Yes' or 'No' for the "Baby Cried Immediately after Birth" question.
 * @param {object} driver - The Appium driver instance
 * @param {string} answer - "Yes" or "No"
 */
async function selectBabyCried(driver, answer) {
    try {
        console.log(`⏳ Selecting '${answer}' for Baby Cried Immediately after Birth...`);

        // Locate the parent LinearLayout containing the exact question, then find the specific RadioButton inside it
        const radioButtonXPath = `//android.widget.LinearLayout[.//android.widget.TextView[@text="Baby Cried Immediately after Birth"]]//android.widget.RadioButton[@text="${answer}"]`;

        const radioButton = await driver.$(radioButtonXPath);

        // Wait for it to be displayed and then click
        await radioButton.waitForDisplayed({ timeout: 5000 });
        await radioButton.click();

        console.log(`✅ Successfully selected '${answer}' for Baby Cried Immediately after Birth.`);
    } catch (error) {
        console.error(`❌ Failed to select '${answer}' for Baby Cried Immediately after Birth:`, error.message);
        throw error;
    }
}
/**
 * Selects 'Yes' or 'No' for the "If No, Resuscitation Done *" question.
 * @param {object} driver - The Appium driver instance
 * @param {string} answer - "Yes" or "No"
 */
async function selectResuscitationDone(driver, answer) {
    try {
        console.log(`⏳ Selecting '${answer}' for Resuscitation Done...`);

        // Locate the parent LinearLayout containing the exact question, then find the specific RadioButton inside it
        const radioButtonXPath = `//android.widget.LinearLayout[.//android.widget.TextView[@text="If No, Resuscitation Done *"]]//android.widget.RadioButton[@text="${answer}"]`;

        const radioButton = await driver.$(radioButtonXPath);

        // Wait for it to be displayed and then click
        await radioButton.waitForDisplayed({ timeout: 5000 });
        await radioButton.click();

        console.log(`✅ Successfully selected '${answer}' for Resuscitation Done.`);
    } catch (error) {
        console.error(`❌ Failed to select '${answer}' for Resuscitation Done:`, error.message);
        throw error;
    }
}
/**
 * Selects 'Yes', 'No', or 'NA' for the "Any birth defect seen in at birth?" question.
 * @param {object} driver - The Appium driver instance
 * @param {string} answer - "Yes", "No", or "NA"
 */
async function selectBirthDefect(driver, answer) {
    try {
        console.log(`⏳ Selecting '${answer}' for Any birth defect seen in at birth...`);

        // Locate the parent layout containing the exact question, then find the specific RadioButton
        const radioButtonXPath = `//android.widget.LinearLayout[.//android.widget.TextView[@text="Any birth defect seen in at birth?"]]//android.widget.RadioButton[@text="${answer}"]`;

        const radioButton = await driver.$(radioButtonXPath);

        // Wait for it to be displayed and then click
        await radioButton.waitForDisplayed({ timeout: 5000 });
        await radioButton.click();

        console.log(`✅ Successfully selected '${answer}' for Any birth defect seen in at birth.`);
    } catch (error) {
        console.error(`❌ Failed to select '${answer}' for Any birth defect seen in at birth:`, error.message);
        throw error;
    }
}
/**
 * Opens the "Defect seen at birth" dropdown and selects an option using coordinates.
 * @param {object} driver - The Appium driver instance
 * @param {string} defectName - The name of the defect to select
 */
async function selectDefectByCoordinates(driver, defectName) {
    // Dictionary mapping each option to its approximate screen coordinates
    // Note: You may need to tweak the Y values slightly based on your exact device
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
        // 1. Check if the provided defect name exists in our map
        if (!coordinatesMap[defectName]) {
            throw new Error(`Defect '${defectName}' not found in the coordinates map.`);
        }

        const targetCoords = coordinatesMap[defectName];
        console.log(`⏳ Opening the 'Defect seen at birth' dropdown...`);

        // 2. Click the dropdown icon to expand the list
        const dropdownIcon = await driver.$('//android.widget.ImageButton[@content-desc="Show dropdown menu"]');
        await dropdownIcon.waitForDisplayed({ timeout: 5000 });
        await dropdownIcon.click();

        console.log(`⏳ Waiting for dropdown menu to appear...`);
        await driver.pause(1500); // Give the UI a moment to animate the dropdown opening

        console.log(`👇 Tapping '${defectName}' at coordinates (X: ${targetCoords.x}, Y: ${targetCoords.y})...`);

        // 3. Perform the tap action using the coordinates
        await driver.action('pointer')
            .move({ x: targetCoords.x, y: targetCoords.y })
            .down()
            .pause(100) // Brief pause to simulate a natural finger press
            .up()
            .perform();

        console.log(`✅ Successfully selected '${defectName}'.`);
    } catch (error) {
        console.error(`❌ Failed to select defect using coordinates:`, error.message);
        throw error;
    }
}
async function runTest() {
    let driver;
    try {
        console.log("🚀 Starting Test Flow...");
        driver = await remote(wdOpts);

        // 1. Navigate and find baby
        await clickNewbornRegistration(driver);
        await driver.pause(3000);
        await scrollAndRegisterBaby(driver, "1st baby of KULSUMA");

        // 2. Fill out standard radio button questions
        await selectCorticosteroidInjection(driver, "Yes");
        await selectInfantSex(driver, "Female");

        // 3. Handle conditional logic for baby crying
        const didBabyCry = "No";
        await selectBabyCried(driver, didBabyCry);
        if (didBabyCry === "No") {
            await selectResuscitationDone(driver, "Yes");
        }

        // 4. Fill birth defect question
        await selectBirthDefect(driver, "No"); // Pass "Yes", "No", or "NA"

        await driver.pause(3000);
        console.log("🎉 Test Flow Completed Successfully!");
        await selectDefectByCoordinates(driver, "Hydrocephalus");
    } catch (error) {
        console.error("🛑 Test execution stopped due to an error:", error.message);
    } finally {
        if (driver) {
            await driver.deleteSession();
            console.log("🔌 Appium session closed.");
        }
    }
}

// Execute the script
runTest();