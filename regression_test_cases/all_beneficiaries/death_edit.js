const assert = require('assert');
const { selectLanguage, login } = require("../../steps/loginSteps");
const { selectVillage } = require("../../steps/villageSteps");

// ─────────────────────────────────────────────────────────────
//  CORE HELPER — Scroll spinner into view
// ─────────────────────────────────────────────────────────────
async function scrollSpinnerToMiddle(browserInstance, spinnerSelector) {
    try {
        const spinner = await browserInstance.$(spinnerSelector);
        const loc = await spinner.getLocation();
        const screen = await browserInstance.getWindowRect();
        const midY = screen.height / 2;

        if (loc.y > midY + 100) {
            console.log(`⬆️  Spinner at y=${loc.y}, scrolling toward middle...`);

            const startY = Math.floor(screen.height * 0.7);
            const endY = Math.floor(screen.height * 0.3);
            const swipeX = Math.floor(screen.width / 2);

            await browserInstance.performActions([{
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
            await browserInstance.releaseActions();
            await browserInstance.pause(1500);
        }
    } catch (e) {
        console.log('⚠️  scrollSpinnerToMiddle skipped:', e.message);
    }
}

// ─────────────────────────────────────────────────────────────
//  CORE HELPER — Tap by coordinates
// ─────────────────────────────────────────────────────────────
async function tapByCoords(browserInstance, tapX, tapY) {
    await browserInstance.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: tapX, y: tapY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 150 },
            { type: 'pointerUp',   button: 0 }
        ]
    }]);
    await browserInstance.releaseActions();
    await browserInstance.pause(500);
}

// ─────────────────────────────────────────────────────────────
//  CORE HELPER — Shared spinner click + XML bounds tap
// ─────────────────────────────────────────────────────────────
async function clickSpinnerAndSelectOption(browserInstance, spinnerSelector, value, optionsList) {
    await scrollSpinnerToMiddle(browserInstance, spinnerSelector);

    const spinner = await browserInstance.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();
    console.log(`📍 Spinner @ (${loc.x}, ${loc.y}), size (${size.width}x${size.height})`);

    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);

    console.log(`📍 Tapping dropdown arrow at (${tapX}, ${tapY})`);
    await tapByCoords(browserInstance, tapX, tapY);
    await browserInstance.pause(2000);

    try {
        const item = await browserInstance.$(`//*[@text="${value}"]`);
        // REDUCED TIMEOUT TO 1000ms so it doesn't hang the runner
        await item.waitForDisplayed({ timeout: 1000 });
        await item.click();
        console.log(`✅ Selected "${value}" via XPath`);
        return;
    } catch (e) {
        console.log(`⚠️  XPath strategy failed: ${e.message}`);
    }

    try {
        const item = await browserInstance.$(`android=new UiSelector().text("${value}")`);
        // REDUCED TIMEOUT TO 1000ms so it doesn't hang the runner
        await item.waitForDisplayed({ timeout: 1000 });
        await item.click();
        console.log(`✅ Selected "${value}" via UiSelector`);
        return;
    } catch (e) {
        console.log(`⚠️  UiSelector strategy failed: ${e.message}`);
    }

    try {
        const source = await browserInstance.getPageSource();
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
                await tapByCoords(browserInstance, tapX, tapY);
                console.log(`✅ Selected "${value}" via tag parse`);
                return;
            }
        }
    } catch (e) {
        console.log(`⚠️  Tag parse failed: ${e.message}`);
    }

    const screen = await browserInstance.getWindowRect();
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
    await tapByCoords(browserInstance, finalTapX, finalTapY);
    console.log(`✅ Selected "${value}" via coordinates`);
}

// ─────────────────────────────────────────────────────────────
//  STANDARD SCRIPT FUNCTIONS
// ─────────────────────────────────────────────────────────────
async function clickAllBeneficiaries(browserInstance) {
    console.log("👆 Clicking on All Beneficiaries...");
    const allBeneficiariesBtn = await browserInstance.$('//android.widget.TextView[@text="All\nBeneficiaries"]');
    await allBeneficiariesBtn.waitForDisplayed({ timeout: 5000 });
    await allBeneficiariesBtn.click();
    console.log("✅ Successfully clicked All Beneficiaries");
}

async function clickRandomBeneficiary(browserInstance) {
    console.log("🎲 Selecting a random beneficiary...");

    const scrollCount = Math.floor(Math.random() * 3);
    if (scrollCount > 0) {
        console.log(`⬇️ Scrolling the list ${scrollCount} time(s)...`);
        const screen = await browserInstance.getWindowRect();
        const startY = Math.floor(screen.height * 0.7);
        const endY = Math.floor(screen.height * 0.3);
        const swipeX = Math.floor(screen.width / 2);

        for (let i = 0; i < scrollCount; i++) {
            await browserInstance.performActions([{
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
            await browserInstance.releaseActions();
            await browserInstance.pause(1000);
        }
    }

    const nameElements = await browserInstance.$$('id:org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id');

    assert.ok(nameElements.length > 0, "No beneficiaries found on screen to click!");

    const randomIndex = Math.floor(Math.random() * nameElements.length);
    const randomBeneficiary = nameElements[randomIndex];

    const exactName = await randomBeneficiary.getText();
    console.log(`👆 Clicking on randomly selected beneficiary: "${exactName}"...`);

    await randomBeneficiary.click();
    console.log(`✅ Successfully selected ${exactName}!`);

    return exactName;
}

async function fillDateOfDeath(browserInstance) {
    console.log("🗓️ Opening Date of Death calendar...");
    const dateField = await browserInstance.$('//android.widget.EditText[@hint="Date of Death *"]');
    await dateField.waitForDisplayed({ timeout: 5000 });
    await dateField.click();
    await browserInstance.pause(1500);

    console.log("📅 Selecting a random valid day from the current view...");
    const availableDays = await browserInstance.$$('//android.view.View[@enabled="true" and @clickable="true"]');

    if (availableDays.length > 0) {
        const randomIdx = Math.floor(Math.random() * availableDays.length);
        const randomDay = availableDays[randomIdx];
        await randomDay.click();
        console.log("🎲 Random enabled day selected!");
    } else {
        console.log("⚠️ No clickable days found in current view. Proceeding with default selection.");
    }

    await browserInstance.pause(1000);
    const okBtn = await browserInstance.$('id:android:id/button1');
    await okBtn.click();
}

async function fillTimeOfDeath(browserInstance) {
    console.log("⏰ Opening Time of Death clock...");
    const timeField = await browserInstance.$('//android.widget.EditText[@hint="Time of Death"]');
    await timeField.waitForDisplayed({ timeout: 5000 });
    await timeField.click();
    await browserInstance.pause(1500);

    const okBtn = await browserInstance.$('id:android:id/button1');
    await okBtn.waitForDisplayed({ timeout: 5000 });
    await okBtn.click();
}

async function fillDropdownsFallback(browserInstance) {
    console.log("📝 Handling Dropdowns & Spinners...");
    await browserInstance.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().descriptionContains("Reason for Death"))');
    await browserInstance.pause(1000);

    await clickSpinnerAndSelectOption(
        browserInstance,
        'android=new UiSelector().className("android.widget.Spinner").descriptionContains("Reason for Death")',
        "Natural Death",
        ["Natural Death", "Accident", "Infectious Disease", "Animal Bite Death", "Suicide", "Undetermined", "Maternal Death"]
    );

    await browserInstance.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().descriptionContains("Place of Death"))');
    await browserInstance.pause(1000);

    await clickSpinnerAndSelectOption(
        browserInstance,
        'android=new UiSelector().className("android.widget.Spinner").descriptionContains("Place of Death")',
        "Home",
        ["Home", "Subcenter", "PHC", "CHC", "District Hospital", "Medical College Hospital", "Private Hospital", "In Transit", "Other Place of Death"]
    );
}

async function editBeneficiaryToDeath(browserInstance) {
    console.log("✏️ Clicking on Edit button...");
    const editBtn = await browserInstance.$('id:org.piramalswasthya.sakhi.saksham.uat:id/fab_edit');
    await editBtn.waitForDisplayed({ timeout: 5000 });
    await editBtn.click();

    console.log("📝 Handling Consent Form...");
    const consentCheckbox = await browserInstance.$('id:org.piramalswasthya.sakhi.saksham.uat:id/checkBox');
    await consentCheckbox.waitForDisplayed({ timeout: 5000 });
    await consentCheckbox.click();

    const agreeBtn = await browserInstance.$('id:org.piramalswasthya.sakhi.saksham.uat:id/btn_positive');
    await agreeBtn.click();

    console.log("⬇️ Scrolling to find 'Death' status...");
    const deathRadioButton = await browserInstance.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("Death")`);
    await deathRadioButton.waitForDisplayed({ timeout: 5000 });
    await deathRadioButton.click();

    await fillDateOfDeath(browserInstance);
    await fillTimeOfDeath(browserInstance);

    // --- ADDED: Ensure keyboard is closed before interacting with dropdowns ---
    if (await browserInstance.isKeyboardShown()) {
        console.log("⌨️ Hiding keyboard before interacting with dropdowns...");
        await browserInstance.hideKeyboard();
        await browserInstance.pause(1000);
    }
    // -------------------------------------------------------------------------

    await fillDropdownsFallback(browserInstance);

    console.log("🚀 Submitting Death form...");
    await browserInstance.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"))').catch(() => {});

    const submitBtn = await browserInstance.$('id:org.piramalswasthya.sakhi.saksham.uat:id/btn_submit');
    await submitBtn.waitForDisplayed({ timeout: 5000 });
    await submitBtn.click();

    console.log("👀 Waiting for Preview screen...");
    const finalSubmitBtn = await browserInstance.$('id:org.piramalswasthya.sakhi.saksham.uat:id/btnSubmitPreview');
    await finalSubmitBtn.waitForDisplayed({ timeout: 10000 });
    await finalSubmitBtn.click();

    console.log("🔎 Checking for 'Add Children' popup...");
    try {
        const noButton = await browserInstance.$('//*[@text="No"]');
        await noButton.waitForDisplayed({ timeout: 5000 });
        await noButton.click();
    } catch (error) {
        console.log("➡️ 'Add Children' popup did not appear. Moving on.");
    }
}

async function verifyDeathStatus(browserInstance, fullName) {
    const firstName = fullName.split(' ')[0];
    console.log(`\n🔍 Verifying death status for: "${fullName}" (Searching by: "${firstName}")...`);

    const searchInput = await browserInstance.$('id:org.piramalswasthya.sakhi.saksham.uat:id/searchView');
    await searchInput.waitForDisplayed({ timeout: 5000 });
    await searchInput.click();
    await browserInstance.pause(500);
    await searchInput.clearValue();
    await searchInput.setValue(firstName);

    if (await browserInstance.isKeyboardShown()) {
        await browserInstance.hideKeyboard();
    }

    await browserInstance.pause(2000);

    let beneficiaryCard;
    try {
        beneficiaryCard = await browserInstance.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${fullName}"))`);
        await beneficiaryCard.waitForDisplayed({ timeout: 10000 });
    } catch (error) {
        assert.fail(`Beneficiary ${fullName} not found after searching for ${firstName} and scrolling!`);
    }

    const actualNameOnScreen = await beneficiaryCard.getText();
    const specificDeathIconXpath = `//android.widget.TextView[@text="${actualNameOnScreen}"]/following-sibling::android.widget.ImageView[@content-desc="Death"]`;
    const deathIcon = await browserInstance.$(specificDeathIconXpath);

    try {
        await deathIcon.waitForDisplayed({ timeout: 5000 });
        console.log(`🎉 VERIFICATION SUCCESS: The death icon is correctly attached to ${actualNameOnScreen}!`);
    } catch (error) {
        assert.fail(`${actualNameOnScreen} does NOT have the death icon. Status update failed.`);
    }
}

// ─────────────────────────────────────────────────────────────
//  MOCHA TEST RUNNER EXECUTION BLOCK
// ─────────────────────────────────────────────────────────────
describe('Beneficiary Registration / Death Reports', () => {

    // Mapped to AR-1343 from image_5450a1.png
    it('(Qase ID: 1343) - Verify beneficiary death registration and movement to appropriate Death Report module based on beneficiary status', async () => {

        const myPreferredLanguage = "English";
        await selectLanguage(browser, myPreferredLanguage);

        await login(browser, "Bobita", "Test@123");
        await browser.pause(5000);

        assert.strictEqual(typeof selectVillage, "function", "selectVillage is not available from steps/villageSteps");

        await selectVillage(browser, "Oating");
        await browser.pause(2000);

        await clickAllBeneficiaries(browser);
        await browser.pause(2000);

        const selectedName = await clickRandomBeneficiary(browser);
        await browser.pause(3000);

        await editBeneficiaryToDeath(browser);
        await browser.pause(4000);

        await verifyDeathStatus(browser, selectedName);
    });
});