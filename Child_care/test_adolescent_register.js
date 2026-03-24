const { remote } = require('webdriverio');

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true
};

const wdOpts = {
    hostname: process.env.APPIUM_HOST || '127.0.0.1',
    port: parseInt(process.env.APPIUM_PORT, 10) || 4723,
    logLevel: 'info',
    capabilities,
};

const FORM_DATA = {
    visitDate: { day: 21, month: 3, year: 2025 },
    healthStatus: 'Anemic', // Options: 'Healthy', 'Anemic', 'Malnourished'
    referredToHealthFacility: 'City Health Center', // Fill this value as needed
    ifaTabletDistribution: 'Yes', // Options: 'Yes', 'No'
    quantityOfIFATablets: '10',  // Required if ifaTabletDistribution is 'Yes'
    menstrualHygieneAwareness: 'Yes', // Options: 'Yes', 'No'
    sanitaryNapkinDistributed: 'Yes', // Options: 'Yes', 'No'
    noOfPacketsDistributed: '5',      // Required if sanitaryNapkinDistributed is 'Yes'
    sanitaryNapkinPlace: 'School',
    sanitaryNapkinDate: { day: 22, month: 3, year: 2025 },
    counselingProvided: 'Yes',
    counselingType: 'Individual',
    followUpDate: { day: 15, month: 4, year: 2025 },
    referralStatus: 'Completed',
};

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

const HEALTH_STATUS_COORDS = {
    'Healthy': { x: 500, y: 700 },
    'Anemic': { x: 500, y: 810 },
    'Malnourished': { x: 500, y: 920 }
};
const PLACE_COORDS = {
    'Home': { x: 500, y: 1650 },
    'Community center': { x: 500, y: 1800 },
    'School': { x: 500, y: 1950 },           // Increased Y to tap lower
    'Subcenter': { x: 500, y: 2100 }         // Increased Y to tap lower
};

const COUNSELING_TYPE_COORDS = {
    'Individual': { x: 500, y: 2000 }, // Estimated from screenshot
    'Group': { x: 500, y: 2150 }       // Estimated from screenshot
};

const REFERRAL_STATUS_COORDS = {
    'Pending': { x: 500, y: 1900 },   // Estimated from screenshot
    'Completed': { x: 500, y: 2050 }  // Estimated from screenshot
};
async function tapAt(driver, x, y) {
    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x, y },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerUp', button: 0 },
        ],
    }]);
    await driver.releaseActions();
}

async function swipeHorizontal(driver, direction) {
    const size = await driver.getWindowRect();
    const startX = direction === 'left' ? Math.floor(size.width * 0.8) : Math.floor(size.width * 0.2);
    const endX = direction === 'left' ? Math.floor(size.width * 0.2) : Math.floor(size.width * 0.8);
    const startY = Math.floor(size.height * 0.5);

    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: startX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerMove', duration: 500, x: endX, y: startY },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(1000);
}

async function getCalendarMonthYear(driver) {
    try {
        const dayElement = await driver.$('android=new UiSelector().text("15").clickable(true)');
        const contentDesc = await dayElement.getAttribute('content-desc');
        const parts = contentDesc.split(' ');
        return { month: MONTH_NAMES.indexOf(parts[1]), year: parseInt(parts[2]) };
    } catch (error) { return null; }
}

async function navigateToMonth(driver, targetMonth, targetYear) {
    const yearHeader = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_header_year")');
    const currentYear = parseInt(await yearHeader.getText());

    if (currentYear !== targetYear) {
        await yearHeader.click();
        await driver.pause(1000);
        const yearEl = await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${targetYear}")`);
        await yearEl.click();
        await driver.pause(1000);
    }

    for (let i = 0; i < 12; i++) {
        const cur = await getCalendarMonthYear(driver);
        if (!cur) break;

        if (cur.month === targetMonth) break;

        const direction = cur.month < targetMonth ? 'left' : 'right';
        await swipeHorizontal(driver, direction);
    }
}

async function pickDateFromCalendar(driver, dateObj) {
    const { day, month, year } = dateObj;
    await (await driver.$('android=new UiSelector().resourceId("android:id/datePicker")')).waitForDisplayed({ timeout: 5000 });

    await navigateToMonth(driver, month, year);

    const formattedDay = String(day);
    const dayToClick = await driver.$(`android=new UiSelector().text("${formattedDay}").clickable(true)`);
    await dayToClick.click();
    await driver.pause(500);

    const okBtn = await driver.$('//android.widget.Button[@text="OK" or @resource-id="android:id/button1"]');
    await okBtn.click();
}

async function clickElementByText(driver, textName) {
    console.log(`Waiting for "${textName}" to be displayed...`);
    const element = await driver.$(`//android.widget.TextView[@text='${textName}']`);
    await element.waitForDisplayed({ timeout: 10000 });
    await element.click();
    console.log(`Successfully clicked on "${textName}".`);
}

async function searchForRecord(driver, searchText) {
    console.log(`Typing "${searchText}" into the search bar...`);
    const searchInput = await driver.$('//*[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
    await searchInput.waitForDisplayed({ timeout: 10000 });

    await searchInput.click();
    await searchInput.setValue(searchText);
    await driver.pressKeyCode(66);
    console.log(`Search triggered for: ${searchText}`);
}

async function clickButtonOnCard(driver, cardTitle, buttonText) {
    console.log(`Looking for the "${buttonText}" button on the "${cardTitle}" card...`);
    const xpath = `//android.widget.TextView[contains(@text, '${cardTitle}')]/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_content']//android.widget.Button[@text='${buttonText}']`;
    const button = await driver.$(xpath);
    await button.waitForDisplayed({ timeout: 10000 });
    await button.click();
    console.log(`Successfully clicked "${buttonText}" on the "${cardTitle}" card.`);
}

async function fillVisitDate(driver) {
    console.log('Clicking Visit Date to open calendar...');
    const field = await driver.$('//android.widget.EditText[@hint="Visit Date *"]');
    await field.waitForDisplayed({ timeout: 10000 });

    await field.click();
    await driver.pause(1500);

    console.log(`Setting date to: ${FORM_DATA.visitDate.day}/${FORM_DATA.visitDate.month}/${FORM_DATA.visitDate.year}`);
    await pickDateFromCalendar(driver, FORM_DATA.visitDate);

    console.log('✔ Visit Date selected successfully.');
}

async function fillHealthStatus(driver) {
    console.log('Processing Health Status Dropdown...');
    const status = FORM_DATA.healthStatus;
    if (!status) return;

    const dropdown = await driver.$('//android.widget.Spinner[@text="Health Status *"]');
    await dropdown.waitForDisplayed({ timeout: 10000 });
    await dropdown.click();

    await driver.pause(1000);

    const coords = HEALTH_STATUS_COORDS[status];
    if (coords) {
        await tapAt(driver, coords.x, coords.y);
        console.log(`✔ Selected Health Status: "${status}" via coordinates.`);
    } else {
        console.error(`❌ Coordinates not found for Health Status: "${status}"`);
    }
}

async function fillReferredToHealthFacility(driver) {
    const value = FORM_DATA.referredToHealthFacility;
    if (!value) {
        console.log('No value provided for "Referred to Health Facility". Skipping.');
        return;
    }

    console.log('Checking if "Referred to Health Facility" field is present...');

    try {
        const field = await driver.$('//android.widget.EditText[@hint="Referred to Health Facility *"]');
        await field.waitForDisplayed({ timeout: 5000 });

        await field.click();
        await driver.pause(500);
        await field.setValue(value);

        console.log(`✔ Filled "Referred to Health Facility" with: "${value}"`);
    } catch (error) {
        console.log('ℹ "Referred to Health Facility" field is not visible (may not appear for selected Health Status). Skipping.');
    }
}

async function fillIFATabletDistribution(driver) {
    const value = FORM_DATA.ifaTabletDistribution;
    if (!value) {
        console.log('No value provided for "IFA Tablet Distribution". Skipping.');
        return;
    }

    console.log(`Selecting IFA Tablet Distribution: "${value}"...`);

    // Find the RadioButton under the "IFA Tablet Distribution" label
    const xpath = `//android.widget.TextView[@text="IFA Tablet Distribution *"]/ancestor::android.widget.LinearLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/ll_content"]//android.widget.RadioButton[@text="${value}"]`;
    const radioBtn = await driver.$(xpath);
    await radioBtn.waitForDisplayed({ timeout: 10000 });
    await radioBtn.click();

    console.log(`✔ Selected IFA Tablet Distribution: "${value}"`);

    // If "Yes" was selected, fill "Quantity of IFA Tablets" if it appears
    if (value === 'Yes') {
        await driver.pause(500);
        await fillQuantityOfIFATablets(driver);
    }
}

async function fillQuantityOfIFATablets(driver) {
    const quantity = FORM_DATA.quantityOfIFATablets;
    if (!quantity) {
        console.log('No value provided for "Quantity of IFA Tablets". Skipping.');
        return;
    }

    console.log('Checking if "Quantity of IFA Tablets" field is present...');

    try {
        const field = await driver.$('//android.widget.EditText[@hint="Quantity of IFA Tablets *"]');
        await field.waitForDisplayed({ timeout: 5000 });

        await field.click();
        await driver.pause(500);
        await field.setValue(quantity);

        console.log(`✔ Filled "Quantity of IFA Tablets" with: "${quantity}"`);
    } catch (error) {
        console.log('ℹ "Quantity of IFA Tablets" field is not visible. Skipping.');
    }
}

async function selectRadioAfterLabel(driver, labelText, radioValue) {
    // Step 1: Scroll the label into view
    const scrollSelector = `new UiScrollable(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/form").scrollable(true)).scrollIntoView(new UiSelector().text("${labelText}"))`;
    try {
        await driver.$(`android=${scrollSelector}`);
    } catch (_) {}
    await driver.pause(800);

    // Step 2: Dismiss keyboard if open (it may be covering the view)
    try { await driver.hideKeyboard(); } catch (_) {}
    await driver.pause(500);

    // Step 3: Scroll label into view again after keyboard dismiss
    try {
        await driver.$(`android=${scrollSelector}`);
    } catch (_) {}
    await driver.pause(500);

    // Step 4: Get the label element's location, then tap the correct RadioButton
    // by finding it via UiAutomator2 fromParent — avoids XPath ancestor recycling bug
    const uiSelector = `android=new UiScrollable(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/form").scrollable(true)).scrollIntoView(new UiSelector().text("${labelText}"))`;
    const labelEl = await driver.$(uiSelector);
    const labelLocation = await labelEl.getLocation();
    const labelY = labelLocation.y;

    // Step 5: Find all RadioButtons currently on screen with the matching text,
    // pick the one whose Y coordinate is CLOSEST to (and below) the label
    const allRadios = await driver.$$(`//android.widget.RadioButton[@text="${radioValue}"]`);

    let bestRadio = null;
    let bestDist = Infinity;

    for (const radio of allRadios) {
        try {
            const loc = await radio.getLocation();
            const dist = loc.y - labelY;
            // Must be below the label (dist > 0) and closest to it
            if (dist > 0 && dist < bestDist) {
                bestDist = dist;
                bestRadio = radio;
            }
        } catch (_) {}
    }

    if (bestRadio) {
        await bestRadio.click();
        console.log(`✔ Clicked "${radioValue}" radio near label "${labelText}" (Y offset: ${bestDist}px)`);
    } else {
        throw new Error(`Could not find "${radioValue}" radio button near label "${labelText}"`);
    }
}

// Scrolls to an EditText by hint. Since EditText hint is not matched by UiSelector().text(),
// we scroll down a fixed step first, then locate by XPath hint attribute.
async function scrollToEditText(driver, hint) {
    // Scroll down inside the form to reveal off-screen fields
    for (let i = 0; i < 5; i++) {
        try {
            const el = await driver.$(`//android.widget.EditText[@hint="${hint}"]`);
            if (await el.isDisplayed()) return el;
        } catch (_) {}

        await driver.performActions([{
            type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: 540, y: 1500 },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 100 },
                { type: 'pointerMove', duration: 600, x: 540, y: 800 },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
        await driver.releaseActions();
        await driver.pause(700);
    }
    // Final attempt
    return await driver.$(`//android.widget.EditText[@hint="${hint}"]`);
}

// Scrolls to a Spinner by its current text attribute using swipe-based scrolling
async function scrollToSpinner(driver, spinnerText) {
    for (let i = 0; i < 5; i++) {
        try {
            const el = await driver.$(`//android.widget.Spinner[@text="${spinnerText}"]`);
            if (await el.isDisplayed()) return el;
        } catch (_) {}

        await driver.performActions([{
            type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: 540, y: 1500 },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 100 },
                { type: 'pointerMove', duration: 600, x: 540, y: 800 },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
        await driver.releaseActions();
        await driver.pause(700);
    }
    return await driver.$(`//android.widget.Spinner[@text="${spinnerText}"]`);
}

async function fillMenstrualHygieneAwareness(driver) {
    const value = FORM_DATA.menstrualHygieneAwareness;
    if (!value) {
        console.log('No value provided for "Menstrual Hygiene Awareness". Skipping.');
        return;
    }

    console.log(`Selecting Menstrual Hygiene Awareness: "${value}"...`);
    await selectRadioAfterLabel(driver, 'Menstrual Hygiene Awareness', value);
    console.log(`✔ Selected Menstrual Hygiene Awareness: "${value}"`);
}

async function fillSanitaryNapkinDistributed(driver) {
    const value = FORM_DATA.sanitaryNapkinDistributed;
    if (!value) {
        console.log('No value provided for "Sanitary Napkin Distributed". Skipping.');
        return;
    }

    console.log(`Selecting Sanitary Napkin Distributed: "${value}"...`);
    await selectRadioAfterLabel(driver, 'Sanitary Napkin Distributed *', value);
    console.log(`✔ Selected Sanitary Napkin Distributed: "${value}"`);

    if (value === 'Yes') {
        await driver.pause(500);
        await fillNoOfPacketsDistributed(driver);

        await driver.pause(500);
        await fillSanitaryNapkinPlace(driver);

        await driver.pause(500);
        await fillSanitaryNapkinDate(driver); // <-- Added this new step!
    }
}

async function fillNoOfPacketsDistributed(driver) {
    const quantity = FORM_DATA.noOfPacketsDistributed;
    if (!quantity) {
        console.log('No value provided for "No. of Packets Distributed". Skipping.');
        return;
    }

    console.log('Filling "No. of Packets Distributed"...');

    try {
        const field = await scrollToEditText(driver, 'No. of Packets Distributed *');
        await field.click();
        await driver.pause(500);
        await field.setValue(quantity);
        console.log(`✔ Filled "No. of Packets Distributed" with: "${quantity}"`);
    } catch (error) {
        console.log('ℹ "No. of Packets Distributed" field not found. Skipping.');
    }
}

async function fillSanitaryNapkinPlace(driver) {
    const place = FORM_DATA.sanitaryNapkinPlace;
    if (!place) {
        console.log('No value provided for "Place". Skipping.');
        return;
    }

    console.log(`Selecting Place: "${place}" using coordinates...`);

    try {
        // Find and click the dropdown to open the menu
        const dropdown = await scrollToSpinner(driver, 'Place *');
        await dropdown.click();

        // Pause to allow the dropdown menu animation to finish opening
        await driver.pause(1000);

        // Get the coordinates for the chosen place
        const coords = PLACE_COORDS[place];

        if (coords) {
            // Use the existing tapAt function to click the coordinate
            await tapAt(driver, coords.x, coords.y);
            console.log(`✔ Selected Place: "${place}" via coordinates (X:${coords.x}, Y:${coords.y}).`);
        } else {
            console.error(`❌ Coordinates not defined for Place option: "${place}"`);
        }

        await driver.pause(500);

    } catch (error) {
        console.log(`ℹ "Place" dropdown not found or could not be clicked. Skipping. Error: ${error.message}`);
    }
}

async function fillSanitaryNapkinDate(driver) {
    const dateObj = FORM_DATA.sanitaryNapkinDate;
    if (!dateObj) {
        console.log('No value provided for "Sanitary Napkin Date". Skipping.');
        return;
    }

    console.log('Scrolling to "Date" field for Sanitary Napkin Distribution...');

    try {
        // Use your existing scrolling function to find the field by its hint
        const field = await scrollToEditText(driver, 'Date');
        await field.click();

        // Pause to let the calendar popup animate and open
        await driver.pause(1500);

        console.log(`Setting date to: ${dateObj.day}/${dateObj.month}/${dateObj.year}`);

        // Reuse your existing calendar selection logic
        await pickDateFromCalendar(driver, dateObj);

        console.log('✔ Sanitary Napkin Date selected successfully.');
    } catch (error) {
        console.log(`ℹ "Date" field not found or could not be clicked. Skipping. Error: ${error.message}`);
    }
}

async function fillCounselingProvided(driver) {
    const value = FORM_DATA.counselingProvided;
    if (!value) {
        console.log('No value provided for "Counseling Provided". Skipping.');
        return;
    }

    console.log(`Selecting Counseling Provided: "${value}"...`);

    try {
        await selectRadioAfterLabel(driver, 'Counseling Provided *', value);
        console.log(`✔ Selected Counseling Provided: "${value}"`);

        // If "Yes", we might need to handle subsequent fields
        if (value === 'Yes') {
            await driver.pause(500);
            // We will add the "Counseling Type" function here next
        }
    } catch (error) {
        console.log(`ℹ Could not select "Counseling Provided". Error: ${error.message}`);
    }
}

async function fillCounselingType(driver) {
    const type = FORM_DATA.counselingType;
    if (!type) {
        console.log('No value provided for "Counseling Type". Skipping.');
        return;
    }

    console.log(`Selecting Counseling Type: "${type}" using coordinates...`);

    try {
        // Find and click the dropdown to open the menu
        const dropdown = await scrollToSpinner(driver, 'Counseling Type');
        await dropdown.click();

        // Pause to allow the bottom sheet animation to finish
        await driver.pause(1000);

        // Get the coordinates
        const coords = COUNSELING_TYPE_COORDS[type];

        if (coords) {
            // Use your existing tapAt function
            await tapAt(driver, coords.x, coords.y);
            console.log(`✔ Selected Counseling Type: "${type}" via coordinates (X:${coords.x}, Y:${coords.y}).`);
        } else {
            console.error(`❌ Coordinates not defined for Counseling Type option: "${type}"`);
        }

        await driver.pause(500);

    } catch (error) {
        console.log(`ℹ "Counseling Type" dropdown could not be clicked. Skipping. Error: ${error.message}`);
    }
}

async function fillFollowUpDate(driver) {
    const dateObj = FORM_DATA.followUpDate;
    if (!dateObj) {
        console.log('No value provided for "Follow-up Date". Skipping.');
        return;
    }

    console.log('Scrolling to "Follow-up Date" field...');

    try {
        // Find the field by its hint
        const field = await scrollToEditText(driver, 'Follow-up Date');
        await field.click();

        // Pause to let the calendar popup animate and open
        await driver.pause(1500);

        console.log(`Setting Follow-up date to: ${dateObj.day}/${dateObj.month}/${dateObj.year}`);

        // Reuse your existing calendar selection logic
        await pickDateFromCalendar(driver, dateObj);

        console.log('✔ Follow-up Date selected successfully.');
    } catch (error) {
        console.log(`ℹ "Follow-up Date" field not found or could not be clicked. Skipping. Error: ${error.message}`);
    }
}

async function fillReferralStatus(driver) {
    const status = FORM_DATA.referralStatus;
    if (!status) {
        console.log('No value provided for "Referral Status". Skipping.');
        return;
    }

    console.log(`Selecting Referral Status: "${status}" using coordinates...`);

    try {
        // 1. Scroll to and click the dropdown
        const dropdown = await scrollToSpinner(driver, 'Referral Status');
        await dropdown.click();

        // 2. Pause to allow the bottom menu to slide up
        await driver.pause(1000);

        // 3. Get the coordinates for the chosen status
        const coords = REFERRAL_STATUS_COORDS[status];

        if (coords) {
            // 4. Tap the exact screen coordinates
            await tapAt(driver, coords.x, coords.y);
            console.log(`✔ Selected Referral Status: "${status}" via coordinates (X:${coords.x}, Y:${coords.y}).`);
        } else {
            console.error(`❌ Coordinates not defined for Referral Status option: "${status}"`);
        }

        await driver.pause(500);

    } catch (error) {
        console.log(`ℹ "Referral Status" dropdown could not be clicked. Skipping. Error: ${error.message}`);
    }
}

async function clickSubmit(driver) {
    console.log('Scrolling to the Submit button...');

    try {
        // Use UiAutomator to scroll down until the Submit button is fully in view
        const submitSelector = 'new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"))';
        const submitBtn = await driver.$(`android=${submitSelector}`);

        await submitBtn.waitForDisplayed({ timeout: 5000 });
        await submitBtn.click();

        console.log('✔ Clicked "Submit" successfully! Form completed.');
    } catch (error) {
        console.log(`ℹ Could not find or click the Submit button using scroller. Trying fallback...`);

        // Fallback directly to XPath just in case the screen is already at the bottom
        const fallbackBtn = await driver.$('//android.widget.Button[@text="Submit"]');
        await fallbackBtn.waitForDisplayed({ timeout: 5000 });
        await fallbackBtn.click();
        console.log('✔ Clicked "Submit" using fallback method.');
    }
}
async function runTest() {
    const driver = await remote(wdOpts);

    try {
        console.log('App launched successfully.');

        await clickElementByText(driver, 'Child Care');
        await driver.pause(1000);

        await clickElementByText(driver, 'Adolescent List');
        await driver.pause(1000);

        await searchForRecord(driver, 'lalita ff');
        await driver.pause(2000);

        await clickButtonOnCard(driver, 'LALITA FF', 'REGISTER');
        await driver.pause(2000);

        await fillVisitDate(driver);
        await driver.pause(1000);

        await fillHealthStatus(driver);
        await driver.pause(1000);

        // Fill "Referred to Health Facility" only if it appears after Health Status selection
        await fillReferredToHealthFacility(driver);
        await driver.pause(1000);

        await fillIFATabletDistribution(driver);
        await driver.pause(1000);

        await fillMenstrualHygieneAwareness(driver);
        await driver.pause(1000);

        await fillSanitaryNapkinDistributed(driver);
        await driver.pause(1000);
        await fillCounselingProvided(driver);
        await driver.pause(1000);
        await fillCounselingType(driver);
        await driver.pause(1000);
        await fillFollowUpDate(driver);
        await driver.pause(1000);
        await fillReferralStatus(driver); // <-- Added this line!
        await driver.pause(1000);
        await clickSubmit(driver);

    } catch (error) {
        console.error('An error occurred during test execution:', error);
    } finally {
        await driver.pause(2000);
        await driver.deleteSession();
        console.log('Test complete. Session ended.');
    }
}

runTest();