const { remote } = require('webdriverio');
const assert = require('assert');

const LOCATORS = {
    langDropdownTrigger: '//android.widget.LinearLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/ll_select_lang"]',
    bottomSheetGrid: '//android.widget.GridView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/rv_languages"]',
    loginTitle: '//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_sign_in"]',
    usernameField: '//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/et_username"]',
    passwordField: '//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/et_password"]',
    loginButton: '//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_login"]'
};

const TRANSLATIONS = [
    {
        langName: 'हिंदी',
        expected: {
            loginTitle: 'जारी रखने के लिए लॉग इन करें',
            usernameHint: 'उपयोगकर्ता नाम',
            passwordHint: 'पासवर्ड',
            loginButton: 'लॉग इन करें'
        }
    },
    {
        langName: 'English',
        expected: {
            loginTitle: 'Login',
            usernameHint: 'Username',
            passwordHint: 'Password',
            loginButton: 'Login'
        }
    },
    {
        langName: 'অসমীয়া',
        expected: {
            loginTitle: 'আগবাঢ়ি যাবলৈ লগ ইন কৰক',
            usernameHint: 'ব্যৱহাৰকাৰীৰ নাম',
            passwordHint: 'পাছৱৰ্ড',
            loginButton: 'লগইন কৰক'
        }
    },
    {
        langName: 'বাংলা',
        expected: {
            loginTitle: 'লগইন',
            usernameHint: 'ব্যবহারকারীর নাম',
            passwordHint: 'পাসওয়ার্ড',
            loginButton: 'লগইন'
        }
    }
];

async function runTests() {
    console.log('🚀 Starting standalone WebdriverIO session...');

    // 1. Manually initialize the browser session for Node.js
    const browser = await remote({
        port: 4723, // Your Appium port
        capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.niramay', // <-- UPDATE THIS
    // You may also need to update the appActivity if it changed for this build
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true
}
    });

    try {
        // 2. Loop through the translations
        for (const data of TRANSLATIONS) {
            console.log(`\n🌐 Testing Language: ${data.langName}`);

            // Note: In standalone mode, we use browser.$ instead of just $
            const dropdown = await browser.$(LOCATORS.langDropdownTrigger);
            await dropdown.waitForDisplayed({ timeout: 5000 });
            await dropdown.click();

            const grid = await browser.$(LOCATORS.bottomSheetGrid);
            await grid.waitForDisplayed({ timeout: 5000 });

            const langOption = await browser.$(`//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_lang_name" and @text="${data.langName}"]`);
            await langOption.waitForDisplayed({ timeout: 5000 });
            await langOption.click();

            await browser.pause(2000);

            const actualTitle = await browser.$(LOCATORS.loginTitle).getText();
            const actualUserHint = await browser.$(LOCATORS.usernameField).getText();
            const actualPassHint = await browser.$(LOCATORS.passwordField).getText();
            const actualBtnText = await browser.$(LOCATORS.loginButton).getText();

            assert.strictEqual(actualTitle, data.expected.loginTitle, `Title mismatch for ${data.langName}`);
            assert.strictEqual(actualUserHint, data.expected.usernameHint, `Username hint mismatch for ${data.langName}`);
            assert.strictEqual(actualPassHint, data.expected.passwordHint, `Password hint mismatch for ${data.langName}`);
            assert.strictEqual(actualBtnText, data.expected.loginButton, `Button text mismatch for ${data.langName}`);

            console.log(`✅ Passed: ${data.langName}`);
        }
    } catch (error) {
        console.error('\n❌ Test Failed:', error.message);
    } finally {
        // 3. Clean up the session when done
        console.log('\nClosing browser session...');
        await browser.deleteSession();
    }
}

// Execute the function
runTests();