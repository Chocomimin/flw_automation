const { remote } = require('webdriverio');

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true,
    'appium:unicodeKeyboard': true,
    'appium:resetKeyboard': true
};

const wdioOptions = {
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities: capabilities
};

// ─────────────────────────────────────────────
// Helpers: Navigation & Searching
// ─────────────────────────────────────────────
async function clickGridItemByText(driver, text) {
    console.log(`Looking for Grid Icon with text: '${text}'...`);
    const xpath = `//android.widget.TextView[@text='${text}' and @resource-id='org.piramalswasthya.sakhi.saksham.uat:id/textView2']/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_icon']`;
    const element = await driver.$(xpath);
    await element.waitForDisplayed({ timeout: 10000 });
    await element.click();
    console.log(`✔ Clicked Grid Icon with text: '${text}'`);
}

async function searchForTextWithKeyboard(driver, searchText) {
    console.log(`Typing '${searchText}' into search bar...`);
    const searchBox = await driver.$("//android.widget.EditText[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/searchView']");
    await searchBox.waitForDisplayed({ timeout: 10000 });
    await searchBox.click();
    await driver.pause(500);

    await searchBox.clearValue();
    await driver.pause(300);

    await searchBox.addValue(searchText);
    await driver.pause(500);

    await driver.pressKeyCode(66); // Enter key
    await driver.pause(800);

    try { await driver.hideKeyboard(); } catch (e) {}
    await driver.pause(500);
    console.log(`✔ Search triggered for '${searchText}'`);
}

async function clickMembersByHouseholdName(driver, householdName) {
    console.log(`Locating Members button for: ${householdName}...`);
    const membersBtnXPath =
        `//android.widget.TextView[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id' and @text='${householdName}']` +
        `/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/parentCard']` +
        `//android.widget.Button[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/button3']`;
    const membersBtn = await driver.$(membersBtnXPath);
    await membersBtn.waitForDisplayed({ timeout: 10000 });
    await membersBtn.click();
    console.log(`✔ Clicked Members button for '${householdName}'`);
}

async function clickScreeningForMember(driver, memberName) {
    console.log(`\nScrolling to find member: '${memberName}'...`);

    // 1. Scroll to the exact text
    const androidScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${memberName}")`;

    try {
        await driver.$(`android=${androidScrollSelector}`).waitForDisplayed({ timeout: 10000 });
        console.log(`✔ Scrolled to member: '${memberName}'`);
    } catch (e) {
        console.log('Scroll approach failed or element is already visible.');
    }

    await driver.pause(1000); // Wait for the screen to finish animating/settling

    // 2. Strict XPath: Find the text -> go UP to the specific Card frame -> go DOWN to its own Screening Button
    const screeningBtnXPath =
        `//android.widget.TextView[contains(@text, '${memberName}')]` +
        `/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_content']` +
        `//android.widget.Button[@text='SCREENING']`;

    const screeningBtn = await driver.$(screeningBtnXPath);

    try {
        await screeningBtn.waitForDisplayed({ timeout: 5000 });
        await screeningBtn.click();
        console.log(`✔ Clicked SCREENING for '${memberName}'`);
    } catch (e) {
        console.log(`✖ Failed to click SCREENING via XPath. Ensure the name is perfectly matched.`);
    }
}

// ─────────────────────────────────────────────
// Helpers: Calendar & Date Picking
// ─────────────────────────────────────────────
async function navigateToMonthYear(driver, targetMonth, targetYear) {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    for (let attempts = 0; attempts < 48; attempts++) {
        const firstDay = await driver.$("//android.view.View[@resource-id='android:id/month_view']/android.view.View[1]");
        const contentDesc = await firstDay.getAttribute('content-desc');
        const parts = contentDesc.split(' ');

        const currentMonth = monthNames.indexOf(parts[1]) + 1;
        const currentYear = parseInt(parts[2]);

        if (currentMonth === targetMonth && currentYear === targetYear) {
            break;
        }

        const targetTotal = targetYear * 12 + targetMonth;
        const currentTotal = currentYear * 12 + currentMonth;

        if (targetTotal < currentTotal) {
            const prevBtn = await driver.$("//android.widget.ImageButton[@resource-id='android:id/prev']");
            await prevBtn.waitForDisplayed({ timeout: 3000 });
            await prevBtn.click();
        } else {
            const nextBtn = await driver.$("//android.widget.ImageButton[@content-desc='Next month']");
            await nextBtn.waitForDisplayed({ timeout: 3000 });
            await nextBtn.click();
        }
        await driver.pause(400);
    }
}

async function fillMalariaScreeningDate(driver, day, month, year) {
    console.log(`\nSetting Malaria Screening Date → ${day}/${month}/${year}`);

    const dateField = await driver.$("//android.widget.EditText[@hint='Maleria Screening Date *']");
    await dateField.waitForDisplayed({ timeout: 10000 });
    await dateField.click();
    await driver.pause(1000);

    await navigateToMonthYear(driver, month, year);
    await driver.pause(300);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const dayPadded = String(day).padStart(2, '0');
    const monthName = monthNames[month - 1];
    const contentDesc = `${dayPadded} ${monthName} ${year}`;

    const dayElement = await driver.$(`//android.view.View[@content-desc='${contentDesc}']`);
    await dayElement.waitForDisplayed({ timeout: 5000 });
    await dayElement.click();
    await driver.pause(500);

    const okButton = await driver.$("//android.widget.Button[@resource-id='android:id/button1']");
    await okButton.waitForDisplayed({ timeout: 5000 });
    await okButton.click();
    await driver.pause(500);
}

// ✨ ENHANCED: Context-Aware Date picker specifically targeting identical Hint Fields
async function fillDateOfTest(driver, day, month, year, contextText = null) {
    console.log(`\nSetting Date of Test ${contextText ? `for '${contextText}'` : ''} → ${day}/${month}/${year}`);

    // Ensure we scroll down to pull the date field into the viewport
    try {
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollForward()`);
        await driver.pause(1000);
    } catch (e) {}

    let dateField;

    // 1. Target specifically relative to the Context (RDT or Slide Test Pf/Pv)
    if (contextText) {
        const strictXPath = `//android.widget.TextView[contains(@text, '${contextText}')]/ancestor::android.widget.LinearLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cl_ri']/following-sibling::android.view.ViewGroup[1]//android.widget.EditText[@hint='Date of Test *']`;
        dateField = await driver.$(strictXPath);
    }

    // 2. Safety Net: If strict targeting fails or no context is given, grab the BOTTOM-MOST "Date of Test" on screen
    if (!dateField || !(await dateField.isExisting())) {
        console.log("ℹ Utilizing fallback target (Last field on screen).");
        const allDateFields = await driver.$$("//android.widget.EditText[@hint='Date of Test *']");

        if (allDateFields.length > 0) {
            // Pick the last matching element found in the DOM (closest to the bottom of the screen)
            dateField = allDateFields[allDateFields.length - 1];
        } else {
            throw new Error("Date of Test field not found on screen.");
        }
    }

    await dateField.waitForDisplayed({ timeout: 10000 });
    await dateField.click();
    await driver.pause(1000);

    await navigateToMonthYear(driver, month, year);
    await driver.pause(300);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const dayPadded = String(day).padStart(2, '0');
    const monthName = monthNames[month - 1];
    const contentDesc = `${dayPadded} ${monthName} ${year}`;

    const dayElement = await driver.$(`//android.view.View[@content-desc='${contentDesc}']`);
    await dayElement.waitForDisplayed({ timeout: 5000 });
    await dayElement.click();
    await driver.pause(500);

    const okButton = await driver.$("//android.widget.Button[@resource-id='android:id/button1']");
    await okButton.waitForDisplayed({ timeout: 5000 });
    await okButton.click();
    await driver.pause(500);
}

async function selectBeneficiaryStatusByCoordinates(driver, option) {
    console.log(`\nSelecting Beneficiary Status: '${option}' using coordinates...`);

    const dropdown = await driver.$("//android.widget.Spinner[@hint='Beneficiary Status *']");
    await dropdown.waitForDisplayed({ timeout: 5000 });
    await dropdown.click();
    await driver.pause(1500);

    let tapX = 540;
    let tapY = 780; // Screening

    if (option.toLowerCase() === 'death') {
        tapY = 880;
    }

    await driver.performActions([{
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: tapX, y: tapY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.pause(1000);
}

// ─────────────────────────────────────────────
// Helper: Select Yes/No/Options for a specific field
// ─────────────────────────────────────────────
async function selectSymptom(driver, symptomName, answer, timeoutMs = 5000) {
    console.log(`Setting '${symptomName}' to '${answer}'...`);

    try {
        const androidScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${symptomName}")`;
        await driver.$(`android=${androidScrollSelector}`).waitForDisplayed({ timeout: 2000 });
    } catch (e) {
        // Ignored
    }

    const rbXPath = `//android.widget.TextView[@text='${symptomName}']/ancestor::android.widget.LinearLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cl_ri']//android.widget.RadioButton[@text='${answer}']`;
    const rbElement = await driver.$(rbXPath);

    await rbElement.waitForDisplayed({ timeout: timeoutMs });
    await rbElement.click();

    console.log(`✔ Set '${symptomName}' -> '${answer}'`);
    await driver.pause(500);
}

// ─────────────────────────────────────────────
// Main flow: Malaria Navigation -> Search -> Form
// ─────────────────────────────────────────────
async function main() {
    console.log('═══════════════════════════════════════════');
    console.log(' Initializing Appium — Malaria Form Flow');
    console.log('═══════════════════════════════════════════');

    let driver;

    try {
        driver = await remote(wdioOptions);
        console.log('✔ Appium session started\n');

        // 1. Navigate to Disease Control -> Malaria -> Malaria
        await clickGridItemByText(driver, 'Disease Control');
        await driver.pause(1500);
        await clickGridItemByText(driver, 'Malaria');
        await driver.pause(1500);
        await clickGridItemByText(driver, 'Malaria');
        await driver.pause(2000);

        // 2. Search and open member
        await searchForTextWithKeyboard(driver, 'RANUDEVI GG');
        await driver.pause(2000);
        await clickMembersByHouseholdName(driver, 'RANUDEVI GG');
        await driver.pause(2000);

        // 3. Scroll to member and start screening
        await clickScreeningForMember(driver, 'REENA JSBS');
        await driver.pause(2000);

        // 4. Fill in the Screening Date
        await fillMalariaScreeningDate(driver, 15, 1, 2026);

        // 5. Select Beneficiary Status
        await selectBeneficiaryStatusByCoordinates(driver, 'Screening');

        // 6. Fill out Symptoms
        console.log('\n--- Filling out Symptoms ---');
        await selectSymptom(driver, 'Fever for > 2 weeks', 'Yes'); // Triggers Dynamic Test Fields
        await selectSymptom(driver, 'Flu-like illness', 'No');
        await selectSymptom(driver, 'Shaking chills', 'No');
        await selectSymptom(driver, 'Headache', 'No');
        await selectSymptom(driver, 'Muscle aches', 'No');
        await selectSymptom(driver, 'Tiredness', 'No');
        await selectSymptom(driver, 'Nausea', 'No');
        await selectSymptom(driver, 'Vomiting', 'No');
        await selectSymptom(driver, 'Diarrhea', 'No');

        // 7. Dynamic Check for 'Malaria Test Type'
        console.log('\n--- Checking for Dynamic Test Fields ---');

        try {
            const submitScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"))`;
            await driver.$(`android=${submitScrollSelector}`).waitForDisplayed({ timeout: 5000 });
        } catch (e) { }

        const desiredTestType = 'Both';
        let selectedTestType = null;

        try {
            const testTypeXPath = `//android.widget.TextView[@text='Malaria Test Type']/ancestor::android.widget.LinearLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cl_ri']//android.widget.RadioButton[@text='${desiredTestType}']`;
            const testTypeBtn = await driver.$(testTypeXPath);

            if (await testTypeBtn.isExisting()) {
                console.log(`✔ 'Malaria Test Type' found! Selecting '${desiredTestType}'...`);
                await testTypeBtn.click();
                selectedTestType = desiredTestType;

                await driver.pause(1000);

                try {
                    await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollForward()`);
                    await driver.pause(1000);
                } catch (scrollErr) { }

            } else {
                console.log("ℹ 'Malaria Test Type' not found. Skipping.");
            }
        } catch (error) {
            console.log("ℹ 'Malaria Test Type' not found. Skipping.");
        }

        // 8. Handle the Conditional Logic based on Test Type
        if (selectedTestType) {

            // CONDITION: If Test Type is 'RDT' or 'Both' -> Fill RDT and Date
            if (selectedTestType === 'RDT' || selectedTestType === 'Both') {
                try {
                    console.log(`\n✔ Filling RDT flow...`);
                    const rdtResult = 'Positive';

                    await selectSymptom(driver, 'Rapid Diagnostic Test (RDT)', rdtResult, 5000);

                    if (rdtResult === 'Positive' || rdtResult === 'Negative') {
                        console.log(`--- RDT Result was '${rdtResult}', filling Date of Test ---`);
                        // Explicitly tell fillDateOfTest the context so it grabs the correct sibling element
                        await fillDateOfTest(driver, 15, 1, 2026, 'Rapid Diagnostic Test (RDT)');
                    }
                } catch (error) {
                    console.log("ℹ 'Rapid Diagnostic Test (RDT)' field not found or interactable.");
                }
            }

            // CONDITION: If Test Type is 'Slide Test' or 'Both' -> Fill Slide Test, Pf/Pv, and Date
            if (selectedTestType === 'Slide Test' || selectedTestType === 'Both') {
                try {
                    console.log(`\n✔ Filling Slide Test flow...`);

                    const slideTestValue = 'Pf';
                    const slideResultValue = 'Positive';

                    // Fill "Malaria Slide Test" (Selects Pf or Pv)
                    await selectSymptom(driver, 'Malaria Slide Test', slideTestValue, 5000);

                    // Fill "Malaria Slide Test Pf" OR "Malaria Slide Test Pv"
                    const specificSlideField = `Malaria Slide Test ${slideTestValue}`;
                    await selectSymptom(driver, specificSlideField, slideResultValue, 5000);

                    if (slideResultValue === 'Positive' || slideResultValue === 'Negative') {
                        console.log(`--- Slide Test Result was '${slideResultValue}', filling Date of Test ---`);
                        // Explicitly tell fillDateOfTest the context so it grabs the correct sibling element
                        await fillDateOfTest(driver, 15, 1, 2026, specificSlideField);
                    }
                } catch (error) {
                    console.log("ℹ Slide Test fields not found or interactable.");
                }
            }
        }

        // 9. Submit the Form
        console.log('\nClicking Submit button...');
        try {
            const submitScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"))`;
            const submitBtn = await driver.$(`android=${submitScrollSelector}`);

            await submitBtn.waitForDisplayed({ timeout: 5000 });
            await submitBtn.click();
            console.log('✔ Form Submitted Successfully!');

            // Allow the application time to process the submission before ending the session
            await driver.pause(3000);
        } catch (error) {
            console.log("✖ Could not find or click the Submit button.", error.message);
        }

    } catch (error) {
        console.error('\n✖ Error during Malaria flow:', error.message);
    } finally {
        if (driver) {
            await driver.pause(2000);
            await driver.deleteSession();
            console.log('✔ Session closed.');
        }
    }
}

main();