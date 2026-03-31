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

const wdioOptions = {
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities: capabilities
};

/**
 * Universal helper function to tap an exact pixel.
 */
async function tapAt(driver, x, y) {
    await driver.action('pointer')
        .move({ duration: 0, x: x, y: y })
        .down({ button: 0 })
        .pause(100)
        .up({ button: 0 })
        .perform();
}

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

/**
 * Shared helper function to interact with Android's default DatePicker
 */
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

async function fillBeneficiaryStatusByCoordinates(driver, statusText) {
    try {
        console.log(`Opening 'Beneficiary Status' dropdown for: "${statusText}"...`);

        const dropdown = await driver.$("(//android.widget.Spinner[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown'])[1]");
        await dropdown.waitForDisplayed({ timeout: 10000 });
        await dropdown.click();

        await driver.pause(1500);

        const STATUS_COORDS = {
            'Not Applicable':         { x: 500, y: 600 },
            'Recovering':             { x: 500, y: 700 },
            'Cured':                  { x: 500, y: 900 },
            'Death':                  { x: 500, y: 1000 },
            'Recurrence of Symptoms': { x: 500, y: 1000 }
        };

        const target = STATUS_COORDS[statusText];

        if (target) {
            console.log(`Tapping ${statusText} at [${target.x}, ${target.y}]`);
            await tapAt(driver, target.x, target.y);
            console.log(`✔ Selected ${statusText}`);
        } else {
            console.error(`❌ Status "${statusText}" not found in coordinate map.`);
        }

        await driver.pause(1000);

    } catch (error) {
        console.error('❌ Error in fillBeneficiaryStatusByCoordinates:', error.message);
    }
}

async function fillAesJeCaseStatusByCoordinates(driver, statusText) {
    try {
        console.log(`Opening 'AES / JE Case Status' dropdown for: "${statusText}"...`);

        const dropdown = await driver.$("(//android.widget.Spinner[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown'])[2]");
        await dropdown.waitForDisplayed({ timeout: 10000 });
        await dropdown.click();

        await driver.pause(1500);

        const AES_STATUS_COORDS = {
            'Suspected':         { x: 500, y: 850 },
            'Confirmed':         { x: 500, y: 950 },
            'Not Confirmed':     { x: 500, y: 1050 },
            'Treatment Started': { x: 500, y: 1150 }
        };

        const target = AES_STATUS_COORDS[statusText];

        if (target) {
            console.log(`Tapping ${statusText} at [${target.x}, ${target.y}]`);
            await tapAt(driver, target.x, target.y);
            console.log(`✔ Selected AES Status: ${statusText}`);
        } else {
            console.error(`❌ AES Status "${statusText}" not found in coordinate map.`);
        }

        await driver.pause(1000);

    } catch (error) {
        console.error('❌ Error in fillAesJeCaseStatusByCoordinates:', error.message);
    }
}

async function fillReferredToByCoordinates(driver, statusText, otherInputText = "Other details") {
    try {
        console.log(`Opening 'Referred To' dropdown for: "${statusText}"...`);

        const dropdown = await driver.$("(//android.widget.Spinner[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown'])[3]");
        await dropdown.waitForDisplayed({ timeout: 10000 });
        await dropdown.click();

        await driver.pause(1500);

        const REFERRED_TO_COORDS = {
            'Primary Health Centre':        { x: 500, y: 1000 },
            'Community Health Centre':      { x: 500, y: 1100 },
            'District Hospital':            { x: 500, y: 1200 },
            'Medical College and Hospital': { x: 500, y: 1300 },
            'Referral Hospital':            { x: 500, y: 1400 },
            'Other Private Hospital':       { x: 500, y: 1500 },
            'Other':                        { x: 500, y: 1600 }
        };

        const target = REFERRED_TO_COORDS[statusText];

        if (target) {
            console.log(`Tapping ${statusText} at [${target.x}, ${target.y}]`);
            await tapAt(driver, target.x, target.y);
            console.log(`✔ Selected Referred To: ${statusText}`);
        } else {
            console.error(`❌ Referred To Status "${statusText}" not found in coordinate map.`);
            return;
        }

        await driver.pause(1000);

        if (statusText === 'Other') {
            console.log(`'Other' selected. Attempting to fill the text input field...`);
            const otherEditText = await driver.$("//android.widget.EditText[contains(@hint, 'Other')]");
            await otherEditText.waitForDisplayed({ timeout: 5000 });
            await otherEditText.click();
            await driver.pause(1000); // allow keyboard to show
            await otherEditText.setValue(otherInputText);

            try {
                if (await driver.isKeyboardShown()) await driver.hideKeyboard();
            } catch (e) {}

            console.log(`✔ Filled 'Other' text field with: ${otherInputText}`);
            await driver.pause(1000);
        }

    } catch (error) {
        console.error('❌ Error in fillReferredToByCoordinates:', error.message);
    }
}

/**
 * Updated function to handle the 'Place of Death' text input via keyboard
 */
async function fillPlaceOfDeathByCoordinates(driver, placeText, otherInputText = "En route to hospital") {
    try {
        console.log(`Opening 'Place of Death' dropdown for: "${placeText}"...`);

        const dropdown = await driver.$("(//android.widget.Spinner[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown'])[2]");
        await dropdown.waitForDisplayed({ timeout: 10000 });
        await dropdown.click();

        await driver.pause(1500);

        const PLACE_COORDS = {
            'Home':     { x: 500, y: 1000 },
            'Facility': { x: 500, y: 1100 },
            'Other':    { x: 500, y: 1200 }
        };

        const target = PLACE_COORDS[placeText];

        if (target) {
            console.log(`Tapping ${placeText} at [${target.x}, ${target.y}]`);
            await tapAt(driver, target.x, target.y);
            console.log(`✔ Selected Place of Death: ${placeText}`);
        } else {
            console.error(`❌ Place of Death "${placeText}" not found in coordinate map.`);
            return;
        }

        await driver.pause(1000);

        if (placeText === 'Other') {
            console.log(`'Other' selected. Attempting to fill using keyboard...`);

            const otherPlaceField = await driver.$("//android.widget.EditText[contains(@hint, 'Other Place of Death') or contains(@text, 'Other Place of Death')]");
            await otherPlaceField.waitForDisplayed({ timeout: 5000 });

            // Explicitly clicking the field to trigger the on-screen keyboard
            await otherPlaceField.click();
            await driver.pause(1000);
            await otherPlaceField.setValue(otherInputText);

            // Hiding keyboard to avoid obscuring the Submit button
            try {
                if (await driver.isKeyboardShown()) {
                    await driver.hideKeyboard();
                }
            } catch (e) { }

            console.log(`✔ Filled 'Other Place of Death' field with: ${otherInputText}`);
            await driver.pause(1000);
        }

    } catch (error) {
        console.error('❌ Error in fillPlaceOfDeathByCoordinates:', error.message);
    }
}

/**
 * Updated function to handle the 'Reason for Death' text input via keyboard
 */
async function fillReasonForDeathByCoordinates(driver, reasonText, otherInputText = "Other illness") {
    try {
        console.log(`Opening 'Reason for Death' dropdown for: "${reasonText}"...`);

        const dropdown = await driver.$("(//android.widget.Spinner[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown'])[3]");
        await dropdown.waitForDisplayed({ timeout: 10000 });
        await dropdown.click();

        await driver.pause(1500);

        const REASON_COORDS = {
            'Fever':         { x: 500, y: 1200 },
            'other Disease': { x: 500, y: 1300 },
            'Other':         { x: 500, y: 1400 }
        };

        const target = REASON_COORDS[reasonText];

        if (target) {
            console.log(`Tapping ${reasonText} at [${target.x}, ${target.y}]`);
            await tapAt(driver, target.x, target.y);
            console.log(`✔ Selected Reason for Death: ${reasonText}`);
        } else {
            console.error(`❌ Reason "${reasonText}" not found in coordinate map.`);
            return;
        }

        await driver.pause(1000);

        if (reasonText === 'Other') {
            console.log(`'Other' selected. Attempting to fill using keyboard...`);

            const otherReasonField = await driver.$("//android.widget.EditText[contains(@hint, 'Other Reason of Death') or contains(@text, 'Other Reason of Death')]");
            await otherReasonField.waitForDisplayed({ timeout: 5000 });

            // Explicitly clicking the field to trigger the on-screen keyboard
            await otherReasonField.click();
            await driver.pause(1000);
            await otherReasonField.setValue(otherInputText);

            // Hiding keyboard to avoid obscuring the Submit button
            try {
                if (await driver.isKeyboardShown()) {
                    await driver.hideKeyboard();
                }
            } catch (e) { }

            console.log(`✔ Filled 'Other Reason of Death' field with: ${otherInputText}`);
            await driver.pause(1000);
        }

    } catch (error) {
        console.error('❌ Error in fillReasonForDeathByCoordinates:', error.message);
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

async function main() {
    console.log("Initializing Appium session...");
    let driver;

    try {
        driver = await remote(wdioOptions);

        await clickElementByText(driver, 'Disease Control');
        await clickElementByText(driver, 'AES/JE');

        await searchForTextWithKeyboard(driver, 'ptest hhhh');
        await driver.pause(2000);

        await clickMembersByHouseholdName(driver, 'PTEST HHHH');
        await driver.pause(2000);

        await scrollAndClickRegisterForMember(driver, 'PTEST HHHH');
        await driver.pause(2000);

        await fillVisitDateByCalendar(driver, 20, 3, 2026);

        // --- Status Configuration ---
        const currentBeneficiaryStatus = 'Death'; // Switch status here to test different flows
        await fillBeneficiaryStatusByCoordinates(driver, currentBeneficiaryStatus);

        // --- Branch Logic Based on Selected Status ---
        if (currentBeneficiaryStatus === 'Death') {
            console.log(`Condition met: Beneficiary Status is 'Death'. Proceeding to fill Date, Place, and Reason of Death.`);

            await driver.pause(1000);
            await fillDateOfDeathByCalendar(driver, 26, 3, 2026);

            await fillReasonForDeathByCoordinates(driver, 'Other', 'Severe complications');
            await fillPlaceOfDeathByCoordinates(driver, 'Other', 'En route to hospital');

        } else {
            const targetStatuses = ['Cured', 'Recurrence of Symptoms', 'Recovering', 'Not Applicable'];
            if (targetStatuses.includes(currentBeneficiaryStatus)) {
                console.log(`Condition met: Beneficiary Status is '${currentBeneficiaryStatus}'. Proceeding to fill subsequent forms.`);

                await fillAesJeCaseStatusByCoordinates(driver, 'Confirmed');
                await fillReferredToByCoordinates(driver, 'Other', 'Private clinic downtown');
            } else {
                console.log(`Condition NOT met: Beneficiary Status '${currentBeneficiaryStatus}' does not trigger subsequent selections.`);
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