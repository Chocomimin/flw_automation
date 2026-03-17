const { remote } = require('webdriverio');

// ── Configuration & Data ──────────────────────────────────────────────────────

const PMSMA_FORM_DATA = {
    ancDate: { day: 15, month: 7, year: 2025 },
    ancPeriod: '7' ,// Options: '2', '3', '4', '5', '6', '7', '8', '9'
    abortionIfAny: 'No'
};

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];



// Perfectly calibrated coordinates (100px apart)
const ANC_PERIOD_COORDS = {
    '2': { x: 500, y: 1000 },
    '3': { x: 500, y: 1100 },
    '4': { x: 500, y: 1200 },
    '5': { x: 500, y: 1300 },
    '6': { x: 500, y: 1400 },
    '7': { x: 500, y: 1500 }, // This will now perfectly hit 7
    '8': { x: 500, y: 1600 },
    '9': { x: 500, y: 1700 }
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

async function scrollDownToText(driver, text, maxScrolls = 3) {
    const elementXPath = `//*[contains(@text, "${text}") or contains(@hint, "${text}")]`;
    for (let i = 0; i < maxScrolls; i++) {
        try {
            const element = await driver.$(elementXPath);
            if ((await element.isExisting()) && (await element.isDisplayed())) {
                return;
            }
        } catch (e) { }

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
}

async function isEmpty(field, hintText) {
    try {
        const text = await field.getText();
        return !text || text.trim() === '' || text.trim() === hintText.trim();
    } catch { return true; }
}

// ── Calendar Helpers ──────────────────────────────────────────────────────────

async function navigateToMonth(driver, targetMonth, targetYear) {
    const yearHeader = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_header_year")');
    if (await yearHeader.isExisting()) {
        const currentYear = parseInt(await yearHeader.getText());
        if (currentYear !== targetYear) {
            await yearHeader.click();
            await driver.pause(1000);
            const yearEl = await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${targetYear}")`);
            if (await yearEl.isExisting()) {
                await yearEl.click();
            }
            await driver.pause(1000);
        }
    }

    for (let i = 0; i < 12; i++) {
        const dayElement = await driver.$('//android.view.View[@text="15"]');
        if (!(await dayElement.isExisting())) break;

        const contentDesc = await dayElement.getAttribute('content-desc');
        if (!contentDesc) break;

        const currentMonthName = MONTH_NAMES.find(m => m !== '' && contentDesc.includes(m));
        const currentMonthIndex = MONTH_NAMES.indexOf(currentMonthName);

        if (currentMonthIndex === targetMonth) break;

        if (currentMonthIndex < targetMonth) {
            const nextBtn = await driver.$('~Next month');
            if (await nextBtn.isExisting()) await nextBtn.click();
            else await swipeHorizontal(driver, 'left');
        } else {
            const prevBtn = await driver.$('~Previous month');
            if (await prevBtn.isExisting()) await prevBtn.click();
            else await swipeHorizontal(driver, 'right');
        }
        await driver.pause(1000);
    }
}

async function pickDateFromCalendar(driver, dateObj) {
    const { day, month, year } = dateObj;

    const datePicker = await driver.$('android=new UiSelector().resourceId("android:id/datePicker")');
    await datePicker.waitForDisplayed({ timeout: 5000 });

    await navigateToMonth(driver, month, year);

    const formattedDay = String(day);
    const dayToClick = await driver.$(`//android.view.View[@text="${formattedDay}"]`);

    if (await dayToClick.isExisting()) {
        await dayToClick.click();
    }
    await driver.pause(500);

    const okBtn = await driver.$('//android.widget.Button[@text="OK" or @resource-id="android:id/button1"]');
    if (await okBtn.isExisting()) {
        await okBtn.click();
    }
}

// ── Form Filling Functions ────────────────────────────────────────────────────

async function fillAncDate(driver) {
    console.log('Processing ANC Date...');

    const field = await driver.$('//android.widget.EditText[contains(@hint, "ANC Date")]');
    await field.waitForDisplayed({ timeout: 10000 });

    if (await isEmpty(field, 'ANC Date *')) {
        await field.click();
        await driver.pause(1500);

        await pickDateFromCalendar(driver, PMSMA_FORM_DATA.ancDate);
        console.log('✔ ANC Date filled successfully.');
    } else {
        console.log('➡ ANC Date is already filled.');
    }
}

async function fillAncPeriod(driver) {
    console.log('Processing ANC Period Dropdown...');

    await scrollDownToText(driver, "ANC Period", 2);

    // Look for the spinner
    const spinnerXPath = `//android.widget.Spinner[contains(@hint, "ANC Period")]`;
    const spinner = await driver.$(spinnerXPath);

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();

        if (currentText !== PMSMA_FORM_DATA.ancPeriod) {

            // Find the arrow next to the spinner
            const arrowXPath = `${spinnerXPath}/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            if (await dropdownArrow.isExisting()) {
                await dropdownArrow.click();
                await driver.pause(1000);

                // Handle if keyboard pops up unexpectedly
                if (await driver.isKeyboardShown()) {
                    await driver.hideKeyboard();
                    await driver.pause(1000);
                    await dropdownArrow.click(); // retry opening
                    await driver.pause(1500);
                } else {
                    await driver.pause(500);
                }

                const coords = ANC_PERIOD_COORDS[PMSMA_FORM_DATA.ancPeriod];

                if (coords) {
                    await tapAt(driver, coords.x, coords.y);
                    console.log(`✔ "ANC Period" updated to "${PMSMA_FORM_DATA.ancPeriod}".`);
                } else {
                    console.error(`❌ Option "${PMSMA_FORM_DATA.ancPeriod}" not found in coordinate map.`);
                }
            } else {
                console.error('❌ Could not find the dropdown arrow for "ANC Period".');
            }
        } else {
            console.log(`➡ "ANC Period" is already set to "${PMSMA_FORM_DATA.ancPeriod}".`);
        }
    } else {
        console.error('❌ Could not find "ANC Period" dropdown field.');
    }
}

async function fillAbortionIfAny(driver) {
    console.log('Checking for "Abortion If Any" field...');

    // 1. Scroll to the section to ensure it's loaded in the DOM
    await scrollDownToText(driver, "Abortion If Any", 2);

    // 2. Locate the specific RadioButton based on FORM_DATA
    const targetOption = PMSMA_FORM_DATA.abortionIfAny;
    const radioXPath = `//android.widget.TextView[@text="Abortion If Any"]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup/android.widget.RadioButton[@text="${targetOption}"]`;
    const radioButton = await driver.$(radioXPath);

    // 3. Check if the element exists (since your prompt asked "if present")
    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');

        // 4. Compare current state with desired input
        if (isChecked !== 'true') {
            await radioButton.click();
            console.log(`✔ "Abortion If Any" changed to "${targetOption}".`);
            await driver.pause(1000); // Small pause for dynamic UI updates
        } else {
            console.log(`➡ "Abortion If Any" is already set to "${targetOption}". No action taken.`);
        }
    } else {
        console.log('ℹ "Abortion If Any" field is not present on this screen. skipping.');
    }
}

// ── Main Execution ────────────────────────────────────────────────────────────

async function fillPmsmaForm(driver) {
    console.log("--- Starting PMSMA Form Details ---");

    await fillAncDate(driver);
    await driver.pause(1000);

    await fillAncPeriod(driver);
    await driver.pause(1000);
    await fillAbortionIfAny(driver);
    await driver.pause(1000);

    console.log("--- Finished PMSMA Form Details ---");
}

module.exports = { fillPmsmaForm };