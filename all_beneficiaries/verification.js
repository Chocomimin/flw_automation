const { remote } = require("webdriverio");
const { selectLanguage, login } = require("../steps/loginSteps");
const { selectVillage } = require("../steps/villageSteps");

// ==========================================
// CONFIGURATION & TEST DATA
// ==========================================
const APP_PACKAGE = "org.piramalswasthya.sakhi.saksham.uat";
const APP_ACTIVITY = "org.piramalswasthya.sakhi.ui.login_activity.LoginActivity";

const capabilities = {
    platformName: "Android",
    "appium:deviceName": "ZD222X4TDK",
    "appium:automationName": "UiAutomator2",
    "appium:appPackage": APP_PACKAGE,
    "appium:appActivity": APP_ACTIVITY,
    "appium:noReset": false,
    "appium:autoGrantPermissions": true,
    "appium:newCommandTimeout": 300,
    "appium:language": "en",
    "appium:locale": "US",
    "appium:enforceXPath1": true
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

async function handleAllPermissions(driver) {
    console.log("🔍 Checking for permission dialogs...");
    const allowButtonSelectors = [
        'android=new UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_button")',
        'android=new UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_foreground_only_button")',
        'android=new UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_one_time_button")',
        'android=new UiSelector().textMatches("(?i)allow")'
    ];

    for (let i = 0; i < 5; i++) {
        let clicked = false;
        for (const selector of allowButtonSelectors) {
            try {
                const btn = await driver.$(selector);
                if (await btn.isDisplayed()) {
                    await btn.click();
                    console.log("✅ Clicked 'Allow' on permission dialog.");
                    await driver.pause(1000);
                    clicked = true;
                    break;
                }
            } catch (e) {}
        }
        if (!clicked) break;
    }
}

async function navigateToAllBeneficiaries(driver) {
    console.log("🔍 Navigating to 'All Beneficiaries' from Dashboard...");
    const allBenBtn = await driver.$('android=new UiSelector().textContains("Beneficiaries").resourceId("org.piramalswasthya.sakhi.saksham.uat:id/textView2")');
    await allBenBtn.waitForDisplayed({ timeout: 15000 });
    await allBenBtn.click();
    console.log("✔ Clicked All Beneficiaries. Waiting for list to load...");
    await driver.pause(3000);
}

/**
 * PHASE 1 ENGINE: Scrolls through the list, finds the elements,
 * and extracts the Name of the beneficiary attached to those elements.
 * Features a DYNAMIC SPEED scroll: Switches to high-speed fling once the child is found.
 */
async function discoverAndNoteBeneficiaries(driver) {
    console.log(`\n🔍 Scrolling through list to discover and NOTE DOWN one Child record and one Death record...`);

    let notedRecords = {
        childName: null,
        deathName: null
    };

    let swipeCount = 0;
    const maxSwipes = 60;

    while ((!notedRecords.childName || !notedRecords.deathName) && swipeCount < maxSwipes) {

        // Check for Child Record and Extract Name
        if (!notedRecords.childName) {
            const childNameXPath = `//android.widget.Button[contains(@text, "View Children") or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_view_children"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id"]`;

            const childNameEl = await driver.$(childNameXPath);
            if (await childNameEl.isDisplayed().catch(() => false)) {
                notedRecords.childName = await childNameEl.getText();
                console.log(`📝 [NOTED] Found Child Record attached to Beneficiary: "${notedRecords.childName}"`);
            }
        }

        // Check for Death Record and Extract Name
        if (!notedRecords.deathName) {
            const deathNameXPath = `//android.widget.ImageView[@content-desc="Death" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/iv_isDeath"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id"]`;

            const deathNameEl = await driver.$(deathNameXPath);
            if (await deathNameEl.isDisplayed().catch(() => false)) {
                notedRecords.deathName = await deathNameEl.getText();
                console.log(`📝 [NOTED] Found Death Record attached to Beneficiary: "${notedRecords.deathName}"`);
            }
        }

        // Stop scrolling immediately if we have captured names for both
        if (notedRecords.childName && notedRecords.deathName) {
            console.log("🎉 Successfully noted down BOTH beneficiaries!");
            break;
        }

        // 🚀 DYNAMIC SCROLL SPEED LOGIC
        try {
            if (notedRecords.childName && !notedRecords.deathName) {
                // If Child is found, Death is far at the bottom. Use fast 'flingForward' to zip down.
                console.log(`⚡ Fast-forwarding to the bottom... (Fling ${swipeCount + 1}/${maxSwipes})`);
                await driver.$('android=new UiScrollable(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/rv_any")).flingForward()');
                await driver.pause(300); // Extremely short pause for high-speed evaluation
            } else {
                // Normal, methodical scroll if we are still hunting for the Child record
                console.log(`🔄 Scrolling down to discover... (Swipe ${swipeCount + 1}/${maxSwipes})`);
                await driver.$('android=new UiScrollable(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/rv_any")).scrollForward()');
                await driver.pause(1000);
            }
        } catch (e) {
            console.log("⚠️ Reached the absolute bottom of the beneficiary list.");
            break;
        }
        swipeCount++;
    }

    if (!notedRecords.childName || !notedRecords.deathName) {
        throw new Error(`❌ [FAILURE] Could not discover both records. Child: ${notedRecords.childName || "MISSING"}, Death: ${notedRecords.deathName || "MISSING"}`);
    }

    return notedRecords;
}

/**
 * PHASE 4 ENGINE: Searches for the noted beneficiaries by name and verifies their status icons/buttons.
 */
async function verifyBeneficiaryRecord(driver, fullName, recordType) {
    console.log(`\n🔍 Post-Install Verification: Searching for ${recordType} record -> "${fullName}"...`);

    const searchView = await driver.$('id=org.piramalswasthya.sakhi.saksham.uat:id/searchView');
    await searchView.waitForDisplayed({ timeout: 10000 });
    await searchView.click();
    await driver.pause(500);

    // Space bug workaround: Split and type only the first name
    const searchKeyword = fullName.split(' ')[0];
    await searchView.setValue(searchKeyword);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();

    console.log(`⏳ Waiting for search results to filter...`);
    await driver.pause(3000);

    let elementXPath = '';
    if (recordType === 'Child') {
        elementXPath = `//android.widget.Button[contains(@text, "View Children") or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_view_children"]`;
    } else if (recordType === 'Death') {
        elementXPath = `//android.widget.ImageView[@content-desc="Death" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/iv_isDeath"]`;
    }

    const expectedElement = await driver.$(elementXPath);
    const isPresent = await expectedElement.isDisplayed().catch(() => false);

    if (isPresent) {
        console.log(`✅ [VERIFIED] ${recordType} identifier successfully retained for "${fullName}"!`);
    } else {
        throw new Error(`❌ [FAILURE] ${recordType} identifier NOT FOUND for "${fullName}" after reinstall.`);
    }

    // Clear the search bar for the next query
    console.log(`🧹 Clearing search bar...`);
    await searchView.click();
    await searchView.clearValue();
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    await driver.pause(1500);
}

// ==========================================
// MAIN EXECUTION
// ==========================================

async function main() {
    const driver = await remote({
        protocol: "http",
        hostname: "localhost",
        port: 4723,
        path: "/",
        capabilities
    });

    console.log("✅ App launched successfully!");

    try {
        // ─────────────────────────────────────────────────────────────────
        // PHASE 1: DISCOVER AND NOTE DATA
        // ─────────────────────────────────────────────────────────────────
        console.log("\n--- PHASE 1: Initial Login & Data Discovery ---");
        await handleAllPermissions(driver);
        await selectLanguage(driver, "English");
        await login(driver, "Bobita", "Test@123");
        await driver.pause(5000);

        await selectVillage(driver, "Oating");
        await driver.pause(2000);
        await handleAllPermissions(driver);

        await navigateToAllBeneficiaries(driver);

        // Let the script scroll, find the elements, and save the exact names
        const notedBeneficiaries = await discoverAndNoteBeneficiaries(driver);

        // ─────────────────────────────────────────────────────────────────
        // PHASE 2: UNINSTALL
        // ─────────────────────────────────────────────────────────────────
        console.log("\n--- PHASE 2: Uninstalling Application ---");
        console.log(`🗑️ Removing app package: ${APP_PACKAGE}...`);
        await driver.removeApp(APP_PACKAGE);
        console.log("✅ App uninstalled successfully.");
        await driver.pause(3000);

        // ─────────────────────────────────────────────────────────────────
        // PHASE 3: REINSTALL FROM DEVICE STORAGE
        // ─────────────────────────────────────────────────────────────────
        console.log("\n--- PHASE 3: Reinstalling Application ---");
        const phoneApkPath = '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Documents/উৎপ্ৰেৰণা-Uat.apk';
        const tmpApkPath = '/data/local/tmp/temp_update.apk';

        console.log('📋 Copying APK to temporary directory...');
        await driver.execute('mobile: shell', {
            command: 'cp',
            args: [`"${phoneApkPath}"`, tmpApkPath]
        });

        console.log('📦 Installing build...');
        const installResult = await driver.execute('mobile: shell', {
            command: 'pm',
            args: ['install', tmpApkPath]
        });
        console.log('Install Result:', installResult);

        console.log('🧹 Cleaning up temp APK file...');
        await driver.execute('mobile: shell', {
            command: 'rm',
            args: [tmpApkPath]
        });

        console.log('🔄 Relaunching the app...');
        await driver.activateApp(APP_PACKAGE);
        await driver.pause(8000);

        // ─────────────────────────────────────────────────────────────────
        // PHASE 4: POST-REINSTALL VERIFICATION
        // ─────────────────────────────────────────────────────────────────
        console.log("\n--- PHASE 4: Post-Install Login & Final Verification ---");
        await handleAllPermissions(driver);
        await selectLanguage(driver, "English");
        await login(driver, "Bobita", "Test@123");
        await driver.pause(5000);

        await selectVillage(driver, "Oating");
        await driver.pause(2000);
        await handleAllPermissions(driver);

        await navigateToAllBeneficiaries(driver);

        // Pass the dynamically discovered names into the validation function
        await verifyBeneficiaryRecord(driver, notedBeneficiaries.childName, 'Child');
        await verifyBeneficiaryRecord(driver, notedBeneficiaries.deathName, 'Death');

        console.log("\n🎉 TEST PASSED: Specific Child records and Death records were successfully restored and verified post-reinstallation!");

    } catch (error) {
        console.error("\n❌ Test failed:", error.message);
        try {
            const screenshot = await driver.takeScreenshot();
            const fs = require('fs');
            const fileName = `error-reinstall-test-${Date.now()}.png`;
            fs.writeFileSync(fileName, screenshot, 'base64');
            console.log(`📸 Screenshot saved for debugging: ${fileName}`);
        } catch (screenshotError) {
            console.error("Could not take screenshot:", screenshotError.message);
        }
    } finally {
        if (driver) {
            console.log("🛑 Closing Appium session...");
            await driver.pause(2000);
            await driver.deleteSession();
        }
    }
}

main().catch(err => {
    console.error("❌ Main function failed:", err);
});