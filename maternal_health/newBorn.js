const { remote } = require('webdriverio');
const { fillDeliveryOutcomeForm } = require("../../maternal_health/deliveryRegistration");

// ─────────────────────────────────────────────────────────────
//  APPIUM CONFIGURATION
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
//  NAVIGATION & SEARCH HELPERS
// ─────────────────────────────────────────────────────────────
async function clickMaternalHealth(driver) {
    try {
        console.log("⏳ Looking for 'Maternal Health' icon...");
        const maternalHealthElement = await driver.$("//android.widget.TextView[@text='Maternal Health']");
        await maternalHealthElement.waitForDisplayed({ timeout: 10000 });
        await maternalHealthElement.click();
        console.log("✅ Successfully clicked on 'Maternal Health'");
    } catch (error) {
        console.error("❌ Failed to click on 'Maternal Health':", error.message);
        throw error;
    }
}

async function clickDeliveryOutcome(driver) {
    try {
        console.log("⏳ Looking for 'Delivery Outcome' icon...");
        const deliveryOutcomeElement = await driver.$("//android.widget.TextView[@text='Delivery Outcome']");
        await deliveryOutcomeElement.waitForDisplayed({ timeout: 5000 });
        await deliveryOutcomeElement.click();
        console.log("✅ Successfully clicked on 'Delivery Outcome'");
    } catch (error) {
        console.error("❌ Failed to click on 'Delivery Outcome':", error.message);
        throw error;
    }
}

async function clickNewbornRegistration(driver) {
    try {
        console.log("⏳ Looking for 'Newborn Registration' icon...");
        const newbornElement = await driver.$("//android.widget.TextView[@text='Newborn Registration']");
        await newbornElement.waitForDisplayed({ timeout: 10000 });
        await newbornElement.click();
        console.log("✅ Successfully clicked on 'Newborn Registration'");
    } catch (error) {
        console.error("❌ Failed to click on 'Newborn Registration':", error.message);
        throw error;
    }
}

async function goToHome(driver) {
    try {
        console.log("⏳ Navigating back to Home...");
        const homeBtn = await driver.$('//android.widget.Button[@content-desc="Go to Home" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/toolbar_menu_home"]');
        if (await homeBtn.isExisting()) {
            await homeBtn.click();
            console.log("✅ Successfully navigated to Home via toolbar button");
            return;
        }
        console.log("⚠️ Home toolbar button not found, falling back to system back press...");
        for (let i = 0; i < 5; i++) {
            await driver.back();
            await driver.pause(800);
        }
    } catch (error) {
        console.error("❌ Failed to navigate Home:", error.message);
        throw error;
    }
}

async function selectPinkRegisterAndSubmit(driver) {
    try {
        console.log("⏳ Looking for a beneficiary card with the pink REGISTER button...");
        const nameXPath = '//android.widget.ImageView[@content-desc="SYNC STATE" and @clickable="true"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id"]';

        const nameElement = await driver.$(nameXPath);
        await nameElement.waitForDisplayed({ timeout: 15000 });

        const targetName = await nameElement.getText();
        console.log(`✅ Found beneficiary with pink button state: "${targetName}"`);

        console.log("⏳ Locating its REGISTER button...");
        const registerButtonXPath = `//android.widget.TextView[@text="${targetName}" and @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"][1]//android.widget.Button[@text="REGISTER"]`;

        const registerButton = await driver.$(registerButtonXPath);
        await registerButton.waitForDisplayed({ timeout: 5000 });
        await registerButton.click();

        console.log(`✅ Successfully clicked the pink 'REGISTER' button for "${targetName}"`);
        return targetName;
    } catch (error) {
        console.error("❌ Failed to find or click the pink REGISTER button:", error.message);
        throw error;
    }
}

function extractSearchTerm(fullName) {
    const trimmed = fullName.trim();
    const babyMatch = trimmed.match(/of\s+(.+)$/i);
    if (babyMatch) {
        return babyMatch[1].trim();
    }
    return trimmed.split(/\s+/)[0];
}

async function searchAndRegisterNewbornByName(driver, searchTerm) {
    try {
        console.log(`⏳ Searching Newborn list for "${searchTerm}"...`);

        const searchField = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
        await searchField.waitForDisplayed({ timeout: 10000 });
        await searchField.click();

        await searchField.clearValue();
        await searchField.addValue(searchTerm);

        console.log("⏳ Pressing Enter to execute search...");
        await driver.pressKeyCode(66);

        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }

        await driver.pause(2000);
        console.log(`✅ Successfully searched for "${searchTerm}"`);

        console.log(`⏳ Locating REGISTER button for the searched newborn...`);
        const registerBtnXPath = `//android.widget.Button[@text="REGISTER" and @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_form_ec1"]`;

        const registerButton = await driver.$(registerBtnXPath);
        await registerButton.waitForDisplayed({ timeout: 5000 });
        await registerButton.click();

        console.log(`✅ Successfully clicked REGISTER for the newborn!`);

    } catch (error) {
        console.error(`❌ Failed to process search and register for "${searchTerm}":`, error.message);
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────
//  DROPDOWN & COORDINATE LOGIC
// ─────────────────────────────────────────────────────────────
async function scrollSpinnerToMiddle(driver, spinnerSelector) {
    try {
        const spinner = await driver.$(spinnerSelector);
        const loc = await spinner.getLocation();
        const screen = await driver.getWindowRect();
        const midY = screen.height / 2;

        if (loc.y > midY + 100) {
            console.log(`⬆️  Spinner at y=${loc.y}, scrolling toward middle...`);
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
                    { type: 'pointerMove', duration: 1000, x: swipeX, y: endY },
                    { type: 'pointerUp', button: 0 }
                ]
            }]);
            await driver.releaseActions();
            await driver.pause(1500);
        }
    } catch (e) {
        console.log('⚠️  scrollSpinnerToMiddle skipped:', e.message);
    }
}

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

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList) {
    await scrollSpinnerToMiddle(driver, spinnerSelector);

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
    } catch (e) { console.log(`⚠️  XPath strategy failed: ${e.message}`); }

    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via UiSelector`);
        return;
    } catch (e) { console.log(`⚠️  UiSelector strategy failed: ${e.message}`); }

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
    } catch (e) { console.log(`⚠️  Tag parse failed: ${e.message}`); }

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
    } catch (e) { console.log(`⚠️  Regex strategy failed: ${e.message}`); }

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
//  FORM FIELD HELPERS
// ─────────────────────────────────────────────────────────────
async function selectRadioOption(driver, questionText, answerText) {
    try {
        console.log(`⏳ Selecting '${answerText}' for '${questionText}'...`);

        const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${questionText}"))`;
        await driver.$(`android=${scrollable}`).catch(() => {});
        await driver.pause(1000);

        const radioButtonXPath = `//android.widget.TextView[contains(@text, "${questionText}")]/ancestor::android.widget.LinearLayout[.//android.widget.RadioGroup][1]//android.widget.RadioButton[@text="${answerText}"]`;
        const radioButton = await driver.$(radioButtonXPath);

        await radioButton.waitForDisplayed({ timeout: 5000 });
        await radioButton.click();
        await driver.pause(1500);

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

async function selectDefectSeenAtBirth(driver, defectName) {
    try {
        console.log(`⏳ Opening the 'Defect seen at birth' dropdown...`);

        const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Defect seen at birth"))`;
        await driver.$(`android=${scrollable}`).catch(() => {});
        await driver.pause(1000);

        const optionsList = [
            "Cleft Lip / Cleft Palate",
            "Club Foot",
            "Down's Syndrome",
            "Hydrocephalus",
            "Imperforate Anus",
            "Neural Tube Defect (Spinal Bifida)",
            "Other"
        ];

        await clickSpinnerAndSelectOption(
            driver,
            'android=new UiSelector().className("android.widget.Spinner").textContains("Defect seen at birth")',
            defectName,
            optionsList
        );
    } catch (error) {
        console.error(`❌ Failed to select defect using master dropdown logic:`, error.message);
        throw error;
    }
}

async function fillBirthWeight(driver, weightInGrams) {
    try {
        console.log(`⏳ Entering Birth Weight: ${weightInGrams} grams...`);

        const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Weight at Birth"))`;
        await driver.$(`android=${scrollable}`).catch(() => {});
        await driver.pause(1000);

        const weightInput = await driver.$('//android.widget.EditText[contains(@hint, "Weight at Birth")]');
        await weightInput.waitForDisplayed({ timeout: 5000 });

        await weightInput.click();
        await weightInput.clearValue();
        await weightInput.setValue(weightInGrams);

        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }

        console.log(`✅ Successfully entered Birth Weight: ${weightInGrams}`);
        await driver.pause(1000);
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

            const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${summaryTitle}"))`;
            await driver.$(`android=${scrollable}`).catch(() => {});
            await driver.pause(1000);

            const addFileBtnXPath = `//android.view.ViewGroup[.//android.widget.TextView[@text="${summaryTitle}"]]//android.widget.ImageView[@content-desc="add file"]`;
            const addFileBtn = await driver.$(addFileBtnXPath);

            if (await addFileBtn.isExisting()) {
                await addFileBtn.waitForDisplayed({ timeout: 5000 });
                await addFileBtn.click();
                console.log(`✅ Clicked 'add file' for ${summaryTitle}`);

                const pickFromGalleryBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btnGallery")');
                await pickFromGalleryBtn.waitForDisplayed({ timeout: 5000 });
                await pickFromGalleryBtn.click();
                console.log(`✅ Clicked 'Pick from Gallery'`);

                console.log("⏳ You have 20 seconds to manually pick the file from the gallery...");
                await driver.pause(20000);
                console.log(`✅ Finished processing ${summaryTitle}`);
            } else {
                console.log(`➡ "${summaryTitle}" add-file button not found, skipping.`);
            }
        }
        console.log("\n🎉 All 4 Delivery Discharge Summaries processed!");
    } catch (error) {
        console.error(`❌ Failed while adding Discharge Summaries:`, error.message);
        throw error;
    }
}

async function fillOtherDefect(driver, defectDescription) {
    try {
        console.log(`⏳ Entering Other Defect: ${defectDescription}...`);

        const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Other defect seen at Birth"))`;
        await driver.$(`android=${scrollable}`).catch(() => {});
        await driver.pause(1000);

        const otherDefectInput = await driver.$('//android.widget.EditText[contains(@hint, "Other defect seen at Birth")]');
        await otherDefectInput.waitForDisplayed({ timeout: 5000 });

        await otherDefectInput.click();
        await otherDefectInput.clearValue();
        await otherDefectInput.setValue(defectDescription);

        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }

        console.log(`✅ Successfully entered Other Defect: ${defectDescription}`);
        await driver.pause(1000);
    } catch (error) {
        console.error(`❌ Failed to enter Other Defect:`, error.message);
        throw error;
    }
}

async function clickSubmitButton(driver) {
    try {
        console.log("⏳ Scrolling down to find the 'Submit' button...");
        const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"))`;
        await driver.$(`android=${scrollable}`).catch(() => {});
        await driver.pause(1000);

        const submitBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit")');
        await submitBtn.waitForDisplayed({ timeout: 5000 });
        await submitBtn.click();

        console.log("✅ Successfully clicked the 'Submit' button!");
        await driver.pause(2000);
    } catch (error) {
        console.error(`❌ Failed to click the 'Submit' button:`, error.message);
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────
//  MAIN EXECUTION
// ─────────────────────────────────────────────────────────────
async function runTest() {
    let driver;
    try {
        driver = await remote(wdOpts);
        console.log("🚀 Starting Test Flow...");

        // 1. Maternal Health -> Delivery Outcome
        await clickMaternalHealth(driver);
        await driver.pause(2000);

        await clickDeliveryOutcome(driver);
        await driver.pause(3000);

        // 2. Select the beneficiary with the pink register button, click it, remember name
        const registeredName = await selectPinkRegisterAndSubmit(driver);
        await driver.pause(3000);

        // 3. Fill and submit the Delivery Outcome form
        await fillDeliveryOutcomeForm(driver);
        console.log("🎉 Delivery Outcome registration completed!");
        await driver.pause(2000);

        // 4. Go back to Home
        await goToHome(driver);
        await driver.pause(2000);

        // 5. Maternal Health -> Newborn Registration
        await clickMaternalHealth(driver);
        await driver.pause(2000);

        await clickNewbornRegistration(driver);
        await driver.pause(3000);

        // 6. Search for the remembered name
        const searchTerm = extractSearchTerm(registeredName);
        await searchAndRegisterNewbornByName(driver, searchTerm);
        await driver.pause(3000);

        // 7. NEWBORN REGISTRATION FORM FILL
        console.log("📝 Starting Newborn Registration Form Fill...");

        await selectRadioOption(driver, "Was Corticosteroid Inj", "Yes");
        await selectRadioOption(driver, "Sex of Infant", "Female");

        const didBabyCry = "No";
        await selectRadioOption(driver, "Baby Cried Immediately", didBabyCry);

        if (didBabyCry === "No") {
            await selectRadioOption(driver, "Resuscitation Done", "Yes");
        }

        // Trigger Defect Dropdown Logic
        await selectRadioOption(driver, "Any birth defect seen", "Yes");
        await driver.pause(2000);

        const defectName = "Other";
        await selectDefectSeenAtBirth(driver, defectName);

        // Conditional logic for "Other" defect
        if (defectName === "Other") {
            await fillOtherDefect(driver, "Observed minor rash on left arm");
        }

        await fillBirthWeight(driver, "3200");
        await selectRadioOption(driver, "Breast feeding started within one hour", "Yes");
        await selectRadioOption(driver, "Is the Baby admitted to the SNCU", "Yes");

        // Handle Images
        await addDischargeSummaries(driver);

        // Submit
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