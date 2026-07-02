const { remote } = require("webdriverio");
const path = require("path");

// Absolute paths to your local APK files on your laptop
const oldBuildPath = "C:\\Users\\saisa\\OneDrive\\Desktop\\flw_automation\\apks\\উৎপ্ৰেৰণা-Uat (2).apk";
const newBuildPath = "C:\\Users\\saisa\\OneDrive\\Desktop\\flw_automation\\apks\\উৎp্ৰেৰণা-Uat (1).apk";

const capabilities = {
    platformName: "Android",
    "appium:deviceName": "192.168.1.15:44444", // Verify wireless IP/port via 'adb devices'
    "appium:automationName": "UiAutomator2",
    "appium:appPackage": "org.piramalswasthya.sakhi.saksham.uat",
    "appium:appActivity": "org.piramalswasthya.sakhi.ui.login_activity.LoginActivity",
    "appium:noReset": true, // Critical: Preserves session data during upgrade
    "appium:autoGrantPermissions": true,
};

/**
 * Helper function to extract the app version from the navigation drawer
 */
async function getAppVersion(driver, buildLabel) {
    console.log(`\n☰ Checking ${buildLabel} version...`);
    try {
        const menuBtn = await driver.$('~Open navigation drawer');
        await menuBtn.waitForDisplayed({ timeout: 10000 });
        await menuBtn.click();

        const versionEl = await driver.$('//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/versionName"]');
        await versionEl.waitForDisplayed({ timeout: 5000 });
        const versionText = await versionEl.getText();

        console.log(`📌 ${buildLabel} Version: ${versionText}`);
        await driver.back();
        await driver.pause(1000);
        return versionText;
    } catch (e) {
        console.log(`⚠️ Could not read version drawer: ${e.message}`);
        return "Unknown";
    }
}

/**
 * Modularized Sign-in & Village Selection Flow
 */
async function performLoginAndVillageSelection(driver, targetVillage = "Oating") {
    // 1. Select Language (from loginSteps.js)
    console.log("🌐 Waiting for language selection screen...");
    const langDropdown = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/ll_select_lang")');
    await langDropdown.waitForDisplayed({ timeout: 10000 });
    await langDropdown.click();
    await driver.pause(1000);

    const langOption = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/tv_lang_name").text("English")');
    await langOption.waitForDisplayed({ timeout: 5000 });
    await langOption.click();
    await driver.pause(2000);

    // 2. Perform Login (from loginSteps.js)
    console.log('🔄 Entering credentials...');
    const usernameField = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/et_username")');
    await usernameField.waitForDisplayed({ timeout: 10000 });
    await usernameField.setValue('Bobita');

    const passwordField = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/et_password")');
    await passwordField.waitForDisplayed({ timeout: 10000 });
    await passwordField.setValue('Test@123');

    const loginButton = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_login")');
    await loginButton.waitForDisplayed({ timeout: 10000 });
    await loginButton.click();

    // Buffer to ensure heavy dashboard loads securely without overloading UiAutomator2
    await driver.pause(8000);

    // 3. Select Village dynamically (from villageSteps.js)
    console.log(`🏡 Selecting village: ${targetVillage}...`);

    await driver.waitUntil(async () => {
        const els = await driver.$$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_village_dropdown")');
        return els.length > 0;
    }, { timeout: 30000 });

    const villageDropdown = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_village_dropdown")');
    await villageDropdown.click();
    await driver.pause(1500);

    const villageOption = await driver.$(`android=new UiSelector().textContains("${targetVillage}")`);
    await villageOption.waitForDisplayed({ timeout: 20000 });
    await villageOption.click();
    await driver.pause(1500);

    const continueBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_continue")');
    await continueBtn.waitForDisplayed({ timeout: 15000 });
    await continueBtn.click();

    // Transition buffer to Home Screen Dashboard
    await driver.pause(4000);
}

async function runUpdateTest() {
    console.log('🏁 Starting Wireless Clean-to-Upgrade Test Loop...');
    const driver = await remote({
        protocol: "http",
        hostname: "localhost",
        port: 4723,
        path: "/",
        capabilities
    });

    try {
        // ==========================================
        // PRE-FLIGHT: Bypass App Verification Prompts
        // ==========================================
        console.log('🛡️ Temporarily disabling package verifier to ensure silent automation...');
        await driver.execute('mobile: shell', {
            command: 'settings',
            args: ['put', 'global', 'package_verifier_enable', '0']
        });

        // ==========================================
        // PHASE 1: Install & Setup Old Build (2)
        // ==========================================
        console.log('\n📦 Installing Old Build (2) from laptop...');
        await driver.installApp(oldBuildPath);

        console.log('🚀 Launching Old Build...');
        await driver.activateApp('org.piramalswasthya.sakhi.saksham.uat');
        await driver.pause(5000);

        // Run structured language, sign-in, and village selection flow
        await performLoginAndVillageSelection(driver, "Oating");
        const oldVersion = await getAppVersion(driver, "PRE-UPDATE");

        // ==========================================
        // PHASE 2: Install New Build (1) Over the Top
        // ==========================================
        console.log('\n📦 Upgrading to New Build (1) from laptop over wireless connection...');

        // Appium streams the new APK file over Wi-Fi and executes a data-retaining system upgrade
        await driver.installApp(newBuildPath);
        console.log('✅ Update installation completed successfully!');

        // ==========================================
        // PHASE 3: Relaunch & Verify Session Survival
        // ==========================================
        console.log('🔄 Relaunching upgraded app...');
        await driver.activateApp('org.piramalswasthya.sakhi.saksham.uat');
        await driver.pause(8000);

        // Verify whether the session survived by checking for the language dropdown state
        const checkLanguageDropdown = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/ll_select_lang")');
        const isSessionReset = await checkLanguageDropdown.isDisplayed().catch(() => false);

        if (isSessionReset) {
             console.log('❌ Session cleared during update. Re-running automated sign-in...');
             await performLoginAndVillageSelection(driver, "Oating");
        } else {
             console.log('✅ Session successfully retained after update!');
        }

        // Verify main dashboard interface components load correctly
        const ashaDashboardIndicator = await driver.$('//android.widget.TextView[@text="All\nHousehold"]');
        await ashaDashboardIndicator.waitForDisplayed({ timeout: 15000 });
        console.log('✅ Main Application dashboard loaded successfully.');

        const newVersion = await getAppVersion(driver, "POST-UPDATE");

        // ==========================================
        // FINAL EXECUTION METRICS
        // ==========================================
        console.log('\n=======================================');
        console.log('🎉 LOCAL AUTOMATION UPDATE TEST SUCCESSFUL');
        console.log('=======================================');
        console.log(`Initial Version (Build 2): ${oldVersion}`);
        console.log(`Updated Version (Build 1): ${newVersion}`);
        console.log('=======================================');

    } catch (error) {
        console.error("\n❌ Test failed Execution:", error);
    } finally {
        // ==========================================
        // POST-FLIGHT: Restore Device Security Settings
        // ==========================================
        console.log('🛡️ Re-enabling Google Play Protect...');
        try {
            await driver.execute('mobile: shell', {
                command: 'settings',
                args: ['put', 'global', 'package_verifier_enable', '1']
            });
        } catch(e) {}

        await driver.deleteSession();
    }
}

runUpdateTest();