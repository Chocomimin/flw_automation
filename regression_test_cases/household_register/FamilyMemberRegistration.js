const { remote } = require("webdriverio");
const { selectLanguage, login } = require("../../steps/loginSteps");
const { selectVillage } = require("../../steps/villageSteps");
const { clickAllHousehold, clickNewHouseholdRegistration, acceptConsent } = require("../../steps/householdSteps");
const { fillHouseholdFormWithExamples } = require("../../steps/householdFormSteps");
const { fillHeadOfFamilyFormWithExamples } = require("../../steps/headOfFamilySteps");
const { formRegistration } = require("../../household_add_member/familyForm");
const { runTest } = require("../../household_add_member/addMember");


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

async function handleAddSpousePopup(driver) {
    console.log("🔍 Checking for 'Add Spouse' popup after HOF submission...");
    try {
        const noBtn = await driver.$('//android.widget.Button[@resource-id="android:id/button2" and @text="No"]');
        await noBtn.waitForDisplayed({ timeout: 10000 });
        await noBtn.click();
        console.log("✅ Clicked 'No' on Add Spouse popup");
        return true;
    } catch (e) {
        console.log("⏭️ 'Add Spouse' popup not found, proceeding...");
        return false;
    }
}

async function navigateBackToHome(driver) {
    console.log("🏠 Navigating back to Home/Dashboard...");

    try {
        const homeIcon = await driver.$('//android.widget.ImageView[contains(@resource-id, "home") or contains(@resource-id, "iv_home") or @content-desc="Home"]');
        if (await homeIcon.isExisting() && await homeIcon.isDisplayed()) {
            console.log("   👆 Tapping top-right Home icon...");
            await homeIcon.click();
            await driver.pause(3000);
        }
    } catch (e) {
        console.log("   ℹ️ Home icon not found, relying on hardware back button.");
    }

    for (let i = 0; i < 5; i++) {
        try {
            const allHouseholdCard = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/cv_icon").index(0)');
            if (await allHouseholdCard.isExisting() && await allHouseholdCard.isDisplayed()) {
                console.log("✅ Reached Home screen successfully!");
                return;
            }
        } catch (e) {}

        console.log("   ⬅️ Pressing hardware Back button...");
        await driver.back();
        await driver.pause(2000);
    }
    console.log("⚠️ Reached max back attempts. Proceeding to next step...");
}

async function searchAndAddMember(driver, searchName) {
    console.log(`🔍 Searching for Household Head: ${searchName} to add a member...`);
    const searchBar = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
    await searchBar.waitForDisplayed({ timeout: 10000 });
    await searchBar.click();
    await driver.pause(1000);
    await driver.keys([...searchName]);

    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    await driver.pause(2000);

    const formattedName = searchName.toUpperCase();
    const addBtn = await driver.$(
        `//android.widget.TextView[contains(@text, "${formattedName}")]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/parentCard"]//android.widget.Button[@text="Add Member"]`
    );
    await addBtn.waitForDisplayed({ timeout: 10000 });
    await addBtn.click();
    console.log(`✅ Clicked "Add Member" for ${formattedName}`);
    await driver.pause(2500);
}

async function selectGenderDialog(driver, genderInput) {
    const key = genderInput.toLowerCase();
    let resId = '';
    if (key === 'male') resId = 'rb_male';
    else if (key === 'female') resId = 'rb_female';
    else if (key === 'transgender' || key === 'trans') resId = 'rb_trans';

    console.log(`⏳ Selecting gender "${genderInput}" in dialog...`);
    const rb = await driver.$(`android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/${resId}")`);
    await rb.waitForDisplayed({ timeout: 5000 });
    await rb.click();
    console.log(`✅ Gender Selected: "${genderInput}"`);
}

async function selectRelationDialog(driver, relation) {
    console.log(`⏳ Selecting relation "${relation}"...`);
    const spinner = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rth")');
    await spinner.waitForDisplayed({ timeout: 5000 });

    const loc = await spinner.getLocation();
    const size = await spinner.getSize();
    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);

    await tapByCoords(driver, tapX, tapY);
    await driver.pause(2000);

    const item = await driver.$(`//*[@text="${relation}"]`);
    await item.waitForDisplayed({ timeout: 5000 });
    await item.click();
    console.log(`✅ Relation Selected: "${relation}"`);
}

async function clickOkButton(driver) {
    const okBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_ok")');
    await okBtn.waitForDisplayed({ timeout: 5000 });
    await okBtn.click();
    console.log(`✅ Dialog OK button clicked`);
}

async function searchNewlyAddedBeneficiary(driver, newMemberName) {
    console.log(`🔍 Verifying newly added beneficiary: ${newMemberName}...`);

    const searchBar = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
    await searchBar.waitForDisplayed({ timeout: 10000 });
    await searchBar.click();
    await searchBar.clearValue(); // Ensure search bar is empty
    await driver.pause(1000);

    await driver.keys([...newMemberName]);

    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    await driver.pause(2000);

    try {
        const formattedName = newMemberName.toUpperCase();
        const memberCard = await driver.$(`//android.widget.TextView[contains(@text, "${formattedName}")]`);

        const isAdded = await memberCard.isDisplayed();
        if(isAdded) {
            console.log(`🎉 SUCCESS: Newly added member "${newMemberName}" found! Registration completed.`);
        }
    } catch (error) {
        console.log(`❌ FAILURE: Could not locate "${newMemberName}" in the list.`);
    }
}



async function main() {
    const driver = await remote({
        protocol: "http", hostname: "localhost", port: 4723, path: "/",
        capabilities: {
            platformName: "Android",
            "appium:deviceName": "ZD222X4TDK",
            "appium:automationName": "UiAutomator2",
            "appium:appPackage": "org.piramalswasthya.sakhi.saksham.uat",
            "appium:appActivity": "org.piramalswasthya.sakhi.ui.login_activity.LoginActivity",
            "appium:noReset": false,
            "appium:autoGrantPermissions": true,
            "appium:newCommandTimeout": 300
        }
    });

    console.log("✅ App launched successfully!");

    try {
        await selectLanguage(driver, "English");
        await login(driver, "Bobita", "Test@123");
        await driver.pause(5000);
        await selectVillage(driver, "Oating");
        await driver.pause(1000);

        // ─── STEP 1: Complete Household and HOF Registration ───
        console.log("\n--- Executing Step 1: Household & HOF Registration ---");
        await clickAllHousehold(driver);
        await clickNewHouseholdRegistration(driver);
        await acceptConsent(driver);

        await fillHouseholdFormWithExamples(driver);
        await driver.pause(3000);
        await fillHeadOfFamilyFormWithExamples(driver);
        await driver.pause(4000);

        // ─── STEP 2: Handle "Add Spouse" Popup (Click NO) ───
        console.log("\n--- Executing Step 2: Handle Add Spouse Popup ---");
        await handleAddSpousePopup(driver);
        await driver.pause(2000);

        // ─── STEP 3: Go Back to Home Dashboard ───
        console.log("\n--- Executing Step 3: Navigate Back to Home ---");
        await navigateBackToHome(driver);
        await driver.pause(1000);
        await runTest(driver); // Execute the add member test
        console.log("\n--- Executing Step 4: Verifying Final Registration ---");

        // Go back home and open the Household list one last time to search
        await navigateBackToHome(driver);
        await driver.pause(1000);
        await clickAllHousehold(driver);
        await driver.pause(2000);

        // ⚠️ Replace "ACTUAL_NAME_HERE" with the name of the person you just registered!
        await searchNewlyAddedBeneficiary(driver, "Krupal Singh");
    } catch (error) {
        console.error("❌ Test failed:", error);
        try {
            const screenshot = await driver.takeScreenshot();
            require('fs').writeFileSync(`error-${Date.now()}.png`, screenshot, 'base64');
            console.log("📸 Screenshot saved for debugging");
        } catch (e) {}
    } finally {
        await driver.pause(5000);
        await driver.deleteSession();
    }
}

main().catch(err => console.error("❌ Main execution error:", err));