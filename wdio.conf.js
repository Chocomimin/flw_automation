const WDIOQaseReporter = require('wdio-qase-reporter').default;
const { beforeRunHook, afterRunHook } = require('wdio-qase-reporter');

exports.config = {

    runner: 'local',

    specs: [
        './regression_test_cases/language_detection.js'
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
        'appium:newCommandTimeout': 300
    }],

    logLevel: 'info',

    hostname: '127.0.0.1',
    port: 4723,
    path: '/',

    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
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