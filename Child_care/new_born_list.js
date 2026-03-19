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

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

// ── Calendar Helpers ──────────────────────────────────────────────────────────

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
        const dayElement = await driver.$('android=new UiSelector().text("15")');
        const contentDesc = await dayElement.getAttribute('content-desc');
        const parts = contentDesc.split(' ');
        return { month: MONTH_NAMES.indexOf(parts[1]), year: parseInt(parts[2]) };
    } catch (error) {
        return null;
    }
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

// ── App Navigation & HBNC Form ────────────────────────────────────────────────

async function clickChildCare(driver) {
    const childCareXPath = `//android.widget.TextView[@text="Child Care"]/parent::android.view.ViewGroup/parent::android.widget.FrameLayout`;
    const childCareCard = await driver.$(childCareXPath);
    await childCareCard.waitForDisplayed({ timeout: 5000 });
    await childCareCard.click();
    console.log('Successfully clicked on the Child Care module.');
}

async function clickGridModule(driver, moduleName) {
    const moduleXPath = `//android.widget.TextView[@text="${moduleName}"]/parent::android.view.ViewGroup/parent::android.widget.FrameLayout`;
    const moduleCard = await driver.$(moduleXPath);
    await moduleCard.waitForDisplayed({ timeout: 5000 });
    await moduleCard.click();
    console.log(`Successfully clicked on the '${moduleName}' module.`);
}

async function clickHBNCButton(driver) {
    const hbncButtonXPath = `//android.widget.Button[@text="HBNC"]`;
    const hbncButton = await driver.$(hbncButtonXPath);
    await hbncButton.waitForDisplayed({ timeout: 5000 });
    await hbncButton.click();
    console.log('Successfully clicked on the HBNC button.');
}

async function clickAddVisitForDay(driver, dayText) {
    const addVisitBtnXPath = `//android.widget.TextView[@text="${dayText}"]/parent::android.widget.LinearLayout//android.widget.Button[@text="Add Visit"]`;
    const addVisitBtn = await driver.$(addVisitBtnXPath);
    await addVisitBtn.waitForDisplayed({ timeout: 5000 });
    await addVisitBtn.click();
    console.log(`Successfully clicked on the Add Visit button for ${dayText}.`);
}

async function handleVisitDate(driver, expectedDateString) {
    const visitDateXPath = `//android.widget.EditText[@hint="Select visit date"]`;
    const visitDateInput = await driver.$(visitDateXPath);
    await visitDateInput.waitForDisplayed({ timeout: 5000 });

    const currentDate = await visitDateInput.getText();
    console.log(`Default visit date found: ${currentDate}`);

    if (currentDate === expectedDateString) {
        console.log(`Date matches the expected input (${expectedDateString}). Proceeding without changes...`);
    } else {
        console.log(`Date does NOT match. Opening calendar to change date to ${expectedDateString}...`);
        await visitDateInput.click();
        await driver.pause(1000);

        // Convert the "DD-MM-YYYY" string into the object format the calendar function expects
        const parts = expectedDateString.split('-');
        const dateObj = {
            day: parseInt(parts[0], 10),
            month: parseInt(parts[1], 10),
            year: parseInt(parts[2], 10)
        };

        await pickDateFromCalendar(driver, dateObj);
    }
}
async function handleIsBabyAlive(driver, expectedInput) {
    console.log(`Processing "Is the Baby alive? *" field... Expected: ${expectedInput}`);

    // Standardize input to match the UI text exactly ('Yes' or 'No')
    const targetOption = expectedInput.toLowerCase() === 'no' ? 'No' : 'Yes';

    // XPath finds the exact radio button (Yes/No) that belongs to the "Is the Baby alive?" question
    const radioBtnXPath = `//android.widget.TextView[@text="Is the Baby alive? *"]/following-sibling::android.widget.FrameLayout//android.widget.RadioButton[@text="${targetOption}"]`;

    const radioButton = await driver.$(radioBtnXPath);

    // Wait for the field to be visible on screen
    await radioButton.waitForDisplayed({ timeout: 5000 }).catch(() => null);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');

        if (isChecked === 'true') {
            console.log(`➡ Default matches input: "Is the Baby alive?" is already set to "${targetOption}".`);
        } else {
            console.log(`➡ Default does not match input. Clicking "${targetOption}"...`);
            await radioButton.click();
            await driver.pause(500);
            console.log(`✔ "Is the Baby alive?" successfully changed to "${targetOption}".`);
        }
    } else {
        console.error(`❌ Could not find the "${targetOption}" radio button for "Is the Baby alive?".`);
    }
}

async function fillBabyWeight(driver, weightInGrams) {
    console.log(`Processing "Baby Weight (Gram) *" field... Expected: ${weightInGrams}`);

    // Find the input field using the hint text from the XML
    const weightFieldXPath = `//android.widget.EditText[contains(@hint, "weight in gram")]`;
    const weightField = await driver.$(weightFieldXPath);

    await weightField.waitForDisplayed({ timeout: 5000 }).catch(() => null);

    if (await weightField.isExisting()) {
        const currentText = await weightField.getText();
        const hintText = 'Enter weight in gram (e.g. 1000)';

        // Check if the field is empty, showing the hint, or has a different value
        if (!currentText || currentText.trim() === '' || currentText.trim() === hintText) {
            console.log('➡ Field is empty. Entering weight...');
            await weightField.click();
            await driver.pause(500);
            await weightField.clearValue();
            await weightField.setValue(String(weightInGrams));
            await driver.pause(500);

            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
            }
            console.log(`✔ "Baby Weight" filled successfully with: ${weightInGrams}g`);

        } else if (currentText.trim() === String(weightInGrams)) {
            console.log(`➡ Default matches input: "Baby Weight" is already set to ${currentText}g.`);

        } else {
            console.log(`➡ Field has incorrect value (${currentText}). Overwriting with ${weightInGrams}...`);
            await weightField.click();
            await driver.pause(500);
            await weightField.clearValue();
            await weightField.setValue(String(weightInGrams));
            await driver.pause(500);

            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
            }
            console.log(`✔ "Baby Weight" updated successfully to: ${weightInGrams}g`);
        }
    } else {
        console.error('❌ Could not find the "Baby Weight (Gram) *" text field.');
    }
}
async function selectRadioOption(driver, fieldLabel, expectedOption) {
    console.log(`Processing "${fieldLabel}" field... Expected: ${expectedOption}`);

    const labelXPath = `//android.widget.TextView[contains(@text, "${fieldLabel}")]`;
    let labelExists = false;

    // Scroll down up to 5 times to find the field (since the page is long)
    for (let i = 0; i < 5; i++) {
        try {
            const labelEl = await driver.$(labelXPath);
            if (await labelEl.isExisting() && await labelEl.isDisplayed()) {
                labelExists = true;
                break;
            }
        } catch (e) { }

        // Swipe up to scroll down
        const size = await driver.getWindowRect();
        await driver.performActions([{
            type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: Math.floor(size.width / 2), y: Math.floor(size.height * 0.7) },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 100 },
                { type: 'pointerMove', duration: 600, x: Math.floor(size.width / 2), y: Math.floor(size.height * 0.3) },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
        await driver.releaseActions();
        await driver.pause(1000);
    }

    if (!labelExists) {
        console.error(`❌ Could not find field label containing: "${fieldLabel}" on the screen.`);
        return;
    }

    // Locate the exact radio button under the specific label
    const radioBtnXPath = `//android.widget.TextView[contains(@text, "${fieldLabel}")]/following-sibling::android.widget.FrameLayout//android.widget.RadioButton[@text="${expectedOption}"]`;
    const radioButton = await driver.$(radioBtnXPath);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');

        if (isChecked === 'true') {
            console.log(`➡ Default matches input: "${fieldLabel}" is already set to "${expectedOption}".`);
        } else {
            console.log(`➡ Default does not match input. Clicking "${expectedOption}"...`);
            await radioButton.click();
            await driver.pause(500);
            console.log(`✔ "${fieldLabel}" successfully changed to "${expectedOption}".`);
        }
    } else {
        console.error(`❌ Could not find the "${expectedOption}" radio button for "${fieldLabel}".`);
    }
}

async function fillTemperature(driver, tempValue) {
    console.log(`Processing "Temperature *" field... Expected: ${tempValue}`);

    const tempFieldXPath = `//android.widget.EditText[contains(@hint, "e.g. 98.6")]`;
    let tempFieldExists = false;
    let tempField;

    // ✅ Scroll down up to 5 times to find the Temperature field
    for (let i = 0; i < 5; i++) {
        try {
            tempField = await driver.$(tempFieldXPath);
            if (await tempField.isExisting() && await tempField.isDisplayed()) {
                tempFieldExists = true;
                break;
            }
        } catch (e) { }

        // Swipe up to scroll down
        const size = await driver.getWindowRect();
        await driver.performActions([{
            type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: Math.floor(size.width / 2), y: Math.floor(size.height * 0.7) },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 100 },
                { type: 'pointerMove', duration: 600, x: Math.floor(size.width / 2), y: Math.floor(size.height * 0.3) },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
        await driver.releaseActions();
        await driver.pause(1000);
    }

    if (!tempFieldExists) {
        console.error('❌ Could not find the "Temperature *" text field. It might be further down or the hint text changed.');
        return;
    }

    const currentText = await tempField.getText();
    const hintText = 'e.g. 98.6';

    // Check if the field is empty, showing the hint, or has a different value
    if (!currentText || currentText.trim() === '' || currentText.trim() === hintText) {
        console.log('➡ Temperature field is empty. Entering value...');
        await tempField.click();
        await driver.pause(500);
        await tempField.clearValue();
        await tempField.setValue(String(tempValue));
        await driver.pause(500);

        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }
        console.log(`✔ "Temperature" filled successfully with: ${tempValue}`);

    } else if (currentText.trim() === String(tempValue)) {
        console.log(`➡ Default matches input: "Temperature" is already set to ${currentText}.`);

    } else {
        console.log(`➡ Field has incorrect value (${currentText}). Overwriting with ${tempValue}...`);
        await tempField.click();
        await driver.pause(500);
        await tempField.clearValue();
        await tempField.setValue(String(tempValue));
        await driver.pause(500);

        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }
        console.log(`✔ "Temperature" updated successfully to: ${tempValue}`);
    }
}
async function fillUmbilicalStump(driver, expectedOption) {
    console.log(`Processing "Condition of Umbilical Stump" field... Expected: ${expectedOption}`);

    const fieldXPath = `//android.widget.EditText[@hint="Select Condition of Umbilical Stump"]`;
    let fieldExists = false;
    let field;

    // Scroll down up to 5 times to find the field
    for (let i = 0; i < 5; i++) {
        try {
            field = await driver.$(fieldXPath);
            if (await field.isExisting() && await field.isDisplayed()) {
                fieldExists = true;
                break;
            }
        } catch (e) { }

        // Swipe up to scroll down
        const size = await driver.getWindowRect();
        await driver.performActions([{
            type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: Math.floor(size.width / 2), y: Math.floor(size.height * 0.7) },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 100 },
                { type: 'pointerMove', duration: 600, x: Math.floor(size.width / 2), y: Math.floor(size.height * 0.3) },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
        await driver.releaseActions();
        await driver.pause(1000);
    }

    if (!fieldExists) {
        console.error(`❌ Could not find "Condition of Umbilical Stump" field on the screen.`);
        return;
    }

    // Check the current selected value
    const currentText = await field.getText();

    if (currentText.trim() === expectedOption.trim()) {
        console.log(`➡ Default matches input: "Condition of Umbilical Stump" is already set to "${expectedOption}".`);
    } else {
        console.log(`➡ Current value ("${currentText}") does not match input. Clicking to change...`);

        // Click to open the dropdown list
        await field.click();
        await driver.pause(1500); // Wait for the dialog to appear

        // Find the desired option in the ListView popup
        const optionXPath = `//android.widget.TextView[@resource-id="android:id/text1" and @text="${expectedOption}"]`;
        const optionElement = await driver.$(optionXPath);

        if (await optionElement.isExisting()) {
            await optionElement.click();
            console.log(`✔ "Condition of Umbilical Stump" successfully changed to "${expectedOption}".`);
            await driver.pause(1000);
        } else {
            console.error(`❌ Could not find option "${expectedOption}" in the dialog list. Ensure the spelling matches exactly.`);
            // Tap outside or back button to close dialog if it failed, preventing the script from getting stuck
            await driver.pressKeyCode(4); // Android Back Button
        }
    }
}
async function runTest() {
    let driver;
    try {
        driver = await remote(wdOpts);

        // Sequence of actions
        await clickChildCare(driver);
        await clickGridModule(driver, "Newborn list");

        await driver.pause(2000);
        await clickHBNCButton(driver);

        await driver.pause(2000);
        await clickAddVisitForDay(driver, "1st Day");

        await driver.pause(2000);

        // Previous Fields
        await handleVisitDate(driver, "15-02-2026");
        await handleIsBabyAlive(driver, "Yes");
        await fillBabyWeight(driver, 2500);

        // ── NEW: Fill all Radio Button Fields ─────────────────────────

        await selectRadioOption(driver, "Urine passed", "Yes"); // Options: Yes, No
        await selectRadioOption(driver, "Stool passed", "Yes"); // Options: Yes, No
        await selectRadioOption(driver, "Diarrhoea", "No");     // Options: Yes, No
        await selectRadioOption(driver, "Vomiting", "No");      // Options: Yes, No
        await selectRadioOption(driver, "Convulsions", "No");   // Options: Yes, No

        await selectRadioOption(driver, "Activity", "Good");    // Options: Good, Lethargic
        await selectRadioOption(driver, "Sucking", "Good");     // Options: Good, Poor
        await selectRadioOption(driver, "Breathing", "Fast");   // Options: Fast, Difficult
        await selectRadioOption(driver, "Chest Indrawing", "Absent"); // Options: Present, Absent
        await fillTemperature(driver, 98.6); // Pass the desired temp as a number or string
        await driver.pause(1000);
        await selectRadioOption(driver, "Jaundice", "No"); // Pass "Yes" or "No"
        await fillUmbilicalStump(driver, "Falling Off");
        await driver.pause(1000);
        await selectRadioOption(driver, "Is Baby discharge from SNCU?", "No");
    } catch (error) {
        console.error('Error during test execution:', error);
    } finally {
        if (driver) {
            await driver.pause(2000);
            await driver.deleteSession();
        }
    }
}

runTest();