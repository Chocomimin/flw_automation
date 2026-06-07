const FORM_DATA = {
    patientName: 'SHARMILA MAJHI MAJHI',
    startTreatmentDate: { day: 27, month: 3, year: 2026 },
    trackingDay: 'Day 3',
    completionTreatmentDate: { day: 31, month: 3, year: 2026 },
    referralDate: { day: 31, month: 6, year: 2026 }
};

const { remote } = require('webdriverio');

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true,
    'appium:unicodeKeyboard': true,
    'appium:resetKeyboard': true
};

const wdioOptions = {
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities: capabilities
};

// ─────────────────────────────────────────────
// NEW: Robust Dropdown Core Helpers
// ─────────────────────────────────────────────

async function scrollSpinnerToMiddle(driver, spinnerSelector) {
    try {
        const spinner = await driver.$(spinnerSelector);
        const loc = await spinner.getLocation();
        const screen = await driver.getWindowRect();
        const midY = screen.height / 2;

        if (loc.y > midY + 100) {
            console.log(`⬆️  Spinner at y=${loc.y}, scrolling toward middle...`);

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
        console.log('⚠️  scrollSpinnerToMiddle skipped:', e.message);
    }
}

async function tapByCoords(driver, tapX, tapY) {
    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: tapX, y: tapY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 150 },
            { type: 'pointerUp',   button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(500);
}

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList) {
    await scrollSpinnerToMiddle(driver, spinnerSelector);

    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();
    console.log(`📍 Spinner @ (${loc.x}, ${loc.y}), size (${size.width}x${size.height})`);

    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);

    console.log(`📍 Tapping dropdown arrow at (${tapX}, ${tapY})`);
    await tapByCoords(driver, tapX, tapY);
    await driver.pause(2000);

    // STRATEGY 0: Direct XPath
    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`✅ Selected "${value}" via XPath`);
        return;
    } catch (e) {
        console.log(`⚠️  XPath strategy failed: ${e.message}`);
    }

    // STRATEGY 1: UiSelector
    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via UiSelector`);
        return;
    } catch (e) {
        console.log(`⚠️  UiSelector strategy failed: ${e.message}`);
    }

    // STRATEGY 2: Tag-by-tag XML parse
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
                console.log(`📍 Found "${value}" in XML (tag parse) → tap(${tapX},${tapY})`);
                await tapByCoords(driver, tapX, tapY);
                console.log(`✅ Selected "${value}" via tag parse`);
                return;
            }
        }
        console.log(`⚠️  "${value}" not found via tag parse, trying regex strategy...`);
    } catch (e) {
        console.log(`⚠️  Tag parse failed: ${e.message}`);
    }

    // STRATEGY 3: Inline regex bounds
    try {
        const source = await driver.getPageSource();
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`text="${escapedValue}"[^/]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
        const match = source.match(regex);

        if (match) {
            const tapX = Math.floor((parseInt(match[1]) + parseInt(match[3])) / 2);
            const tapY = Math.floor((parseInt(match[2]) + parseInt(match[4])) / 2);
            console.log(`📍 Found "${value}" via regex → tap(${tapX},${tapY})`);
            await tapByCoords(driver, tapX, tapY);
            console.log(`✅ Selected "${value}" via regex`);
            return;
        }
        console.log(`⚠️  "${value}" not found via regex, trying coordinate fallback...`);
    } catch (e) {
        console.log(`⚠️  Regex strategy failed: ${e.message}`);
    }

    // STRATEGY 4: Coordinate fallback
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

    console.log(`📍 Coordinate fallback → tap(${finalTapX}, ${finalTapY})`);
    await tapByCoords(driver, finalTapX, finalTapY);
    console.log(`✅ Selected "${value}" via coordinates`);
}

// ─────────────────────────────────────────────
// Helpers: Navigation
// ─────────────────────────────────────────────
async function clickGridItemByText(driver, text) {
    console.log(`Looking for Grid Icon with text: '${text}'...`);
    const xpath = `//android.widget.TextView[@text='${text}']/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_icon']`;
    const element = await driver.$(xpath);
    await element.waitForDisplayed({ timeout: 10000 });
    await element.click();
    console.log(`✔ Clicked Grid Icon with text: '${text}'`);
}

async function clickFollowUpForMember(driver, memberName) {
    console.log(`\nScrolling to find member: '${memberName}'...`);

    // 1. Scroll dynamically using UiScrollable until the text is visible
    const androidScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${memberName}")`;

    try {
        await driver.$(`android=${androidScrollSelector}`).waitForDisplayed({ timeout: 10000 });
        console.log(`✔ Scrolled to member: '${memberName}'`);
    } catch (e) {
        console.log('Scroll approach failed or element is already visible.');
    }

    await driver.pause(1000);

    // 2. Strict XPath: Find the text -> go UP to the specific Card frame -> go DOWN to its own FOLLOW UP Button
    const followUpBtnXPath =
        `//android.widget.TextView[contains(@text, '${memberName}')]` +
        `/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_content']` +
        `//android.widget.Button[@text='FOLLOW UP']`;

    const followUpBtn = await driver.$(followUpBtnXPath);

    try {
        await followUpBtn.waitForDisplayed({ timeout: 5000 });
        await followUpBtn.click();
        console.log(`✔ Clicked 'FOLLOW UP' for '${memberName}'`);
    } catch (e) {
        console.log(`✖ Failed to click 'FOLLOW UP' via XPath. Ensure the name is perfectly matched.`);
    }
}

// ─────────────────────────────────────────────
// Helpers: Calendar & Date Picking
// ─────────────────────────────────────────────
async function navigateToMonthYear(driver, targetMonth, targetYear) {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    for (let attempts = 0; attempts < 48; attempts++) {
        // Grab the first day available in the calendar grid to figure out the current visible month/year
        const firstDay = await driver.$("//android.view.View[@resource-id='android:id/month_view']/android.view.View[1]");
        const contentDesc = await firstDay.getAttribute('content-desc');
        const parts = contentDesc.split(' ');

        const currentMonth = monthNames.indexOf(parts[1]) + 1;
        const currentYear = parseInt(parts[2]);

        if (currentMonth === targetMonth && currentYear === targetYear) {
            break;
        }

        const targetTotal = targetYear * 12 + targetMonth;
        const currentTotal = currentYear * 12 + currentMonth;

        if (targetTotal < currentTotal) {
            // Need to go back in time
            const prevBtn = await driver.$("//android.widget.ImageButton[@resource-id='android:id/prev' or @content-desc='Previous month']");
            await prevBtn.waitForDisplayed({ timeout: 3000 });
            await prevBtn.click();
        } else {
            // Need to go forward in time
            const nextBtn = await driver.$("//android.widget.ImageButton[@content-desc='Next month']");
            await nextBtn.waitForDisplayed({ timeout: 3000 });
            await nextBtn.click();
        }
        await driver.pause(400);
    }
}

// GENERIC DATE PICKER HELPER
async function fillDateField(driver, hintText, day, month, year) {
    console.log(`\nSetting '${hintText}' → ${day}/${month}/${year}`);

    // Scroll to the field if necessary
    try {
        const dateScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${hintText}")`;
        await driver.$(`android=${dateScrollSelector}`).waitForDisplayed({ timeout: 4000 });
    } catch (e) {
        // Ignored, might already be on screen
    }

    const dateField = await driver.$(`//android.widget.EditText[contains(@hint, '${hintText}')]`);
    await dateField.waitForDisplayed({ timeout: 10000 });
    await dateField.click();
    await driver.pause(1000);

    // Navigate to the correct Month and Year
    await navigateToMonthYear(driver, month, year);
    await driver.pause(300);

    // Format the Target Day element
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const dayPadded = String(day).padStart(2, '0');
    const monthName = monthNames[month - 1];
    const contentDesc = `${dayPadded} ${monthName} ${year}`;

    // Click the Day
    const dayElement = await driver.$(`//android.view.View[@content-desc='${contentDesc}']`);
    await dayElement.waitForDisplayed({ timeout: 5000 });
    await dayElement.click();
    await driver.pause(500);

    // Click 'OK' on the Calendar
    const okButton = await driver.$("//android.widget.Button[@resource-id='android:id/button1']");
    await okButton.waitForDisplayed({ timeout: 5000 });
    await okButton.click();
    console.log(`✔ Set '${hintText}' to '${contentDesc}' successfully.`);
    await driver.pause(500);
}

// ─────────────────────────────────────────────
// Helpers: Robust Dropdowns
// ─────────────────────────────────────────────
async function selectDayWiseTracking(driver, dayText) {
    console.log(`\nOpening 'Day-wise Tracking' dropdown for: "${dayText}"...`);

    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollForward()`);
        await driver.pause(1000);
    } catch (e) {}

    const spinnerSelector = `//android.widget.Spinner[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown']`;
    const optionsList = ['Day 1', 'Day 2', 'Day 3'];

    await clickSpinnerAndSelectOption(driver, spinnerSelector, dayText, optionsList);
}


// ─────────────────────────────────────────────
// Main flow
// ─────────────────────────────────────────────
async function main() {
    console.log('═══════════════════════════════════════════');
    console.log(' Initializing Appium — Malaria Follow Up Flow');
    console.log('═══════════════════════════════════════════');

    let driver;

    try {
        driver = await remote(wdioOptions);
        console.log('✔ Appium session started\n');

        // 1. Navigate to Disease Control
        await clickGridItemByText(driver, 'Disease Control');
        await driver.pause(1500);

        // 2. Navigate to Malaria
        await clickGridItemByText(driver, 'Malaria');
        await driver.pause(1500);

        // 3. Navigate to Malaria Confirmed Cases
        await clickGridItemByText(driver, 'Malaria Confirmed Cases');
        await driver.pause(2000);

        // 4. Scroll to member and click Follow Up
        await clickFollowUpForMember(driver, FORM_DATA.patientName);

        // 5. Fill Date of Starting Treatment
        await fillDateField(driver, 'Date of Starting Treatment *', FORM_DATA.startTreatmentDate.day, FORM_DATA.startTreatmentDate.month, FORM_DATA.startTreatmentDate.year);

        // 6. Select the Day from the dropdown using the Robust Helper
        await selectDayWiseTracking(driver, FORM_DATA.trackingDay);

        // 7. Fill Date of Completion of Treatment
        await fillDateField(driver, 'Date of Completion of Treatment *', FORM_DATA.completionTreatmentDate.day, FORM_DATA.completionTreatmentDate.month, FORM_DATA.completionTreatmentDate.year);

        // 8. Fill Date of Referral
        await fillDateField(driver, 'Date of Referral', FORM_DATA.referralDate.day, FORM_DATA.referralDate.month, FORM_DATA.referralDate.year);

        // 9. Submit the Form
        console.log('\nClicking Submit button...');
        try {
            const submitScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"))`;
            const submitBtn = await driver.$(`android=${submitScrollSelector}`);

            await submitBtn.waitForDisplayed({ timeout: 5000 });
            await submitBtn.click();
            console.log('✔ Form Submitted Successfully!');

            // Allow the application time to process the submission before ending the session
            await driver.pause(3000);
        } catch (error) {
            console.log("✖ Could not find or click the Submit button.", error.message);
        }

    } catch (error) {
        console.error('\n✖ Error during Follow Up flow:', error.message);
    } finally {
        if (driver) {
            await driver.pause(3000);
            await driver.deleteSession();
            console.log('✔ Session closed.');
        }
    }
}

main();