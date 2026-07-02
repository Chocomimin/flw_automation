const { remote } = require('webdriverio');
const { fillDeliveryOutcomeForm } = require("../../maternal_health/deliveryRegistration");

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

// ── Navigation Helpers ────────────────────────────────────────────────────────
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

// ── Pick specific beneficiary based on pink color logic WITH SCROLLING ────────
async function selectPinkRegisterAndSubmit(driver) {
    try {
        console.log("⏳ Scrolling to find a beneficiary card with the pink REGISTER button...");

        // XPath identifying the card with the pink button
        const nameXPath = '//android.widget.ImageView[@content-desc="SYNC STATE" and @clickable="true"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id"]';

        let nameElement;
        let found = false;
        let attempts = 0;
        const maxScrolls = 10; // Max number of times to swipe down the list

        // Swipe and Search Loop
        while (attempts < maxScrolls) {
            // Use $$ to get an array of elements matching the XPath without waiting/throwing an error
            const elements = await driver.$$(nameXPath);

            if (elements.length > 0 && await elements[0].isDisplayed()) {
                nameElement = elements[0];
                found = true;
                break;
            }

            console.log(`🔄 Scroll attempt ${attempts + 1}: Pink button not found yet, swiping down...`);

            // Perform a manual swipe gesture (from 80% down the screen to 30% up)
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
            await driver.pause(1500); // Allow the UI to settle after scrolling

            attempts++;
        }

        if (!found) {
            throw new Error("Could not find any beneficiary with a pink REGISTER button after scrolling.");
        }

        const targetName = await nameElement.getText();
        console.log(`✅ Found beneficiary with pink button state: "${targetName}"`);

        console.log("⏳ Locating its REGISTER button...");
        // Re-anchor to the found name to explicitly click the REGISTER button inside the same card
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
// ── Newborn search ─────────────────────────────────────────────────────────────
function extractSearchTerm(fullName) {
    const trimmed = fullName.trim();
    const babyMatch = trimmed.match(/of\s+(.+)$/i);
    if (babyMatch) {
        return babyMatch[1].trim();
    }
    return trimmed.split(/\s+/)[0];
}

async function searchNewbornByName(driver, searchTerm) {
    try {
        console.log(`⏳ Searching Newborn list for "${searchTerm}"...`);

        const searchField = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
        await searchField.waitForDisplayed({ timeout: 10000 });
        await searchField.click();
        await searchField.setValue(searchTerm);

        const searchBtn = await driver.$('//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/ib_search"]');
        if (await searchBtn.isExisting()) {
            await searchBtn.click();
        } else {
            await driver.pressKeyCode(66);
        }

        await driver.pause(2000);
        console.log(`✅ Successfully searched for "${searchTerm}" in Newborn Registration list`);
    } catch (error) {
        console.error(`❌ Failed to search Newborn list for "${searchTerm}":`, error.message);
        throw error;
    }
}

// ── Main Flow ────────────────────────────────────────────────────────────────
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
        await searchNewbornByName(driver, searchTerm);

        console.log(`🎉 Test Flow Completed Successfully! Searched Newborn list for "${searchTerm}" (registered as "${registeredName}")`);

    } catch (error) {
        console.error("🛑 Test execution stopped due to an error:", error.message);
    } finally {
        if (driver) {
            await driver.deleteSession();
        }
    }
}

runTest();