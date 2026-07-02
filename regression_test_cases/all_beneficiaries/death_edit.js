const { remote } = require('webdriverio');
const { selectLanguage, login } = require("../../steps/loginSteps"); // Adjust path if needed
const { selectVillage } = require("../../steps/villageSteps"); // Adjust path if needed

// ─────────────────────────────────────────────────────────────
//  CORE HELPER — Scroll spinner into view
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
// ─────────────────────────────────────────────────────────────
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

    // STRATEGY 0: Direct XPath
    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`✅ Selected "${value}" via XPath`);
        return;
    } catch (e) {
        console.log(`⚠️  XPath strategy failed: ${e.message}`);
    }

    // STRATEGY 1: UiSelector
    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via UiSelector`);
        return;
    } catch (e) {
        console.log(`⚠️  UiSelector strategy failed: ${e.message}`);
    }

    // STRATEGY 2: Tag-by-tag XML parse
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
    } catch (e) {
        console.log(`⚠️  Tag parse failed: ${e.message}`);
    }

    // STRATEGY 3: Coordinate fallback
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
//  STANDARD SCRIPT FUNCTIONS
// ─────────────────────────────────────────────────────────────
async function clickAllBeneficiaries(driver) {
    console.log("👆 Clicking on All Beneficiaries...");
    const allBeneficiariesBtn = await driver.$('//android.widget.TextView[@text="All\nBeneficiaries"]');
    await allBeneficiariesBtn.waitForDisplayed({ timeout: 5000 });
    await allBeneficiariesBtn.click();
    console.log("✅ Successfully clicked All Beneficiaries");
}

async function clickRandomBeneficiary(driver) {
    console.log("🎲 Selecting a random beneficiary...");

    const scrollCount = Math.floor(Math.random() * 3);
    if (scrollCount > 0) {
        console.log(`⬇️ Scrolling the list ${scrollCount} time(s)...`);
        const screen = await driver.getWindowRect();
        const startY = Math.floor(screen.height * 0.7);
        const endY = Math.floor(screen.height * 0.3);
        const swipeX = Math.floor(screen.width / 2);

        for (let i = 0; i < scrollCount; i++) {
            await driver.performActions([{
                type: 'pointer', id: `finger_scroll_${i}`,
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
            await driver.pause(1000);
        }
    }

    const nameElements = await driver.$$('id:org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id');

    if (nameElements.length === 0) {
        throw new Error("❌ No beneficiaries found on screen to click!");
    }

    const randomIndex = Math.floor(Math.random() * nameElements.length);
    const randomBeneficiary = nameElements[randomIndex];

    const exactName = await randomBeneficiary.getText();
    console.log(`👆 Clicking on randomly selected beneficiary: "${exactName}"...`);

    await randomBeneficiary.click();
    console.log(`✅ Successfully selected ${exactName}!`);

    return exactName;
}

async function fillDateOfDeath(driver) {
    console.log("🗓️ Opening Date of Death calendar...");
    const dateField = await driver.$('//android.widget.EditText[@hint="Date of Death *"]');
    await dateField.waitForDisplayed({ timeout: 5000 });
    await dateField.click();
    await driver.pause(1500);

    console.log("📅 Selecting a random valid day from the current view...");

    // Finds all enabled (clickable) day elements in the currently opened month.
    // Invalid days (like future days or days before DOB) are usually disabled.
    const availableDays = await driver.$$('//android.view.View[@enabled="true" and @clickable="true"]');

    if (availableDays.length > 0) {
        const randomIdx = Math.floor(Math.random() * availableDays.length);
        const randomDay = availableDays[randomIdx];
        await randomDay.click();
        console.log("🎲 Random enabled day selected!");
    } else {
        console.log("⚠️ No clickable days found in current view. Proceeding with default selection.");
    }

    await driver.pause(1000);

    console.log("✅ Clicking OK on calendar...");
    const okBtn = await driver.$('id:android:id/button1');
    await okBtn.click();

    console.log("🎯 Date of Death filled successfully!");
}

async function fillTimeOfDeath(driver) {
    console.log("⏰ Opening Time of Death clock...");

    const timeField = await driver.$('//android.widget.EditText[@hint="Time of Death"]');
    await timeField.waitForDisplayed({ timeout: 5000 });
    await timeField.click();
    await driver.pause(1500);

    console.log("✅ Clicking OK to accept default time...");
    const okBtn = await driver.$('id:android:id/button1');
    await okBtn.waitForDisplayed({ timeout: 5000 });
    await okBtn.click();

    console.log("🎯 Time of Death filled successfully!");
}

async function fillDropdownsFallback(driver) {
    console.log("📝 Handling Dropdowns & Spinners...");

    // ---- 1. REASON FOR DEATH ----
    console.log("🔽 Opening 'Reason for Death' dropdown...");
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().descriptionContains("Reason for Death"))');
    await driver.pause(1000);

    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().className("android.widget.Spinner").descriptionContains("Reason for Death")',
        "Natural Death",
        ["Natural Death", "Accident", "Infectious Disease", "Animal Bite Death", "Suicide", "Undetermined", "Maternal Death"]
    );

    // ---- 2. PLACE OF DEATH ----
    console.log("🔽 Opening 'Place of Death' dropdown...");
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().descriptionContains("Place of Death"))');
    await driver.pause(1000);

    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().className("android.widget.Spinner").descriptionContains("Place of Death")',
        "Home",
        ["Home", "Subcenter", "PHC", "CHC", "District Hospital", "Medical College Hospital", "Private Hospital", "In Transit", "Other Place of Death"]
    );

    console.log("✅ Both dropdowns selected successfully!");
}

async function editBeneficiaryToDeath(driver) {
    console.log("✏️ Clicking on Edit button...");
    const editBtn = await driver.$('id:org.piramalswasthya.sakhi.saksham.uat:id/fab_edit');
    await editBtn.waitForDisplayed({ timeout: 5000 });
    await editBtn.click();

    console.log("📝 Handling Consent Form...");
    const consentCheckbox = await driver.$('id:org.piramalswasthya.sakhi.saksham.uat:id/checkBox');
    await consentCheckbox.waitForDisplayed({ timeout: 5000 });
    await consentCheckbox.click();

    const agreeBtn = await driver.$('id:org.piramalswasthya.sakhi.saksham.uat:id/btn_positive');
    await agreeBtn.click();
    console.log("✅ Consent agreed.");

    console.log("⬇️ Scrolling to find 'Death' status...");
    const deathRadioButton = await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("Death")`);
    await deathRadioButton.waitForDisplayed({ timeout: 5000 });
    await deathRadioButton.click();
    console.log("💀 'Death' status selected successfully.");

    await fillDateOfDeath(driver);
    await fillTimeOfDeath(driver);

    await fillDropdownsFallback(driver);

    // ---- SUBMIT FORM (FIRST BUTTON) ----
    console.log("🚀 Submitting Death form...");
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"))').catch(() => {});

    const submitBtn = await driver.$('id:org.piramalswasthya.sakhi.saksham.uat:id/btn_submit');
    await submitBtn.waitForDisplayed({ timeout: 5000 });
    await submitBtn.click();

    // ---- FINAL SUBMIT (PREVIEW SCREEN) ----
    console.log("👀 Waiting for Preview screen...");
    const finalSubmitBtn = await driver.$('id:org.piramalswasthya.sakhi.saksham.uat:id/btnSubmitPreview');
    await finalSubmitBtn.waitForDisplayed({ timeout: 10000 });

    console.log("🚀 Clicking final SUBMIT button on Preview...");
    await finalSubmitBtn.click();

    // ---- HANDLE OPTIONAL "ADD CHILDREN" POPUP ----
    console.log("🔎 Checking for 'Add Children' popup...");
    try {
        // Wait up to 5 seconds for the 'No' button to appear
        const noButton = await driver.$('//*[@text="No"]');
        await noButton.waitForDisplayed({ timeout: 5000 });

        console.log("⚠️ 'Add Children' popup detected. Clicking 'No'...");
        await noButton.click();
        console.log("✅ Clicked 'No' successfully.");
    } catch (error) {
        // If the element isn't found within 5 seconds, it will catch the error here and continue
        console.log("➡️ 'Add Children' popup did not appear. Moving on.");
    }

    console.log("✅ Form completely submitted successfully!");
}

async function verifyDeathStatus(driver, fullName) {
    // 1. Extract the first word of the full name to type in the search box
    const firstName = fullName.split(' ')[0];
    console.log(`\n🔍 Verifying death status for: "${fullName}" (Searching by: "${firstName}")...`);

    const searchInput = await driver.$('id:org.piramalswasthya.sakhi.saksham.uat:id/searchView');
    await searchInput.waitForDisplayed({ timeout: 5000 });
    await searchInput.click();
    await driver.pause(500);
    await searchInput.clearValue();

    // Type ONLY the first name
    await searchInput.setValue(firstName);
    console.log(`✍️ Typed text: ${firstName}`);

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        console.log("⌨️ Closed keyboard.");
    }

    await driver.pause(2000); // Give the app a moment to filter results

    console.log(`⏳ Scrolling through results to find the exact match: "${fullName}"...`);

    // 2. Use UiScrollable to scroll until the specific full name is visible
    let beneficiaryCard;
    try {
        beneficiaryCard = await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${fullName}"))`);
        await beneficiaryCard.waitForDisplayed({ timeout: 10000 });
        console.log(`👁️ Beneficiary card for ${fullName} is visible.`);
    } catch (error) {
        throw new Error(`❌ Verification Failed: Beneficiary ${fullName} not found after searching for ${firstName} and scrolling!`);
    }

    // Capture the exact text from the screen for strict XPath building in the next step
    const actualNameOnScreen = await beneficiaryCard.getText();

    // 3. Look specifically for the Death icon that is a sibling of this name
    const specificDeathIconXpath = `//android.widget.TextView[@text="${actualNameOnScreen}"]/following-sibling::android.widget.ImageView[@content-desc="Death"]`;
    const deathIcon = await driver.$(specificDeathIconXpath);

    try {
        await deathIcon.waitForDisplayed({ timeout: 5000 });
        console.log(`🎉 VERIFICATION SUCCESS: The death icon is correctly attached to ${actualNameOnScreen}!`);
    } catch (error) {
        throw new Error(`❌ VERIFICATION FAILED: ${actualNameOnScreen} does NOT have the death icon. Status update failed.`);
    }
}

async function main() {
    const driver = await remote({
        protocol: "http",
        hostname: "localhost",
        port: 4723,
        path: "/",
        capabilities: {
            platformName: "Android",
            "appium:deviceName": "ZD222X4TDK",
            "appium:automationName": "UiAutomator2",
            "appium:appPackage": "org.piramalswasthya.sakhi.saksham.uat",
            "appium:appActivity": "org.piramalswasthya.sakhi.ui.login_activity.LoginActivity",
            "appium:noReset": false,
            "appium:autoGrantPermissions": true,
            "appium:newCommandTimeout": 300,
            "appium:language": "en",
            "appium:locale": "US",
        }
    });

    console.log("✅ App launched successfully!");

    try {
        const myPreferredLanguage = "English";
        await selectLanguage(driver, myPreferredLanguage);

        await login(driver, "Bobita", "Test@123");
        await driver.pause(5000);

        if (typeof selectVillage !== "function") {
            throw new Error("selectVillage is not available from steps/villageSteps");
        }

        await selectVillage(driver, "Oating");
        await driver.pause(2000);

        await clickAllBeneficiaries(driver);
        await driver.pause(2000);

        // Fetch random beneficiary and save the dynamically generated full name
        const selectedName = await clickRandomBeneficiary(driver);
        await driver.pause(3000);

        await editBeneficiaryToDeath(driver);

        // Brief pause after submitting to ensure UI transitions back to list
        await driver.pause(4000);

        // Pass the full selectedName. The function will automatically grab the first name, search it, and scroll to find the full name.
        await verifyDeathStatus(driver, selectedName);

    } catch (error) {
        console.error("❌ Test failed:", error);

        try {
            const screenshot = await driver.takeScreenshot();
            const fs = require('fs');
            fs.writeFileSync(`error-${Date.now()}.png`, screenshot, 'base64');
            console.log("📸 Screenshot saved for debugging");
        } catch (screenshotError) {
            console.error("Could not take screenshot:", screenshotError);
        }
    } finally {
        console.log('🧹 Closing active sessions...');
        await driver.deleteSession();
    }
}

main().catch(err => {
    console.error("❌ Main function failed:", err);
});

module.exports = {
    clickAllBeneficiaries,
    clickRandomBeneficiary,
    editBeneficiaryToDeath,
    verifyDeathStatus
};