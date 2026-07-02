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
        console.log(`↕️ Scrolling to find field: "${textToFind}"...`);
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${textToFind}"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 });
    } catch (e) {
        // Ignored if already on screen
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
// 3. STAGE STEPS
// ==========================================

async function navigateToAllBeneficiaries(driver) {
    console.log("🔍 Navigating to 'All Beneficiaries' from Dashboard...");
    // Using textContains avoids issues with the newline character inside the button
    const allBenBtn = await driver.$('android=new UiSelector().textContains("Beneficiaries").resourceId("org.piramalswasthya.sakhi.saksham.uat:id/textView2")');
    await allBenBtn.waitForDisplayed({ timeout: 10000 });
    await allBenBtn.click();
    console.log("✔ Clicked All Beneficiaries. Waiting for list to load...");
    await driver.pause(3000);
}

async function scrollAndClickRegisterSpouse(driver, targetName) {
    console.log(`🔍 Scrolling main list to find beneficiary: "${targetName}"...`);

    // 1. Scroll the RecyclerView until the specific name appears on screen
    const scrollSelector = `android=new UiScrollable(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/rv_any")).setMaxSearchSwipes(30).scrollIntoView(new UiSelector().text("${targetName}"))`;

    try {
        await driver.$(scrollSelector).waitForExist({ timeout: 10000 });
        console.log(`✔ Found beneficiary: "${targetName}" on screen.`);
    } catch (e) {
        throw new Error(`❌ Could not find beneficiary "${targetName}" in the list after scrolling.`);
    }

    await driver.pause(1000); // Allow UI to settle after fast scrolling

    // 2. Locate the button ONLY inside the card that belongs to this specific name
    const specificBtnXPath = `//android.widget.TextView[@text="${targetName}"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_add_spouse"]`;

    const spouseBtn = await driver.$(specificBtnXPath);
    await spouseBtn.waitForDisplayed({ timeout: 5000 });

    const btnText = await spouseBtn.getText();
    await spouseBtn.click();
    console.log(`✔ Clicked dynamic button: "${btnText}" specifically for ${targetName}`);
    await driver.pause(2000);
}

async function handleConsentForm(driver) {
    console.log("⏳ Waiting for Consent Form overlay layout window...");
    const checkbox = await driver.$('//android.widget.CheckBox[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/checkBox"]');
    await checkbox.waitForDisplayed({ timeout: 8000 });
    await checkbox.click();
    console.log("✔ Checked the Consent Confirmation item box.");

    const agreeBtn = await driver.$('//android.widget.Button[@text="AGREE" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_positive"]');
    await agreeBtn.click();
    console.log("✔ Clicked AGREE on registration confirmation.");
    await driver.pause(2000);
}

async function selectDateOfBirth(driver, dateObj) {
    const { day, month, year } = dateObj;
    console.log(`📅 Adjusting Date of Birth values to: ${day}-${month}-${year}...`);

    const dobField = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/et_date" and contains(@text, "Date of Birth")]');
    await dobField.waitForDisplayed({ timeout: 5000 });
    await dobField.click();
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
    console.log("✔ Calendar date configuration confirmed successfully.");
    await driver.pause(1500);
}

async function fillParentDetails(driver, fatherName, motherName) {
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();

    console.log("📝 Writing Father's Name...");
    await scrollToText(driver, "Father's Name");

    const fatherInput = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/et" and @hint="Father\'s Name"]');
    await fatherInput.waitForDisplayed({ timeout: 5000 });
    await fatherInput.setValue(fatherName);

    if (await driver.isKeyboardShown()) await driver.hideKeyboard();

    console.log("📝 Writing Mother's Name...");
    await scrollToText(driver, "Mother's Name");

    const motherInput = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/et" and @hint="Mother\'s Name"]');
    await motherInput.waitForDisplayed({ timeout: 5000 });
    await motherInput.setValue(motherName);

    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
}

async function clickSubmit(driver) {
    console.log("🚀 Executing initial record submission...");

    // 1. Scroll to and click the first Submit button on the main form
    await scrollToText(driver, "Submit");
    const firstSubmitBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]');
    await firstSubmitBtn.waitForDisplayed({ timeout: 5000 });
    await firstSubmitBtn.click();
    console.log("✔ Initial Submit clicked. Waiting for Preview screen...");

    await driver.pause(1500);

    // 2. Click the final SUBMIT button on the Preview overlay
    console.log("🔍 Locating final submit on Preview screen...");
    const finalSubmitBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnSubmitPreview"]');
    await finalSubmitBtn.waitForDisplayed({ timeout: 5000 });
    await finalSubmitBtn.click();
    console.log("✔ Final Preview SUBMIT button clicked. Registration complete.");
}

// ==========================================
// 4. MASTER EXECUTION WRAPPER
// ==========================================

async function registerSpouseDetails(driver, testData) {
    console.log(`📝 Starting registration flow for spouse...`);

    // 0. Click into the All Beneficiaries module from Dashboard
    await navigateToAllBeneficiaries(driver);

    // 1. Scroll main list and click Register Husband / Register Wife button on that specific card
    await scrollAndClickRegisterSpouse(driver, testData.targetSearchName);

    // 2. Deal with Consent pop up screen
    await handleConsentForm(driver);

    // 3. Select date on native picker overlay
    await selectDateOfBirth(driver, testData.dob);

    // 4. Fill text inputs fields
    await fillParentDetails(driver, testData.fatherName, testData.motherName);

    // 5. Finalize submission link
    await clickSubmit(driver);
}

// ==========================================
// MAIN RUN METHOD
// ==========================================

async function registerSpouseDetails() {
    const driver = await remote(wdOpts);

    // --- Data Configuration Object ---
    const inputData = {
        targetSearchName: "RANU SINGH", // The name to scroll to
        dob: { day: 12, month: 6, year: 2011 },
        fatherName: "RAHUL SINGH",
        motherName: "KIRAN DEVI"
    };

    try {
        await driver.pause(3000);

        // Execute the entire flow using the data object
        await registerSpouseDetails(driver, inputData);

        await driver.pause(3000);
        console.log("✅ Script finished processing successfully!");

    } catch (error) {
        console.error("❌ Test Script processing error:", error.message);
    } finally {
        if (driver) {
            await driver.deleteSession();
        }
    }
}
module.exports = { registerSpouseDetails };
registerSpouseDetails();