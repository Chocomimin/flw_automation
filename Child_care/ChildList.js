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

// ─── Module Navigation Helpers ──────────────────────────────────────────────

async function clickGridModule(driver, moduleName) {
    console.log(`Locating the "${moduleName}" module...`);

    const moduleXPath = `//android.widget.TextView[@text="${moduleName}"]/parent::android.view.ViewGroup/parent::android.widget.FrameLayout`;
    const moduleCard = await driver.$(moduleXPath);

    try {
        await moduleCard.waitForDisplayed({ timeout: 5000 });
        await moduleCard.click();
        console.log(`✔ Successfully clicked on "${moduleName}".`);
        await driver.pause(1500);
    } catch (error) {
        console.error(`❌ Could not find or click the "${moduleName}" module.`);
        throw error;
    }
}

async function searchChild(driver, childName) {
    console.log(`Locating search bar to find: "${childName}"...`);

    const searchInputXPath = `//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]`;
    const searchInput = await driver.$(searchInputXPath);

    try {
        await searchInput.waitForDisplayed({ timeout: 5000 });
        await searchInput.click();

        await searchInput.setValue(childName);
        console.log(`✔ Entered "${childName}" into search bar.`);

        await driver.pause(1000);

        // Trigger the Android native keyboard 'Enter'/'Search' action (Keycode 66)
        await driver.pressKeyCode(66);
        console.log(`✔ Triggered search via Android keyboard.`);

        await driver.pause(2000);

        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }
    } catch (error) {
        console.error('❌ Could not interact with the search bar or keyboard.');
        throw error;
    }
}

async function clickHBYCButton(driver) {
    console.log('Locating the "HBYC" button...');

    const hbycButtonXPath = `//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_hbyc"]`;
    const hbycButton = await driver.$(hbycButtonXPath);

    try {
        await hbycButton.waitForDisplayed({ timeout: 5000 });
        await hbycButton.click();
        console.log('✔ Successfully clicked on the "HBYC" button.');
        await driver.pause(1500); // Wait for the month list to load
    } catch (error) {
        console.error('❌ Could not find the "HBYC" button. Make sure the search yielded a result.');
        throw error;
    }
}

async function clickAddVisitForMonth(driver, monthText) {
    console.log(`Locating "Add Visit" button for ${monthText}...`);

    const addVisitXPath = `//android.widget.TextView[@text="${monthText}"]/parent::android.widget.LinearLayout//android.widget.Button[@text="Add Visit"]`;
    const addVisitBtn = await driver.$(addVisitXPath);

    try {
        await addVisitBtn.waitForDisplayed({ timeout: 5000 });
        await addVisitBtn.click();
        console.log(`✔ Successfully clicked "Add Visit" for ${monthText}.`);
        await driver.pause(1500);
    } catch (error) {
        console.error(`❌ Could not find the "Add Visit" button for ${monthText}.`);
        throw error;
    }
}

// ─── Calendar Helpers ────────────────────────────────────────────────────────

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

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

// ─── HBYC Form Data Entry Helpers ───────────────────────────────────────────

async function handleVisitDate(driver, expectedDateString) {
    const visitDateXPath = `//android.widget.EditText[@hint="Select visit date"]`;
    const visitDateInput = await driver.$(visitDateXPath);
    await visitDateInput.waitForDisplayed({ timeout: 5000 });

    const currentDate = await visitDateInput.getText();
    if (currentDate === expectedDateString) {
        console.log(`Date matches (${expectedDateString}). Proceeding...`);
    } else {
        console.log(`Opening calendar to change visit date to ${expectedDateString}...`);
        await visitDateInput.click();
        await driver.pause(1000);

        const parts = expectedDateString.split('-');
        const dateObj = { day: parseInt(parts[0], 10), month: parseInt(parts[1], 10), year: parseInt(parts[2], 10) };
        await pickDateFromCalendar(driver, dateObj);
    }
}

async function handleIsBabyAlive(driver, expectedInput) {
    console.log(`Processing "Is the Baby alive?" field... Expected: ${expectedInput}`);

    const targetOption = expectedInput.toLowerCase() === 'no' ? 'No' : 'Yes';
    const radioBtnXPath = `//android.widget.TextView[contains(@text, "Is the Baby alive?")]/following-sibling::android.widget.FrameLayout//android.widget.RadioButton[@text="${targetOption}"]`;
    const radioButton = await driver.$(radioBtnXPath);

    try {
        await radioButton.waitForDisplayed({ timeout: 5000 });
        const isChecked = await radioButton.getAttribute('checked');

        if (isChecked === 'true') {
            console.log(`➡ Matches input: already set to "${targetOption}".`);
        } else {
            console.log(`➡ Clicking "${targetOption}"...`);
            await radioButton.click();
            await driver.pause(500);
            console.log(`✔ Successfully changed to "${targetOption}".`);
        }
    } catch (error) {
        console.error(`❌ Could not interact with "${targetOption}" for "Is the Baby alive?".`);
    }
}

async function handleDateOfDeath(driver, expectedDateString) {
    console.log(`Processing "Date of Death" field... Expected: ${expectedDateString}`);

    const dateOfDeathXPath = `//android.widget.EditText[@hint="Select date of death"]`;
    const dateInput = await driver.$(dateOfDeathXPath);

    try {
        await dateInput.waitForDisplayed({ timeout: 5000 });

        const currentDate = await dateInput.getText();
        if (currentDate === expectedDateString) {
            console.log(`Date matches (${expectedDateString}). Proceeding...`);
        } else {
            console.log(`Opening calendar to set Date of Death to ${expectedDateString}...`);
            await dateInput.click();
            await driver.pause(1000);

            const parts = expectedDateString.split('-');
            const dateObj = { day: parseInt(parts[0], 10), month: parseInt(parts[1], 10), year: parseInt(parts[2], 10) };
            await pickDateFromCalendar(driver, dateObj);
            console.log(`✔ "Date of Death" successfully set.`);
        }
    } catch (error) {
        console.error('❌ Could not find "Date of Death" field.');
    }
}

async function selectReasonForDeath(driver, reason) {
    console.log(`Processing "Reason for Death" field... Expected: ${reason}`);

    const fieldXPath = `//android.widget.EditText[@hint="Select Reason for Death"]`;
    const field = await driver.$(fieldXPath);

    try {
        await field.waitForDisplayed({ timeout: 5000 });

        const currentText = await field.getText();
        if (currentText.trim() === reason) {
            console.log(`➡ "Reason for Death" is already set to "${reason}".`);
        } else {
            console.log(`➡ Clicking dropdown to select "${reason}"...`);
            await field.click();
            await driver.pause(1500); // Wait for the list popup

            // Find the option in the dialog list
            const optionXPath = `//android.widget.TextView[@resource-id="android:id/text1" and @text="${reason}"]`;
            const optionElement = await driver.$(optionXPath);

            if (await optionElement.isExisting()) {
                await optionElement.click();
                console.log(`✔ Successfully selected "${reason}".`);
                await driver.pause(1000);
            } else {
                // Fallback: Scroll through the list popup to find it
                const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${reason}")`;
                const scrolledElement = await driver.$(scrollSelector);
                await scrolledElement.click();
                console.log(`✔ Successfully scrolled and selected "${reason}".`);
                await driver.pause(1000);
            }
        }
    } catch (error) {
        console.error(`❌ Could not select "${reason}". Check if dropdown is visible.`);
        await driver.pressKeyCode(4); // Press Android Back Button to escape dialog if it's stuck
    }
}
async function selectPlaceOfDeath(driver, place) {
    console.log(`Processing "Place of Death" field... Expected: ${place}`);

    // XPath for the input field
    const fieldXPath = `//android.widget.EditText[@hint="Select place of death" or contains(@text, "Select")]`;
    const field = await driver.$(fieldXPath);

    try {
        // Find the "Place of Death" label and scroll to it if necessary
        const labelXPath = `//android.widget.TextView[@text="Place of Death *"]`;
        const label = await driver.$(labelXPath);
        if (!(await label.isDisplayed())) {
            const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("Place of Death *")`;
            await driver.$(scrollSelector);
        }

        await field.waitForDisplayed({ timeout: 5000 });

        const currentText = await field.getText();
        if (currentText.trim() === place) {
            console.log(`➡ "Place of Death" is already set to "${place}".`);
        } else {
            console.log(`➡ Clicking dropdown to select "${place}"...`);
            await field.click();
            await driver.pause(1500); // Wait for the list popup

            // Find the option in the dialog list
            const optionXPath = `//android.widget.TextView[@resource-id="android:id/text1" and @text="${place}"]`;
            const optionElement = await driver.$(optionXPath);

            if (await optionElement.isExisting()) {
                await optionElement.click();
                console.log(`✔ Successfully selected "${place}".`);
                await driver.pause(1000);
            } else {
                // Fallback: Scroll through the list popup to find it
                const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${place}")`;
                const scrolledElement = await driver.$(scrollSelector);
                await scrolledElement.click();
                console.log(`✔ Successfully scrolled and selected "${place}".`);
                await driver.pause(1000);
            }
        }
    } catch (error) {
        console.error(`❌ Could not select "${place}". Check if dropdown is visible.`);
        await driver.pressKeyCode(4); // Press Android Back Button to escape dialog if it's stuck
    }

}

async function fillBabyWeight(driver, weightInGrams) {
    console.log(`Processing "Baby Weight (Gram)" field... Expected: ${weightInGrams}`);

    // XPath for the input field based on its hint text
    const weightFieldXPath = `//android.widget.EditText[contains(@hint, "weight in gram")]`;
    const weightField = await driver.$(weightFieldXPath);

    try {
        // If the field isn't immediately visible, scroll down a bit
        if (!(await weightField.isDisplayed().catch(() => false))) {
            const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Baby Weight"))`;
            await driver.$(scrollSelector).catch(() => {});
        }

        await weightField.waitForDisplayed({ timeout: 5000 });

        const currentText = await weightField.getText();
        const hintText = 'Enter weight in gram (e.g. 1000)';

        // Check if the field is empty (showing the hint) or has a different value
        if (!currentText || currentText.trim() === '' || currentText.trim() === hintText) {
            console.log('➡ Field is empty. Entering weight...');
            await weightField.click();
            await driver.pause(500);
            await weightField.clearValue();
            await weightField.setValue(String(weightInGrams));
            await driver.pause(500);

            if (await driver.isKeyboardShown()) await driver.hideKeyboard();
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

            if (await driver.isKeyboardShown()) await driver.hideKeyboard();
            console.log(`✔ "Baby Weight" updated successfully to: ${weightInGrams}g`);
        }
    } catch (error) {
        console.error('❌ Could not find or interact with the "Baby Weight (Gram) *" text field.');
    }
}
async function selectRadioOption(driver, fieldLabel, expectedOption) {
    console.log(`Processing "${fieldLabel}" field... Expected: ${expectedOption}`);
    const labelXPath = `//android.widget.TextView[contains(@text, "${fieldLabel}")]`;
    let labelExists = false;

    // Scroll mechanism to find field (crucial for long forms like this one!)
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

    const radioBtnXPath = `//android.widget.TextView[contains(@text, "${fieldLabel}")]/following-sibling::android.widget.FrameLayout//android.widget.RadioButton[@text="${expectedOption}"]`;
    const radioButton = await driver.$(radioBtnXPath);

    if (await radioButton.isExisting()) {
        const isChecked = await radioButton.getAttribute('checked');
        if (isChecked === 'true') {
            console.log(`➡ Default matches input: "${fieldLabel}" is already set to "${expectedOption}".`);
        } else {
            console.log(`➡ Clicking "${expectedOption}"...`);
            await radioButton.click();
            await driver.pause(500);
            console.log(`✔ "${fieldLabel}" successfully changed to "${expectedOption}".`);
        }
    } else {
        console.error(`❌ Could not find the "${expectedOption}" radio button for "${fieldLabel}".`);
    }
}

async function clickSubmit(driver) {
    console.log('Processing Submit button...');
    const submitBtnXPath = `//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnSave" and @text="Submit"]`;
    const submitBtn = await driver.$(submitBtnXPath);

    try {
        await submitBtn.waitForDisplayed({ timeout: 5000 });
        await submitBtn.click();
        console.log('✔ Successfully clicked the "Submit" button.');
    } catch (error) {
        console.error('❌ Could not find or click the "Submit" button.');
    }
}

async function fillTemperature(driver, tempValue) {
    console.log(`Processing "Temperature" field... Expected: ${tempValue}`);

    // XPath looking for the specific hint text
    const tempFieldXPath = `//android.widget.EditText[contains(@hint, "e.g. 98.6")]`;
    const tempField = await driver.$(tempFieldXPath);

    try {
        // If the field isn't immediately visible, scroll down to find it
        if (!(await tempField.isDisplayed().catch(() => false))) {
            const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("98.6"))`;
            await driver.$(scrollSelector).catch(() => {});
        }

        await tempField.waitForDisplayed({ timeout: 5000 });

        const currentText = await tempField.getText();

        // Check if the field is empty (showing a hint containing 'e.g.') or has a different value
        if (!currentText || currentText.trim() === '' || currentText.includes('e.g.')) {
            console.log('➡ Field is empty. Entering temperature...');
            await tempField.click();
            await driver.pause(500);
            await tempField.clearValue();
            await tempField.setValue(String(tempValue));
            await driver.pause(500);

            if (await driver.isKeyboardShown()) await driver.hideKeyboard();
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

            if (await driver.isKeyboardShown()) await driver.hideKeyboard();
            console.log(`✔ "Temperature" updated successfully to: ${tempValue}`);
        }
    } catch (error) {
        console.error('❌ Could not find or interact with the "Temperature" text field.');
    }
}

async function uploadMCPCard(driver) {
    console.log(`Processing "MCP Card Upload" field...`);

    const labelXPath = `//android.widget.TextView[@text="MCP Card Upload"]`;
    let labelExists = false;

    // Scroll down up to 5 times to find the MCP Card Upload label
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
        console.error(`❌ Could not find "MCP Card Upload" section on the screen.`);
        return;
    }

    // Locate the specific "PICK IMAGE" button right under "MCP Card Upload"
    const pickImageBtnXPath = `//android.widget.TextView[@text="MCP Card Upload"]/following-sibling::android.widget.FrameLayout//android.widget.Button[@text="PICK IMAGE"]`;
    const pickImageBtn = await driver.$(pickImageBtnXPath);

    try {
        await pickImageBtn.waitForDisplayed({ timeout: 5000 });
        await pickImageBtn.click();
        console.log(`➡ Clicked "PICK IMAGE" button.`);

        await driver.pause(1500); // Wait for the dialog popup

        // Locate and click "Take Photo" (handles common casing variations)
        const takePhotoXPath = `//*[@text="Take Photo" or @text="Take photo"]`;
        const takePhotoBtn = await driver.$(takePhotoXPath);

        await takePhotoBtn.waitForDisplayed({ timeout: 5000 });
        await takePhotoBtn.click();
        console.log(`✔ Clicked "Take Photo". Waiting 20 seconds for the camera/image process...`);

        // Wait the requested 20 seconds
        await driver.pause(20000);
        console.log(`✔ Finished 20 second wait for MCP Card Upload.`);

    } catch (error) {
        console.error(`❌ Failed during the image picking process:`, error);
    }
}
async function runTest() {
    let driver;
    try {
        console.log('Starting Appium session...');
        driver = await remote(wdOpts);

        // 1. Navigate
        await clickGridModule(driver, "Child Care");
        await clickGridModule(driver, "Child List");
        await searchChild(driver, "RINA GOOD");
        await clickHBYCButton(driver);
        await clickAddVisitForMonth(driver, "9 Months"); // Updated to 9 Months based on your XML

        // 2. Initial Details
        await handleVisitDate(driver, "10-03-2026");

        // 🌟 Set condition to Yes
        const isBabyAlive = "Yes";
        await handleIsBabyAlive(driver, isBabyAlive);
        await driver.pause(1000); // Give the UI a moment to expand

        // 3. Conditional Flow
        if (isBabyAlive === "No") {
            await handleDateOfDeath(driver, "10-03-2026");
            await selectReasonForDeath(driver, "Fever");
            await selectPlaceOfDeath(driver, "PHC");
        } else {
            // === SCENARIO: BABY IS ALIVE ===

            // First, fill the weight
            await fillBabyWeight(driver, 6500); // e.g., 6.5kg for a 9-month-old

            // Next, fill out all the health and counseling radio buttons
            await selectRadioOption(driver, "Is the child sick?", "No");
            await selectRadioOption(driver, "Is the child exclusively breast feeding?", "Yes");
            await selectRadioOption(driver, "Is the mother counseled for exclusive breast feeding?", "Yes");

            // New fields from the 9-Month XML/Screenshot
            await selectRadioOption(driver, "Has the child started complimentary feeding?", "Yes");
            await selectRadioOption(driver, "Is the mother counseled for complimentary feeding?", "Yes");
            await selectRadioOption(driver, "Is the Weight of the child recorded by AWW?", "Yes");
            await selectRadioOption(driver, "Is there any developmental delay?", "No"); // Assuming No delay
            await selectRadioOption(driver, "Is measles vaccine given?", "Yes");
            await selectRadioOption(driver, "Is vitamin A given", "Yes"); // Note: XML misses the '?' here
            await selectRadioOption(driver, "Is ORS available at home?", "Yes");
            await selectRadioOption(driver, "Is IFA syrup available at home?", "Yes");
            await selectRadioOption(driver, "Is ORS given?", "Yes");
            await selectRadioOption(driver, "Is IFA syrup given?", "Yes");
            await selectRadioOption(driver, "Is counseling for handwashing given?", "Yes");
            await fillTemperature(driver, 98.6);
            await uploadMCPCard(driver);
        }

        // 4. Submit the form
        await driver.pause(1000);
        await clickSubmit(driver);

    } catch (error) {
        console.error('Error during test execution:', error);
    } finally {
        if (driver) {
            console.log('Closing session in 2 seconds...');
            await driver.pause(2000);
            await driver.deleteSession();
            console.log('Session closed.');
        }
    }
}

runTest();
