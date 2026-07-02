const { remote } = require("webdriverio");
const { selectLanguage, login } = require("../../steps/loginSteps");
const { selectVillage } = require("../../steps/villageSteps");
const { clickAllHousehold, clickNewHouseholdRegistration, acceptConsent } = require("../../steps/householdSteps");
const { fillHouseholdFormWithExamples } = require("../../steps/householdFormSteps");
const { fillHeadOfFamilyFormWithExamples } = require("../../steps/headOfFamilySteps");

// ==========================================
// CALENDAR / SCROLL HELPERS (from cataractSurgery.js)
// ==========================================

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

async function scrollToText(driver, textToFind) {
    try {
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${textToFind}"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 });
    } catch (e) { /* already visible */ }
    await driver.pause(500);
}

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
        if (curTotal > tgtTotal) await prevBtn.click();
        else await swipeHorizontalCalendar(driver, 'left');
        await driver.pause(600);
    }
}

// ==========================================
// RANDOM DATA GENERATORS
// ==========================================

function generateRandomWoman() {
    const firstNames = ["Anjali", "Priya", "Sunita", "Kavita", "Lakshmi", "Meena", "Sita", "Geeta", "Radha"];
    const lastNames  = ["Sharma", "Verma", "Reddy", "Patel", "Singh", "Das", "Rao"];
    return {
        firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
        lastName:  lastNames[Math.floor(Math.random() * lastNames.length)]
    };
}

function generateRandomMan() {
    const firstNames = ["Rahul", "Amit", "Raj", "Vikram", "Sanjay", "Anil", "Sunil", "Ravi", "Mohan"];
    const lastNames  = ["Sharma", "Verma", "Reddy", "Patel", "Singh", "Das", "Rao"];
    return {
        firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
        lastName:  lastNames[Math.floor(Math.random() * lastNames.length)]
    };
}

function generateRandomMaritalStatus() {
    const statuses = ['Unmarried', 'Married', 'Divorced', 'Separated', 'Widower'];
    return statuses[Math.floor(Math.random() * statuses.length)];
}

// ==========================================
// NAVIGATION HELPERS
// ==========================================

async function goToHome(driver) {
    console.log("🏠 Navigating back to Home screen...");
    const homeBtn = await driver.$('//android.widget.Button[@content-desc="Go to Home" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/toolbar_menu_home"]');
    await homeBtn.waitForDisplayed({ timeout: 10000 });
    await homeBtn.click();
    await driver.pause(3000);
    console.log("✅ Arrived at Home screen.");
}

async function goToAllBeneficiaries(driver) {
    console.log("📋 Clicking 'All Beneficiaries' module on Home screen...");
    // The card on the home dashboard containing text "Beneficiaries"
    const allBenCard = await driver.$(
        '//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_icon" and .//android.widget.TextView[contains(@text, "Beneficiaries")]]'
    );
    await allBenCard.waitForDisplayed({ timeout: 10000 });
    await allBenCard.click();
    await driver.pause(3000);
    console.log("✅ Opened All Beneficiaries screen.");
}

// ==========================================
// SEARCH → SELECT → CATARACT SURGERY FLOW
// ==========================================

/**
 * Searches for a beneficiary using the first half of their firstName,
 * then clicks the matching full-name result, then clicks "Cataract Surgery".
 */
async function searchAndOpenCataractSurgery(driver, firstName, lastName) {
    const fullName = `${firstName} ${lastName}`.toUpperCase();
    // Use only the first half of the first name as the search term
    const halfName = firstName.substring(0, Math.ceil(firstName.length / 2));

    console.log(`\n🔎 Searching for beneficiary with half-name: "${halfName}"...`);

    // Click the search bar and type the half name
    const searchBar = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
    await searchBar.waitForDisplayed({ timeout: 10000 });
    await searchBar.click();
    await driver.pause(500);
    await searchBar.clearValue();
    await searchBar.setValue(halfName);
    await driver.pause(2000); // Wait for results to filter

    console.log(`✅ Typed "${halfName}" in search bar. Now locating card for: "${fullName}"...`);

    // Find the "Cataract Surgery" button (btn_above_30) inside the card (contentLayout)
    // whose title TextView (tv_hh_id) matches the full name exactly.
    // XPath: walk up from tv_hh_id to contentLayout, then down into ll_ben_details_4 > btn_above_30
    const cataractBtnXPath =
        `//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id" and @text="${fullName}"]` +
        `/ancestor::android.view.ViewGroup[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/contentLayout"]` +
        `//android.widget.LinearLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/ll_ben_details_4"]` +
        `//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_above_30" and @text="Cataract Surgery"]`;

    const cataractBtn = await driver.$(cataractBtnXPath);
    await cataractBtn.waitForDisplayed({ timeout: 10000 });
    await cataractBtn.click();
    console.log(`✅ Clicked 'Cataract Surgery' button on card for "${fullName}".`);
    await driver.pause(2000);

    // Tap "ADD" to open a new cataract surgery record
    const addBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnAction" and @text="ADD"]');
    await addBtn.waitForDisplayed({ timeout: 8000 });
    await addBtn.click();
    await driver.pause(2000);
    console.log("✅ Opened new Cataract Surgery form.");
}

// ==========================================
// CATARACT FORM FIELD HELPERS
// ==========================================

async function selectMultipleSymptoms(driver, symptomsArray) {
    console.log("📝 Selecting symptoms...");
    await scrollToText(driver, "Symptoms Observed");
    for (const symptom of symptomsArray) {
        const checkBox = await driver.$(`//android.widget.CheckBox[@text="${symptom}"]`);
        if (await checkBox.isExisting()) {
            await checkBox.click();
            console.log(`   ✔ Symptom: [${symptom}]`);
            await driver.pause(300);
        } else {
            console.warn(`   ⚠️ Symptom not found: "${symptom}"`);
        }
    }
}

async function selectEyeAffected(driver, eyeSide) {
    console.log(`📝 Selecting eye affected: "${eyeSide}"...`);
    await scrollToText(driver, "Eye Affected");
    const radioBtn = await driver.$(`//android.widget.RadioButton[@text="${eyeSide}"]`);
    await radioBtn.waitForDisplayed({ timeout: 5000 });
    await radioBtn.click();
}

async function selectReferToOption(driver, facilityType) {
    console.log(`📝 Selecting 'Refer To': "${facilityType}"...`);
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
    console.log(`📝 Selecting Follow-up Status: "${statusText}"...`);
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
    console.log(`📅 Setting Date of Surgery: ${day}-${month}-${year}...`);
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
    const dayCell    = await driver.$(`//android.view.View[@content-desc="${targetDesc}"]`);
    await dayCell.waitForDisplayed({ timeout: 5000 });
    await dayCell.click();
    await driver.pause(500);

    const okBtn = await driver.$('//*[@text="OK" or @resource-id="android:id/button1"]');
    await okBtn.click();
    await driver.pause(1500);
}

async function triggerImageUpload(driver) {
    console.log("📸 Handling image upload...");
    await scrollToText(driver, "PICK IMAGE");
    const pickImageBtn = await driver.$('//android.widget.Button[@text="PICK IMAGE"]');
    await pickImageBtn.waitForDisplayed({ timeout: 5000 });
    await pickImageBtn.click();
    await driver.pause(1500);

    const chooseFileOption = await driver.$('//android.widget.TextView[@resource-id="android:id/text1" and contains(@text, "Choose File")]');
    await chooseFileOption.waitForDisplayed({ timeout: 5000 });
    await chooseFileOption.click();

    console.log("⏳ Waiting 60s for manual file selection...");
    await driver.pause(60000);
    console.log("⏳ Image upload wait complete.");
}

async function submitCataractForm(driver) {
    console.log("🚀 Submitting Cataract Surgery form...");
    const submitBtn = await driver.$('//android.widget.Button[@text="SUBMIT" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnSave"]');
    await submitBtn.waitForDisplayed({ timeout: 5000 });
    await submitBtn.click();
    console.log("✅ Form submitted.");
    await driver.pause(3000);
}

/**
 * Full cataract surgery form fill for a single beneficiary.
 * Assumes the form is already open (ADD was just tapped).
 */
async function fillCataractForm(driver, formData) {
    await selectMultipleSymptoms(driver, formData.symptomsList);
    await selectEyeAffected(driver, formData.eyeSelection);
    await selectReferToOption(driver, formData.referralDestination);
    await selectFollowUpStatus(driver, formData.followUpStatus);
    await setDateOfSurgery(driver, formData.surgeryDate);
    await triggerImageUpload(driver);
    await submitCataractForm(driver);
}

// ==========================================
// MAIN
// ==========================================

async function main() {
    const driver = await remote({
        protocol: "http",
        hostname: "localhost",
        port: 4723,
        path: "/",
        capabilities: {
            platformName: "Android",
            "appium:deviceName": "ZD222X4TDK",
            "appium:automationName": "UiAutomator2",
            "appium:appPackage": "org.piramalswasthya.sakhi.saksham.uat",
            "appium:appActivity": "org.piramalswasthya.sakhi.ui.login_activity.LoginActivity",
            "appium:noReset": false,
            "appium:autoGrantPermissions": true,
            "appium:newCommandTimeout": 300,
            "appium:language": "en",
            "appium:locale": "US",
        }
    });

    console.log("✅ App launched successfully!");

    // Cataract form data (same for both beneficiaries; adjust if needed)
    const cataractFormData = {
        symptomsList:        ["Blurred Vision", "White/Gray Spot in Eye"],
        eyeSelection:        "Both",
        referralDestination: "Govt Public Facility",
        followUpStatus:      "Surgery Done",
        surgeryDate:         { day: 12, month: 6, year: 2026 }
    };

    try {
        // ── Login & village selection ────────────────────────────────────────
        await selectLanguage(driver, "English");
        await login(driver, "Bobita", "Test@123");
        await driver.pause(5000);
        await selectVillage(driver, "Oating");
        await driver.pause(2000);

        // ================================================================
        // REGISTRATION 1: WOMAN (40+)
        // ================================================================
        console.log("\n==========================================");
        console.log("▶️ STARTING REGISTRATION 1: WOMAN");
        console.log("==========================================");

        await clickAllHousehold(driver);
        await clickNewHouseholdRegistration(driver);
        await acceptConsent(driver);

        const womanData         = generateRandomWoman();
        const womanMaritalStatus = generateRandomMaritalStatus();
        console.log(`🎲 Woman Profile: ${womanData.firstName} ${womanData.lastName} [${womanMaritalStatus}]`);

        await fillHouseholdFormWithExamples(driver, { firstName: womanData.firstName, lastName: womanData.lastName });
        await driver.pause(3000);
        await fillHeadOfFamilyFormWithExamples(driver, womanMaritalStatus, "Female");
        console.log("🎉 Woman Registration completed!");
        await driver.pause(4000);

        // ================================================================
        // REGISTRATION 2: MAN (40+)
        // ================================================================
        console.log("\n==========================================");
        console.log("▶️ STARTING REGISTRATION 2: MAN");
        console.log("==========================================");

        await clickAllHousehold(driver);
        await clickNewHouseholdRegistration(driver);
        await acceptConsent(driver);

        const manData         = generateRandomMan();
        const manMaritalStatus = generateRandomMaritalStatus();
        console.log(`🎲 Man Profile: ${manData.firstName} ${manData.lastName} [${manMaritalStatus}]`);

        await fillHouseholdFormWithExamples(driver, { firstName: manData.firstName, lastName: manData.lastName });
        await driver.pause(3000);
        await fillHeadOfFamilyFormWithExamples(driver, manMaritalStatus, "Male");
        console.log("🎉 Man Registration completed!");
        await driver.pause(4000);

        // ── Summary ──────────────────────────────────────────────────────
        console.log("\n📋 ================= SUMMARY =================");
        console.log(`👩 First Registration (Woman): ${womanData.firstName} ${womanData.lastName} [${womanMaritalStatus}]`);
        console.log(`👨 Second Registration (Man) : ${manData.firstName} ${manData.lastName} [${manMaritalStatus}]`);
        console.log("==============================================\n");

        // ================================================================
        // CATARACT SURGERY – WOMAN
        // ================================================================
        console.log("\n==========================================");
        console.log("▶️ CATARACT SURGERY FOR WOMAN");
        console.log("==========================================");

        // Navigate to All Beneficiaries from wherever we are
        await goToAllBeneficiaries(driver);

        // Search with half first name → click full name → open cataract form
        await searchAndOpenCataractSurgery(driver, womanData.firstName, womanData.lastName);

        // Fill and submit the cataract surgery form
        await fillCataractForm(driver, cataractFormData);
        console.log(`🎉 Cataract Surgery form submitted for ${womanData.firstName} ${womanData.lastName}!`);

        // Go back to home
        await goToHome(driver);

        // ================================================================
        // CATARACT SURGERY – MAN
        // ================================================================
        console.log("\n==========================================");
        console.log("▶️ CATARACT SURGERY FOR MAN");
        console.log("==========================================");

        // Navigate to All Beneficiaries again
        await goToAllBeneficiaries(driver);

        // Search with half first name → click full name → open cataract form
        await searchAndOpenCataractSurgery(driver, manData.firstName, manData.lastName);

        // Fill and submit the cataract surgery form
        await fillCataractForm(driver, cataractFormData);
        console.log(`🎉 Cataract Surgery form submitted for ${manData.firstName} ${manData.lastName}!`);

        console.log("\n✅ All registrations and cataract surgery forms completed successfully!");

    } catch (error) {
        console.error("❌ Test failed:", error);
        try {
            const screenshot = await driver.takeScreenshot();
            const fs = require('fs');
            fs.writeFileSync(`error-dual-reg-cataract-${Date.now()}.png`, screenshot, 'base64');
            console.log("📸 Screenshot saved for debugging.");
        } catch (screenshotError) {
            console.error("Could not take screenshot:", screenshotError);
        }
    } finally {
        await driver.pause(5000);
        if (driver) {
            await driver.deleteSession();
        }
    }
}

main().catch(err => {
    console.error("❌ Main function failed:", err);
});