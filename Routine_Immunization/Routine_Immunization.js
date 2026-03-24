const {remote} = require('webdriverio');

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
// HELPER FUNCTIONS (These were missing!)
// ==========================================

async function tapAt(driver, x, y) {
    await driver.action('pointer')
        .move({ duration: 0, x: x, y: y })
        .down({ button: 0 })
        .pause(100) // Brief pause to register as a tap
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

// ==========================================
// PAGE ACTIONS
// ==========================================

async function clickRoutineImmunization(driver) {
    try {
        const routineImmunizationSelector = '//android.widget.TextView[@text="Routine Immunization"]';
        const element = await driver.$(routineImmunizationSelector);
        await element.waitForDisplayed({ timeout: 5000 });
        await element.click();
        console.log("Successfully clicked on the Routine Immunization module.");
    } catch (error) {
        console.error("Failed to click on Routine Immunization. It might not be visible on screen:", error);
    }
}

async function clickChildImmunization(driver) {
    try {
        const childImmunizationSelector = '//android.widget.FrameLayout[@clickable="true" and .//android.widget.TextView[@text="Child Immunization"]]';
        const element = await driver.$(childImmunizationSelector);
        await element.waitForDisplayed({ timeout: 5000 });
        await element.click();
        console.log("Successfully clicked on the Child Immunization module.");
    } catch (error) {
        console.error("Failed to click on Child Immunization. Ensure it is visible on the screen:", error);
    }
}

async function searchAndClickShowVaccines(driver, searchText) {
    try {
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

        console.log(`Successfully typed: "${searchText}" through the keyboard`);

        await driver.pause(1500);

        const upperSearchText = searchText.toUpperCase();

        const showVaccinesBtnSelector = `//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content" and .//android.widget.TextView[contains(translate(@text, 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), '${upperSearchText}')]]//android.widget.Button[@text="Show Vaccines"]`;

        const showVaccineBtn = await driver.$(showVaccinesBtnSelector);

        await showVaccineBtn.waitForDisplayed({ timeout: 5000 });
        await showVaccineBtn.click();

        console.log(`Successfully clicked 'Show Vaccines' for the record containing "${searchText}".`);

    } catch (error) {
        console.error(`Failed during search or clicking 'Show Vaccines' for "${searchText}":`, error.message);
    }
}

async function selectVaccine(driver, vaccineName) {
    try {
        console.log(`Attempting to scroll to vaccine: "${vaccineName}"...`);

        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${vaccineName}"))`;
        const vaccineElement = await driver.$(scrollSelector);

        await vaccineElement.waitForDisplayed({ timeout: 10000 });

        const fillButtonXPath = `//android.widget.TextView[@text="${vaccineName}"]/../android.widget.Button[@text="FILL"]`;

        const fillButton = await driver.$(fillButtonXPath);

        await fillButton.waitForDisplayed({ timeout: 3000 });
        await fillButton.click();

        console.log(`Successfully clicked the "FILL" button for vaccine: "${vaccineName}"`);

    } catch (error) {
        console.error(`Failed to find or click the FILL button for "${vaccineName}". Error:`, error.message);
    }
}

async function toggleVaccineSwitches(driver, vaccines) {
    const vaccineArray = Array.isArray(vaccines) ? vaccines : [vaccines];

    for (const vaccineName of vaccineArray) {
        try {
            console.log(`Attempting to find and toggle switch for: "${vaccineName}"...`);

            const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${vaccineName}"))`;
            const nameElement = await driver.$(scrollSelector);

            await nameElement.waitForDisplayed({ timeout: 10000 });

            const switchXPath = `//android.widget.TextView[@text="${vaccineName}"]/../android.widget.Switch`;
            const switchElement = await driver.$(switchXPath);

            await switchElement.waitForDisplayed({ timeout: 3000 });

            await switchElement.click();
            console.log(`Successfully clicked the switch for: "${vaccineName}"`);

            await driver.pause(500);

        } catch (error) {
            console.error(`Failed to toggle switch for "${vaccineName}". Ensure the name matches the screen exactly. Error:`, error.message);
        }
    }
}

async function setVaccinationDate(driver, targetDay, targetMonth, targetYear) {
    try {
        console.log(`Setting vaccination date to: ${targetDay} ${targetMonth} ${targetYear}...`);

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
        console.log(`Successfully confirmed the date: ${targetContentDesc}`);

    } catch (error) {
        console.error("Error setting the vaccination date from the picker:", error.message);
    }
}

async function fillVaccinatedPlace(driver, placeName) {
    console.log(`Processing Vaccinated Place Dropdown for: "${placeName}"...`);

    await scrollDownToText(driver, "Vaccinated Place", 2);

    const spinner = await driver.$('//android.widget.Spinner[@text="Vaccinated Place" or @hint="Vaccinated Place"]');

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();

        if (currentText !== placeName) {
            console.log("⏳ Opening 'Vaccinated Place' Dropdown...");

            const arrowXPath = `//android.widget.Spinner[@text="Vaccinated Place"]/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
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

                const targetOption = await driver.$(`//*[@text="${placeName}"]`);

                if (await targetOption.isExisting()) {
                    console.log(`⏳ Found text "${placeName}", tapping it directly...`);
                    await targetOption.click();
                    console.log(`✔ Vaccinated Place updated to "${placeName}".`);
                } else {
                    console.log(`⚠ Could not find text natively, falling back to coordinates...`);

                    // 🚨 UPDATED Y-COORDINATES: Shifted down to match the list's actual position on screen
                    const VACCINATED_PLACE_COORDS = {
                        'Sub-Centre':                  { x: 500, y: 870 },
                        'PHC':                         { x: 500, y: 1000 },
                        'CHC':                         { x: 500, y: 1130 },
                        'Sub-District Hospital':       { x: 500, y: 1260 },
                        'District Hospital':           { x: 500, y: 1390 },
                        'Medical College Hospital':    { x: 500, y: 1520 },
                        'Private Hospital':            { x: 500, y: 1650 },
                        'Accredited Private Hospital': { x: 500, y: 1780 },
                        'VHND VHSND U-WIN Session':    { x: 500, y: 1910 },
                        'Other':                       { x: 500, y: 2040 }
                    };

                    const coords = VACCINATED_PLACE_COORDS[placeName];
                    if (coords) {
                        console.log(`⏳ Tapping coordinates X:${coords.x} Y:${coords.y} for ${placeName}`);
                        await tapAt(driver, coords.x, coords.y);
                        console.log(`✔ Vaccinated Place updated via coordinates.`);
                    } else {
                        console.error(`❌ "${placeName}" is not defined in the coordinate map.`);
                    }
                }
            } else {
                console.error('❌ Could not find the dropdown arrow for Vaccinated Place.');
            }
        } else {
            console.log(`➡ Vaccinated Place is already set to "${placeName}".`);
        }
    } else {
        console.error('❌ Could not find "Vaccinated Place" dropdown field.');
    }
}
async function fillVaccinatedBy(driver, vaccinatedByText) {
    console.log(`Processing Vaccinated By Dropdown for: "${vaccinatedByText}"...`);

    await scrollDownToText(driver, "Vaccinated By", 2);

    const spinner = await driver.$('//android.widget.Spinner[@text="Vaccinated By" or @hint="Vaccinated By"]');

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();

        if (currentText !== vaccinatedByText) {
            console.log("⏳ Opening 'Vaccinated By' Dropdown...");

            // Target the arrow specifically for the Vaccinated By row
            const arrowXPath = `//android.widget.Spinner[@text="Vaccinated By"]/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
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

                // 1. Try native selection first
                const targetOption = await driver.$(`//*[@text="${vaccinatedByText}"]`);

                if (await targetOption.isExisting()) {
                    console.log(`⏳ Found text "${vaccinatedByText}", tapping it directly...`);
                    await targetOption.click();
                    console.log(`✔ Vaccinated By updated to "${vaccinatedByText}".`);
                } else {
                    console.log(`⚠ Could not find text natively, falling back to coordinates...`);

                    // 🚨 UPDATED Y-COORDINATES: Shifted down because the menu opens UPWARDS near the bottom of the screen
                    const VACCINATED_BY_COORDS = {
                        'ANM': { x: 500, y: 1750 },
                        'CHO': { x: 500, y: 1880 },
                        'MO':  { x: 500, y: 2000 }
                    };

                    const coords = VACCINATED_BY_COORDS[vaccinatedByText];
                    if (coords) {
                        console.log(`⏳ Tapping coordinates X:${coords.x} Y:${coords.y} for ${vaccinatedByText}`);
                        await tapAt(driver, coords.x, coords.y);
                        console.log(`✔ Vaccinated By updated via coordinates.`);
                    } else {
                        console.error(`❌ "${vaccinatedByText}" is not defined in the coordinate map.`);
                    }
                }
            } else {
                console.error('❌ Could not find the dropdown arrow for Vaccinated By.');
            }
        } else {
            console.log(`➡ Vaccinated By is already set to "${vaccinatedByText}".`);
        }
    } else {
        console.error('❌ Could not find "Vaccinated By" dropdown field.');
    }
}

async function uploadMCPCards(driver, cardNames) {
    for (const cardName of cardNames) {
        try {
            console.log(`Processing file upload for: "${cardName}"...`);

            // Scroll down until the card name is visible
            await scrollDownToText(driver, cardName, 2);

            // Locate the "add_file" icon next to the specific MCP Card text
            const addFileIconXPath = `//android.widget.TextView[@text="${cardName}"]/../android.widget.ImageView[@content-desc="add file"]`;
            const addFileIcon = await driver.$(addFileIconXPath);

            if (await addFileIcon.isExisting()) {
                await addFileIcon.click();
                console.log(`✔ Clicked 'add file' for ${cardName}.`);

                await driver.pause(1500); // Wait for the picker dialog to open

                // Look specifically for the "Pick from Gallery" button in the custom dialog
                const galleryBtnSelector = '//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnGallery"]';
                const galleryBtn = await driver.$(galleryBtnSelector);

                if (await galleryBtn.isExisting()) {
                    await galleryBtn.click();
                    console.log(`✔ Selected 'Pick from Gallery'. Waiting 20 seconds for manual interaction...`);

                    // Wait for 20 seconds to allow the user to manually pick an image
                    await driver.pause(20000);

                    console.log(`⏳ Finished waiting for ${cardName} upload.`);
                } else {
                    console.warn(`⚠ Could not find 'Pick from Gallery' option for ${cardName}.`);
                }

            } else {
                console.error(`❌ Could not find the 'add file' icon for ${cardName}.`);
            }

        } catch (error) {
            console.error(`Failed during upload process for "${cardName}":`, error.message);
        }
    }
}


async function clickSubmitButton(driver) {
    try {
        console.log("Attempting to click Submit...");

        // Scroll to the Submit button just in case it's off-screen
        await scrollDownToText(driver, "Submit", 2);

        const submitBtnSelector = '//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]';
        const submitBtn = await driver.$(submitBtnSelector);

        await submitBtn.waitForDisplayed({ timeout: 5000 });
        await submitBtn.click();

        console.log("✔ Successfully clicked the Submit button.");
    } catch (error) {
        console.error("Failed to click the Submit button:", error.message);
    }
}

async function handleIncentiveReminderDialog(driver, clickYes = true) {
    try {
        console.log("⏳ Waiting for Incentive Reminder dialog...");

        // Determine which button to click based on your preference
        const buttonText = clickYes ? "Yes" : "No";
        const buttonXPath = `//android.widget.Button[@text="${buttonText}"]`;

        const dialogButton = await driver.$(buttonXPath);

        // Wait for the dialog button to appear (timeout 5 seconds)
        await dialogButton.waitForDisplayed({ timeout: 5000 });

        // Click the button
        await dialogButton.click();

        console.log(`✔ Successfully clicked '${buttonText}' on the Reminder dialog.`);

        // Brief pause to allow the dialog to close and the next screen to load
        await driver.pause(1500);

    } catch (error) {
        console.error("⚠ Incentive Reminder dialog did not appear or could not be clicked:", error.message);
    }
}

async function runTest() {
    const driver = await remote(wdOpts);
    try {
        await clickRoutineImmunization(driver);
        await clickChildImmunization(driver);

        await searchAndClickShowVaccines(driver, "baby of rita");

        // Wait a second for the bottom sheet to animate up
        await driver.pause(1000);
        await selectVaccine(driver, "OPV-3");

        await driver.pause(1500);

        const dateInput = await driver.$('//android.widget.EditText[@hint="Date of Vaccination *"]');
        await dateInput.click();
        await driver.pause(1000); // Wait for calendar to pop up

        await setVaccinationDate(driver, 15, "March", 2026);

        const vaccinesToToggle = ["OPV-3"];
        await toggleVaccineSwitches(driver, vaccinesToToggle);
        await fillVaccinatedPlace(driver, "PHC");
        await fillVaccinatedBy(driver, "ANM");
        const cardsToUpload = ["MCP Card 1", "MCP Card 2"];
        await uploadMCPCards(driver, cardsToUpload);
        await clickSubmitButton(driver);
        await handleIncentiveReminderDialog(driver, true);

    } finally {
        await driver.deleteSession();
    }
}

runTest();