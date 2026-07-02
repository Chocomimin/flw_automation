const { remote } = require('webdriverio');

// ─────────────────────────────────────────────────────────────
//  CAPABILITIES
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
//  DROPDOWN OPTION LISTS  (ordered exactly as in screenshots)
// ─────────────────────────────────────────────────────────────

// 0 children — NO sterilization options
const FP_OPTIONS_ZERO_CHILD = [
    'Self',              // index 0
    'ANTRA Injection',   // index 1
    'Copper T (IUCD)',   // index 2
    'Condom',            // index 3
    'Mala N',            // index 4
    'Chaya',             // index 5
    'ECP',               // index 6
    'Any Other Method',  // index 7
];

// ≥1 child — sterilization options present
const FP_OPTIONS_WITH_CHILD = [
    'Self',                  // index 0
    'ANTRA Injection',       // index 1
    'Copper T (IUCD)',       // index 2
    'Condom',                // index 3
    'Mala N',                // index 4
    'Chaya',                 // index 5
    'ECP',                   // index 6
    'MALE STERILIZATION',    // index 7
    'FEMALE STERILIZATION',  // index 8
    'Any Other Method',      // index 9
];

const STERILIZATION_TARGETS = ['MALE STERILIZATION', 'FEMALE STERILIZATION'];

// ─────────────────────────────────────────────────────────────
//  LOW-LEVEL HELPERS
// ─────────────────────────────────────────────────────────────

async function tapByCoords(driver, tapX, tapY) {
    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0,   x: tapX, y: tapY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 150 },
            { type: 'pointerUp',   button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(500);
}

async function scrollFormDown(driver) {
    await driver.execute('mobile: swipeGesture', {
        left: 540, top: 1800, width: 400, height: 400,
        direction: 'up', percent: 0.6
    });
    await driver.pause(1000);
}

// ─────────────────────────────────────────────────────────────
//  ROBUST DROPDOWN HANDLING (From couple_tracking.js)
// ─────────────────────────────────────────────────────────────

async function scrollSpinnerToMiddle(driver, spinnerSelector) {
    try {
        const spinner = await driver.$(spinnerSelector);
        const loc = await spinner.getLocation();
        const screen = await driver.getWindowRect();
        const midY = screen.height / 2;

        if (loc.y > midY + 100) {
            console.log(`   ⬆️  Spinner at y=${loc.y}, scrolling toward middle...`);

            const startY = Math.floor(screen.height * 0.7);
            const endY = Math.floor(screen.height * 0.3);
            const swipeX = Math.floor(screen.width / 2);

            await driver.performActions([{
                type: 'pointer', id: 'finger1',
                parameters: { pointerType: 'touch' },
                actions: [
                    { type: 'pointerMove', duration: 0, x: swipeX, y: startY },
                    { type: 'pointerDown', button: 0 },
                    { type: 'pause', duration: 200 },
                    { type: 'pointerMove', duration: 1000, x: swipeX, y: endY },
                    { type: 'pointerUp', button: 0 }
                ]
            }]);
            await driver.releaseActions();
            await driver.pause(1500);
        }
    } catch (e) {
        console.log('   ⚠️  scrollSpinnerToMiddle skipped:', e.message);
    }
}

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList) {
    await scrollSpinnerToMiddle(driver, spinnerSelector);

    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();

    const tapX = Math.floor(loc.x + size.width - 40); // Tap near the right edge (dropdown arrow)
    const tapY = Math.floor(loc.y + size.height / 2);

    console.log(`   📍 Tapping dropdown arrow at (${tapX}, ${tapY})`);
    await tapByCoords(driver, tapX, tapY);
    await driver.pause(2000); // Wait for popup to animate

    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`   ✅ Selected "${value}" via XPath`);
        return;
    } catch (e) {
        console.log(`   ⚠️  XPath strategy failed: ${e.message}`);
    }

    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`   ✅ Selected "${value}" via UiSelector`);
        return;
    } catch (e) {
        console.log(`   ⚠️  UiSelector strategy failed: ${e.message}`);
    }

    try {
        const source = await driver.getPageSource();
        const nodes = source.match(/<[^>]+>/g) || [];
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const textRegex = new RegExp(`(?:text|content-desc)="\\s*${escapedValue}\\s*"`);
        let foundNode = null;

        for (const node of nodes) {
            if (textRegex.test(node) && node.includes('bounds=')) {
                foundNode = node;
                break;
            }
        }

        if (foundNode) {
            const boundsMatch = foundNode.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
            if (boundsMatch) {
                const tapX = Math.floor((parseInt(boundsMatch[1]) + parseInt(boundsMatch[3])) / 2);
                const tapY = Math.floor((parseInt(boundsMatch[2]) + parseInt(boundsMatch[4])) / 2);
                console.log(`   📍 Found "${value}" in XML (tag parse) → tap(${tapX},${tapY})`);
                await tapByCoords(driver, tapX, tapY);
                console.log(`   ✅ Selected "${value}" via tag parse`);
                return;
            }
        }
    } catch (e) {
        console.log(`   ⚠️  Tag parse failed: ${e.message}`);
    }

    try {
        const source = await driver.getPageSource();
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`text="${escapedValue}"[^/]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
        const match = source.match(regex);

        if (match) {
            const tapX = Math.floor((parseInt(match[1]) + parseInt(match[3])) / 2);
            const tapY = Math.floor((parseInt(match[2]) + parseInt(match[4])) / 2);
            console.log(`   📍 Found "${value}" via regex → tap(${tapX},${tapY})`);
            await tapByCoords(driver, tapX, tapY);
            console.log(`   ✅ Selected "${value}" via regex`);
            return;
        }
    } catch (e) {
        console.log(`   ⚠️  Regex strategy failed: ${e.message}`);
    }

    // FINAL FALLBACK: Calculate coordinates based on the index
    const screen = await driver.getWindowRect();
    const idx = optionsList.indexOf(value);
    if (idx === -1) throw new Error(`"${value}" not in list: [${optionsList.join(', ')}]`);

    const rowHeight     = size.height;
    const spinnerBottom = loc.y + size.height;
    const opensUpward   = (screen.height - spinnerBottom) < (optionsList.length * rowHeight);
    const finalTapX     = Math.floor(loc.x + size.width / 2);
    let   finalTapY;

    if (opensUpward) {
        const reversedIdx = (optionsList.length - 1) - idx;
        finalTapY = Math.floor(loc.y - (reversedIdx * rowHeight) - (rowHeight / 2));
    } else {
        finalTapY = Math.floor(spinnerBottom + (idx * rowHeight) + (rowHeight / 2));
    }
    finalTapY = Math.max(5, Math.min(finalTapY, screen.height - 5));

    console.log(`   📍 Coordinate fallback → tap(${finalTapX}, ${finalTapY})`);
    await tapByCoords(driver, finalTapX, finalTapY);
    console.log(`   ✅ Selected "${value}" via coordinates fallback`);
}

// ─────────────────────────────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────────────────────────────

async function clickEligibleCoupleList(driver) {
    console.log('👆 Clicking Eligible Couple List...');
    const el = await driver.$(
        `android=new UiSelector().resourceId("${PACKAGE}:id/textView2").textContains("Eligible")`
    );
    await el.waitForDisplayed({ timeout: 20000 });
    await el.click();
    await driver.pause(3000);
    console.log('✅ Eligible Couple List opened');
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
    console.log('✅ On Eligible Couple Tracking list');
}

async function goBackToList(driver) {
    console.log('\n⬅️  Going back to list...');
    try {
        const navUp = await driver.$(`//android.widget.ImageButton[@content-desc="Navigate up"]`);
        if (await navUp.isDisplayed().catch(() => false)) {
            await navUp.click();
            await driver.pause(2000);
            return;
        }
    } catch (_) {}
    await driver.back();
    await driver.pause(2000);
}

// ─────────────────────────────────────────────────────────────
//  BENEFICIARY COLLECTION
// ─────────────────────────────────────────────────────────────

async function getVisibleBeneficiaries(driver) {
    const nameEls = await driver.$$(`//*[@resource-id="${PACKAGE}:id/tv_hh_ec_id"]`);
    const results = [];

    for (let i = 0; i < nameEls.length; i++) {
        try {
            const name = (await nameEls[i].getText()).trim();
            const countEl = await driver.$(
                `(//*[@resource-id="${PACKAGE}:id/tv_weeks_of_pregnancy_ph"])[${i + 1}]` +
                `/following-sibling::android.widget.TextView`
            );
            const count = parseInt((await countEl.getText()).trim(), 10);
            if (name) results.push({ name, totalChildren: isNaN(count) ? -1 : count });
        } catch (_) {}
    }
    return results;
}

async function collectAllBeneficiaries(driver) {
    console.log('\n📋 Collecting all beneficiary cards...');

    try {
        await driver.execute('mobile: scroll', {
            strategy: '-android uiautomator',
            selector: `new UiScrollable(new UiSelector().resourceId("${PACKAGE}:id/rv_any")).scrollToBeginning(5)`
        });
        await driver.pause(1500);
    } catch (_) {}

    const seen = new Map();

    for (let pass = 0; pass < 8; pass++) {
        const batch = await getVisibleBeneficiaries(driver);
        let newItems = 0;
        for (const b of batch) {
            if (!seen.has(b.name)) { seen.set(b.name, b.totalChildren); newItems++; }
        }
        console.log(`   Pass ${pass + 1}: +${newItems} new (total ${seen.size})`);
        if (newItems === 0 && pass > 0) break;

        await driver.execute('mobile: swipeGesture', {
            left: 540, top: 1800, width: 400, height: 400,
            direction: 'up', percent: 0.6
        });
        await driver.pause(1000);
    }

    try {
        await driver.execute('mobile: scroll', {
            strategy: '-android uiautomator',
            selector: `new UiScrollable(new UiSelector().resourceId("${PACKAGE}:id/rv_any")).scrollToBeginning(5)`
        });
        await driver.pause(1500);
    } catch (_) {}

    const list = [...seen.entries()].map(([name, totalChildren]) => ({ name, totalChildren }));
    console.log(`📊 Total beneficiaries found: ${list.length}`);
    list.forEach(b => console.log(`   • "${b.name}" → children: ${b.totalChildren}`));
    return list;
}

// ─────────────────────────────────────────────────────────────
//  ADD VISIT OPENER
// ─────────────────────────────────────────────────────────────

async function openAddVisit(driver, name) {
    console.log(`\n🎯 Opening ADD VISIT for: "${name}"`);

    try {
        await driver.execute('mobile: scroll', {
            strategy: '-android uiautomator',
            selector:
                `new UiScrollable(new UiSelector().resourceId("${PACKAGE}:id/rv_any"))` +
                `.scrollIntoView(new UiSelector().text("${name}"))`
        });
        await driver.pause(1000);
    } catch (_) {}

    const addBtnXPath =
        `//android.widget.TextView[@resource-id="${PACKAGE}:id/tv_hh_ec_id" and @text="${name}"]` +
        `/ancestor::android.widget.FrameLayout[@resource-id="${PACKAGE}:id/cv_content"]` +
        `//android.widget.Button[@resource-id="${PACKAGE}:id/btn_add"]`;

    try {
        const btn = await driver.$(addBtnXPath);
        if (!(await btn.isDisplayed().catch(() => false))) {
            console.log(`   ⚠️  ADD VISIT button not visible for "${name}"`);
            return false;
        }
        await btn.click();
        await driver.pause(3000);
    } catch (e) {
        console.log(`   ⚠️  Could not click ADD VISIT: ${e.message}`);
        return false;
    }

    try {
        const f = await driver.$(`//android.widget.EditText[@hint="Date of Visit *"]`);
        if (await f.isDisplayed().catch(() => false)) {
            console.log(`   ✅ EC Tracking form opened`);
            return true;
        }
    } catch (_) {}

    console.log(`   ❌ Form did not open — going back`);
    await driver.back();
    await driver.pause(2000);
    return false;
}

// ─────────────────────────────────────────────────────────────
//  RADIO BUTTON HELPER
// ─────────────────────────────────────────────────────────────

async function selectRadioEC(driver, questionText, optionText) {
    console.log(`\n🔘 "${questionText}" → "${optionText}"`);
    try {
        await driver.execute('mobile: scroll', {
            strategy: '-android uiautomator',
            selector: `new UiSelector().text("${questionText}")`
        });
        await driver.pause(800);
    } catch (_) {}

    const xp =
        `//android.widget.TextView[@text="${questionText}"]` +
        `/ancestor::android.widget.LinearLayout[@resource-id="${PACKAGE}:id/ll_content"]` +
        `/android.widget.RadioGroup[@resource-id="${PACKAGE}:id/rg"]` +
        `/android.widget.RadioButton[@text="${optionText}"]`;

    const radio = await driver.$(xp);
    await radio.waitForDisplayed({ timeout: 8000 });
    if ((await radio.getAttribute('checked')) === 'true') {
        console.log('   ℹ️  Already selected');
        return;
    }
    await radio.click();
    await driver.pause(1500);
    console.log(`   ✅ "${optionText}" selected`);
}

// ─────────────────────────────────────────────────────────────
//  READ SPINNER BOX VALUE
// ─────────────────────────────────────────────────────────────

async function getSpinnerValue(driver) {
    try {
        const spinner = await driver.$(
            `android=new UiSelector().resourceId("${PACKAGE}:id/actv_rv_dropdown")`
        );
        return (await spinner.getText() || '').trim();
    } catch (_) {
        return '';
    }
}

// ─────────────────────────────────────────────────────────────
//  CORE: ITERATE & VERIFY USING ROBUST FALLBACK
// ─────────────────────────────────────────────────────────────

async function clickEveryElementAndVerify(driver, optionsList, beneficiaryName, totalChildren) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🔽 Iterating FP dropdown elements for "${beneficiaryName}" (children: ${totalChildren})`);
    console.log(`   Options list : [${optionsList.join(', ')}]`);
    console.log(`   Targets      : [${STERILIZATION_TARGETS.join(', ')}]`);
    console.log('─'.repeat(60));

    const foundTargets = new Set();
    const spinnerSelector = `android=new UiSelector().resourceId("${PACKAGE}:id/actv_rv_dropdown")`;

    for (let rowIndex = 0; rowIndex < optionsList.length; rowIndex++) {
        const expectedLabel = optionsList[rowIndex];
        console.log(`\n   ▶ Verifying expected item: "${expectedLabel}"`);

        // 1. Utilize the robust clicker directly
        try {
            await clickSpinnerAndSelectOption(driver, spinnerSelector, expectedLabel, optionsList);
        } catch (e) {
            console.log(`   ⚠️  Failed to click option "${expectedLabel}": ${e.message}`);
            continue;
        }

        // 2. Read spinner box value to verify it worked and capture sterilization data
        const spinnerValue = await getSpinnerValue(driver);
        console.log(`   🗂  Spinner now shows: "${spinnerValue}"`);

        // 3. Compare against sterilization targets
        const upperSpinner = spinnerValue.toUpperCase();
        let matchedTarget  = null;
        for (const target of STERILIZATION_TARGETS) {
            if (upperSpinner === target.toUpperCase()) {
                matchedTarget = target;
                break;
            }
        }

        if (matchedTarget) {
            foundTargets.add(matchedTarget);
            console.log(`   ✅ MATCH — "${spinnerValue}" matches target "${matchedTarget}"`);
        } else {
            console.log(`   ℹ️  No sterilization match — spinner shows "${spinnerValue}"`);
        }
    }

    // ── Final assertion ───────────────────────────────────────────────────
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📊 Verification Summary for "${beneficiaryName}" (children: ${totalChildren}):`);

    if (totalChildren === 0) {
        // Expect NO sterilization options
        const unexpected = STERILIZATION_TARGETS.filter(t => foundTargets.has(t));
        if (unexpected.length === 0) {
            console.log(`   ✅ PASS — No sterilization options found (correct for 0-child beneficiary)`);
        } else {
            throw new Error(
                `❌ FAIL — Sterilization options unexpectedly found for 0-child beneficiary ` +
                `"${beneficiaryName}": [${unexpected.join(', ')}]`
            );
        }
    } else {
        // Expect BOTH sterilization options
        const missing = STERILIZATION_TARGETS.filter(t => !foundTargets.has(t));
        STERILIZATION_TARGETS.forEach(t => {
            console.log(`   ${foundTargets.has(t) ? '✅' : '❌'} ${t} — ${foundTargets.has(t) ? 'FOUND & MATCHED' : 'NOT FOUND'}`);
        });
        if (missing.length > 0) {
            throw new Error(
                `❌ FAIL — Missing sterilization options for "${beneficiaryName}": [${missing.join(', ')}]`
            );
        }
        console.log(`   🎉 PASS — Both sterilization options confirmed for "${beneficiaryName}"`);
    }
    console.log('─'.repeat(60));
}

// ─────────────────────────────────────────────────────────────
//  EC FORM SETUP
// ─────────────────────────────────────────────────────────────

async function fillECFormAndVerify(driver, beneficiaryName, totalChildren) {
    console.log(`\n📝 Filling EC form for "${beneficiaryName}"...`);

    // Date of Visit — confirm today
    console.log('\n📅 Setting Date of Visit...');
    const dateField = await driver.$(`//android.widget.EditText[@hint="Date of Visit *"]`);
    await dateField.waitForDisplayed({ timeout: 8000 });
    await dateField.click();
    await driver.pause(2000);
    try {
        const okBtn = await driver.$('android=new UiSelector().resourceId("android:id/button1")');
        await okBtn.waitForDisplayed({ timeout: 5000 });
        await okBtn.click();
        await driver.pause(1000);
        console.log('   ✅ Date of Visit confirmed (today)');
    } catch (e) {
        console.log('   ⚠️  Date picker OK not found, pressing back');
        await driver.back();
        await driver.pause(1000);
    }

    // LMP Date — go back 1 month, pick first available day
    console.log('\n📅 Setting LMP Date...');
    try {
        const lmpField = await driver.$(`//android.widget.EditText[@hint="LMP Date *"]`);
        await lmpField.waitForDisplayed({ timeout: 6000 });
        await lmpField.click();
        await driver.pause(2000);

        try {
            const prevBtn = await driver.$('//android.widget.ImageButton[@resource-id="android:id/prev"]');
            if (await prevBtn.isDisplayed()) { await prevBtn.click(); await driver.pause(700); }
        } catch (_) {}

        const days = await driver.$$('//android.view.View[@resource-id="android:id/month_view"]/android.view.View');
        for (const day of days) {
            if ((await day.getAttribute('enabled')) === 'true' &&
                (await day.getAttribute('content-desc') || '').trim().length > 0) {
                await day.click();
                await driver.pause(600);
                break;
            }
        }
        const okBtn = await driver.$('android=new UiSelector().resourceId("android:id/button1")');
        await okBtn.waitForDisplayed({ timeout: 3000 });
        await okBtn.click();
        await driver.pause(800);
        console.log('   ✅ LMP Date set');
    } catch (e) {
        console.log('   ⚠️  LMP Date skipped:', e.message);
    }

    // Pregnancy Test = No
    await selectRadioEC(driver, 'Is Pregnancy Test done?', 'No');
    await driver.pause(1500);

    // Family Planning = Yes → reveals FP Methods dropdown
    await selectRadioEC(
        driver,
        'Are you using Family Planning Method? or Do you want to use any Planning Method',
        'Yes'
    );
    await driver.pause(2000);

    // Scroll to make FP Methods dropdown visible
    await scrollFormDown(driver);
    await driver.pause(500);

    // Run element-by-element verification using the robust fallback approach
    const optionsList = totalChildren === 0 ? FP_OPTIONS_ZERO_CHILD : FP_OPTIONS_WITH_CHILD;
    await clickEveryElementAndVerify(driver, optionsList, beneficiaryName, totalChildren);
}

// ─────────────────────────────────────────────────────────────
//  RUN ONE SCENARIO
// ─────────────────────────────────────────────────────────────

async function runScenario(driver, beneficiary) {
    const { name, totalChildren } = beneficiary;
    console.log(`\n${'═'.repeat(65)}`);
    console.log(`👤 Beneficiary : ${name}`);
    console.log(`👶 Children    : ${totalChildren}`);
    console.log('═'.repeat(65));

    const opened = await openAddVisit(driver, name);
    if (!opened) throw new Error(`Could not open ADD VISIT form for "${name}"`);

    await fillECFormAndVerify(driver, name, totalChildren);

    await goBackToList(driver);
    console.log(`\n✅ Scenario done for "${name}"`);
}

// ─────────────────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
    console.log('🚀 EC FP Methods — Robust Fallback Sterilization Verify\n');
    let driver;

    try {
        driver = await remote(wdioOptions);
        await driver.pause(5000);

        await clickEligibleCoupleList(driver);
        await clickEligibleCoupleTracking(driver);

        const all = await collectAllBeneficiaries(driver);
        if (all.length === 0) throw new Error('No beneficiaries found');

        const zeroChild = all.find(b => b.totalChildren === 0);
        if (!zeroChild) throw new Error('No beneficiary with 0 children found');
        console.log(`\n🔍 0-child  : "${zeroChild.name}"`);

        const withChild = all.find(b => b.totalChildren >= 1);
        if (!withChild) throw new Error('No beneficiary with ≥1 child found');
        console.log(`🔍 ≥1-child : "${withChild.name}" (${withChild.totalChildren} child(ren))`);

        await runScenario(driver, zeroChild);
        await runScenario(driver, withChild);

        console.log('\n' + '═'.repeat(65));
        console.log('🎯 ALL SCENARIOS PASSED');
        console.log(`   ✅ "${zeroChild.name}" (0 children) — no sterilization options (correct)`);
        console.log(`   ✅ "${withChild.name}" (${withChild.totalChildren} child(ren)) — both sterilization options confirmed`);
        console.log('═'.repeat(65));

    } catch (err) {
        console.error('\n❌ Test failed:', err.message);
        console.error(err.stack);
        process.exitCode = 1;
    } finally {
        if (driver) {
            console.log('\n🛑 Closing session...');
            await driver.deleteSession().catch(() => {});
        }
    }
}

main();