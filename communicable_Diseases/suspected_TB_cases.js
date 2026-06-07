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
    hostname: '127.0.0.1',
    port: 4723,
    logLevel: 'error',
    capabilities,
};

// ==========================================
// 1. INPUT DATA
// ==========================================
const FORM_DATA = {
    searchName: "kavya sharma",

    // Visit Date (Format: DD-Month-YYYY)
    dateOfVisit: "24-June-2026",

    // Sputum Fields
    sputumSampleCollected: "Yes", // Options: "Yes", "No"
    sputumSampleSubmittedAt: "PHC", // Options: "HWC", "PHC", "CHC", "District Hospital", "Govt. Medical College"
    sputumTestResult: "Positive", // Options: "Positive", "Negative"

    // TB Case Fields
    typeOfTBCase: "Previously treated TB case", // Options: "New case of TB", "Previously treated TB case", "DR-TB case"
    reasonForSuspicion: "Contact with DR-TB case", // Options: "Treatment failure", "TB Relapse/Recurring symptoms", "Contact with DR-TB case", "Treatment after LFU (Lost to Follow-up)", "Other"

    // ID Fields
    nikshayID: "123456789",
    referralFacility: "District TB Centre (DTC)",
    drTbConfirmed: "Yes"
};

// ==========================================
// 2. CORE DROPDOWN HELPERS (From Household Form)
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
// 3. PAGE ACTIONS
// ==========================================

async function scrollDownToText(driver, text, maxSwipes = 2) {
    try {
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).setMaxSearchSwipes(${maxSwipes}).scrollIntoView(new UiSelector().textContains("${text}"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 });
    } catch (e) {
        console.log(`ℹ Could not scroll to text "${text}" (It might already be fully in view).`);
    }
}

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

async function clickCommunicableDiseases(driver) {
    try {
        console.log("Attempting to click 'Communicable Diseases' module...");
        const communicableSelector = '//android.widget.FrameLayout[@clickable="true" and .//android.widget.TextView[@text="Communicable Diseases"]]';
        const element = await driver.$(communicableSelector);
        await element.waitForDisplayed({ timeout: 5000 });
        await element.click();
        console.log("✔ Successfully clicked on the 'Communicable Diseases' module.");
    } catch (error) {
        console.error("❌ Failed to click on 'Communicable Diseases'.", error.message);
    }
}

async function clickSuspectedTBCases(driver) {
    try {
        console.log("Attempting to click 'Suspected TB cases'...");
        const suspectedTBSelector = '//android.widget.FrameLayout[@clickable="true" and .//android.widget.TextView[@text="Suspected TB cases"]]';
        const element = await driver.$(suspectedTBSelector);
        await element.waitForDisplayed({ timeout: 5000 });
        await element.click();
        console.log("✔ Successfully clicked on 'Suspected TB cases'.");
    } catch (error) {
        console.error("❌ Failed to click on 'Suspected TB cases'.", error.message);
    }
}

async function searchAndClickTrack(driver, searchText) {
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
        const trackButtonXPath = `//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content" and .//android.widget.LinearLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/ll_title_tb_suspected_list_bar"]/android.widget.TextView[contains(translate(@text, 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), '${upperSearchText}')]]//android.widget.Button[@text="TRACK"]`;

        const trackBtn = await driver.$(trackButtonXPath);

        await trackBtn.waitForDisplayed({ timeout: 5000 });
        await trackBtn.click();

        console.log(`✔ Successfully clicked 'TRACK' button for "${searchText}".`);

    } catch (error) {
        console.error(`❌ Failed during search or clicking 'TRACK' for "${searchText}":`, error.message);
    }
}

async function fillDateOfVisit(driver, day, month, year) {
    try {
        console.log("Attempting to open 'Date of Visit *' calendar...");
        const dateInputSelector = '//android.widget.EditText[@hint="Date of Visit *"]';
        const dateInput = await driver.$(dateInputSelector);

        await dateInput.waitForDisplayed({ timeout: 5000 });
        await dateInput.click();

        await driver.pause(1000);

        await selectDateFromPicker(driver, day, month, year);

    } catch (error) {
        console.error("❌ Failed to open 'Date of Visit' calendar:", error.message);
    }
}

async function fillSputumSampleCollected(driver, answerText) {
    try {
        console.log(`Attempting to set 'Is Sputum sample collected?' to '${answerText}'...`);

        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Is Sputum sample collected"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const radioXPath = `//android.widget.TextView[contains(@text, "Is Sputum sample collected")]/../../android.widget.RadioGroup//android.widget.RadioButton[@text="${answerText}"]`;
        const radioBtn = await driver.$(radioXPath);

        await radioBtn.waitForDisplayed({ timeout: 3000 });
        await radioBtn.click();

        console.log(`✔ Successfully selected '${answerText}' for Sputum sample.`);
    } catch (error) {
        console.error(`❌ Failed to set 'Is Sputum sample collected?':`, error.message);
    }
}

async function fillSputumSampleSubmittedAt(driver, locationText) {
    try {
        console.log(`Processing 'Sputum sample submitted at' Dropdown for: "${locationText}"...`);
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Sputum sample submitted at"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const spinnerSelector = `//android.widget.Spinner[contains(@text, "Sputum sample submitted at") or contains(@hint, "Sputum sample submitted at")]`;
        const optionsList = ["HWC", "PHC", "CHC", "District Hospital", "Govt. Medical College"];

        await clickSpinnerAndSelectOption(driver, spinnerSelector, locationText, optionsList);
    } catch (error) {
        console.error('❌ Error processing Sputum sample submitted at dropdown:', error.message);
    }
}

async function fillReasonForSuspicion(driver, reasonText) {
    try {
        console.log(`Processing 'Reason for suspicion' Dropdown for: "${reasonText}"...`);
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Reason for suspicion"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const spinnerSelector = `//android.widget.Spinner[contains(@text, "Reason for suspicion") or contains(@hint, "Reason for suspicion")]`;
        const optionsList = [
            'Treatment failure',
            'TB Relapse/Recurring symptoms',
            'Contact with DR-TB case',
            'Treatment after LFU (Lost to Follow-up)',
            'Other'
        ];

        await clickSpinnerAndSelectOption(driver, spinnerSelector, reasonText, optionsList);
    } catch (error) {
        console.error('❌ Error processing Reason for suspicion dropdown:', error.message);
    }
}

async function fillReferralFacility(driver, facilityText) {
    try {
        console.log(`Processing 'Referral Facility' Dropdown for: "${facilityText}"...`);
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Referral Facility"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const spinnerSelector = `//android.widget.Spinner[contains(@text, "Referral Facility") or contains(@hint, "Referral Facility")]`;
        const optionsList = [
            'District TB Centre (DTC)',
            'HWC',
            'PHC',
            'CHC',
            'District Hospital',
            'Govt. Medical College'
        ];

        await clickSpinnerAndSelectOption(driver, spinnerSelector, facilityText, optionsList);
    } catch (error) {
        console.error('❌ Error processing Referral Facility dropdown:', error.message);
    }
}

async function fillNikshayID(driver, idValue) {
    try {
        console.log(`Attempting to enter Nikshay ID: "${idValue}"...`);

        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Nikshay ID"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const nikshayInputXPath = '//android.widget.EditText[@hint="Nikshay ID" or @text="Nikshay ID"]';
        const inputElement = await driver.$(nikshayInputXPath);

        await inputElement.waitForDisplayed({ timeout: 5000 });
        await inputElement.clearValue();
        await inputElement.setValue(idValue);

        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }

        console.log(`✔ Successfully entered Nikshay ID: "${idValue}".`);
    } catch (error) {
        console.error(`❌ Failed to enter Nikshay ID:`, error.message);
    }
}

async function fillSputumTestResult(driver, resultText) {
    try {
        console.log(`Attempting to set 'Sputum Test Result' to '${resultText}'...`);

        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Sputum Test Result"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const radioXPath = `//android.widget.TextView[contains(@text, "Sputum Test Result")]/../../android.widget.RadioGroup//android.widget.RadioButton[@text="${resultText}"]`;
        const radioBtn = await driver.$(radioXPath);

        await radioBtn.waitForDisplayed({ timeout: 3000 });
        await radioBtn.click();

        console.log(`✔ Successfully selected '${resultText}' for Sputum Test Result.`);
    } catch (error) {
        console.error(`❌ Failed to set 'Sputum Test Result':`, error.message);
    }
}

async function fillTypeOfTBCase(driver, caseType) {
    try {
        console.log(`Attempting to set 'Type of TB case?' to '${caseType}'...`);

        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Type of TB case"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const radioXPath = `//android.widget.TextView[contains(@text, "Type of TB case")]/../../android.widget.RadioGroup//android.widget.RadioButton[@text="${caseType}"]`;
        const radioBtn = await driver.$(radioXPath);

        await radioBtn.waitForDisplayed({ timeout: 3000 });
        await radioBtn.click();

        console.log(`✔ Successfully selected '${caseType}'`);
    } catch (error) {
        console.error(`❌ Failed to set 'Type of TB case?':`, error.message);
    }
}

async function fillDrTbConfirmed(driver, answerText) {
    try {
        console.log(`Attempting to set 'Has the diagnosis of DR-TB been confirmed?' to '${answerText}'...`);

        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Has the diagnosis of DR-TB been confirmed"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const radioXPath = `//android.widget.TextView[contains(@text, "Has the diagnosis of DR-TB been confirmed")]/../../android.widget.RadioGroup//android.widget.RadioButton[@text="${answerText}"]`;
        const radioBtn = await driver.$(radioXPath);

        await radioBtn.waitForDisplayed({ timeout: 3000 });
        await radioBtn.click();

        console.log(`✔ Successfully selected '${answerText}' for DR-TB diagnosis confirmation.`);
    } catch (error) {
        console.error(`❌ Failed to set 'Has the diagnosis of DR-TB been confirmed?':`, error.message);
    }
}

async function clickSubmitButton(driver) {
    try {
        console.log("Attempting to click Submit...");

        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Submit"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const submitBtnSelector = '//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]';
        const submitBtn = await driver.$(submitBtnSelector);

        await submitBtn.waitForDisplayed({ timeout: 5000 });
        await submitBtn.click();

        console.log("✔ Successfully clicked the Submit button.");
    } catch (error) {
        console.error("❌ Failed to click the Submit button:", error.message);
    }
}

async function clickOkButton(driver) {
    try {
        console.log("Attempting to click the 'OK' button...");

        const okBtnXPath = '//android.widget.Button[@text="OK" or @text="Ok" or @text="ok" or @resource-id="android:id/button1"]';
        const okBtn = await driver.$(okBtnXPath);

        await okBtn.waitForDisplayed({ timeout: 5000 });
        await okBtn.click();

        console.log("✔ Successfully clicked the 'OK' button.");
    } catch (error) {
        console.error("❌ Failed to click the 'OK' button:", error.message);
    }
}

// ==========================================
// 4. MAIN TEST EXECUTION
// ==========================================

async function runTest() {
    const driver = await remote(wdOpts);
    try {
        await driver.pause(2000);

        await clickCommunicableDiseases(driver);
        await driver.pause(1000);

        await clickSuspectedTBCases(driver);
        await driver.pause(1500);

        await searchAndClickTrack(driver, FORM_DATA.searchName);
        await driver.pause(1500);

        // 1. Fill Date of Visit (Parsed from FORM_DATA)
        const [visitDay, visitMonth, visitYear] = FORM_DATA.dateOfVisit.split('-');
        await fillDateOfVisit(driver, parseInt(visitDay, 10), visitMonth, parseInt(visitYear, 10));
        await driver.pause(500);

        // 2. Fill Type of Case
        await fillTypeOfTBCase(driver, FORM_DATA.typeOfTBCase);
        await driver.pause(1000);

        // If type of TB is previously treated TB or DR-TB case, fill reason for suspicion
        if (FORM_DATA.typeOfTBCase === "Previously treated TB case" || FORM_DATA.typeOfTBCase === "DR-TB case") {
            await fillReasonForSuspicion(driver, FORM_DATA.reasonForSuspicion);
            await driver.pause(1000);
        }

        // 3. Fill Sputum Collected
        await fillSputumSampleCollected(driver, FORM_DATA.sputumSampleCollected);
        await driver.pause(1000);

        // If it is Yes, fill sputum sample submitted, nikshay id, sputum test result
        if (FORM_DATA.sputumSampleCollected === "Yes") {
            await fillSputumSampleSubmittedAt(driver, FORM_DATA.sputumSampleSubmittedAt);
            await driver.pause(1000);

            await fillNikshayID(driver, FORM_DATA.nikshayID);
            await driver.pause(1000);

            await fillSputumTestResult(driver, FORM_DATA.sputumTestResult);
            await driver.pause(1000);
        }

        // 4. Fill Referral Facility
        await fillReferralFacility(driver, FORM_DATA.referralFacility);
        await driver.pause(1000);

        // 5. Fill has the diagnosis of dr-tb
        await fillDrTbConfirmed(driver, FORM_DATA.drTbConfirmed);
        await driver.pause(1000);

        // 6. Submit Form
        await clickSubmitButton(driver);
        await clickOkButton(driver);

    } finally {
        if (driver) {
            await driver.pause(2000);
            await driver.deleteSession();
        }
    }
}

runTest();