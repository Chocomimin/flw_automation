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
// 1. CORE HELPERS & DROPDOWN LOGIC
// ==========================================

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

async function openMaterialDropdownAndSelect(driver, orderIndex, value, optionsList) {
    try {
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
            await driver.pause(1000);
        }
    } catch (e) {}

    // Scroll down to an anchor below the dropdowns so both are guaranteed to be in the DOM
    await scrollDownToText(driver, "MCP Card", 2);
    await driver.pause(1000);

    // Fetch all Material dropdown arrow icons on the screen
    const icons = await driver.$$('//android.widget.ImageButton[@content-desc="Show dropdown menu"]');

    let iconData = [];
    for (let icon of icons) {
        try {
            const loc = await icon.getLocation();
            const size = await icon.getSize(); // Capture size for fallback math
            iconData.push({ element: icon, y: loc.y, loc, size });
        } catch (e) {}
    }

    // Sort them strictly top-to-bottom by their Y coordinates
    iconData.sort((a, b) => a.y - b.y);

    if (iconData.length <= orderIndex) {
        throw new Error(`Expected at least ${orderIndex + 1} dropdown icons on screen, found ${iconData.length}.`);
    }

    const targetIcon = iconData[orderIndex];

    console.log(`📍 Tapping dropdown arrow (index ${orderIndex}) for: ${value}...`);
    await targetIcon.element.click();
    await driver.pause(2000); // Wait for the list popup to render

    // STRATEGY 1: Direct XPath Selection
    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`✅ Selected "${value}" natively`);
        return;
    } catch (e) {}

    // STRATEGY 2: XML Bounds Parse Fallback
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
                await tapByCoords(driver, tapX, tapY);
                console.log(`✅ Selected "${value}" via XML bounds`);
                return;
            }
        }
    } catch (e) {}

    // STRATEGY 3: Coordinate Fallback
    if (optionsList && optionsList.length > 0) {
        console.log(`⚠️ DOM strategies failed. Falling back to Coordinate selection for "${value}"...`);
        const screen = await driver.getWindowRect();
        const idx = optionsList.indexOf(value);

        if (idx === -1) throw new Error(`"${value}" not found in provided optionsList.`);

        // The height of the dropdown icon exactly matches the height of the list rows
        const rowHeight = targetIcon.size.height;
        const spinnerBottom = targetIcon.loc.y + targetIcon.size.height;

        // Determine if the popup opens upward or downward based on screen space
        const opensUpward = (screen.height - spinnerBottom) < (optionsList.length * rowHeight);

        // Tap directly in the horizontal center of the screen
        const finalTapX = Math.floor(screen.width / 2);
        let finalTapY;

        if (opensUpward) {
            const reversedIdx = (optionsList.length - 1) - idx;
            finalTapY = Math.floor(targetIcon.loc.y - (reversedIdx * rowHeight) - (rowHeight / 2));
        } else {
            finalTapY = Math.floor(spinnerBottom + (idx * rowHeight) + (rowHeight / 2));
        }

        // Keep coordinates within screen limits
        finalTapY = Math.max(5, Math.min(finalTapY, screen.height - 5));

        await tapByCoords(driver, finalTapX, finalTapY);
        console.log(`✅ Selected "${value}" via coordinates fallback`);
        return;
    }

    throw new Error(`❌ Failed to select "${value}" from dropdown. All strategies failed.`);
}


// ==========================================
// 2. PAGE ACTIONS
// ==========================================

async function scrollDownToText(driver, text, maxSwipes = 2) {
    try {
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).setMaxSearchSwipes(${maxSwipes}).scrollIntoView(new UiSelector().textContains("${text}"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 });
    } catch (e) {}
}

async function clickRoutineImmunization(driver) {
    try {
        const element = await driver.$('//android.widget.TextView[@text="Routine Immunization"]');
        await element.waitForDisplayed({ timeout: 5000 });
        await element.click();
        console.log("✔ Clicked Routine Immunization.");
    } catch (error) {
        console.error("❌ Failed to click Routine Immunization:", error.message);
    }
}

async function clickChildImmunization(driver) {
    try {
        const element = await driver.$('//android.widget.FrameLayout[@clickable="true" and .//android.widget.TextView[@text="Child Immunization"]]');
        await element.waitForDisplayed({ timeout: 5000 });
        await element.click();
        console.log("✔ Clicked Child Immunization.");
    } catch (error) {
        console.error("❌ Failed to click Child Immunization:", error.message);
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
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();

        console.log(`✔ Typed search: "${searchText}"`);
        await driver.pause(1500);

        const upperSearchText = searchText.toUpperCase();
        const showVaccinesBtnSelector = `//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content" and .//android.widget.TextView[contains(translate(@text, 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), '${upperSearchText}')]]//android.widget.Button[@text="Show Vaccines"]`;

        const showVaccineBtn = await driver.$(showVaccinesBtnSelector);
        await showVaccineBtn.waitForDisplayed({ timeout: 5000 });
        await showVaccineBtn.click();
        console.log(`✔ Clicked 'Show Vaccines'`);

    } catch (error) {
        console.error(`❌ Failed searching/clicking 'Show Vaccines':`, error.message);
    }
}

async function selectVaccine(driver, vaccineName) {
    console.log(`Attempting to scroll down to find the FILL button for vaccine: "${vaccineName}"...`);

    let isFound = false;
    const maxSwipes = 20;

    for (let i = 0; i < maxSwipes; i++) {
        const fillButtonXPath = `//android.widget.TextView[contains(@text, "${vaccineName}")]/../android.widget.Button[@text="FILL"]`;
        const alternativeRowXPath = `//android.widget.TextView[contains(@text, "${vaccineName}")]`;

        try {
            const fillButton = await driver.$(fillButtonXPath);
            if (await fillButton.isDisplayed()) {
                await fillButton.click();
                console.log(`✔ Successfully clicked the "FILL" button for vaccine: "${vaccineName}"`);
                isFound = true;
                break;
            }
        } catch (e) {
            try {
                const rowText = await driver.$(alternativeRowXPath);
                if (await rowText.isDisplayed()) {
                    await rowText.click();
                    console.log(`✔ Clicked the vaccine row for "${vaccineName}" (FILL button not found)`);
                    isFound = true;
                    break;
                }
            } catch (err) {}
        }

        console.log(`Vaccine "${vaccineName}" not in view. Swiping up (Attempt ${i + 1}/${maxSwipes})...`);
        const screen = await driver.getWindowRect();
        const startY = Math.floor(screen.height * 0.8);
        const endY = Math.floor(screen.height * 0.2);
        const swipeX = Math.floor(screen.width / 2);

        await driver.performActions([{
            type: 'pointer', id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: swipeX, y: startY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 200 },
                { type: 'pointerMove', duration: 800, x: swipeX, y: endY },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
        await driver.releaseActions();
        await driver.pause(1500);
    }

    if (!isFound) {
        throw new Error(`❌ Failed to find or click "${vaccineName}" after ${maxSwipes} swipes.`);
    }
}

async function toggleVaccineSwitches(driver, vaccines) {
    const vaccineArray = Array.isArray(vaccines) ? vaccines : [vaccines];

    for (const vaccineName of vaccineArray) {
        console.log(`Attempting to toggle switch for: "${vaccineName}"...`);
        const switchXPath = `//android.widget.TextView[contains(@text, "${vaccineName}")]/../android.widget.Switch`;

        let isFound = false;
        const maxSwipes = 20;

        for (let i = 0; i < maxSwipes; i++) {
            try {
                const switchElement = await driver.$(switchXPath);
                if (await switchElement.isDisplayed()) {
                    await switchElement.click();
                    console.log(`✔ Successfully toggled switch for: "${vaccineName}"`);
                    await driver.pause(500);
                    isFound = true;
                    break;
                }
            } catch (e) {}

            console.log(`Switch for "${vaccineName}" not in view. Swiping up (Attempt ${i + 1}/${maxSwipes})...`);
            const screen = await driver.getWindowRect();
            const startY = Math.floor(screen.height * 0.8);
            const endY = Math.floor(screen.height * 0.2);
            const swipeX = Math.floor(screen.width / 2);

            await driver.performActions([{
                type: 'pointer', id: 'finger1',
                parameters: { pointerType: 'touch' },
                actions: [
                    { type: 'pointerMove', duration: 0, x: swipeX, y: startY },
                    { type: 'pointerDown', button: 0 },
                    { type: 'pause', duration: 200 },
                    { type: 'pointerMove', duration: 800, x: swipeX, y: endY },
                    { type: 'pointerUp', button: 0 }
                ]
            }]);
            await driver.releaseActions();
            await driver.pause(1500);
        }

        if (!isFound) console.error(`❌ Failed to toggle switch for "${vaccineName}".`);
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

        if (!dayFound) throw new Error(`Could not find the day: ${targetContentDesc}`);

        const okButton = await driver.$('//android.widget.Button[@resource-id="android:id/button1" and @text="OK"]');
        await okButton.click();
        console.log(`✔ Confirmed date: ${targetContentDesc}`);

    } catch (error) {
        console.error("❌ Error setting vaccination date:", error.message);
    }
}

// ==========================================
// 3. DROPDOWN HANDLERS
// ==========================================

async function fillVaccinatedPlace(driver, placeName) {
    console.log(`Processing 'Vaccinated Place' Dropdown for: "${placeName}"...`);
    const optionsList = [
        'Sub-Centre', 'PHC', 'CHC', 'Sub-District Hospital', 'District Hospital',
        'Medical College Hospital', 'Private Hospital', 'Accredited Private Hospital',
        'VHND VHSND U-WIN Session', 'Other'
    ];
    // Place is structurally the 1st dropdown from the top (Index 0)
    await openMaterialDropdownAndSelect(driver, 0, placeName, optionsList);
}

async function fillVaccinatedBy(driver, vaccinatedByText) {
    console.log(`Processing 'Vaccinated By' Dropdown for: "${vaccinatedByText}"...`);
    const optionsList = ['ANM', 'CHO', 'MO'];
    // By is structurally the 2nd dropdown from the top (Index 1)
    await openMaterialDropdownAndSelect(driver, 1, vaccinatedByText, optionsList);
}

// ==========================================
// 4. FINAL STEPS
// ==========================================

async function uploadMCPCards(driver, cardNames) {
    for (const cardName of cardNames) {
        try {
            console.log(`Processing file upload for: "${cardName}"...`);
            await scrollDownToText(driver, cardName, 2);

            const addFileIconXPath = `//android.widget.TextView[contains(@text, "${cardName}")]/../android.widget.ImageView[@content-desc="add file"]`;
            const addFileIcon = await driver.$(addFileIconXPath);

            if (await addFileIcon.isExisting()) {
                await addFileIcon.click();
                console.log(`✔ Clicked 'add file' for ${cardName}.`);
                await driver.pause(1500);

                const galleryBtnSelector = '//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnGallery"]';
                const galleryBtn = await driver.$(galleryBtnSelector);

                if (await galleryBtn.isExisting()) {
                    await galleryBtn.click();
                    console.log(`✔ Selected 'Pick from Gallery'. Waiting 20 seconds for manual interaction...`);
                    await driver.pause(20000);
                    console.log(`⏳ Finished waiting for ${cardName} upload.`);
                } else {
                    console.warn(`⚠ Could not find 'Pick from Gallery' option for ${cardName}.`);
                }
            } else {
                console.error(`❌ Could not find the 'add file' icon for ${cardName}.`);
            }
        } catch (error) {
            console.error(`❌ Failed during upload process for "${cardName}":`, error.message);
        }
    }
}

async function clickSubmitButton(driver) {
    try {
        console.log("Attempting to click Submit...");
        await scrollDownToText(driver, "Submit", 2);

        const submitBtnSelector = '//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]';
        const submitBtn = await driver.$(submitBtnSelector);

        await submitBtn.waitForDisplayed({ timeout: 5000 });
        await submitBtn.click();
        console.log("✔ Successfully clicked the Submit button.");
    } catch (error) {
        console.error("❌ Failed to click the Submit button:", error.message);
    }
}

async function handleIncentiveReminderDialog(driver, clickYes = true) {
    try {
        console.log("⏳ Waiting for Incentive Reminder dialog...");
        const buttonText = clickYes ? "Yes" : "No";
        const buttonXPath = `//android.widget.Button[@text="${buttonText}"]`;

        const dialogButton = await driver.$(buttonXPath);
        await dialogButton.waitForDisplayed({ timeout: 5000 });
        await dialogButton.click();

        console.log(`✔ Successfully clicked '${buttonText}' on the Reminder dialog.`);
        await driver.pause(1500);
    } catch (error) {
        console.error("⚠ Incentive Reminder dialog did not appear or could not be clicked:", error.message);
    }
}

// ==========================================
// MAIN TEST EXECUTION
// ==========================================

async function runTest() {
    const driver = await remote(wdOpts);

    const targetPatient = "pallavi karmakar";
    const targetVaccine = "JE-2";
    const dateConfig = { day: 15, month: "March", year: 2026 };

    try {
        await driver.pause(2000);

        await clickRoutineImmunization(driver);
        await clickChildImmunization(driver);

        await searchAndClickShowVaccines(driver, targetPatient);
        await driver.pause(2000);

        await selectVaccine(driver, targetVaccine);
        await driver.pause(1500);

        const dateInput = await driver.$('//android.widget.EditText[@hint="Date of Vaccination *"]');
        await dateInput.waitForDisplayed({ timeout: 5000 });
        await dateInput.click();
        await driver.pause(1000);

        await setVaccinationDate(driver, dateConfig.day, dateConfig.month, dateConfig.year);

        const vaccinesToToggle = [targetVaccine];
        await toggleVaccineSwitches(driver, vaccinesToToggle);

        await fillVaccinatedPlace(driver, "PHC");
        await fillVaccinatedBy(driver, "ANM");

        const cardsToUpload = ["MCP Card 1", "MCP Card 2"];
        await uploadMCPCards(driver, cardsToUpload);

        await clickSubmitButton(driver);

        await handleIncentiveReminderDialog(driver, false);

    } catch (error) {
        console.error("❌ Script Execution Failed:", error.message);
    } finally {
        if (driver) {
            await driver.pause(2000);
            await driver.deleteSession();
        }
    }
}

runTest();