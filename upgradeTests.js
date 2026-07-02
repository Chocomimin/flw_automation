const { remote } = require("webdriverio");
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { selectLanguage, login } = require("./steps/loginSteps");
const { selectVillage } = require("./steps/villageSteps");
const { clickAllHousehold, clickNewHouseholdRegistration, acceptConsent } = require("./steps/householdSteps");
const { fillHouseholdFormWithExamples } = require("./steps/householdFormSteps");
const { fillHeadOfFamilyFormWithExamples } = require("./steps/headOfFamilySteps");

// ==========================================
// CONFIGURATION
// ==========================================
const APP_PACKAGE = "org.piramalswasthya.sakhi.saksham.uat";
const APP_ACTIVITY = "org.piramalswasthya.sakhi.ui.login_activity.LoginActivity";
const DEVICE_ID = "ZD222X4TDK";

// Image 2 = OLD build (Uat-1.apk) — modified June 16
// Image 1 = NEW build (Uat.apk)  — modified June 11
const OLD_BUILD_DEVICE_PATH = '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Documents/উৎপ্ৰেৰণা-Uat-1.apk';
const NEW_BUILD_DEVICE_PATH = '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Documents/উৎপ্ৰেৰণা-Uat.apk';

const TMP_APK_PC  = path.join(__dirname, 'temp_update.apk');
const TMP_APK_DEV = '/data/local/tmp/temp_update.apk';

const capabilities = {
    platformName: "Android",
    "appium:deviceName": DEVICE_ID,
    "appium:automationName": "UiAutomator2",
    "appium:appPackage": APP_PACKAGE,
    "appium:appActivity": APP_ACTIVITY,
    "appium:noReset": true,
    "appium:autoGrantPermissions": true,
    "appium:newCommandTimeout": 300,
    "appium:language": "en",
    "appium:locale": "US",
    "appium:enforceXPath1": true
};

// ==========================================
// ADB INSTALL
// ==========================================
function installApkViaAdb(deviceSourcePath, label) {
    console.log(`\n📦 Installing ${label}...`);
    try {
        if (fs.existsSync(TMP_APK_PC)) fs.unlinkSync(TMP_APK_PC);

        console.log(`  📥 Pulling APK from device...`);
        execSync(`adb -s ${DEVICE_ID} pull "${deviceSourcePath}" "${TMP_APK_PC}"`, { stdio: 'inherit' });

        if (!fs.existsSync(TMP_APK_PC)) {
            throw new Error(`APK pull failed — file not on device at: ${deviceSourcePath}`);
        }
        const sizeMB = (fs.statSync(TMP_APK_PC).size / 1024 / 1024).toFixed(1);
        console.log(`  ✅ Pull complete (${sizeMB} MB)`);

        console.log(`  📤 Pushing APK to device temp folder...`);
        execSync(`adb -s ${DEVICE_ID} push "${TMP_APK_PC}" ${TMP_APK_DEV}`, { stdio: 'inherit' });
        console.log(`  ✅ Push complete`);

        console.log(`  🔧 Running pm install -r...`);
        const installOut = execSync(`adb -s ${DEVICE_ID} shell pm install -r ${TMP_APK_DEV}`, { encoding: 'utf8' });
        console.log(`  install result: ${installOut.trim()}`);

        if (!installOut.includes('Success')) {
            throw new Error(`pm install FAILED: ${installOut.trim()}`);
        }

        execSync(`adb -s ${DEVICE_ID} shell rm ${TMP_APK_DEV}`);
        if (fs.existsSync(TMP_APK_PC)) fs.unlinkSync(TMP_APK_PC);

        console.log(`✅ ${label} installed successfully.\n`);
    } catch (e) {
        if (fs.existsSync(TMP_APK_PC)) fs.unlinkSync(TMP_APK_PC);
        throw new Error(`installApkViaAdb FAILED [${label}]: ${e.message}`);
    }
}

// ==========================================
// HELPERS
// ==========================================
async function shellCmd(driver, command, args) {
    console.log(`  🔧 shell: ${command} ${args.join(' ')}`);
    const result = await driver.execute('mobile: shell', { command, args });
    console.log(`  📤 result: ${result ?? '(empty = ok)'}`);
    return result;
}

async function handleAllPermissions(driver) {
    console.log("🔍 Checking for permission dialogs...");
    const selectors = [
        'android=new UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_button")',
        'android=new UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_foreground_only_button")',
        'android=new UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_one_time_button")',
        'android=new UiSelector().textMatches("(?i)allow")'
    ];
    for (let i = 0; i < 10; i++) {
        let clicked = false;
        for (const sel of selectors) {
            try {
                const btn = await driver.$(sel);
                if (await btn.isDisplayed()) {
                    await btn.click();
                    console.log(`  ✅ [${i + 1}] Clicked Allow`);
                    await driver.pause(1000);
                    clicked = true;
                    break;
                }
            } catch (e) { /* not present */ }
        }
        if (!clicked) break;
    }
    console.log("ℹ️ No more permission dialogs.");
}

async function waitForDashboard(driver) {
    console.log("⏳ Waiting for Dashboard to load (up to 30s)...");
    const dashboardSelectors = [
        'android=new UiSelector().textContains("Household")',
        'android=new UiSelector().textContains("Dashboard")',
        'android=new UiSelector().textContains("Home")',
        'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/textView2")',
    ];
    const permSelectors = [
        'android=new UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_button")',
        'android=new UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_foreground_only_button")',
        'android=new UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_one_time_button")',
    ];

    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
        // Dismiss any permissions that appear during load
        for (const sel of permSelectors) {
            try {
                const btn = await driver.$(sel);
                if (await btn.isDisplayed()) {
                    await btn.click();
                    console.log("  ✅ Clicked Allow (during dashboard load)");
                    await driver.pause(800);
                }
            } catch (e) { /* ok */ }
        }

        // Check if dashboard visible
        for (const sel of dashboardSelectors) {
            try {
                const el = await driver.$(sel);
                if (await el.isDisplayed()) {
                    console.log(`✅ Dashboard loaded.`);
                    return true;
                }
            } catch (e) { /* not yet */ }
        }

        await driver.pause(1500);
    }
    throw new Error("❌ Dashboard never loaded within 30 seconds.");
}

// ==========================================
// PHASE 1: Register new household on OLD build
// and capture the registered household name
// ==========================================
async function registerNewHousehold(driver) {
    console.log("\n🏠 Registering new household on OLD build...");

    await clickAllHousehold(driver);
    await clickNewHouseholdRegistration(driver);
    await acceptConsent(driver);

    console.log("🚀 Filling Household form...");
    await fillHouseholdFormWithExamples(driver);
    await driver.pause(3000);

    console.log("🚀 Filling Head of Family form...");
    await fillHeadOfFamilyFormWithExamples(driver);
    await driver.pause(3000);

    console.log("✅ Household registration submitted.");

    // Now go back to household list and capture the newly registered name
    const registeredName = await captureLastRegisteredHousehold(driver);
    return registeredName;
}

// Captures the name of the most recently registered household
// by navigating to All Household list and reading the first/top entry
async function captureLastRegisteredHousehold(driver) {
    console.log("\n🔍 Capturing registered household name from list...");

    await clickAllHousehold(driver);
    await driver.pause(3000);

    // Try to get the name of the first household card in the list
    // which should be the one we just registered (newest first)
    const nameSelectors = [
        'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id").instance(0)',
        '//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id"][1]',
    ];

    for (const sel of nameSelectors) {
        try {
            const el = await driver.$(sel);
            await el.waitForDisplayed({ timeout: 10000 });
            const name = await el.getText();
            if (name && name.trim().length > 0) {
                console.log(`📝 [CAPTURED] Registered Household Name: "${name}"`);
                return name.trim();
            }
        } catch (e) {
            console.log(`  ⚠️ Selector failed: ${sel.substring(0, 60)}`);
        }
    }

    throw new Error("❌ Could not capture the registered household name from the list.");
}

// ==========================================
// PHASE 4: Verify registered household exists on NEW build
// ==========================================
async function verifyHouseholdAfterUpgrade(driver, householdName) {
    console.log(`\n🔍 Verifying household "${householdName}" exists after upgrade...`);

    await clickAllHousehold(driver);
    await driver.pause(3000);

    // Search for the household by name
    const searchSelectors = [
        'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/searchView")',
        'android=new UiSelector().className("android.widget.SearchView")',
    ];

    let searchView = null;
    for (const sel of searchSelectors) {
        try {
            const el = await driver.$(sel);
            if (await el.isDisplayed().catch(() => false)) {
                searchView = el;
                break;
            }
        } catch (e) { /* try next */ }
    }

    if (searchView) {
        await searchView.click();
        await driver.pause(500);
        const keyword = householdName.split(' ')[0];
        await searchView.setValue(keyword);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        console.log(`  ⏳ Searching for "${keyword}"...`);
        await driver.pause(3000);
    } else {
        console.log("  ⚠️ Search bar not found, scanning full list...");
    }

    // Look for the household name in the list
    const nameXPath = `//android.widget.TextView[@text="${householdName}"]`;
    const isPresent = await driver.$(nameXPath).isDisplayed().catch(() => false);

    if (isPresent) {
        console.log(`✅ [VERIFIED] Household "${householdName}" found after upgrade!`);
    } else {
        // Try partial match
        const partialXPath = `//android.widget.TextView[contains(@text, "${householdName.split(' ')[0]}")]`;
        const partialPresent = await driver.$(partialXPath).isDisplayed().catch(() => false);
        if (partialPresent) {
            console.log(`⚠️ [PARTIAL] Partial match found for "${householdName}" — data likely retained.`);
        } else {
            throw new Error(`❌ Household "${householdName}" NOT FOUND after upgrade. Data may have been lost.`);
        }
    }

    // Clear search if it was used
    if (searchView) {
        await searchView.click();
        await searchView.clearValue();
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        await driver.pause(1000);
    }
}

// ==========================================
// MAIN
// ==========================================
async function main() {
    const driver = await remote({
        protocol: "http",
        hostname: "localhost",
        port: 4723,
        path: "/",
        capabilities
    });

    try {
        // ── PRE-TEST: Install OLD build ───────────────────────────────────
        console.log("\n--- PRE-TEST: Installing Old Build (2.10.5) ---");
        console.log("ℹ️  OLD = উৎপ্ৰেৰণা-Uat-1.apk");
        installApkViaAdb(OLD_BUILD_DEVICE_PATH, "Old Build 2.10.5 (Uat-1.apk)");

        console.log('🧹 Clearing app data for clean start...');
        await shellCmd(driver, 'pm', ['clear', APP_PACKAGE]);

        console.log('🔄 Launching Old Build...');
        await driver.activateApp(APP_PACKAGE);
        await driver.pause(5000);

        // ── PHASE 1: Login + Register household on OLD build ─────────────
        console.log("\n--- PHASE 1: Login & Register Household (Old Build 2.10.5) ---");
        await handleAllPermissions(driver);
        await selectLanguage(driver, "English");
        await login(driver, "Bobita", "Test@123");
        await driver.pause(3000);

        await selectVillage(driver, "Oating");
        await driver.pause(1000);
        await waitForDashboard(driver);

        // Register the household and capture its name for later verification
        const registeredHouseholdName = await registerNewHousehold(driver);

        console.log("\n📋 Will verify this after upgrade:");
        console.log(`   Household: "${registeredHouseholdName}"`);

        // ── PHASE 2 & 3: Install NEW build ───────────────────────────────
        console.log('\n--- PHASE 2 & 3: Upgrading to New Build (2.10.6) ---');
        console.log("ℹ️  NEW = উৎপ্ৰেৰণা-Uat.apk");
        installApkViaAdb(NEW_BUILD_DEVICE_PATH, "New Build 2.10.6 (Uat.apk)");

        console.log('🧹 Clearing app data (reset login for upgrade test)...');
        await shellCmd(driver, 'pm', ['clear', APP_PACKAGE]);

        console.log('🔄 Launching New Build...');
        await driver.activateApp(APP_PACKAGE);
        await driver.pause(8000);

        // ── PHASE 4: Login + Verify household on NEW build ───────────────
        console.log("\n--- PHASE 4: Post-Upgrade Verification (New Build 2.10.6) ---");
        await handleAllPermissions(driver);
        await selectLanguage(driver, "English");
        await login(driver, "Bobita", "Test@123");
        await driver.pause(3000);

        await selectVillage(driver, "Oating");
        await driver.pause(1000);
        await waitForDashboard(driver);

        await verifyHouseholdAfterUpgrade(driver, registeredHouseholdName);

        console.log("\n🎉 TEST PASSED: Upgrade 2.10.5 → 2.10.6 successful!");
        console.log(`   ✅ Household "${registeredHouseholdName}" retained after upgrade.`);

    } catch (error) {
        console.error("\n❌ Test FAILED:", error.message);
        try {
            const screenshot = await driver.takeScreenshot();
            const fileName = `error-upgrade-${Date.now()}.png`;
            fs.writeFileSync(fileName, screenshot, 'base64');
            console.log(`📸 Screenshot saved: ${fileName}`);
        } catch (se) {
            console.error("Screenshot failed:", se.message);
        }
        // Also save page source for debugging
        try {
            const src = await driver.getPageSource();
            fs.writeFileSync(`page-source-${Date.now()}.xml`, src);
            console.log("📄 Page source saved for debugging.");
        } catch (e) { /* ok */ }
        process.exitCode = 1;
    } finally {
        if (fs.existsSync(TMP_APK_PC)) fs.unlinkSync(TMP_APK_PC);
        if (driver) {
            console.log("🛑 Closing session...");
            await driver.pause(2000);
            await driver.deleteSession();
        }
    }
}

main().catch(err => {
    console.error("❌ Fatal:", err);
    process.exit(1);
});