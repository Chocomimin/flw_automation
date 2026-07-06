const WDIOQaseReporter = require('wdio-qase-reporter').default;
const { beforeRunHook, afterRunHook } = require('wdio-qase-reporter');

exports.config = {

    runner: 'local',

    specs: [
        // './regression_test_cases/language_detection.js',
        // './regression_test_cases/profile_pi/profileTest.js',
        // './regression_test_cases/all_beneficiaries/death_edit.js',
        './regression_test_cases/all_beneficiaries/old_registration_for_cataract.js',
        './regression_test_cases/household_register/validation_verification.js',
        './regression_test_cases/household_register/Adolescent_verification.js',
    ],

    maxInstances: 1,

    // ✅ FIX: capabilities was missing — this was the crash cause
    capabilities: [{
        platformName: 'Android',
        'appium:deviceName': 'ZD222X4TDK',
        'appium:automationName': 'UiAutomator2',
        'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
        'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
        'appium:noReset': false,
        'appium:autoGrantPermissions': true,
        'appium:newCommandTimeout': 300,

        // 🛠️ CRITICAL FIXES FOR UIAUTOMATOR2 CRASHES:
        'appium:clearSystemFiles': true,        // Forces cleanup of stale UiAutomator2 sessions between tests
        'appium:disableWindowAnimation': true,  // Disables drawer/UI animations that overload the DOM parser

        // ⚡ OPTIMIZATION (From earlier):
        'appium:unicodeKeyboard': true,         // Speeds up text entry
        'appium:resetKeyboard': true            // Resets keyboard after test
    }],

    logLevel: 'info',

    hostname: '127.0.0.1',
    port: 4723,
    path: '/',

    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 900000
    },

    reporters: [
        'spec',
        [
            WDIOQaseReporter,
            {
                disableWebdriverStepsReporting: true,
                disableWebdriverScreenshotsReporting: true,
                useCucumber: false,
            },
        ],
    ],

    // ✅ FIX: these hooks are required for Qase to open/close the test run
    onPrepare: async function () {
        await beforeRunHook();
    },

    onComplete: async function () {
        await afterRunHook();
    },
};