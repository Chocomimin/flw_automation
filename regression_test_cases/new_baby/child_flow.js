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
//  NAVIGATION HELPERS
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

async function clickChildCare(driver) {
    try {
        console.log("⏳ Looking for 'Child Care' icon...");
        const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Child Care"))`;
        await driver.$(`android=${scrollable}`).catch(() => {});

        const childCareElement = await driver.$("//android.widget.TextView[@text='Child Care']");
        await childCareElement.waitForDisplayed({ timeout: 10000 });
        await childCareElement.click();
        console.log("✅ Successfully clicked on 'Child Care'");
    } catch (error) {
        console.error("❌ Failed to click on 'Child Care':", error.message);
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

async function clickChildRegistration(driver) {
    try {
        console.log("⏳ Looking for 'Child Registration' icon...");
        const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Child Registration"))`;
        await driver.$(`android=${scrollable}`).catch(() => {});
        await driver.pause(1000);

        const childRegText = await driver.$('//android.widget.TextView[@text="Child Registration"]');
        await childRegText.waitForDisplayed({ timeout: 5000 });
        await childRegText.click();

        console.log("✅ Successfully clicked on 'Child Registration'!");
        await driver.pause(2000);
    } catch (error) {
        console.error(`❌ Failed to click on 'Child Registration':`, error.message);
        throw error;
    }
}

async function clickNewbornList(driver) {
    try {
        console.log("⏳ Looking for 'Newborn list' icon...");
        const element = await driver.$("//android.widget.TextView[@text='Newborn list' or @text='Newborn List']");
        await element.waitForDisplayed({ timeout: 5000 });
        await element.click();
        console.log("✅ Successfully clicked on 'Newborn list'");
    } catch (error) {
        console.error("❌ Failed to click on 'Newborn list':", error.message);
        throw error;
    }
}

async function clickChildList(driver) {
    try {
        console.log("⏳ Looking for 'Child List' icon...");
        const element = await driver.$("//android.widget.TextView[@text='Child List' or @text='Child list']");
        await element.waitForDisplayed({ timeout: 5000 });
        await element.click();
        console.log("✅ Successfully clicked on 'Child List'");
    } catch (error) {
        console.error("❌ Failed to click on 'Child List':", error.message);
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

// ─────────────────────────────────────────────────────────────
//  BENEFICIARY SELECTION & SEARCH
// ─────────────────────────────────────────────────────────────
async function selectPinkRegisterAndSubmit(driver) {
    try {
        console.log("⏳ Scrolling to find a beneficiary card with the pink REGISTER button...");

        const nameXPath = '//android.widget.ImageView[@content-desc="SYNC STATE" and @clickable="true"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id"]';

        let nameElement;
        let found = false;
        let attempts = 0;
        const maxScrolls = 10;

        while (attempts < maxScrolls) {
            const elements = await driver.$$(nameXPath);
            if (elements.length > 0 && await elements[0].isDisplayed()) {
                nameElement = elements[0];
                found = true;
                break;
            }

            console.log(`🔄 Scroll attempt ${attempts + 1}: Pink button not found yet, swiping down...`);
            const { width, height } = await driver.getWindowRect();
            await driver.performActions([{
                type: 'pointer', id: 'finger1',
                parameters: { pointerType: 'touch' },
                actions: [
                    { type: 'pointerMove', duration: 0, x: Math.floor(width / 2), y: Math.floor(height * 0.8) },
                    { type: 'pointerDown', button: 0 },
                    { type: 'pause', duration: 200 },
                    { type: 'pointerMove', duration: 1000, x: Math.floor(width / 2), y: Math.floor(height * 0.3) },
                    { type: 'pointerUp', button: 0 }
                ]
            }]);
            await driver.releaseActions();
            await driver.pause(1500);
            attempts++;
        }

        if (!found) {
            throw new Error("Could not find any beneficiary with a pink REGISTER button after scrolling.");
        }

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

async function searchAndRegisterChildByName(driver, searchTerm) {
    try {
        console.log(`\n🔍 Searching Child list for '${searchTerm}'...`);
        const searchInput = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
        await searchInput.waitForDisplayed({ timeout: 10000 });
        await searchInput.click();
        await searchInput.clearValue();

        await searchInput.addValue(searchTerm);

        console.log("⏳ Pressing Enter to execute search...");
        await driver.pressKeyCode(66);

        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }
        await driver.pause(2000);
        console.log(`✅ Successfully searched for "${searchTerm}"`);

        console.log(`⏳ Locating the REGISTER button for the child containing '${searchTerm}'...`);
        const specificRegisterButtonXPath = `//android.view.ViewGroup[.//android.widget.TextView[contains(@text, "${searchTerm}")]]//android.widget.Button[@text="REGISTER"]`;
        const registerButton = await driver.$(specificRegisterButtonXPath);

        await registerButton.waitForDisplayed({ timeout: 5000 });
        await registerButton.click();
        console.log(`✅ Successfully clicked the 'REGISTER' button for child!`);
        await driver.pause(3000);
    } catch (error) {
        console.error(`❌ Failed to search and register child '${searchTerm}':`, error.message);
        throw error;
    }
}

async function verifyNameInList(driver, searchTerm) {
    try {
        console.log(`\n🔍 Searching list to verify presence of '${searchTerm}'...`);
        const searchInput = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
        await searchInput.waitForDisplayed({ timeout: 10000 });
        await searchInput.click();
        await searchInput.clearValue();

        await searchInput.addValue(searchTerm);

        console.log("⏳ Pressing Enter to execute search...");
        await driver.pressKeyCode(66);

        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }
        await driver.pause(3000);

        const specificNameXPath = `//android.view.ViewGroup[.//android.widget.TextView[contains(@text, "${searchTerm}")]]`;
        const elements = await driver.$$(specificNameXPath);

        if (elements.length > 0 && await elements[0].isDisplayed()) {
            console.log(`✅ Verified! Found a match containing '${searchTerm}' in the list.`);
            return true;
        } else {
            console.log(`⚠️ Could not find '${searchTerm}' in this list.`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error during verification search for '${searchTerm}':`, error.message);
        return false;
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
    } catch (e) { }

    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via UiSelector`);
        return;
    } catch (e) { }

    try {
        const source = await driver.getPageSource();
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`text="${escapedValue}"[^/]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
        const match = source.match(regex);

        if (match) {
            const tapX = Math.floor((parseInt(match[1]) + parseInt(match[3])) / 2);
            const tapY = Math.floor((parseInt(match[2]) + parseInt(match[4])) / 2);
            await tapByCoords(driver, tapX, tapY);
            console.log(`✅ Selected "${value}" via regex`);
            return;
        }
    } catch (e) { }

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

    await tapByCoords(driver, finalTapX, finalTapY);
    console.log(`✅ Selected "${value}" via coordinates`);
}

// ─────────────────────────────────────────────────────────────
//  NEWBORN REGISTRATION FORM HELPERS
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
            "Cleft Lip / Cleft Palate", "Club Foot", "Down's Syndrome",
            "Hydrocephalus", "Imperforate Anus", "Neural Tube Defect (Spinal Bifida)", "Other"
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
            const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${summaryTitle}"))`;
            await driver.$(`android=${scrollable}`).catch(() => {});
            await driver.pause(1000);

            const addFileBtnXPath = `//android.view.ViewGroup[.//android.widget.TextView[@text="${summaryTitle}"]]//android.widget.ImageView[@content-desc="add file"]`;
            const addFileBtn = await driver.$(addFileBtnXPath);

            if (await addFileBtn.isExisting()) {
                await addFileBtn.waitForDisplayed({ timeout: 5000 });
                await addFileBtn.click();

                const pickFromGalleryBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btnGallery")');
                await pickFromGalleryBtn.waitForDisplayed({ timeout: 5000 });
                await pickFromGalleryBtn.click();

                console.log(`⏳ You have 20 seconds to manually pick the file for ${summaryTitle}...`);
                await driver.pause(20000);
            }
        }
        console.log("🎉 All 4 Delivery Discharge Summaries processed!");
    } catch (error) {
        console.error(`❌ Failed while adding Discharge Summaries:`, error.message);
        throw error;
    }
}

async function fillOtherDefect(driver, defectDescription) {
    try {
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

// ─────────────────────────────────────────────────────────────
//  CHILD REGISTRATION FORM HELPERS
// ─────────────────────────────────────────────────────────────
async function fillChildRchId(driver, rchIdNumber) {
    try {
        console.log(`\n✍️ Filling RCH ID No. of Child with '${rchIdNumber}'...`);
        const childRchIdInput = await driver.$(`//android.widget.EditText[@text="RCH ID No. of Child"]`);
        await childRchIdInput.waitForDisplayed({ timeout: 5000 });
        await childRchIdInput.click();
        await childRchIdInput.clearValue();
        await childRchIdInput.setValue(rchIdNumber);

        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }
        console.log(`✅ Successfully filled RCH ID No. of Child!`);
    } catch (error) {
        console.error(`❌ Failed to fill RCH ID No. of Child:`, error.message);
        throw error;
    }
}

async function fillBirthCertificateNumber(driver, certNumber) {
    try {
        console.log(`\n✍️ Filling Birth Certificate Number with '${certNumber}'...`);
        const birthCertInput = await driver.$(`//android.widget.EditText[@text="Birth Certificate Number"]`);
        await birthCertInput.waitForDisplayed({ timeout: 5000 });
        await birthCertInput.click();
        await birthCertInput.clearValue();
        await birthCertInput.setValue(certNumber);

        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }
        console.log(`✅ Successfully filled Birth Certificate Number!`);
    } catch (error) {
        console.error(`❌ Failed to fill Birth Certificate Number:`, error.message);
        throw error;
    }
}

async function selectPlaceOfBirth(driver, placeName) {
    try {
        console.log(`\n🏥 Selecting Place of Birth: '${placeName}'...`);
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
        console.log(`✅ Place of Birth selected!`);
    } catch (error) {
        console.error(`❌ Failed to select Place of Birth:`, error.message);
        throw error;
    }
}

async function uploadFrontAndBackImages(driver) {
    try {
        console.log(`\n📜 Scrolling down to find 'Front Side'...`);
        const scrollFront = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Front Side"))`;
        await driver.$(`android=${scrollFront}`).catch(() => {});
        await driver.pause(1000);

        console.log(`📸 Starting Front Side image upload...`);
        const frontSideAddBtn = await driver.$(`//android.view.ViewGroup[.//android.widget.TextView[@text="Front Side"]]//android.widget.ImageView[@content-desc="add file"]`);
        await frontSideAddBtn.waitForDisplayed({ timeout: 5000 });
        await frontSideAddBtn.click();

        const pickFromGallery = await driver.$(`//*[@text="Pick from gallery" or @text="Pick from Gallery"]`);
        await pickFromGallery.waitForDisplayed({ timeout: 5000 });
        await pickFromGallery.click();
        console.log(`⏳ Waiting 20 seconds for Front Side upload...`);
        await driver.pause(20000);

        console.log(`\n📜 Scrolling down to find 'Back Side'...`);
        const scrollBack = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Back Side"))`;
        await driver.$(`android=${scrollBack}`).catch(() => {});
        await driver.pause(1000);

        console.log(`📸 Starting Back Side image upload...`);
        const backSideAddBtn = await driver.$(`//android.view.ViewGroup[.//android.widget.TextView[@text="Back Side"]]//android.widget.ImageView[@content-desc="add file"]`);
        await backSideAddBtn.waitForDisplayed({ timeout: 5000 });
        await backSideAddBtn.click();

        const pickFromGalleryBack = await driver.$(`//*[@text="Pick from gallery" or @text="Pick from Gallery"]`);
        await pickFromGalleryBack.waitForDisplayed({ timeout: 5000 });
        await pickFromGalleryBack.click();
        console.log(`⏳ Waiting 20 seconds for Back Side upload...`);
        await driver.pause(20000);

        console.log(`✅ Front and Back Side image uploads processed successfully!`);
    } catch (error) {
        console.error(`❌ Failed during image upload:`, error.message);
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────
//  VIEW & EDIT HELPERS (POST SUBMIT)
// ─────────────────────────────────────────────────────────────
async function clickViewButton(driver) {
    try {
        console.log("\n⏳ Waiting for the 'VIEW' button to appear...");
        const viewBtn = await driver.$('//android.widget.Button[@text="VIEW" and @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_form"]');
        await viewBtn.waitForDisplayed({ timeout: 10000 });
        await viewBtn.click();
        console.log("✅ Successfully clicked the 'VIEW' button.");
        await driver.pause(2000);
    } catch (error) {
        console.error("❌ Failed to click the 'VIEW' button:", error.message);
        throw error;
    }
}

async function clickEditButton(driver) {
    try {
        console.log("\n⏳ Waiting for the 'EDIT' floating action button...");
        const editBtn = await driver.$('//android.widget.ImageButton[@content-desc="EDIT" and @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/fab_edit"]');
        await editBtn.waitForDisplayed({ timeout: 10000 });
        await editBtn.click();
        console.log("✅ Successfully clicked the 'EDIT' button.");
        await driver.pause(2000);
    } catch (error) {
        console.error("❌ Failed to click the 'EDIT' button:", error.message);
        throw error;
    }
}

async function handleConsentForm(driver) {
    try {
        console.log("\n⏳ Checking for Consent Form...");
        const checkBox = await driver.$('//android.widget.CheckBox[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/checkBox"]');

        // Short timeout because it might not always show up
        await checkBox.waitForDisplayed({ timeout: 5000 });

        console.log("📝 Consent form detected. Accepting...");
        const isChecked = await checkBox.getAttribute('checked');
        if (String(isChecked) !== 'true') {
            await checkBox.click();
            console.log("✅ Checked the consent checkbox.");
        }

        const agreeBtn = await driver.$('//android.widget.Button[@text="AGREE" and @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_positive"]');
        await agreeBtn.click();
        console.log("✅ Clicked the 'AGREE' button.");

        await driver.pause(2000);
    } catch (error) {
        console.log("➡ No consent form appeared or it was already accepted. Proceeding...");
    }
}

async function updateChildAge(driver, newAgeStr) {
    try {
        console.log(`\n⏳ Updating/Verifying Child's Age to '${newAgeStr}'...`);

        const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Age"))`;
        await driver.$(`android=${scrollable}`).catch(() => {});
        await driver.pause(1000);

        const ageInput = await driver.$('//android.widget.EditText[contains(@hint, "Age") or contains(@text, "Age")]');
        if (await ageInput.isExisting()) {
            await ageInput.waitForDisplayed({ timeout: 5000 });
            await ageInput.click();
            await ageInput.clearValue();
            await ageInput.setValue(newAgeStr);

            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
                await driver.pause(1000);
            }
            console.log(`✅ Successfully updated Child's Age to '${newAgeStr}'.`);
        } else {
            console.log(`⚠️ Age field not explicitly found. Proceeding with submit anyway.`);
        }
        await driver.pause(1000);
    } catch (error) {
        console.error(`❌ Failed to update Child's Age:`, error.message);
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────
//  COMMON SUBMIT
// ─────────────────────────────────────────────────────────────
async function clickSubmitButton(driver) {
    try {
        console.log("\n⏳ Scrolling down to find the 'Submit' button...");
        const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"))`;
        await driver.$(`android=${scrollable}`).catch(() => {});
        await driver.pause(1000);

        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
            await driver.pause(1000);
        }

        const submitBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit")');
        await submitBtn.waitForDisplayed({ timeout: 5000 });
        await submitBtn.click();

        console.log("✅ Successfully clicked the 'Submit' button!");
        await driver.pause(3000);
    } catch (error) {
        console.error(`❌ Failed to click the 'Submit' button:`, error.message);
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────
//  MAIN EXECUTION (THE GRAND TOUR)
// ─────────────────────────────────────────────────────────────
async function runTest() {
    let driver;
    try {
        driver = await remote(wdOpts);
        console.log("🚀 Starting End-to-End Test Flow...");

        // ==========================================
        // PHASE 1: DELIVERY OUTCOME
        // ==========================================
        await clickMaternalHealth(driver);
        await driver.pause(2000);

        await clickDeliveryOutcome(driver);
        await driver.pause(3000);

        const registeredName = await selectPinkRegisterAndSubmit(driver);
        await driver.pause(3000);

        await fillDeliveryOutcomeForm(driver);
        console.log("🎉 Delivery Outcome registration completed!");
        await driver.pause(2000);

        // ==========================================
        // PHASE 2: NEWBORN REGISTRATION
        // ==========================================
        await goToHome(driver);
        await driver.pause(2000);

        await clickMaternalHealth(driver);
        await driver.pause(2000);

        await clickNewbornRegistration(driver);
        await driver.pause(3000);

        const searchTerm = extractSearchTerm(registeredName);
        await searchAndRegisterNewbornByName(driver, searchTerm);
        await driver.pause(3000);

        console.log("📝 Starting Newborn Registration Form Fill...");
        await selectRadioOption(driver, "Was Corticosteroid Inj", "Yes");
        await selectRadioOption(driver, "Sex of Infant", "Female");

        const didBabyCry = "No";
        await selectRadioOption(driver, "Baby Cried Immediately", didBabyCry);
        if (didBabyCry === "No") {
            await selectRadioOption(driver, "Resuscitation Done", "Yes");
        }

        await selectRadioOption(driver, "Any birth defect seen", "Yes");
        await driver.pause(2000);
        const defectName = "Other";
        await selectDefectSeenAtBirth(driver, defectName);
        if (defectName === "Other") {
            await fillOtherDefect(driver, "Observed minor rash on left arm");
        }

        await fillBirthWeight(driver, "3200");
        await selectRadioOption(driver, "Breast feeding started within one hour", "Yes");
        await selectRadioOption(driver, "Is the Baby admitted to the SNCU", "Yes");
        await addDischargeSummaries(driver);
        await clickSubmitButton(driver);
        console.log("🎉 Newborn Registration Form Fill Completed!");

        // ==========================================
        // PHASE 3: CHILD REGISTRATION & EDIT VERIFICATION
        // ==========================================
        await goToHome(driver);
        await driver.pause(2000);

        await clickMaternalHealth(driver);
        await driver.pause(2000);

        await clickChildRegistration(driver);
        await driver.pause(3000);

        await searchAndRegisterChildByName(driver, searchTerm);
        await driver.pause(3000);

        console.log("📝 Starting Child Registration Form Fill...");
        await fillChildRchId(driver, "987654321098");
        await fillBirthCertificateNumber(driver, "B-2026-9876543");
        await selectPlaceOfBirth(driver, "Primary Health Centre");
        await uploadFrontAndBackImages(driver);

        await clickSubmitButton(driver);
        console.log("🎉 Initial Child Registration Completed!");

        console.log("🔍 Proceeding to VIEW and EDIT the submitted record...");
        await clickViewButton(driver);
        await clickEditButton(driver);

        // Handle Consent form dynamically if it appears
        await handleConsentForm(driver);

        await updateChildAge(driver, "1");
        await clickSubmitButton(driver);
        console.log("🎉 Record Edit & Resubmit Completed!");

        // ==========================================
        // PHASE 4: FINAL VERIFICATION IN CHILD CARE
        // ==========================================
        console.log("\n==========================================");
        console.log("PHASE 4: FINAL VERIFICATION IN CHILD CARE");
        console.log("==========================================");
        await goToHome(driver);
        await driver.pause(2000);

        await clickChildCare(driver);
        await driver.pause(2000);

        await clickNewbornList(driver);
        await driver.pause(3000);

        let isFound = await verifyNameInList(driver, searchTerm);

        if (isFound) {
            console.log(`🎉 TEST CASE PASSED! '${searchTerm}' found in Newborn list.`);
        } else {
            console.log(`🔄 '${searchTerm}' not in Newborn list. Checking Child list...`);
            await goToHome(driver);
            await driver.pause(2000);

            await clickChildCare(driver);
            await driver.pause(2000);

            await clickChildList(driver);
            await driver.pause(3000);

            isFound = await verifyNameInList(driver, searchTerm);

            if (isFound) {
                console.log(`🎉 TEST CASE PASSED! '${searchTerm}' found in Child list.`);
            } else {
                console.log(`❌ TEST CASE FAILED! '${searchTerm}' not found in Newborn list or Child list.`);
            }
        }

        console.log("\n🎉🚀 Entire End-to-End Test Flow Completed Successfully!");

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