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
    searchName: "rahul sharma",

    // Set these to "Yes" or "No" based on what you want to test!
    tbScreeningAnswers: {
        "Coughing more than 2 weeks": "No",
        "Blood in sputum": "No",
        "Fever for > 2 weeks": "No",
        "Loss of weight": "No",
        "Night Sweats": "No",
        "History of TB": "No",
        "Are you currently taking anti-TB drugs": "No",
        "Anyone in family currently suffering from TB": "No",
        "Rise of fever in evening": "No",
        "Loss of appetite": "No",
        "Age more than 60 years": "No",
        "Diabetic": "No",
        "Tobacco user": "No",
        "BMI < 18.5": "No",
        "Contact with TB patient on treatment": "No",
        "History of TB in last 5 years": "No"
    }
};

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

async function scrollAndSelectRadio(driver, questionText, answerText) {
    try {
        console.log(`Searching for '${questionText}' to select '${answerText}'...`);

        // Scroll the question into view (using textContains ignores the trailing asterisks *)
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${questionText}"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        // Find the TextView with the question -> jump up to its parent Layouts -> dive into the RadioGroup -> select the RadioButton
        const radioXPath = `//android.widget.TextView[contains(@text, "${questionText}")]/../../android.widget.RadioGroup//android.widget.RadioButton[@text="${answerText}"]`;
        const radioBtn = await driver.$(radioXPath);

        await radioBtn.waitForDisplayed({ timeout: 3000 });
        await radioBtn.click();

        console.log(`✔ Successfully set '${questionText}' to '${answerText}'`);
    } catch (error) {
        console.error(`❌ Failed to set '${questionText}':`, error.message);
    }
}

async function fillTBScreeningQuestions(driver, answersObj) {
    console.log("--- Starting TB Screening Questionnaire ---");
    for (const [question, answer] of Object.entries(answersObj)) {
        await scrollAndSelectRadio(driver, question, answer);
        await driver.pause(400); // Brief pause to allow UI animations to settle
    }
    console.log("--- Completed TB Screening Questionnaire ---");
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

async function clickTBScreening(driver) {
    try {
        console.log("Attempting to click 'TB Screening'...");
        const tbScreeningSelector = '//android.widget.FrameLayout[@clickable="true" and .//android.widget.TextView[@text="TB Screening"]]';
        const element = await driver.$(tbScreeningSelector);
        await element.waitForDisplayed({ timeout: 5000 });
        await element.click();
        console.log("✔ Successfully clicked on 'TB Screening'.");
    } catch (error) {
        console.error("❌ Failed to click on 'TB Screening'.", error.message);
    }
}

async function searchAndClickScreen(driver, searchText) {
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
        const screenButtonXPath = `//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content" and .//android.widget.LinearLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/ll_title_tb_screening_list_bar"]/android.widget.TextView[contains(translate(@text, 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), '${upperSearchText}')]]//android.widget.Button[@text="SCREEN"]`;

        const screenBtn = await driver.$(screenButtonXPath);
        await screenBtn.waitForDisplayed({ timeout: 5000 });
        await screenBtn.click();
        console.log(`✔ Successfully clicked 'SCREEN' button for "${searchText}".`);

    } catch (error) {
        console.error(`❌ Failed during search or clicking 'SCREEN' for "${searchText}":`, error.message);
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

async function clickSubmitButton(driver) {
    try {
        console.log("Attempting to click Submit...");

        // Scroll down slightly to make sure the submit button is fully in view
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

// ==========================================
// 4. MAIN EXECUTION
// ==========================================

async function runTest() {
    const driver = await remote(wdOpts);
    try {
        await driver.pause(2000);

        // 1. Navigate to TB Screening
        await clickCommunicableDiseases(driver);
        await driver.pause(1000);
        await clickTBScreening(driver);

        // 2. Search & Open Form
        await searchAndClickScreen(driver, FORM_DATA.searchName);

        // Wait for the TB Screening Form to open
        await driver.pause(1500);

        // 3. Fill Date (e.g., 24th March 2026)
        await fillDateOfVisit(driver, 24, "March", 2026);

        await driver.pause(1000);

        // 4. Fill Questionnaire dynamically based on FORM_DATA
        await fillTBScreeningQuestions(driver, FORM_DATA.tbScreeningAnswers);

        // 5. Submit Form
        await clickSubmitButton(driver);

    } finally {
        await driver.pause(2000);
        await driver.deleteSession();
    }
}

runTest();