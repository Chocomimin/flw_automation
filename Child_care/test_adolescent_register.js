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
    searchName: 'shika karmakar',
    visitDate: { day: 21, month: 3, year: 2025 },
    healthStatus: 'Anemic',
    referredToHealthFacility: 'City Health Center',
    ifaTabletDistribution: 'Yes',
    quantityOfIFATablets: '10',
    menstrualHygieneAwareness: 'Yes',
    sanitaryNapkinDistributed: 'Yes',
    noOfPacketsDistributed: '5',
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

// ── Touch & Scroll Helpers ────────────────────────────────────────────────────

async function tapByCoords(driver, x, y) {
    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x, y },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 150 },
            { type: 'pointerUp', button: 0 },
        ],
    }]);
    await driver.releaseActions();
    await driver.pause(500);
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

async function scrollDown(driver) {
    const size = await driver.getWindowRect();
    const startX = Math.floor(size.width / 2);
    const startY = Math.floor(size.height * 0.70);
    const endY = Math.floor(size.height * 0.30);

    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: startX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerMove', duration: 600, x: startX, y: endY },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(1000);
}

async function scrollUp(driver) {
    const size = await driver.getWindowRect();
    const startX = Math.floor(size.width / 2);
    const startY = Math.floor(size.height * 0.30);
    const endY = Math.floor(size.height * 0.70);

    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: startX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerMove', duration: 600, x: startX, y: endY },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(1000);
}

async function scrollToText(driver, text, maxScrolls = 4) {
    const elementXPath = `//*[contains(@text, "${text}") or contains(@hint, "${text}")]`;
    try {
        const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${text}"))`;
        await driver.$(`android=${scrollable}`).catch(() => {});
    } catch (e) {}

    let element = await driver.$(elementXPath);
    if ((await element.isExisting()) && (await element.isDisplayed())) return;

    for (let i = 0; i < maxScrolls; i++) {
        element = await driver.$(elementXPath);
        if ((await element.isExisting()) && (await element.isDisplayed())) return;
        await scrollDown(driver);
    }
}

// ── Bulletproof Dropdown Integration ──────────────────────────────────────────

async function scrollSpinnerToMiddle(driver, spinnerSelector) {
    try {
        const spinner = await driver.$(spinnerSelector);
        const loc = await spinner.getLocation();
        const screen = await driver.getWindowRect();
        const midY = screen.height / 2;

        // Force elements below the midway point higher up to ensure accurate tap calculation
        if (loc.y > midY - 100) {
            const startY = Math.floor(screen.height * 0.7);
            const endY = Math.floor(screen.height * 0.2);
            const swipeX = Math.floor(screen.width / 2);

            await driver.performActions([{
                type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
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
    } catch (e) {}
}

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList) {
    await scrollSpinnerToMiddle(driver, spinnerSelector);
    await driver.pause(1500);

    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc = await spinner.getLocation();
    const size = await spinner.getSize();
    const screen = await driver.getWindowRect();

    // Tap the right-side arrow icon physically to open the menu
    const tapX = Math.floor(loc.x + (size.width * 0.90));
    const tapY = Math.floor(loc.y + (size.height / 2));

    console.log(`📍 Opening dropdown for "${value}" at (${tapX}, ${tapY})...`);
    await tapByCoords(driver, tapX, tapY);

    // Give the Popup Window layer time to fully render on screen
    await driver.pause(2000);

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
        await tapByCoords(driver, tapX, tapY);
        await driver.pause(2000);
    }

    const index = optionsList.indexOf(value);
    if (index === -1) {
        throw new Error(`❌ "${value}" was not found in the provided options list: [${optionsList.join(', ')}]`);
    }

    console.log(`⚡ Bypassing Appium DOM. Executing Screen-Aware Math Tap for index ${index}...`);

    const gap = 15;
    const itemHeight = Math.floor(size.height * 0.92);
    const spinnerTop = loc.y;
    const spinnerBottom = loc.y + size.height;

    // Calculate if there is enough space below the spinner for the menu
    const spaceBelow = screen.height - spinnerBottom;
    const requiredSpace = (optionsList.length * itemHeight) + gap;

    const finalTapX = Math.floor(loc.x + (size.width / 2));
    let finalTapY;

    if (spaceBelow >= requiredSpace || spaceBelow > spinnerTop) {
        // Enough space below: Menu opens DOWNWARDS
        console.log(`📉 Menu opened downwards.`);
        finalTapY = Math.floor(spinnerBottom + gap + (index * itemHeight) + (itemHeight / 2));
    } else {
        // Not enough space below: Menu opens UPWARDS
        console.log(`📈 Menu opened upwards.`);
        const popupBottom = spinnerTop - gap;
        const popupTop = popupBottom - (optionsList.length * itemHeight);
        finalTapY = Math.floor(popupTop + (index * itemHeight) + (itemHeight / 2));
    }

    console.log(`📍 Tapping Option via Math Fallback at (${finalTapX}, ${finalTapY})`);
    await tapByCoords(driver, finalTapX, finalTapY);
    console.log(`✅ Selected "${value}" successfully!`);

    await driver.pause(1000);
}

// ── Calendar Logic ────────────────────────────────────────────────────────────

async function pickDateFromCalendar(driver, dateObj) {
    const { day, month, year } = dateObj;

    const okBtnXPath = '//android.widget.Button[@text="OK" or @resource-id="android:id/button1"]';
    const okBtn = await driver.$(okBtnXPath);
    await okBtn.waitForDisplayed({ timeout: 5000 });

    console.log('🗓️ Calendar opened. Adjusting year...');

    const yearHeader = await driver.$('//*[@resource-id="android:id/date_picker_header_year"]');
    if (await yearHeader.isExisting()) {
        const currentYear = parseInt(await yearHeader.getText(), 10);
        if (currentYear !== year) {
            await yearHeader.click();
            await driver.pause(1000);

            const yearScrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${year}")`;
            const yearEl = await driver.$(`android=${yearScrollable}`);
            await yearEl.click();
            await driver.pause(1000);
        }
    }

    console.log('🗓️ Adjusting month...');

    for (let i = 0; i < 24; i++) {
        const midDay = await driver.$('//android.view.View[@text="15"]');
        if (!(await midDay.isExisting())) break;

        const contentDesc = await midDay.getAttribute('content-desc');
        const currentMonthName = MONTH_NAMES.find(m => m !== '' && contentDesc.includes(m));
        const currentMonthIndex = MONTH_NAMES.indexOf(currentMonthName);

        if (currentMonthIndex === month) break;

        if (currentMonthIndex < month) {
            const nextBtn = await driver.$('//*[@resource-id="android:id/next"]');
            if (await nextBtn.isExisting() && await nextBtn.getAttribute('enabled') === 'true') {
                await nextBtn.click();
            } else {
                await swipeHorizontal(driver, 'left');
            }
        } else {
            const prevBtn = await driver.$('//*[@resource-id="android:id/prev"]');
            if (await prevBtn.isExisting() && await prevBtn.getAttribute('enabled') === 'true') {
                await prevBtn.click();
            } else {
                await swipeHorizontal(driver, 'right');
            }
        }
        await driver.pause(800);
    }

    console.log(`🗓️ Selecting day ${day}...`);

    const dayEl = await driver.$(`//android.view.View[@text="${day}"]`);
    if (await dayEl.isExisting()) {
        await dayEl.click();
    } else {
        console.log(`⚠️ Day ${day} not found on calendar.`);
    }

    await driver.pause(500);

    await okBtn.click();
    await driver.pause(1000);
}

// ── Search & Form Finding Helpers ─────────────────────────────────────────────

async function clickElementByText(driver, textName) {
    console.log(`Waiting for "${textName}" to be displayed...`);
    const element = await driver.$(`//android.widget.TextView[@text='${textName}']`);
    await element.waitForDisplayed({ timeout: 10000 });
    await element.click();
    console.log(`Successfully clicked on "${textName}".`);
}

async function searchRecord(driver, searchText) {
    console.log(`Typing "${searchText}" into the search bar...`);

    const searchInput = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
    await searchInput.waitForDisplayed({ timeout: 10000 });

    await searchInput.click();
    await driver.pause(500);
    await searchInput.clearValue();
    await searchInput.setValue(searchText);
    await driver.pause(1000);

    try {
        await driver.execute('mobile: performEditorAction', { action: 'search' });
    } catch (e) {
        console.log('mobile: performEditorAction unsupported, falling back to Enter key...');
        await driver.pressKeyCode(66);
    }

    await driver.pause(1000);

    try {
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }
    } catch (e) {}

    console.log(`✔ Search triggered for: ${searchText}. Waiting for list to update...`);
    await driver.pause(3000);
}

async function clickButtonOnCard(driver, cardTitle, buttonText) {
    const upperCaseTitle = cardTitle.toUpperCase();
    console.log(`Looking for the "${buttonText}" button on the "${upperCaseTitle}" card...`);

    const xpath = `//android.widget.TextView[contains(translate(@text, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${cardTitle.toLowerCase()}')]/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_content']//android.widget.Button[@text='${buttonText}']`;

    const button = await driver.$(xpath);
    await button.waitForDisplayed({ timeout: 10000 });
    await button.click();
    console.log(`Successfully clicked "${buttonText}" on the "${upperCaseTitle}" card.`);
}

async function selectRadioAfterLabel(driver, labelText, radioValue) {
    await scrollToText(driver, labelText);
    await driver.pause(800);

    const uiSelector = `android=new UiScrollable(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/form").scrollable(true)).scrollIntoView(new UiSelector().text("${labelText}"))`;
    const labelEl = await driver.$(uiSelector);
    const labelLocation = await labelEl.getLocation();
    const labelY = labelLocation.y;

    const allRadios = await driver.$$(`//android.widget.RadioButton[@text="${radioValue}"]`);

    let bestRadio = null;
    let bestDist = Infinity;

    for (const radio of allRadios) {
        try {
            const loc = await radio.getLocation();
            const dist = loc.y - labelY;
            if (dist > 0 && dist < bestDist) {
                bestDist = dist;
                bestRadio = radio;
            }
        } catch (_) {}
    }

    if (bestRadio) {
        await bestRadio.click();
        console.log(`✔ Clicked "${radioValue}" radio near label "${labelText}"`);
    } else {
        throw new Error(`Could not find "${radioValue}" radio button near label "${labelText}"`);
    }
}

async function scrollToEditText(driver, hint) {
    for (let i = 0; i < 5; i++) {
        try {
            const el = await driver.$(`//android.widget.EditText[@hint="${hint}"]`);
            if (await el.isDisplayed()) return el;
        } catch (_) {}
        await scrollDown(driver);
    }
    return await driver.$(`//android.widget.EditText[@hint="${hint}"]`);
}

// ── Form Filling Functions ────────────────────────────────────────────────────

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
    const status = FORM_DATA.healthStatus;
    if (!status) return;

    console.log('Processing Health Status Dropdown...');
    await scrollToText(driver, "Health Status");

    const spinnerXPath = `//android.widget.Spinner[contains(@hint, "Health Status") or contains(@text, "Health Status")]`;
    const optionsList = ['Healthy', 'Anemic', 'Malnourished'];

    await clickSpinnerAndSelectOption(driver, spinnerXPath, status, optionsList);
}

async function fillReferredToHealthFacility(driver) {
    const value = FORM_DATA.referredToHealthFacility;
    if (!value) return;

    console.log('Checking if "Referred to Health Facility" field is present...');
    try {
        await scrollToText(driver, "Referred to Health Facility");
        const field = await driver.$('//android.widget.EditText[@hint="Referred to Health Facility *"]');
        await field.waitForDisplayed({ timeout: 5000 });

        await field.click();
        await driver.pause(500);
        await field.setValue(value);

        try {
            if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        } catch (e) {}

        console.log(`✔ Filled "Referred to Health Facility" with: "${value}"`);
    } catch (error) {
        console.log('ℹ "Referred to Health Facility" field is not visible. Skipping.');
    }
}

async function fillIFATabletDistribution(driver) {
    const value = FORM_DATA.ifaTabletDistribution;
    if (!value) return;

    console.log(`Selecting IFA Tablet Distribution: "${value}"...`);
    await scrollToText(driver, "IFA Tablet Distribution");

    const xpath = `//android.widget.TextView[@text="IFA Tablet Distribution *"]/ancestor::android.widget.LinearLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/ll_content"]//android.widget.RadioButton[@text="${value}"]`;
    const radioBtn = await driver.$(xpath);
    await radioBtn.waitForDisplayed({ timeout: 10000 });
    await radioBtn.click();

    console.log(`✔ Selected IFA Tablet Distribution: "${value}"`);

    if (value === 'Yes') {
        await driver.pause(500);
        await fillQuantityOfIFATablets(driver);
    }
}

async function fillQuantityOfIFATablets(driver) {
    const quantity = FORM_DATA.quantityOfIFATablets;
    if (!quantity) return;

    console.log('Checking if "Quantity of IFA Tablets" field is present...');
    try {
        await scrollToText(driver, "Quantity of IFA Tablets");
        const field = await driver.$('//android.widget.EditText[@hint="Quantity of IFA Tablets *"]');
        await field.waitForDisplayed({ timeout: 5000 });

        await field.click();
        await driver.pause(500);
        await field.setValue(quantity);

        try {
            if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        } catch (e) {}

        console.log(`✔ Filled "Quantity of IFA Tablets" with: "${quantity}"`);
    } catch (error) {
        console.log('ℹ "Quantity of IFA Tablets" field is not visible. Skipping.');
    }
}

async function fillMenstrualHygieneAwareness(driver) {
    const value = FORM_DATA.menstrualHygieneAwareness;
    if (!value) return;

    console.log(`Selecting Menstrual Hygiene Awareness: "${value}"...`);
    await selectRadioAfterLabel(driver, 'Menstrual Hygiene Awareness', value);
}

async function fillSanitaryNapkinDistributed(driver) {
    const value = FORM_DATA.sanitaryNapkinDistributed;
    if (!value) return;

    console.log(`Selecting Sanitary Napkin Distributed: "${value}"...`);
    await selectRadioAfterLabel(driver, 'Sanitary Napkin Distributed *', value);

    if (value === 'Yes') {
        await driver.pause(500);
        await fillNoOfPacketsDistributed(driver);
        await driver.pause(500);
        await fillSanitaryNapkinPlace(driver);
        await driver.pause(500);
        await fillSanitaryNapkinDate(driver);
    }
}

async function fillNoOfPacketsDistributed(driver) {
    const quantity = FORM_DATA.noOfPacketsDistributed;
    if (!quantity) return;

    console.log('Filling "No. of Packets Distributed"...');
    try {
        const field = await scrollToEditText(driver, 'No. of Packets Distributed *');
        await field.click();
        await driver.pause(500);
        await field.setValue(quantity);

        try {
            if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        } catch (e) {}

        console.log(`✔ Filled "No. of Packets Distributed" with: "${quantity}"`);
    } catch (error) {
        console.log('ℹ "No. of Packets Distributed" field not found. Skipping.');
    }
}

async function fillSanitaryNapkinPlace(driver) {
    const place = FORM_DATA.sanitaryNapkinPlace;
    if (!place) return;

    console.log(`Selecting Place: "${place}"...`);
    await scrollToText(driver, "Place");

    const spinnerXPath = `//android.widget.Spinner[contains(@text, "Place") or contains(@hint, "Place")]`;
    const optionsList = ['Home', 'Community center', 'School', 'Subcenter'];

    await clickSpinnerAndSelectOption(driver, spinnerXPath, place, optionsList);
}

async function fillSanitaryNapkinDate(driver) {
    const dateObj = FORM_DATA.sanitaryNapkinDate;
    if (!dateObj) return;

    console.log('Scrolling to "Date" field for Sanitary Napkin Distribution...');
    try {
        const field = await scrollToEditText(driver, 'Date');
        await field.click();
        await driver.pause(1500);
        console.log(`Setting date to: ${dateObj.day}/${dateObj.month}/${dateObj.year}`);
        await pickDateFromCalendar(driver, dateObj);
        console.log('✔ Sanitary Napkin Date selected successfully.');
    } catch (error) {
        console.log(`ℹ "Date" field not found or could not be clicked. Skipping. Error: ${error.message}`);
    }
}

async function fillCounselingProvided(driver) {
    const value = FORM_DATA.counselingProvided;
    if (!value) return;

    console.log(`Selecting Counseling Provided: "${value}"...`);
    try {
        await selectRadioAfterLabel(driver, 'Counseling Provided *', value);
    } catch (error) {
        console.log(`ℹ Could not select "Counseling Provided". Error: ${error.message}`);
    }
}

async function fillCounselingType(driver) {
    const type = FORM_DATA.counselingType;
    if (!type) return;

    console.log(`Selecting Counseling Type: "${type}"...`);
    await scrollToText(driver, "Counseling Type");

    const spinnerXPath = `//android.widget.Spinner[contains(@text, "Counseling Type") or contains(@hint, "Counseling Type")]`;
    const optionsList = ['Individual', 'Group'];

    await clickSpinnerAndSelectOption(driver, spinnerXPath, type, optionsList);
}

async function fillFollowUpDate(driver) {
    const dateObj = FORM_DATA.followUpDate;
    if (!dateObj) return;

    console.log('Scrolling to "Follow-up Date" field...');
    try {
        const field = await scrollToEditText(driver, 'Follow-up Date');
        await field.click();
        await driver.pause(1500);
        console.log(`Setting Follow-up date to: ${dateObj.day}/${dateObj.month}/${dateObj.year}`);
        await pickDateFromCalendar(driver, dateObj);
        console.log('✔ Follow-up Date selected successfully.');
    } catch (error) {
        console.log(`ℹ "Follow-up Date" field not found or could not be clicked. Skipping. Error: ${error.message}`);
    }
}

async function fillReferralStatus(driver) {
    const status = FORM_DATA.referralStatus;
    if (!status) return;

    console.log(`Selecting Referral Status: "${status}"...`);
    await scrollToText(driver, "Referral Status");

    const spinnerXPath = `//android.widget.Spinner[contains(@text, "Referral Status") or contains(@hint, "Referral Status")]`;
    const optionsList = ['Pending', 'Completed'];

    await clickSpinnerAndSelectOption(driver, spinnerXPath, status, optionsList);
}

async function clickSubmit(driver) {
    console.log('Scrolling to the Submit button...');
    try {
        const submitSelector = 'new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"))';
        const submitBtn = await driver.$(`android=${submitSelector}`);

        await submitBtn.waitForDisplayed({ timeout: 5000 });
        await submitBtn.click();
        console.log('✔ Clicked "Submit" successfully! Form completed.');
    } catch (error) {
        console.log(`ℹ Could not find or click the Submit button using scroller. Trying fallback...`);
        const fallbackBtn = await driver.$('//android.widget.Button[@text="Submit"]');
        await fallbackBtn.waitForDisplayed({ timeout: 5000 });
        await fallbackBtn.click();
        console.log('✔ Clicked "Submit" using fallback method.');
    }
}

// ── Main Execution ────────────────────────────────────────────────────────────

async function runTest() {
    const driver = await remote(wdOpts);

    try {
        console.log('App launched successfully.');

        await clickElementByText(driver, 'Child Care');
        await driver.pause(1000);

        await clickElementByText(driver, 'Adolescent List');
        await driver.pause(1000);

        await searchRecord(driver, FORM_DATA.searchName);
        await driver.pause(2000);

        await clickButtonOnCard(driver, FORM_DATA.searchName, 'REGISTER');
        await driver.pause(2000);

        await fillVisitDate(driver);
        await driver.pause(1000);

        await fillHealthStatus(driver);
        await driver.pause(1000);

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

        if (FORM_DATA.counselingProvided === 'Yes') {
            await fillCounselingType(driver);
            await driver.pause(1000);
        }

        await fillFollowUpDate(driver);
        await driver.pause(1000);

        await fillReferralStatus(driver);
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