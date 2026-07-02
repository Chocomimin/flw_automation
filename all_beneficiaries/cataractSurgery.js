const { remote } = require('webdriverio');

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true,
    'appium:newCommandTimeout': 180
};

const wdOpts = {
    hostname: '127.0.0.1',
    port: 4723,
    logLevel: 'error',
    capabilities,
};

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

// ==========================================
// 1. SCROLLING & UI HELPERS
// ==========================================

async function scrollToText(driver, textToFind) {
    try {
        console.log(`↕️ Micro-scrolling to pull "${textToFind}" into view...`);
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${textToFind}"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 });
    } catch (e) {
        // Element is likely already fully visible within viewport boundaries
    }
    await driver.pause(500);
}

// ==========================================
// 2. CALENDAR UTILITIES
// ==========================================

async function getCalendarMonthYear(driver) {
    try {
        const cells = await driver.$$('//android.view.View[@resource-id="android:id/month_view"]/android.view.View');
        for (const cell of cells) {
            const desc = await cell.getAttribute('content-desc').catch(() => '');
            const match = desc.match(/^(\d{2})\s+(\w+)\s+(\d{4})$/);
            if (match) {
                const month = MONTH_NAMES.findIndex(m => m.toLowerCase() === match[2].toLowerCase());
                const year  = parseInt(match[3], 10);
                if (month > 0) return { month, year };
            }
        }
    } catch (e) {}
    return null;
}

async function swipeHorizontalCalendar(driver, direction) {
    const size   = await driver.getWindowRect();
    const startX = direction === 'left' ? Math.floor(size.width * 0.80) : Math.floor(size.width * 0.20);
    const endX   = direction === 'left' ? Math.floor(size.width * 0.20) : Math.floor(size.width * 0.80);
    const midY   = Math.floor(size.height * 0.50);

    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0,   x: startX, y: midY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 80  },
            { type: 'pointerMove', duration: 450, x: endX,   y: midY },
            { type: 'pointerUp',   button: 0 },
        ],
    }]);
    await driver.releaseActions();
    await driver.pause(800);
}

async function swipeVerticalInsidePopup(driver, direction) {
    const size = await driver.getWindowRect();
    const startX = Math.floor(size.width / 2);
    const topY = Math.floor(size.height * 0.40);
    const bottomY = Math.floor(size.height * 0.60);
    const startY = direction === 'down' ? topY : bottomY;
    const endY   = direction === 'down' ? bottomY : topY;

    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0,   x: startX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 100  },
            { type: 'pointerMove', duration: 500, x: startX, y: endY },
            { type: 'pointerUp',   button: 0 },
        ],
    }]);
    await driver.releaseActions();
    await driver.pause(600);
}

async function navigateCalendarToMonth(driver, targetMonth, targetYear) {
    const yearHeader = await driver.$('//android.widget.TextView[@resource-id="android:id/date_picker_header_year"]');
    await yearHeader.waitForDisplayed({ timeout: 5000 });
    const currentYear = parseInt(await yearHeader.getText(), 10);

    if (currentYear !== targetYear) {
        await yearHeader.click();
        await driver.pause(1000);
        let yearFound = false;
        const yearXpath = `//android.widget.TextView[@text="${targetYear}"]`;
        const swipeDir = targetYear < currentYear ? 'down' : 'up';

        for (let i = 0; i < 40; i++) {
            const yearEl = await driver.$(yearXpath);
            if (await yearEl.isDisplayed().catch(() => false)) {
                yearFound = true;
                await yearEl.click();
                break;
            }
            await swipeVerticalInsidePopup(driver, swipeDir);
        }
        if (!yearFound) throw new Error(`Year ${targetYear} not found after scrolling.`);
        await driver.pause(1000);
    }

    const prevBtn = await driver.$('//android.widget.ImageButton[@resource-id="android:id/prev"]');
    for (let i = 0; i < 36; i++) {
        const cur = await getCalendarMonthYear(driver);
        if (!cur) break;
        const curTotal = cur.year * 12 + cur.month;
        const tgtTotal = targetYear * 12 + targetMonth;

        if (curTotal === tgtTotal) break;
        if (curTotal > tgtTotal) {
            await prevBtn.click();
        } else {
            await swipeHorizontalCalendar(driver, 'left');
        }
        await driver.pause(600);
    }
}

// ==========================================
// 3. CORE WORKFLOW STAGES
// ==========================================

async function navigateToAllBeneficiaries(driver) {
    console.log("🔍 Navigating to 'All Beneficiaries' from Dashboard...");
    const allBenBtn = await driver.$('android=new UiSelector().textContains("Beneficiaries").resourceId("org.piramalswasthya.sakhi.saksham.uat:id/textView2")');
    await allBenBtn.waitForDisplayed({ timeout: 10000 });
    await allBenBtn.click();
    await driver.pause(3000);
}

// ─────────────────────────────────────────────────────────────
// MANUAL SWIPE LOOP (Name by Name)
// ─────────────────────────────────────────────────────────────
async function scrollAndOpenCataractModule(driver, targetName) {
    console.log(`🔍 Initiating manual swipe loop to locate name: "${targetName}"...`);

    let isFound = false;

    for (let i = 0; i < 15; i++) {
        const nameXPath = `//android.widget.TextView[contains(@text, "${targetName}")]`;
        const nameElement = await driver.$(nameXPath);

        if (await nameElement.isExisting()) {
            console.log(`✔ Found beneficiary: "${targetName}" on screen.`);
            isFound = true;
            break;
        }

        console.log(`   Swiping down list... (Swipe ${i + 1})`);
        const size = await driver.getWindowRect();
        const startY = Math.floor(size.height * 0.75);
        const endY = Math.floor(size.height * 0.30);
        const startX = Math.floor(size.width / 2);

        await driver.performActions([{
            type: 'pointer', id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: startX, y: startY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 200 },
                { type: 'pointerMove', duration: 800, x: startX, y: endY },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
        await driver.releaseActions();
        await driver.pause(1500);
    }

    if (!isFound) {
        throw new Error(`❌ Could not find beneficiary "${targetName}" after manually scrolling.`);
    }

    // NEW: Force the app to scroll the card up slightly to guarantee the button is rendered in the DOM
    await scrollToText(driver, "Cataract Surgery");

    const cataractBtnXPath = `//android.widget.TextView[contains(@text, "${targetName}")]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]//android.widget.Button[@text="Cataract Surgery"]`;
    const cataractBtn = await driver.$(cataractBtnXPath);

    await cataractBtn.waitForDisplayed({ timeout: 5000 });
    await cataractBtn.click();
    console.log(`✔ Clicked Cataract Surgery button card link.`);
    await driver.pause(2000);

    console.log("🔍 Triggering new record via ADD link...");
    const addBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnAction" and @text="ADD"]');
    await addBtn.waitForDisplayed({ timeout: 5000 });
    await addBtn.click();
    await driver.pause(2000);
}

async function selectMultipleSymptoms(driver, symptomsArray) {
    console.log("📝 Checking off target observation boxes...");
    await scrollToText(driver, "Symptoms Observed");

    for (const symptom of symptomsArray) {
        const checkBox = await driver.$(`//android.widget.CheckBox[@text="${symptom}"]`);
        if (await checkBox.isExisting()) {
            await checkBox.click();
            console.log(`   ✔ Symptom applied: [${symptom}]`);
            await driver.pause(300);
        } else {
            console.warn(`   ⚠️ Symptom checkbox target text not found: "${symptom}"`);
        }
    }
}

async function selectEyeAffected(driver, eyeSide) {
    console.log(`📝 Picking eye affected option path: "${eyeSide}"...`);
    await scrollToText(driver, "Eye Affected");

    const radioBtn = await driver.$(`//android.widget.RadioButton[@text="${eyeSide}"]`);
    await radioBtn.waitForDisplayed({ timeout: 5000 });
    await radioBtn.click();
}

async function selectReferToOption(driver, facilityType) {
    console.log(`📝 Processing list dialog selection field for: "${facilityType}"...`);
    await scrollToText(driver, "Select refer to");

    const dropDownField = await driver.$('//android.widget.EditText[@hint="Select refer to"]');
    await dropDownField.waitForDisplayed({ timeout: 5000 });
    await dropDownField.click();
    await driver.pause(1000);

    const itemSelection = await driver.$(`//android.widget.TextView[@resource-id="android:id/text1" and @text="${facilityType}"]`);
    await itemSelection.waitForDisplayed({ timeout: 5000 });
    await itemSelection.click();
    await driver.pause(1000);
}

async function selectFollowUpStatus(driver, statusText) {
    console.log(`📝 Processing follow-up dialog window choice: "${statusText}"...`);
    await scrollToText(driver, "Follow-up Status");

    const dropDownField = await driver.$('//android.widget.EditText[@hint="Select status"]');
    await dropDownField.waitForDisplayed({ timeout: 5000 });
    await dropDownField.click();
    await driver.pause(1000);

    const itemSelection = await driver.$(`//android.widget.TextView[@resource-id="android:id/text1" and @text="${statusText}"]`);
    await itemSelection.waitForDisplayed({ timeout: 5000 });
    await itemSelection.click();
    await driver.pause(1000);
}

async function setDateOfSurgery(driver, dateObj) {
    const { day, month, year } = dateObj;
    console.log(`📅 Mapping calendar Date of Surgery to: ${day}-${month}-${year}...`);
    await scrollToText(driver, "Date of Surgery");

    const dateField = await driver.$('//android.widget.EditText[@hint="Select date of surgery"]');
    await dateField.waitForDisplayed({ timeout: 5000 });
    await dateField.click();
    await driver.pause(1000);

    await navigateCalendarToMonth(driver, month, year);
    await driver.pause(500);

    const paddedDay  = String(day).padStart(2, '0');
    const monthName  = MONTH_NAMES[month];
    const targetDesc = `${paddedDay} ${monthName} ${year}`;

    const dayCell = await driver.$(`//android.view.View[@content-desc="${targetDesc}"]`);
    await dayCell.waitForDisplayed({ timeout: 5000 });
    await dayCell.click();
    await driver.pause(500);

    const okBtn = await driver.$('//*[@text="OK" or @resource-id="android:id/button1"]');
    await okBtn.click();
    await driver.pause(1500);
}

async function triggerImageUploadProcess(driver) {
    console.log("📸 Invoking file attachment logic streams...");
    await scrollToText(driver, "PICK IMAGE");

    const pickImageBtn = await driver.$('//android.widget.Button[@text="PICK IMAGE"]');
    await pickImageBtn.waitForDisplayed({ timeout: 5000 });
    await pickImageBtn.click();
    await driver.pause(1500);

    console.log("🔍 Tapping default repository link wrapper to launch interface controller...");
    const chooseFileOption = await driver.$('//android.widget.TextView[@resource-id="android:id/text1" and contains(@text, "Choose File")]');

    await chooseFileOption.waitForDisplayed({ timeout: 5000 });
    await chooseFileOption.click();

    console.log("⏳ Manual file selection state entered. Holding execution channel safely for 1 minute...");
    await driver.pause(60000);
    console.log("⏳ Pause sequence completed.");
}

async function processFinalFormSubmission(driver) {
    console.log("🚀 Pushing finalized record structures down execution line...");
    const submitBtn = await driver.$('//android.widget.Button[@text="SUBMIT" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnSave"]');
    await submitBtn.waitForDisplayed({ timeout: 5000 });
    await submitBtn.click();
    console.log("✔ Submission step successfully processed.");
}

// ==========================================
// 4. MASTER COMPILER FUNCTION
// ==========================================

async function executeCataractSurgeryWorkflow(driver, dataConfig) {
    console.log("📝 Initialization sequence for Cataract Surgery reporting framework active...");

    await navigateToAllBeneficiaries(driver);
    await scrollAndOpenCataractModule(driver, dataConfig.patientName.toUpperCase());

    await selectMultipleSymptoms(driver, dataConfig.symptomsList);
    await selectEyeAffected(driver, dataConfig.eyeSelection);
    await selectReferToOption(driver, dataConfig.referralDestination);
    await selectFollowUpStatus(driver, dataConfig.followUpStatus);
    await setDateOfSurgery(driver, dataConfig.surgeryDate);

    await triggerImageUploadProcess(driver);
    await processFinalFormSubmission(driver);
}

// ==========================================
// MAIN RUN ENGINE
// ==========================================

async function runTest() {
    const driver = await remote(wdOpts);

    const inputParameters = {
        patientName: "AMITHA SINGH",
        symptomsList: ["Blurred Vision", "White/Gray Spot in Eye"],
        eyeSelection: "Both",
        referralDestination: "Govt Public Facility",
        followUpStatus: "Surgery Done",
        surgeryDate: { day: 12, month: 6, year: 2026 }
    };

    try {
        await driver.pause(3000);

        await executeCataractSurgeryWorkflow(driver, inputParameters);

        await driver.pause(3000);
        console.log("✅ Cataract surgery registration module processed entirely without error blocks!");

    } catch (error) {
        console.error("❌ Execution terminated natively via driver block error:", error.message);
    } finally {
        if (driver) {
            await driver.deleteSession();
        }
    }
}

runTest();