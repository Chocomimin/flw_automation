const { remote } = require("webdriverio");
const path = require("path");

// Absolute paths to your local APK files
const oldBuildPath = "C:\\Users\\saisa\\OneDrive\\Desktop\\flw_automation\\apks\\উৎপ্ৰেৰণা-Uat (2).apk";
const newBuildPath = "C:\\Users\\saisa\\OneDrive\\Desktop\\flw_automation\\apks\\উৎp্ৰেৰণা-Uat (1).apk";

const capabilities = {
    platformName: "Android",
    // Update this to match your current wireless device IP from 'adb devices'
    "appium:deviceName": "192.168.1.15:44444",
    "appium:automationName": "UiAutomator2",
    "appium:appPackage": "org.piramalswasthya.sakhi.saksham.uat",
    "appium:appActivity": "org.piramalswasthya.sakhi.ui.login_activity.LoginActivity",
    "appium:noReset": true, // Critical: Preserves application data/session during the upgrade
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
        return versionText;
    } catch (e) {
        console.log(`⚠️ Could not read version drawer: ${e.message}`);
        return "Unknown";
    }
}

/**
 * Helper function to handle Login and Village Selection
 */
async function loginAndSelectVillage(driver) {
    console.log('🔄 Performing Login...');
    const usernameField = await driver.$('//android.widget.EditText[@text="Username"]');
    await usernameField.waitForDisplayed({ timeout: 10000 });
    await usernameField.setValue('Bobita');

    const passwordField = await driver.$('//android.widget.EditText[@text="Password"]');
    await passwordField.setValue('Test@123');

    const loginBtn = await driver.$('//android.widget.Button[@text="Login"]');
    await loginBtn.click();

    console.log('🏡 Selecting Village...');
    const villageDropdown = await driver.$('//android.widget.Spinner[@content-desc="Select Village"]');
    await villageDropdown.waitForDisplayed({ timeout: 10000 });
    await villageDropdown.click();

    const villageOption = await driver.$('//android.widget.TextView[@text="Your Target Village"]');
    await villageOption.click();

    const submitBtn = await driver.$('//android.widget.Button[@text="Submit"]');
    await submitBtn.click();
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
        // PRE-FLIGHT: Bypass Play Protect
        // ==========================================
        console.log('🛡️ Temporarily disabling Google Play Protect to bypass pop-ups...');
        await driver.execute('mobile: shell', {
            command: 'settings',
            args: ['put', 'global', 'package_verifier_enable', '0']
        });

        // ==========================================
        // PHASE 1: Install & Set Up Old Build (2)
        // ==========================================
        console.log('\n📦 Installing Old Build (2) from laptop...');
        await driver.installApp(oldBuildPath);

        console.log('🚀 Launching Old Build...');
        await driver.activateApp('org.piramalswasthya.sakhi.saksham.uat');
        await driver.pause(5000);

        // Run initial login flow to establish local data session
        await loginAndSelectVillage(driver);
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

        // Check if the session survived the over-the-air update
        const isLoginRequiredAfterUpdate = await driver.$('//android.widget.EditText[@text="Username"]');
        try {
             await isLoginRequiredAfterUpdate.waitForDisplayed({ timeout: 5000 });
             console.log('❌ Session was cleared. Re-logging in...');
             await loginAndSelectVillage(driver);
        } catch (e) {
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