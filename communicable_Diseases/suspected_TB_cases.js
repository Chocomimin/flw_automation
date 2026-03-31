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
    searchName: "rej",

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


async function tapAt(driver, x, y) {
    await driver.action('pointer')
        .move({ duration: 0, x: x, y: y })
        .down({ button: 0 })
        .pause(100)
        .up({ button: 0 })
        .perform();
}

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

// ==========================================
// 3. PAGE ACTIONS
// ==========================================

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

        const spinnerXPath = `//android.widget.Spinner[@text="Sputum sample submitted at" or @hint="Sputum sample submitted at"]`;
        const spinner = await driver.$(spinnerXPath);

        if (await spinner.isExisting()) {
            console.log("⏳ Opening 'Sputum sample submitted at' Dropdown...");

            const arrowXPath = `//android.widget.Spinner[contains(@text, "Sputum sample submitted at")]/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            if (await dropdownArrow.isExisting()) {
                await dropdownArrow.click();
                await driver.pause(1500);

                if (await driver.isKeyboardShown()) {
                    await driver.hideKeyboard();
                    await driver.pause(1000);
                    await dropdownArrow.click();
                    await driver.pause(1500);
                }

                const targetOption = await driver.$(`//*[@text="${locationText}"]`);

                if (await targetOption.isExisting()) {
                    console.log(`⏳ Found text "${locationText}", tapping it directly...`);
                    await targetOption.click();
                    console.log(`✔ Location updated to "${locationText}".`);
                } else {
                    console.log(`⚠ Could not find text natively, falling back to coordinates...`);

                    const LOCATION_COORDS = {
                        'HWC':                   { x: 500, y: 1140 },
                        'PHC':                   { x: 500, y: 1250 },
                        'CHC':                   { x: 500, y: 1360 },
                        'District Hospital':     { x: 500, y: 1470 },
                        'Govt. Medical College': { x: 500, y: 1580 }
                    };

                    const coords = LOCATION_COORDS[locationText];
                    if (coords) {
                        console.log(`⏳ Tapping coordinates X:${coords.x} Y:${coords.y} for ${locationText}`);
                        await tapAt(driver, coords.x, coords.y);
                        console.log(`✔ Location updated via coordinates.`);
                    } else {
                        console.error(`❌ "${locationText}" is not defined in the coordinate map.`);
                    }
                }
            } else {
                console.error('❌ Could not find the dropdown arrow.');
            }
        }
    } catch (error) {
        console.error('❌ Error processing Sputum sample submitted at dropdown:', error.message);
    }
}

async function fillNikshayID(driver, idValue) {
    try {
        console.log(`Attempting to enter Nikshay ID: "${idValue}"...`);

        // Scroll to the input field
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Nikshay ID"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        // Find and enter value
        const nikshayInputXPath = '//android.widget.EditText[@hint="Nikshay ID" or @text="Nikshay ID"]';
        const inputElement = await driver.$(nikshayInputXPath);

        await inputElement.waitForDisplayed({ timeout: 5000 });
        await inputElement.clearValue();
        await inputElement.setValue(idValue);

        // Hide keyboard after typing
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

async function fillReasonForSuspicion(driver, reasonText) {
    try {
        console.log(`Processing 'Reason for suspicion' Dropdown for: "${reasonText}"...`);

        const spinnerXPath = `//android.widget.Spinner[@text="Reason for suspicion *" or @hint="Reason for suspicion *"]`;
        const spinner = await driver.$(spinnerXPath);

        if (await spinner.isExisting()) {
            console.log("⏳ Opening 'Reason for suspicion' Dropdown...");

            const arrowXPath = `//android.widget.Spinner[contains(@text, "Reason for suspicion")]/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            if (await dropdownArrow.isExisting()) {
                await dropdownArrow.click();
                await driver.pause(1500);

                if (await driver.isKeyboardShown()) {
                    await driver.hideKeyboard();
                    await driver.pause(1000);
                    await dropdownArrow.click();
                    await driver.pause(1500);
                }

                const targetOption = await driver.$(`//*[@text="${reasonText}"]`);

                if (await targetOption.isExisting()) {
                    console.log(`⏳ Found text "${reasonText}", tapping it directly...`);
                    await targetOption.click();
                    console.log(`✔ Reason updated to "${reasonText}".`);
                } else {
                    console.log(`⚠ Could not find text natively, falling back to coordinates...`);

                    const REASON_COORDS = {
                        'Treatment failure':                       { x: 500, y: 970 },
                        'TB Relapse/Recurring symptoms':           { x: 500, y: 1080 },
                        'Contact with DR-TB case':                 { x: 500, y: 1190 },
                        'Treatment after LFU (Lost to Follow-up)': { x: 500, y: 1300 },
                        'Other':                                   { x: 500, y: 1410 }
                    };

                    const coords = REASON_COORDS[reasonText];
                    if (coords) {
                        console.log(`⏳ Tapping coordinates X:${coords.x} Y:${coords.y} for ${reasonText}`);
                        await tapAt(driver, coords.x, coords.y);
                        console.log(`✔ Reason updated via coordinates.`);
                    } else {
                        console.error(`❌ "${reasonText}" is not defined in the coordinate map.`);
                    }
                }
            } else {
                console.error('❌ Could not find the dropdown arrow for Reason for suspicion.');
            }
        } else {
            console.log(`➡ 'Reason for suspicion' dropdown is not visible. Skipping.`);
        }
    } catch (error) {
        console.error('❌ Error processing Reason for suspicion dropdown:', error.message);
    }
}

async function fillReferralFacility(driver, facilityText) {
    try {
        console.log(`Processing 'Referral Facility' Dropdown for: "${facilityText}"...`);

        // Scroll into view if needed
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Referral Facility"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const spinnerXPath = `//android.widget.Spinner[@text="Referral Facility *" or @hint="Referral Facility *"]`;
        const spinner = await driver.$(spinnerXPath);

        if (await spinner.isExisting()) {
            console.log("⏳ Opening 'Referral Facility' Dropdown...");

            const arrowXPath = `//android.widget.Spinner[contains(@text, "Referral Facility")]/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            if (await dropdownArrow.isExisting()) {
                await dropdownArrow.click();
                await driver.pause(1500);

                if (await driver.isKeyboardShown()) {
                    await driver.hideKeyboard();
                    await driver.pause(1000);
                    await dropdownArrow.click();
                    await driver.pause(1500);
                }

                const targetOption = await driver.$(`//*[@text="${facilityText}"]`);

                if (await targetOption.isExisting()) {
                    console.log(`⏳ Found text "${facilityText}", tapping it directly...`);
                    await targetOption.click();
                    console.log(`✔ Facility updated to "${facilityText}".`);
                } else {
                    console.log(`⚠ Could not find text natively, falling back to coordinates...`);

                    // Estimated Y coordinates starting just below the spinner (y: ~1040)
                    const FACILITY_COORDS = {
                        'District TB Centre (DTC)': { x: 500, y: 1100 },
                        'HWC':                      { x: 500, y: 1210 },
                        'PHC':                      { x: 500, y: 1320 },
                        'CHC':                      { x: 500, y: 1430 },
                        'District Hospital':        { x: 500, y: 1540 },
                        'Govt. Medical College':    { x: 500, y: 1650 }
                    };

                    const coords = FACILITY_COORDS[facilityText];
                    if (coords) {
                        console.log(`⏳ Tapping coordinates X:${coords.x} Y:${coords.y} for ${facilityText}`);
                        await tapAt(driver, coords.x, coords.y);
                        console.log(`✔ Facility updated via coordinates.`);
                    } else {
                        console.error(`❌ "${facilityText}" is not defined in the coordinate map.`);
                    }
                }
            } else {
                console.error('❌ Could not find the dropdown arrow for Referral Facility.');
            }
        } else {
            console.log(`➡ 'Referral Facility' dropdown is not visible. Skipping.`);
        }
    } catch (error) {
        console.error('❌ Error processing Referral Facility dropdown:', error.message);
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

async function fillDrTbConfirmed(driver, answerText) {
    try {
        console.log(`Attempting to set 'Has the diagnosis of DR-TB been confirmed?' to '${answerText}'...`);

        // Scroll into view
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Has the diagnosis of DR-TB been confirmed"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        // Find and click the specific radio button
        const radioXPath = `//android.widget.TextView[contains(@text, "Has the diagnosis of DR-TB been confirmed")]/../../android.widget.RadioGroup//android.widget.RadioButton[@text="${answerText}"]`;
        const radioBtn = await driver.$(radioXPath);

        await radioBtn.waitForDisplayed({ timeout: 3000 });
        await radioBtn.click();

        console.log(`✔ Successfully selected '${answerText}' for DR-TB diagnosis confirmation.`);
    } catch (error) {
        console.error(`❌ Failed to set 'Has the diagnosis of DR-TB been confirmed?':`, error.message);
    }
}

async function clickOkButton(driver) {
    try {
        console.log("Attempting to click the 'OK' button...");

        // XPath targeting common variations of the OK button text and the standard Android dialog positive button ID
        const okBtnXPath = '//android.widget.Button[@text="OK" or @text="Ok" or @text="ok" or @resource-id="android:id/button1"]';
        const okBtn = await driver.$(okBtnXPath);

        await okBtn.waitForDisplayed({ timeout: 5000 });
        await okBtn.click();

        console.log("✔ Successfully clicked the 'OK' button.");
    } catch (error) {
        console.error("❌ Failed to click the 'OK' button:", error.message);
    }
}
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

        // 1. Fill Date
        await fillDateOfVisit(driver, 24, "September", 2025);
        await driver.pause(500);

        await fillReferralFacility(driver, FORM_DATA.referralFacility);
        await fillSputumSampleCollected(driver, FORM_DATA.sputumSampleCollected);
        await driver.pause(1000);

        // 3. If Sputum is collected, fill out the new fields that appear
        if (FORM_DATA.sputumSampleCollected === "Yes") {
            await fillSputumSampleSubmittedAt(driver, FORM_DATA.sputumSampleSubmittedAt);
            await driver.pause(1000);

            // Fill Nikshay ID
            await fillNikshayID(driver, FORM_DATA.nikshayID);
            await driver.pause(1000);

            await fillSputumTestResult(driver, FORM_DATA.sputumTestResult);
            await driver.pause(1000);
            // await fillDrTbConfirmed(driver, FORM_DATA.drTbConfirmed);
        }

        // 4. Select Type of TB case
        await fillTypeOfTBCase(driver, FORM_DATA.typeOfTBCase);
        await driver.pause(1000);



        // 5. Select Reason for Suspicion (if it appeared)
        if (FORM_DATA.typeOfTBCase !== "New case of TB") {
            await fillReasonForSuspicion(driver, FORM_DATA.reasonForSuspicion);
        }

        await driver.pause(1000);
        await fillDrTbConfirmed(driver, FORM_DATA.drTbConfirmed);
        await driver.pause(1000);
        // 6. Submit Form
        await clickSubmitButton(driver);
        await clickOkButton(driver);

    } finally {
        await driver.pause(2000);
        await driver.deleteSession();
    }
}

runTest();