const assert = require('assert');
// 1. Import qase from your newly installed reporter
const { qase } = require('@qase/wdio-reporter');

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
        qaseId: 1,
        langName: 'हिंदी',
        expected: {
            loginTitle: 'जारी रखने के लिए लॉग इन करें',
            usernameHint: 'उपयोगकर्ता नाम',
            passwordHint: 'पासवर्ड',
            loginButton: 'लॉग इन करें'
        }
    },
    {
        qaseId: 2,
        langName: 'English',
        expected: {
            loginTitle: 'Login',
            usernameHint: 'Username',
            passwordHint: 'Password',
            loginButton: 'Login'
        }
    },
    {
        qaseId: 3,
        langName: 'অসমীয়া',
        expected: {
            loginTitle: 'আগবাঢ়ি যাবলৈ লগ ইন কৰক',
            usernameHint: 'ব্যৱহাৰকাৰীৰ নাম',
            passwordHint: 'পাছৱৰ্ড',
            loginButton: 'লগইন কৰক'
        }
    },
    {
        qaseId: 4,
        langName: 'বাংলা',
        expected: {
            loginTitle: 'লগইন',
            usernameHint: 'ব্যবহারকারীর নাম',
            passwordHint: 'পাসওয়ার্ড',
            loginButton: 'লগইন'
        }
    }
];

describe('FLW App Localization & Translation Verification', () => {

    TRANSLATIONS.forEach((data) => {
        // 2. Wrap the test description using qase(Case_ID, Test_Title)
        it(qase(data.qaseId, `Verify UI strings for ${data.langName}`), async () => {
            console.log(`\n🌐 Testing Language: ${data.langName} [Qase ID: ${data.qaseId}]`);

            // 1. Click language dropdown
            const dropdown = await $(LOCATORS.langDropdownTrigger);
            await dropdown.waitForDisplayed({ timeout: 5000 });
            await dropdown.click();

            // 2. Wait for the bottom sheet
            const grid = await $(LOCATORS.bottomSheetGrid);
            await grid.waitForDisplayed({ timeout: 5000 });

            // 3. Select language
            const langOption = await $(`//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_lang_name" and @text="${data.langName}"]`);
            await langOption.waitForDisplayed({ timeout: 5000 });
            await langOption.click();

            // Give UI a moment to refresh
            await browser.pause(2000);

            // 4. Extract strings
            const actualTitle = await $(LOCATORS.loginTitle).getText();
            const actualUserHint = await $(LOCATORS.usernameField).getText();
            const actualPassHint = await $(LOCATORS.passwordField).getText();
            const actualBtnText = await $(LOCATORS.loginButton).getText();

            // 5. Assertions
            assert.strictEqual(actualTitle, data.expected.loginTitle, `Title mismatch for ${data.langName}`);
            assert.strictEqual(actualUserHint, data.expected.usernameHint, `Username hint mismatch for ${data.langName}`);
            assert.strictEqual(actualPassHint, data.expected.passwordHint, `Password hint mismatch for ${data.langName}`);
            assert.strictEqual(actualBtnText, data.expected.loginButton, `Button text mismatch for ${data.langName}`);
        });
    });
});