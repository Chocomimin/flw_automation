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
// Helpers: Coordinate Based Dropdowns
// ─────────────────────────────────────────────
async function selectDayWiseTrackingByCoordinates(driver, dayText) {
    try {
        console.log(`\nOpening 'Day-wise Tracking' dropdown for: "${dayText}"...`);

        // 1. Ensure the dropdown is in view
        try {
            await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollForward()`);
            await driver.pause(1000);
        } catch (e) {}

        // 2. Locate and click the Dropdown menu
        const dropdown = await driver.$("//android.widget.Spinner[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown']");
        await dropdown.waitForDisplayed({ timeout: 10000 });
        await dropdown.click();

        await driver.pause(1500); // Give the popup list time to animate and expand

        // 3. Define Coordinates based on the UI layout
        const DAY_COORDS = {
            'Day 1': { x: 500, y: 850 },
            'Day 2': { x: 500, y: 950 },
            'Day 3': { x: 500, y: 1050 }
        };

        const target = DAY_COORDS[dayText];

        // 4. Perform the tap
        if (target) {
            console.log(`Tapping ${dayText} at [${target.x}, ${target.y}]`);

            await driver.performActions([{
                type: 'pointer',
                id: 'finger1',
                parameters: { pointerType: 'touch' },
                actions: [
                    { type: 'pointerMove', duration: 0, x: target.x, y: target.y },
                    { type: 'pointerDown', button: 0 },
                    { type: 'pause', duration: 100 },
                    { type: 'pointerUp', button: 0 }
                ]
            }]);

            console.log(`✔ Selected ${dayText}`);
        } else {
            console.error(`❌ Day "${dayText}" not found in coordinate map.`);
        }

        await driver.pause(1000);

    } catch (error) {
        console.error('❌ Error in selectDayWiseTrackingByCoordinates:', error.message);
    }
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
        const targetPatientName = 'REENA JSBS';
        await clickFollowUpForMember(driver, targetPatientName);
       

        // 5. Fill Date of Starting Treatment
        await fillDateField(driver, 'Date of Starting Treatment *', 27, 3, 2026);

        // 6. Select the Day from the dropdown using Coordinates
        await selectDayWiseTrackingByCoordinates(driver, 'Day 1');

        // 7. Fill Date of Completion of Treatment
        await fillDateField(driver, 'Date of Completion of Treatment *', 31, 3, 2026);

        // 8. Fill Date of Referral
        await fillDateField(driver, 'Date of Referral', 31, 3, 2026);

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