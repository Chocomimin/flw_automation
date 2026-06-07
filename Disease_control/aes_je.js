const { remote } = require('webdriverio');

// ─────────────────────────────────────────────────────────────
//  TEST DATA CONFIGURATION
// ─────────────────────────────────────────────────────────────
const inputData = {
    diseaseCategory: 'Disease Control',
    diseaseType: 'Kala Azar', // Dynamically replaces 'AES/JE'
    searchName: 'AJOY MAJHI',
    targetMemberName: 'BISAL MAJHI',
    visitDate: '15-03-2026',

    // Status can be: 'Not Applicable', 'Recovering', 'Cured', 'Death', 'Recurrence of Symptoms'
    beneficiaryStatus: 'Recovering',

    // Death Workflow Inputs
    dateOfDeath: '16-03-2026',
    reasonForDeath: 'Other', // 'Fever', 'other Disease', 'Other'
    otherReasonText: 'Unknown Complications',
    placeOfDeath: 'Other', // 'Home', 'Facility', 'Other'
    otherPlaceText: 'Street Side',

    // Standard Workflow Inputs (If not 'Death')
    caseStatus: 'Confirmed', // 'Suspected', 'Confirmed', 'Not Confirmed', 'Treatment Started'
    referredTo: 'Primary Health Centre',
    rdtResult: 'Positive', // 'Positive', 'Negative'
    dateOfTest: '16-03-2026'
};

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true
};

const wdioOptions = {
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities: capabilities
};

// ─────────────────────────────────────────────────────────────
//  CORE HELPERS — Extracted from Household Form
// ─────────────────────────────────────────────────────────────

// Helper to parse 'DD-MM-YYYY' strings into day, month, year integers
function parseDateString(dateStr) {
    const parts = dateStr.split('-');
    return {
        day: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10),
        year: parseInt(parts[2], 10)
    };
}

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

// ─────────────────────────────────────────────────────────────
//  EXISTING HELPERS
// ─────────────────────────────────────────────────────────────

async function clickElementByText(driver, text) {
    console.log(`Looking for element with text: '${text}'...`);
    const element = await driver.$(`//*[@text='${text}']`);
    await element.waitForDisplayed({ timeout: 10000 });
    await element.click();
}

async function searchForTextWithKeyboard(driver, searchText) {
    console.log(`Typing '${searchText}' and pressing Enter...`);
    const searchBox = await driver.$("//android.widget.EditText[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/searchView']");
    await searchBox.waitForDisplayed({ timeout: 10000 });
    await searchBox.click();
    await searchBox.setValue(searchText);
    await driver.pressKeyCode(66);
    console.log(`Search triggered for '${searchText}'`);
}

async function clickMembersByHouseholdName(driver, householdName) {
    console.log(`Locating Members button for: ${householdName}`);
    const membersBtnXPath = `//*[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id' and @text='${householdName}']/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/parentCard']//android.widget.Button[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/button3']`;
    const membersBtn = await driver.$(membersBtnXPath);
    await membersBtn.waitForDisplayed({ timeout: 10000 });
    await membersBtn.click();
    console.log(`✔ Clicked Members button for ${householdName}`);
}

async function scrollAndClickRegisterForMember(driver, memberName) {
    console.log(`Scrolling to find member: '${memberName}' and clicking REGISTER...`);
    const maxScrolls = 10;

    for (let i = 0; i < maxScrolls; i++) {
        const registerBtnXPath =
            `//*[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/ll_title_tb_screening_list_bar']` +
            `/android.widget.TextView[@text='${memberName}']` +
            `/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_content']` +
            `//android.widget.Button[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/btn_form_tb']`;

        const registerBtn = await driver.$(registerBtnXPath);
        const isDisplayed = await registerBtn.isDisplayed().catch(() => false);

        if (isDisplayed) {
            await registerBtn.click();
            console.log(`✔ Clicked REGISTER for member: ${memberName}`);
            return;
        }

        console.log(`Member not visible, scrolling down (attempt ${i + 1})...`);
        await driver.execute('mobile: scrollGesture', {
            left: 100, top: 400, width: 880, height: 1800,
            direction: 'down', percent: 0.8
        });
        await driver.pause(800);
    }

    throw new Error(`REGISTER button for '${memberName}' not found after ${maxScrolls} scrolls`);
}

function pad(n) {
    return String(n).padStart(2, '0');
}

async function selectDateInCalendar(driver, day, month, year) {
    console.log('Opened DatePicker dialog...');
    await driver.pause(1000);

    const yearHeader = await driver.$("//android.widget.TextView[@resource-id='android:id/date_picker_header_year']");
    await yearHeader.waitForDisplayed({ timeout: 5000 });
    await yearHeader.click();
    await driver.pause(800);

    const yearListItem = await driver.$(`//android.view.View[@text='${year}']`).catch(() => null);
    const yearListDisplayed = yearListItem ? await yearListItem.isDisplayed().catch(() => false) : false;

    if (yearListDisplayed) {
        await yearListItem.click();
        console.log(`✔ Selected year ${year} from year list`);
        await driver.pause(500);
    } else {
        const dateHeader = await driver.$("//android.widget.TextView[@resource-id='android:id/date_picker_header_date']");
        const dateHeaderDisplayed = await dateHeader.isDisplayed().catch(() => false);
        if (dateHeaderDisplayed) await dateHeader.click();
        await driver.pause(500);
    }

    const maxMonthNavigations = 24;
    for (let attempt = 0; attempt < maxMonthNavigations; attempt++) {
        const firstDayDesc = await driver
            .$("//android.view.View[@resource-id='android:id/month_view']//android.view.View[@text='1']")
            .getAttribute('content-desc')
            .catch(() => null);

        if (!firstDayDesc) {
            console.warn('Could not read month_view first day, retrying...');
            await driver.pause(500);
            continue;
        }

        const parts = firstDayDesc.split(' ');
        const currentMonthName = parts[1];
        const currentYear = parseInt(parts[2], 10);

        const monthNames = [
            'January','February','March','April','May','June',
            'July','August','September','October','November','December'
        ];
        const currentMonth = monthNames.indexOf(currentMonthName) + 1;

        if (currentMonth === month && currentYear === year) {
            console.log('✔ Reached target month/year');
            break;
        }

        const currentTotal = currentYear * 12 + currentMonth;
        const targetTotal = year * 12 + month;

        if (targetTotal > currentTotal) {
            const nextBtn = await driver.$("//android.widget.ImageButton[@content-desc='Next month']");
            const nextExists = await nextBtn.isExisting().catch(() => false);
            if (nextExists) {
                await nextBtn.click();
            } else {
                await driver.execute('mobile: swipeGesture', {
                    left: 234, top: 899, width: 612, height: 719,
                    direction: 'left', percent: 0.8
                });
            }
        } else {
            const prevBtn = await driver.$("//android.widget.ImageButton[@resource-id='android:id/prev']");
            await prevBtn.waitForDisplayed({ timeout: 5000 });
            await prevBtn.click();
        }

        await driver.pause(600);
    }

    const monthNames = [
        'January','February','March','April','May','June',
        'July','August','September','October','November','December'
    ];
    const targetContentDesc = `${pad(day)} ${monthNames[month - 1]} ${year}`;
    console.log(`Tapping day with content-desc: '${targetContentDesc}'`);

    const dayView = await driver.$(`//android.view.View[@content-desc='${targetContentDesc}']`);
    await dayView.waitForDisplayed({ timeout: 5000 });
    await dayView.click();
    console.log(`✔ Selected day: ${targetContentDesc}`);
    await driver.pause(500);

    const okBtn = await driver.$("//android.widget.Button[@resource-id='android:id/button1']");
    await okBtn.waitForDisplayed({ timeout: 5000 });
    await okBtn.click();
    console.log('✔ DatePicker confirmed with OK');
    await driver.pause(500);
}

async function fillVisitDateByCalendar(driver, day, month, year) {
    console.log(`Setting visit date to: ${pad(day)}-${pad(month)}-${year}`);
    const visitDateField = await driver.$("(//android.widget.EditText[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/et'])[1]");
    await visitDateField.waitForDisplayed({ timeout: 10000 });
    await visitDateField.click();

    await selectDateInCalendar(driver, day, month, year);
}

async function fillDateOfDeathByCalendar(driver, day, month, year) {
    console.log(`Setting Date of Death to: ${pad(day)}-${pad(month)}-${year}`);

    const deathDateField = await driver.$("//android.widget.EditText[contains(@text, 'Date of death') or contains(@hint, 'Date of death')]");
    await deathDateField.waitForDisplayed({ timeout: 10000 });
    await deathDateField.click();

    await selectDateInCalendar(driver, day, month, year);
}

// ─────────────────────────────────────────────────────────────
//  UPDATED REFACTORED DROPDOWN FUNCTIONS
// ─────────────────────────────────────────────────────────────

async function fillBeneficiaryStatus(driver, statusText) {
    try {
        console.log(`Opening 'Beneficiary Status' dropdown for: "${statusText}"...`);
        const spinnerSelector = "(//android.widget.Spinner[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown'])[1]";
        const optionsList = ['Not Applicable', 'Recovering', 'Cured', 'Death', 'Recurrence of Symptoms'];

        await clickSpinnerAndSelectOption(driver, spinnerSelector, statusText, optionsList);
    } catch (error) {
        console.error('❌ Error in fillBeneficiaryStatus:', error.message);
    }
}

// Renamed from fillAesJeCaseStatus to make it more generic for inputData.diseaseType
async function fillCaseStatus(driver, statusText) {
    try {
        console.log(`Opening 'Case Status' dropdown for: "${statusText}"...`);
        const spinnerSelector = "(//android.widget.Spinner[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown'])[2]";
        const optionsList = ['Suspected', 'Confirmed', 'Not Confirmed', 'Treatment Started'];

        await clickSpinnerAndSelectOption(driver, spinnerSelector, statusText, optionsList);
    } catch (error) {
        console.error('❌ Error in fillCaseStatus:', error.message);
    }
}

async function fillReferredTo(driver, statusText, otherInputText = "Other details") {
    try {
        console.log(`Opening 'Referred To' dropdown for: "${statusText}"...`);
        const spinnerSelector = "(//android.widget.Spinner[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown'])[3]";
        const optionsList = [
            'Primary Health Centre', 'Community Health Centre', 'District Hospital',
            'Medical College and Hospital', 'Referral Hospital', 'Other Private Hospital', 'Other'
        ];

        await clickSpinnerAndSelectOption(driver, spinnerSelector, statusText, optionsList);

        if (statusText === 'Other') {
            console.log(`'Other' selected. Attempting to fill the text input field...`);
            const otherEditText = await driver.$("//android.widget.EditText[contains(@hint, 'Other')]");
            await otherEditText.waitForDisplayed({ timeout: 5000 });
            await otherEditText.click();
            await driver.pause(1000);
            await otherEditText.setValue(otherInputText);

            try {
                if (await driver.isKeyboardShown()) await driver.hideKeyboard();
            } catch (e) {}

            console.log(`✔ Filled 'Other' text field with: ${otherInputText}`);
            await driver.pause(1000);
        }
    } catch (error) {
        console.error('❌ Error in fillReferredTo:', error.message);
    }
}

async function fillPlaceOfDeath(driver, placeText, otherInputText = "En route to hospital") {
    try {
        console.log(`Opening 'Place of Death' dropdown for: "${placeText}"...`);
        const spinnerSelector = "(//android.widget.Spinner[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown'])[2]";
        const optionsList = ['Home', 'Facility', 'Other'];

        await clickSpinnerAndSelectOption(driver, spinnerSelector, placeText, optionsList);

        if (placeText === 'Other') {
            console.log(`'Other' selected. Attempting to fill using keyboard...`);
            const otherPlaceField = await driver.$("//android.widget.EditText[contains(@hint, 'Other Place of Death') or contains(@text, 'Other Place of Death')]");
            await otherPlaceField.waitForDisplayed({ timeout: 5000 });
            await otherPlaceField.click();
            await driver.pause(1000);
            await otherPlaceField.setValue(otherInputText);

            try {
                if (await driver.isKeyboardShown()) await driver.hideKeyboard();
            } catch (e) { }

            console.log(`✔ Filled 'Other Place of Death' field with: ${otherInputText}`);
            await driver.pause(1000);
        }
    } catch (error) {
        console.error('❌ Error in fillPlaceOfDeath:', error.message);
    }
}

async function fillReasonForDeath(driver, reasonText, otherInputText = "Other illness") {
    try {
        console.log(`Opening 'Reason for Death' dropdown for: "${reasonText}"...`);
        const spinnerSelector = "(//android.widget.Spinner[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown'])[3]";
        const optionsList = ['Fever', 'other Disease', 'Other'];

        await clickSpinnerAndSelectOption(driver, spinnerSelector, reasonText, optionsList);

        if (reasonText === 'Other') {
            console.log(`'Other' selected. Attempting to fill using keyboard...`);
            const otherReasonField = await driver.$("//android.widget.EditText[contains(@hint, 'Other Reason of Death') or contains(@text, 'Other Reason of Death')]");
            await otherReasonField.waitForDisplayed({ timeout: 5000 });
            await otherReasonField.click();
            await driver.pause(1000);
            await otherReasonField.setValue(otherInputText);

            try {
                if (await driver.isKeyboardShown()) await driver.hideKeyboard();
            } catch (e) { }

            console.log(`✔ Filled 'Other Reason of Death' field with: ${otherInputText}`);
            await driver.pause(1000);
        }
    } catch (error) {
        console.error('❌ Error in fillReasonForDeath:', error.message);
    }
}

async function submitForm(driver) {
    console.log("Locating and clicking 'Submit' button...");
    const submitBtn = await driver.$("//android.widget.Button[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/btn_submit']");
    await submitBtn.waitForDisplayed({ timeout: 10000 });
    await submitBtn.click();
    console.log("✔ Clicked Submit button successfully.");
    await driver.pause(2000);
}

// ─────────────────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
    console.log("Initializing Appium session...");
    let driver;

    try {
        driver = await remote(wdioOptions);

        // 1. Driven dynamically by inputData.diseaseCategory & inputData.diseaseType
        await clickElementByText(driver, inputData.diseaseCategory);
        await clickElementByText(driver, inputData.diseaseType);

        // 2. Driven dynamically by inputData.searchName & inputData.targetMemberName
        await searchForTextWithKeyboard(driver, inputData.searchName);
        await driver.pause(2000);

        await clickMembersByHouseholdName(driver, inputData.searchName);
        await driver.pause(2000);

        await scrollAndClickRegisterForMember(driver, inputData.targetMemberName);
        await driver.pause(2000);

        // 3. Parse Visit Date & invoke Calendar
        const visit = parseDateString(inputData.visitDate);
        await fillVisitDateByCalendar(driver, visit.day, visit.month, visit.year);

        // --- Status Configuration from inputData ---
        await fillBeneficiaryStatus(driver, inputData.beneficiaryStatus);

        // --- Branch Logic Based on Selected Status ---
        if (inputData.beneficiaryStatus === 'Death') {
            console.log(`Condition met: Beneficiary Status is 'Death'. Proceeding to fill Date, Place, and Reason of Death.`);

            await driver.pause(1000);

            const death = parseDateString(inputData.dateOfDeath);
            await fillDateOfDeathByCalendar(driver, death.day, death.month, death.year);

            await fillReasonForDeath(driver, inputData.reasonForDeath, inputData.otherReasonText);
            await fillPlaceOfDeath(driver, inputData.placeOfDeath, inputData.otherPlaceText);

        } else {
            const targetStatuses = ['Cured', 'Recurrence of Symptoms', 'Recovering', 'Not Applicable'];
            if (targetStatuses.includes(inputData.beneficiaryStatus)) {
                console.log(`Condition met: Beneficiary Status is '${inputData.beneficiaryStatus}'. Proceeding to fill subsequent forms.`);

                await fillCaseStatus(driver, inputData.caseStatus);
                await fillReferredTo(driver, inputData.referredTo, "Details if 'Other' selected");

                // Note: If you have additional dropdown UI interactions for `rdtResult` and `dateOfTest`,
                // you would hook them up right here using `inputData.rdtResult` & `inputData.dateOfTest`.
            } else {
                console.log(`Condition NOT met: Beneficiary Status '${inputData.beneficiaryStatus}' does not trigger subsequent selections.`);
            }
        }

        await submitForm(driver);
        await driver.pause(3000);

    } catch (error) {
        console.error("An error occurred:", error.message);
    } finally {
        if (driver) {
            await driver.pause(2000);
            await driver.deleteSession();
        }
    }
}

main();