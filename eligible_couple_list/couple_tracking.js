const { remote } = require('webdriverio');

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true,

    'appium:uiautomator2ServerInstallTimeout': 60000,
    'appium:uiautomator2ServerLaunchTimeout': 60000,
    'appium:uiautomator2ServerReadTimeout': 60000,
    'appium:adbExecTimeout': 60000,
    'appium:androidInstallTimeout': 120000,
    'appium:newCommandTimeout': 300,
    'appium:shouldTerminateApp': false,
    'appium:skipDeviceInitialization': false,
    'appium:disableWindowAnimation': true,
};

const wdioOptions = {
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities,
    logLevel: 'error',

    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
};

const PACKAGE = 'org.piramalswasthya.sakhi.saksham.uat';
const BENEFICIARY_NAME = 'SUMI KALANDI';

const FORM_DATA = {
    dateOfVisit:               { day: 6, month: 3, year: 2026 },
    lmpDate:                   { day: 1, month: 1, year: 2026 },
    isPregnancyTestDone:       'Yes',
    pregnancyTestResult:       'Positive',
    isWomanPregnant:           'No',
    usingFamilyPlanningMethod: 'No'
};

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];





async function safeAction(driver, actionFn, retries = 3, delayMs = 3000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await actionFn();
        } catch (e) {
            const isInstrumentationCrash =
                e.message && (
                    e.message.includes('instrumentation process is not running') ||
                    e.message.includes('UiAutomator2 server') ||
                    e.message.includes('cannot be proxied') ||
                    e.message.includes('Session ID is undefined')
                );

            if (isInstrumentationCrash && attempt < retries) {
                console.warn(`\n⚠️  UiAutomator2 crash detected (attempt ${attempt}/${retries})`);
                console.warn('   Waiting for device to recover...');
                await new Promise(r => setTimeout(r, delayMs));


                try {
                    await driver.execute('mobile: shell', {
                        command: 'input',
                        args: ['keyevent', 'KEYCODE_WAKEUP']
                    });
                    await driver.pause(1000);
                    await driver.execute('mobile: shell', {
                        command: 'input',
                        args: ['keyevent', 'KEYCODE_MENU']
                    });
                    await driver.pause(1500);
                } catch (_) {}

                console.warn(`   Retrying action (attempt ${attempt + 1})...`);
            } else {
                throw e;
            }
        }
    }
}




async function safeFind(driver, xpath, timeout = 8000) {
    const el = await driver.$(xpath);
    await el.waitForDisplayed({ timeout });
    return el;
}




async function getCalendarMonthYear(driver) {
    try {
        const cells = await driver.$$('//android.view.View[@resource-id="android:id/month_view"]/android.view.View');
        for (const cell of cells) {
            const desc = await cell.getAttribute('content-desc').catch(() => '');
            const match = desc.match(/^(\d{2})\s+(\w+)\s+(\d{4})$/);
            if (match) {
                const month = MONTH_NAMES.findIndex(m => m.toLowerCase() === match[2].toLowerCase());
                const year  = parseInt(match[3], 10);
                if (month > 0) {
                    console.log(`   📆 Calendar: ${MONTH_NAMES[month]} ${year}`);
                    return { month, year };
                }
            }
        }
    } catch (e) {
        console.warn(`   ⚠️  getCalendarMonthYear: ${e.message}`);
    }
    return null;
}

async function goToPrevMonth(driver) {
    const btn = await driver.$('//android.widget.ImageButton[@resource-id="android:id/prev"]');
    await btn.click();
    await driver.pause(700);
}

async function goToNextMonth(driver) {
    const btn = await driver.$('//android.widget.ImageButton[@resource-id="android:id/next"]');
    await btn.click();
    await driver.pause(700);
}

async function pickDateInCalendar(driver, day, month, year) {
    console.log(`   🗓️  Target: ${String(day).padStart(2,'0')} ${MONTH_NAMES[month]} ${year}`);
    for (let i = 0; i < 36; i++) {
        const cur = await getCalendarMonthYear(driver);
        if (!cur) { console.warn('   ⚠️  Cannot read month'); break; }
        const diff = (year - cur.year) * 12 + (month - cur.month);
        if (diff === 0) { console.log('   ✅ Correct month'); break; }
        console.log(`   ↔️  diff=${diff} → ${diff < 0 ? 'PREV' : 'NEXT'}`);
        diff < 0 ? await goToPrevMonth(driver) : await goToNextMonth(driver);
    }
    const contentDesc = `${String(day).padStart(2,'0')} ${MONTH_NAMES[month]} ${year}`;
    console.log(`   👆 Tapping: "${contentDesc}"`);
    const dayCell = await driver.$(`//android.view.View[@content-desc="${contentDesc}"]`);
    await dayCell.waitForDisplayed({ timeout: 5000 });
    await dayCell.click();
    await driver.pause(600);
    console.log('   ✅ Day tapped');
}

async function tapOK(driver) {
    const ok = await driver.$('//android.widget.Button[@resource-id="android:id/button1"]');
    await ok.waitForDisplayed({ timeout: 5000 });
    await ok.click();
    await driver.pause(800);
    console.log('   ✅ OK tapped');
}

async function fillDateField(driver, hint, day, month, year) {
    console.log(`\n📅 "${hint}" → ${String(day).padStart(2,'0')}-${String(month).padStart(2,'0')}-${year}`);
    await safeAction(driver, async () => {
        const field = await driver.$(`//android.widget.EditText[@hint="${hint}"]`);
        await field.waitForDisplayed({ timeout: 8000 });
        await field.click();
        await driver.pause(2000);
        await pickDateInCalendar(driver, day, month, year);
        await tapOK(driver);
        await driver.pause(1000);
    });
}





async function selectRadio(driver, questionText, optionText) {
    console.log(`\n🔘 "${questionText.substring(0, 60)}" → "${optionText}"`);

    await safeAction(driver, async () => {

        try {
            await driver.execute('mobile: scroll', {
                strategy: '-android uiautomator',
                selector: `new UiSelector().text("${questionText}")`
            });
            await driver.pause(1000);
        } catch (_) {}



        const xp =
            `//android.widget.TextView[@text="${questionText}"]` +
            `/ancestor::android.widget.LinearLayout[@resource-id="${PACKAGE}:id/ll_content"]` +
            `/android.widget.RadioGroup[@resource-id="${PACKAGE}:id/rg"]` +
            `/android.widget.RadioButton[@text="${optionText}"]`;

        const radio = await driver.$(xp);
        await radio.waitForDisplayed({ timeout: 8000 });


        const actualText = await radio.getText();
        if (actualText !== optionText) {
            throw new Error(`Wrong radio found: expected "${optionText}" but got "${actualText}"`);
        }

        if ((await radio.getAttribute('checked')) === 'true') {
            console.log('   ℹ️  Already selected');
            return;
        }

        await radio.click();
        await driver.pause(1500);
        console.log(`   ✅ "${optionText}" selected`);


        const checked = await radio.getAttribute('checked');
        if (checked !== 'true') {
            console.warn(`   ⚠️  Radio may not have been selected, retrying click...`);
            await radio.click();
            await driver.pause(1000);
        }
    });
}

async function scrollFormDown(driver) {
    await driver.execute('mobile: swipeGesture', {
        left: 540, top: 1800, width: 400, height: 400,
        direction: 'up', percent: 0.6
    });
    await driver.pause(1000);
}




async function fillECTrackingForm(driver) {
    console.log('\n📝 Filling EC Tracking Form for:', BENEFICIARY_NAME);
    console.log('─────────────────────────────────────────');


    await fillDateField(driver, 'Date of Visit *',
        FORM_DATA.dateOfVisit.day,
        FORM_DATA.dateOfVisit.month,
        FORM_DATA.dateOfVisit.year
    );


    await fillDateField(driver, 'LMP Date *',
        FORM_DATA.lmpDate.day,
        FORM_DATA.lmpDate.month,
        FORM_DATA.lmpDate.year
    );


    await selectRadio(driver, 'Is Pregnancy Test done?', FORM_DATA.isPregnancyTestDone);
    await driver.pause(1500);


    if (FORM_DATA.isPregnancyTestDone === 'No') {




        console.log('\n📌 Branch A: Test = No → Family Planning');
        await selectRadio(driver,
            'Are you using Family Planning Method? or Do you want to use any Planning Method',
            FORM_DATA.usingFamilyPlanningMethod
        );

    } else {




        console.log('\n📌 Branch B: Test = Yes → Pregnancy Test Result');
        await driver.pause(1500);

        await selectRadio(driver,
            'Pregnancy Test Result *',
            FORM_DATA.pregnancyTestResult
        );
        await driver.pause(1500);

        if (FORM_DATA.pregnancyTestResult === 'Positive') {





            console.log('\n📌 Branch B1: Positive → "Is the woman pregnant?"');
            await driver.pause(1500);

            await selectRadio(driver,
                'Is the woman pregnant?',
                FORM_DATA.isWomanPregnant
            );

            console.log('\n📌 Branch B1 done — Family Planning not applicable for Positive result');

        } else {




            console.log('\n📌 Branch B2: Negative → Family Planning Method');
            await driver.pause(1000);

            await selectRadio(driver,
                'Are you using Family Planning Method? or Do you want to use any Planning Method',
                FORM_DATA.usingFamilyPlanningMethod
            );
        }
    }


    console.log('\n🚀 Submitting...');
    await scrollFormDown(driver);
    await driver.pause(500);

    await safeAction(driver, async () => {
        const submitBtn = await driver.$(`//android.widget.Button[@resource-id="${PACKAGE}:id/btn_submit"]`);
        await submitBtn.waitForDisplayed({ timeout: 8000 });
        await submitBtn.click();
        await driver.pause(3000);
        console.log('✅ Form submitted!');
    });
}




async function clickEligibleCoupleTracking(driver) {
    console.log('👆 Clicking Eligible Couple Tracking...');
    const card = await driver.$(
        `//android.widget.TextView[@text="Eligible Couple Tracking"]` +
        `/ancestor::android.widget.FrameLayout[@resource-id="${PACKAGE}:id/cv_icon"]`
    );
    await card.waitForDisplayed({ timeout: 15000 });
    await card.click();
    await driver.pause(3000);
    console.log('✅ On list');
}

async function clickAddVisitByScrolling(driver, name) {
    console.log(`\n📜 Scrolling to find "${name}"...`);
    const MAX_SCROLLS = 20;
    const addBtnXPath =
        `//android.widget.TextView[@resource-id="${PACKAGE}:id/tv_hh_ec_id" and @text="${name}"]` +
        `/ancestor::android.widget.FrameLayout[@resource-id="${PACKAGE}:id/cv_content"]` +
        `//android.widget.Button[@resource-id="${PACKAGE}:id/btn_add"]`;

    for (let i = 0; i <= MAX_SCROLLS; i++) {
        const btn = await driver.$(addBtnXPath);
        if (await btn.isDisplayed().catch(() => false)) {
            console.log(`   ✅ Found "${name}" – clicking ADD VISIT`);
            await btn.click();
            await driver.pause(3000);
            return;
        }
        if (i < MAX_SCROLLS) {
            console.log(`   📜 Scroll ${i + 1}/${MAX_SCROLLS}`);
            try {
                await driver.execute('mobile: scroll', {
                    strategy: '-android uiautomator',
                    selector:
                        `new UiScrollable(new UiSelector().resourceId("${PACKAGE}:id/rv_any"))` +
                        `.scrollIntoView(new UiSelector().text("${name}"))`
                });
                await driver.pause(1500);
            } catch (_) {
                await driver.execute('mobile: swipeGesture', {
                    left: 540, top: 1800, width: 400, height: 400,
                    direction: 'up', percent: 0.75
                });
                await driver.pause(1200);
            }
        }
    }
    throw new Error(`Could not find ADD VISIT for "${name}"`);
}




async function main() {
    console.log('🚀 Starting Appium session...\n');
    let driver;
    try {
        driver = await remote(wdioOptions);
        await driver.pause(5000);

        await clickEligibleCoupleTracking(driver);
        await clickAddVisitByScrolling(driver, BENEFICIARY_NAME);
        await fillECTrackingForm(driver);

        console.log('\n🎯 Automation complete!');
    } catch (err) {
        console.error('❌ Test failed:', err.message);
        process.exitCode = 1;
    } finally {
        if (driver) {
            console.log('🛑 Closing session...');
            await driver.deleteSession().catch(() => {});
        }
    }
}

main();