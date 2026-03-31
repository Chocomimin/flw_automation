const { remote } = require('webdriverio');

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK', // Replace with your actual device ID if needed
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true
};

const wdOpts = {
    hostname: '127.0.0.1',
    port: 4723,
    logLevel: 'error',
    capabilities,
};

const FORM_DATA = {
    // ... existing fields ...
    regimenType: "Longer Regimen (18-24 Months)",
    treatmentStartDate: { day: 23, month: 3, year: 2026 },

    // Set Follow Up Date to a later date (e.g., March 15, 2026)
    visitDate: { day: 23, month: 3, year: 2026 },
    adherenceToMedicines: "Regular", // Options: "Regular", "Irregular"
    anyDiscomfort: "No" // Options: "Yes", "No"
};

async function tapAt(driver, x, y) {
    await driver.action('pointer')
        .move({ duration: 0, x: x, y: y })
        .down({ button: 0 })
        .pause(100)
        .up({ button: 0 })
        .perform();
}

async function clickCommunicableDiseases(driver) {
    try {
        console.log("Attempting to click 'Communicable Diseases' module...");

        // Scroll into view just in case the device screen is small and it's hidden further down
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Communicable Diseases"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        // XPath targets the clickable FrameLayout card that contains the text
        const communicableSelector = '//android.widget.FrameLayout[@clickable="true" and .//android.widget.TextView[@text="Communicable Diseases"]]';
        const element = await driver.$(communicableSelector);

        await element.waitForDisplayed({ timeout: 5000 });
        await element.click();

        console.log("✔ Successfully clicked on the 'Communicable Diseases' module.");
    } catch (error) {
        console.error("❌ Failed to click on 'Communicable Diseases'.", error.message);
    }
}

async function clickConfirmedTBCases(driver) {
    try {
        console.log("Attempting to click 'Confirmed TB cases'...");

        // XPath targets the clickable FrameLayout card that contains the text
        const confirmedTBSelector = '//android.widget.FrameLayout[@clickable="true" and .//android.widget.TextView[@text="Confirmed TB cases"]]';
        const element = await driver.$(confirmedTBSelector);

        await element.waitForDisplayed({ timeout: 5000 });
        await element.click();

        console.log("✔ Successfully clicked on 'Confirmed TB cases'.");
    } catch (error) {
        console.error("❌ Failed to click on 'Confirmed TB cases'.", error.message);
    }
}

async function searchAndClickFollowUp(driver, searchText) {
    try {
        console.log(`Attempting to search for: "${searchText}"...`);

        // 1. Locate and interact with the search bar
        const searchInputSelector = '//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]';
        const searchElement = await driver.$(searchInputSelector);

        await searchElement.waitForDisplayed({ timeout: 5000 });
        await searchElement.clearValue();

        // Tap to bring up the keyboard
        await searchElement.click();
        await driver.pause(500);

        // Type the search text using device keyboard
        await driver.keys(searchText.split(''));

        // Hide keyboard after typing to ensure the list is fully visible
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }

        console.log(`✔ Successfully typed "${searchText}". Waiting for list to filter...`);
        await driver.pause(2000); // Give the app a moment to filter the list

        // 2. Locate and click the "FOLLOW UP" button
        // Convert to uppercase to match the "REJ" format seen in your XML
        const upperSearchText = searchText.toUpperCase();

        // XPath to find the card containing the name, and click the FOLLOW UP button inside that specific card
        const followUpButtonXPath = `//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content" and .//android.widget.TextView[contains(translate(@text, 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), '${upperSearchText}')]]//android.widget.Button[@text="FOLLOW UP"]`;

        const followUpBtn = await driver.$(followUpButtonXPath);

        await followUpBtn.waitForDisplayed({ timeout: 5000 });
        await followUpBtn.click();

        console.log(`✔ Successfully clicked 'FOLLOW UP' button for "${searchText}".`);

    } catch (error) {
        console.error(`❌ Failed during search or clicking 'FOLLOW UP' for "${searchText}":`, error.message);
    }
}

async function fillRegimenType(driver, regimenText) {
    try {
        console.log(`Processing 'Regimen Type' Dropdown for: "${regimenText}"...`);

        // Scroll to the dropdown to ensure it's visible
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Regimen Type"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        // Target the spinner specifically looking for its hint/text
        const spinnerXPath = `//android.widget.Spinner[@text="Regimen Type *" or @hint="Regimen Type *"]`;
        const spinner = await driver.$(spinnerXPath);

        if (await spinner.isExisting()) {
            console.log("⏳ Opening 'Regimen Type' Dropdown...");

            // Find the arrow button associated with this dropdown
            const arrowXPath = `//android.widget.Spinner[contains(@text, "Regimen Type")]/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/text_input_end_icon"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            if (await dropdownArrow.isExisting()) {
                await dropdownArrow.click();
                await driver.pause(1500); // Wait for the animation

                // Standard safety check for keyboard obscuring the view
                if (await driver.isKeyboardShown()) {
                    await driver.hideKeyboard();
                    await driver.pause(1000);
                    await dropdownArrow.click();
                    await driver.pause(1500);
                }

                // 1. Try native text click
                const targetOption = await driver.$(`//*[@text="${regimenText}"]`);

                if (await targetOption.isExisting()) {
                    console.log(`⏳ Found text "${regimenText}", tapping it directly...`);
                    await targetOption.click();
                    console.log(`✔ Regimen Type updated to "${regimenText}".`);
                } else {
                    console.log(`⚠ Could not find text natively, falling back to coordinates...`);

                    // 2. Coordinate fallback based on the layout
                    // The dropdown starts around y: 476 based on the XML
                    // Each item is typically ~110px high based on the screenshot
                    const REGIMEN_COORDS = {
                        'DS-TB (6 Months)':              { x: 500, y: 530 },
                        'Shorter Regimen (9-12 Months)': { x: 500, y: 640 },
                        'Longer Regimen (18-24 Months)': { x: 500, y: 750 },
                        'BPaL Regimen (6 Months)':       { x: 500, y: 860 },
                        'INH Mono (6 Month)':            { x: 500, y: 970 }
                    };

                    const coords = REGIMEN_COORDS[regimenText];
                    if (coords) {
                        console.log(`⏳ Tapping coordinates X:${coords.x} Y:${coords.y} for ${regimenText}`);
                        await tapAt(driver, coords.x, coords.y);
                        console.log(`✔ Regimen Type updated via coordinates.`);
                    } else {
                        console.error(`❌ "${regimenText}" is not defined in the coordinate map.`);
                    }
                }
            } else {
                console.error('❌ Could not find the dropdown arrow for Regimen Type.');
            }
        } else {
            console.log(`➡ 'Regimen Type' dropdown is not visible. Skipping.`);
        }
    } catch (error) {
        console.error('❌ Error processing Regimen Type dropdown:', error.message);
    }
}

async function selectDateFromPicker(driver, targetDay, targetMonth, targetYear) {
    try {
        console.log(`⏳ Setting date to: ${targetDay} ${targetMonth} ${targetYear}...`);

        // 1. Select the Year
        const yearHeader = await driver.$('//android.widget.TextView[@resource-id="android:id/date_picker_header_year"]');
        const currentYear = await yearHeader.getText();

        if (currentYear !== targetYear.toString()) {
            await yearHeader.click();
            const yearScrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${targetYear}"))`;
            await driver.$(yearScrollSelector).click();
            await driver.pause(500);
        }

        // 2. Target the specific day content description
        const formattedDay = targetDay.toString().padStart(2, '0');
        const targetContentDesc = `${formattedDay} ${targetMonth} ${targetYear}`;
        const targetDayElement = await driver.$(`~${targetContentDesc}`);

        const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        let dayFound = false;

        // 3. Scroll through months to find the day
        for (let i = 0; i < 12; i++) {
            if (await targetDayElement.isDisplayed()) {
                await targetDayElement.click();
                dayFound = true;
                break;
            }

            const headerDateStr = await driver.$('//android.widget.TextView[@resource-id="android:id/date_picker_header_date"]').getText();
            const currentMonthMatch = monthsShort.find(m => headerDateStr.includes(m));

            const currentMonthIndex = monthsShort.indexOf(currentMonthMatch);
            const targetMonthIndex = monthsFull.indexOf(targetMonth);

            if (targetMonthIndex > currentMonthIndex) {
                const nextBtn = await driver.$('//android.widget.ImageButton[@resource-id="android:id/next"]');
                if (await nextBtn.isExisting()) await nextBtn.click();
            } else if (targetMonthIndex < currentMonthIndex) {
                const prevBtn = await driver.$('//android.widget.ImageButton[@resource-id="android:id/prev"]');
                if (await prevBtn.isExisting()) await prevBtn.click();
            }

            await driver.pause(500);
        }

        if (!dayFound) {
            throw new Error(`Could not find the day matching: ${targetContentDesc}`);
        }

        // 4. Click OK
        const okButton = await driver.$('//android.widget.Button[@resource-id="android:id/button1" and @text="OK"]');
        await okButton.click();
        console.log(`✔ Successfully confirmed the date: ${targetContentDesc}`);

    } catch (error) {
        console.error("❌ Error setting the date from the picker:", error.message);
    }
}

async function fillTreatmentStartDate(driver, dateObj) {
    try {
        console.log(`Attempting to set 'Treatment Start Date' to ${dateObj.day}/${dateObj.month}/${dateObj.year}...`);

        // Scroll into view if needed
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Treatment Start Date"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        // Locate and click the input field to open the calendar
        const dateInputSelector = '//android.widget.EditText[@hint="Treatment Start Date *"]';
        const dateInput = await driver.$(dateInputSelector);

        await dateInput.waitForDisplayed({ timeout: 5000 });
        await dateInput.click();

        await driver.pause(1000);

        // Array to convert numerical month (1-12) to full month name for the Android UI
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        // Arrays are 0-indexed, so we subtract 1 from the month number
        const targetMonthString = monthNames[dateObj.month - 1];

        // Call the date picker helper with the extracted values
        await selectDateFromPicker(driver, dateObj.day, targetMonthString, dateObj.year);

    } catch (error) {
        console.error("❌ Failed to open 'Treatment Start Date' calendar:", error.message);
    }
}
async function fillFollowUpDate(driver, dateObj) {
    try {
        console.log(`Attempting to set 'Follow Up Dates' to ${dateObj.day}/${dateObj.month}/${dateObj.year}...`);

        // Scroll into view if needed
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Follow Up Dates"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        // Locate and click the input field to open the calendar
        const dateInputSelector = '//android.widget.EditText[contains(@hint, "Follow Up Dates")]';
        const dateInput = await driver.$(dateInputSelector);

        await dateInput.waitForDisplayed({ timeout: 5000 });
        await dateInput.click();

        await driver.pause(1000);

        // Convert numerical month (1-12) to full month name for the Android UI
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const targetMonthString = monthNames[dateObj.month - 1];

        // Call your existing date picker helper
        await selectDateFromPicker(driver, dateObj.day, targetMonthString, dateObj.year);

    } catch (error) {
        console.error("❌ Failed to open 'Follow Up Dates' calendar:", error.message);
    }
}
async function fillAdherenceToMedicines(driver, adherenceText) {
    try {
        console.log(`Attempting to set 'Adherence to Medicines' to '${adherenceText}'...`);

        // Scroll into view
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Adherence to Medicines"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        // Find and click the specific radio button
        const radioXPath = `//android.widget.TextView[contains(@text, "Adherence to Medicines")]/../../android.widget.RadioGroup//android.widget.RadioButton[@text="${adherenceText}"]`;
        const radioBtn = await driver.$(radioXPath);

        await radioBtn.waitForDisplayed({ timeout: 3000 });
        await radioBtn.click();

        console.log(`✔ Successfully selected '${adherenceText}' for Adherence to Medicines.`);
    } catch (error) {
        console.error(`❌ Failed to set 'Adherence to Medicines':`, error.message);
    }
}

async function fillAnyDiscomfort(driver, discomfortText) {
    try {
        console.log(`Attempting to set 'Any discomfort' to '${discomfortText}'...`);

        // Scroll into view
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Any discomfort"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        // Find and click the specific radio button
        const radioXPath = `//android.widget.TextView[contains(@text, "Any discomfort")]/../../android.widget.RadioGroup//android.widget.RadioButton[@text="${discomfortText}"]`;
        const radioBtn = await driver.$(radioXPath);

        await radioBtn.waitForDisplayed({ timeout: 3000 });
        await radioBtn.click();

        console.log(`✔ Successfully selected '${discomfortText}' for Any discomfort.`);
    } catch (error) {
        console.error(`❌ Failed to set 'Any discomfort':`, error.message);
    }
}

async function clickSubmitButton(driver) {
    try {
        console.log("Attempting to click Submit...");

        // 1. Scroll further down to ensure the button is fully on screen
        // By scrolling to "Follow-up History", we ensure Submit is well within view
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Follow-up History"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        // 2. Add a brief pause to allow the app's internal validation state to update
        await driver.pause(1000);

        // 3. Target the button and click
        const submitBtnSelector = '//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]';
        const submitBtn = await driver.$(submitBtnSelector);

        await submitBtn.waitForDisplayed({ timeout: 5000 });
        await submitBtn.click();

        console.log("✔ Successfully clicked the Submit button.");

        // 4. Wait to see if a popup appears or navigation happens
        await driver.pause(2000);

    } catch (error) {
        console.error("❌ Failed to click the Submit button:", error.message);
    }
}

async function clickVisitDateAndGoBack(driver) {
    try {
        console.log("Clicking 'Follow Up Dates' again to reopen calendar...");

        // Scroll to ensure it's in view
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Follow Up Dates"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        // Click the field to open the calendar
        const dateInputSelector = '//android.widget.EditText[contains(@hint, "Follow Up Dates")]';
        const dateInput = await driver.$(dateInputSelector);
        await dateInput.click();
        await driver.pause(1500); // Wait for the calendar animation to finish

        console.log("Going back (dismissing the calendar)...");

        // Option 1: Look for the native Android "CANCEL" button on the date picker and click it
        const cancelBtn = await driver.$('//android.widget.Button[@resource-id="android:id/button2"]');
        if (await cancelBtn.isExisting()) {
            await cancelBtn.click();
        } else {
            // Option 2: Fallback to the Android hardware back button
            await driver.back();
        }

        console.log("✔ Successfully clicked the date and went back.");
    } catch (error) {
        console.error("❌ Error clicking visit date and going back:", error.message);
    }
}
async function runTest() {
    console.log("Initializing WebDriverIO session...");
    const driver = await remote(wdOpts);

    try {
        await driver.pause(2000); // Give the Home screen time to fully load

        // Step 1: Click Communicable Diseases
        await clickCommunicableDiseases(driver);
        await driver.pause(1500); // Wait for the transition to the next screen

        // Step 2: Click Confirmed TB cases
        await clickConfirmedTBCases(driver);
        await driver.pause(1500); // Wait for the list/form to load
        await searchAndClickFollowUp(driver, "rej");
        await driver.pause(1500);
        await fillRegimenType(driver, FORM_DATA.regimenType);
        await driver.pause(1000);
        await fillTreatmentStartDate(driver, FORM_DATA.treatmentStartDate);
        await driver.pause(1000);
        await fillFollowUpDate(driver, FORM_DATA.visitDate);
        await driver.pause(1000);
        await clickVisitDateAndGoBack(driver);
        await driver.pause(1000);
        await fillAdherenceToMedicines(driver, FORM_DATA.adherenceToMedicines);
        await driver.pause(1000);
        await fillAnyDiscomfort(driver, FORM_DATA.anyDiscomfort);
        await driver.pause(1000);

        // Step 9: Click Submit
        await clickSubmitButton(driver);
        await driver.pause(1500);
    } catch (error) {
        console.error("❌ An error occurred during the test run:", error);
    } finally {
        console.log("Closing session...");
        await driver.pause(2000);
        await driver.deleteSession();
    }
}

runTest();