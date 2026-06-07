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
    regimenType: "Longer Regimen (18-24 Months)",
    treatmentStartDate: { day:7, month: 6, year: 2026 },

    // Set Follow Up Date to a later date (e.g., March 15, 2026)
    visitDate: { day: 7, month: 6, year: 2026 },
    adherenceToMedicines: "Regular", // Options: "Regular", "Irregular"
    anyDiscomfort: "No" // Options: "Yes", "No"
};

// ==========================================
// 1. CORE DROPDOWN HELPERS (From Household Form)
// ==========================================

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

    // Ensure keyboard is hidden before tapping the dropdown to avoid layout shifts
    try {
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
            await driver.pause(1000);
        }
    } catch (e) {}

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

// ==========================================
// 2. PAGE ACTIONS
// ==========================================

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

        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Communicable Diseases"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

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

        const searchInputSelector = '//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]';
        const searchElement = await driver.$(searchInputSelector);

        await searchElement.waitForDisplayed({ timeout: 5000 });
        await searchElement.clearValue();
        await searchElement.click();
        await driver.pause(500);

        await driver.keys(searchText.split(''));

        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }

        console.log(`✔ Successfully typed "${searchText}". Waiting for list to filter...`);
        await driver.pause(2000);

        const upperSearchText = searchText.toUpperCase();
        const followUpButtonXPath = `//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content" and .//android.widget.TextView[contains(translate(@text, 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), '${upperSearchText}')]]//android.widget.Button[@text="FOLLOW UP"]`;

        const followUpBtn = await driver.$(followUpButtonXPath);

        await followUpBtn.waitForDisplayed({ timeout: 5000 });
        await followUpBtn.click();

        console.log(`✔ Successfully clicked 'FOLLOW UP' button for "${searchText}".`);

    } catch (error) {
        console.error(`❌ Failed during search or clicking 'FOLLOW UP' for "${searchText}":`, error.message);
    }
}

// ─────────────────────────────────────────────────────────────
// UPDATED Regimen Type Dropdown
// ─────────────────────────────────────────────────────────────
async function fillRegimenType(driver, regimenText) {
    try {
        console.log(`Processing 'Regimen Type' Dropdown for: "${regimenText}"...`);
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Regimen Type"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const spinnerSelector = `//android.widget.Spinner[contains(@text, "Regimen Type") or contains(@hint, "Regimen Type")]`;

        const optionsList = [
            'DS-TB (6 Months)',
            'Shorter Regimen (9-12 Months)',
            'Longer Regimen (18-24 Months)',
            'BPaL Regimen (6 Months)',
            'INH Mono (6 Month)'
        ];

        await clickSpinnerAndSelectOption(driver, spinnerSelector, regimenText, optionsList);
    } catch (error) {
        console.error('❌ Error processing Regimen Type dropdown:', error.message);
    }
}
// ─────────────────────────────────────────────────────────────

async function selectDateFromPicker(driver, targetDay, targetMonth, targetYear) {
    try {
        console.log(`⏳ Setting date to: ${targetDay} ${targetMonth} ${targetYear}...`);

        const yearHeader = await driver.$('//android.widget.TextView[@resource-id="android:id/date_picker_header_year"]');
        const currentYear = await yearHeader.getText();

        if (currentYear !== targetYear.toString()) {
            await yearHeader.click();
            const yearScrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${targetYear}"))`;
            await driver.$(yearScrollSelector).click();
            await driver.pause(500);
        }

        const formattedDay = targetDay.toString().padStart(2, '0');
        const targetContentDesc = `${formattedDay} ${targetMonth} ${targetYear}`;
        const targetDayElement = await driver.$(`~${targetContentDesc}`);

        const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        let dayFound = false;

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

        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Treatment Start Date"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const dateInputSelector = '//android.widget.EditText[@hint="Treatment Start Date *"]';
        const dateInput = await driver.$(dateInputSelector);

        await dateInput.waitForDisplayed({ timeout: 5000 });
        await dateInput.click();

        await driver.pause(1000);

        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const targetMonthString = monthNames[dateObj.month - 1];

        await selectDateFromPicker(driver, dateObj.day, targetMonthString, dateObj.year);

    } catch (error) {
        console.error("❌ Failed to open 'Treatment Start Date' calendar:", error.message);
    }
}

async function fillFollowUpDate(driver, dateObj) {
    try {
        console.log(`Attempting to set 'Follow Up Dates' to ${dateObj.day}/${dateObj.month}/${dateObj.year}...`);

        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Follow Up Dates"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const dateInputSelector = '//android.widget.EditText[contains(@hint, "Follow Up Dates")]';
        const dateInput = await driver.$(dateInputSelector);

        await dateInput.waitForDisplayed({ timeout: 5000 });
        await dateInput.click();

        await driver.pause(1000);

        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const targetMonthString = monthNames[dateObj.month - 1];

        await selectDateFromPicker(driver, dateObj.day, targetMonthString, dateObj.year);

    } catch (error) {
        console.error("❌ Failed to open 'Follow Up Dates' calendar:", error.message);
    }
}

async function fillAdherenceToMedicines(driver, adherenceText) {
    try {
        console.log(`Attempting to set 'Adherence to Medicines' to '${adherenceText}'...`);

        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Adherence to Medicines"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

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

        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Any discomfort"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

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

        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Follow-up History"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});
        await driver.pause(1000);

        const submitBtnSelector = '//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]';
        const submitBtn = await driver.$(submitBtnSelector);

        await submitBtn.waitForDisplayed({ timeout: 5000 });
        await submitBtn.click();

        console.log("✔ Successfully clicked the Submit button.");
        await driver.pause(2000);

    } catch (error) {
        console.error("❌ Failed to click the Submit button:", error.message);
    }
}

async function clickVisitDateAndGoBack(driver) {
    try {
        console.log("Clicking 'Follow Up Dates' again to reopen calendar...");

        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Follow Up Dates"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const dateInputSelector = '//android.widget.EditText[contains(@hint, "Follow Up Dates")]';
        const dateInput = await driver.$(dateInputSelector);
        await dateInput.click();
        await driver.pause(1500);

        console.log("Going back (dismissing the calendar)...");

        const cancelBtn = await driver.$('//android.widget.Button[@resource-id="android:id/button2"]');
        if (await cancelBtn.isExisting()) {
            await cancelBtn.click();
        } else {
            await driver.back();
        }

        console.log("✔ Successfully clicked the date and went back.");
    } catch (error) {
        console.error("❌ Error clicking visit date and going back:", error.message);
    }
}

// ==========================================
// 3. MAIN TEST EXECUTION
// ==========================================

async function runTest() {
    console.log("Initializing WebDriverIO session...");
    const driver = await remote(wdOpts);

    try {
        await driver.pause(2000);

        // Step 1: Click Communicable Diseases
        await clickCommunicableDiseases(driver);
        await driver.pause(1500);

        // Step 2: Click Confirmed TB cases
        await clickConfirmedTBCases(driver);
        await driver.pause(1500);

        await searchAndClickFollowUp(driver, "kavya sharma");
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
        if (driver) {
            await driver.pause(2000);
            await driver.deleteSession();
        }
    }
}

runTest();