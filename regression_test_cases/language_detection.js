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
        expected: { loginTitle: 'जारी रखने के लिए लॉग इन करें', usernameHint: 'उपयोगकर्ता नाम', passwordHint: 'पासवर्ड', loginButton: 'लॉग इन करें' }
    },
    {
        langName: 'English',
        expected: { loginTitle: 'Login', usernameHint: 'Username', passwordHint: 'Password', loginButton: 'Login' }
    },
    {
        langName: 'অসমীয়া',
        expected: { loginTitle: 'আগবাঢ়ি যাবলৈ লগ ইন কৰক', usernameHint: 'ব্যৱহাৰকাৰীৰ নাম', passwordHint: 'পাছৱৰ্ড', loginButton: 'লগইন কৰক' }
    },
    {
        langName: 'বাংলা',
        expected: { loginTitle: 'লগইন', usernameHint: 'ব্যবহারকারীর নাম', passwordHint: 'পাসওয়ার্ড', loginButton: 'লগইন' }
    }
];

describe('App Stability & Login', () => {

    // The reporter extracts "1334" and maps this execution to AR-1334 in Qase
    it('Qase ID: 1334 - Verify app functions correctly in Hindi, English, Assamese, and Bengali', async () => {

        for (const data of TRANSLATIONS) {
            console.log(`\n🌐 Testing Language: ${data.langName}`);

            // In test runner mode, `browser.$` can just be `$`
            const dropdown = await $(LOCATORS.langDropdownTrigger);
            await dropdown.waitForDisplayed({ timeout: 5000 });
            await dropdown.click();

            const grid = await $(LOCATORS.bottomSheetGrid);
            await grid.waitForDisplayed({ timeout: 5000 });

            const langOption = await $(`//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_lang_name" and @text="${data.langName}"]`);
            await langOption.waitForDisplayed({ timeout: 5000 });
            await langOption.click();

            await browser.pause(2000);

            const actualTitle = await $(LOCATORS.loginTitle).getText();
            const actualUserHint = await $(LOCATORS.usernameField).getText();
            const actualPassHint = await $(LOCATORS.passwordField).getText();
            const actualBtnText = await $(LOCATORS.loginButton).getText();

            assert.strictEqual(actualTitle, data.expected.loginTitle, `Title mismatch for ${data.langName}`);
            assert.strictEqual(actualUserHint, data.expected.usernameHint, `Username hint mismatch for ${data.langName}`);
            assert.strictEqual(actualPassHint, data.expected.passwordHint, `Password hint mismatch for ${data.langName}`);
            assert.strictEqual(actualBtnText, data.expected.loginButton, `Button text mismatch for ${data.langName}`);

            console.log(`✅ Passed: ${data.langName}`);
        }
    });
});