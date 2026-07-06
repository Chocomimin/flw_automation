const { selectLanguage, login } = require("../../steps/loginSteps");
const { selectVillage } = require("../../steps/villageSteps");
const { clickAllHousehold, clickNewHouseholdRegistration, acceptConsent } = require("../../steps/householdSteps");
const { fillHouseholdFormWithExamples } = require("../../steps/householdFormSteps");
const { fillHeadOfFamilyFormWithExamples } = require("../../steps/headOfFamilySteps");

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

async function scrollToText(browserInstance, textToFind) {
    try {
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${textToFind}"))`;
        await browserInstance.$(scrollSelector).waitForExist({ timeout: 3000 });
    } catch (e) { }
    await browserInstance.pause(500);
}

async function getCalendarMonthYear(browserInstance) {
    try {
        const cells = await browserInstance.$$('//android.view.View[@resource-id="android:id/month_view"]/android.view.View');
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

async function swipeHorizontalCalendar(browserInstance, direction) {
    const size   = await browserInstance.getWindowRect();
    const startX = direction === 'left' ? Math.floor(size.width * 0.80) : Math.floor(size.width * 0.20);
    const endX   = direction === 'left' ? Math.floor(size.width * 0.20) : Math.floor(size.width * 0.80);
    const midY   = Math.floor(size.height * 0.50);

    await browserInstance.performActions([{
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
    await browserInstance.releaseActions();
    await browserInstance.pause(800);
}

async function swipeVerticalInsidePopup(browserInstance, direction) {
    const size = await browserInstance.getWindowRect();
    const startX = Math.floor(size.width / 2);
    const topY = Math.floor(size.height * 0.40);
    const bottomY = Math.floor(size.height * 0.60);
    const startY = direction === 'down' ? topY : bottomY;
    const endY   = direction === 'down' ? bottomY : topY;

    await browserInstance.performActions([{
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
    await browserInstance.releaseActions();
    await browserInstance.pause(600);
}

async function navigateCalendarToMonth(browserInstance, targetMonth, targetYear) {
    const yearHeader = await browserInstance.$('//android.widget.TextView[@resource-id="android:id/date_picker_header_year"]');
    await yearHeader.waitForDisplayed({ timeout: 5000 });
    const currentYear = parseInt(await yearHeader.getText(), 10);

    if (currentYear !== targetYear) {
        await yearHeader.click();
        await browserInstance.pause(1000);
        let yearFound = false;
        const yearXpath = `//android.widget.TextView[@text="${targetYear}"]`;
        const swipeDir = targetYear < currentYear ? 'down' : 'up';

        for (let i = 0; i < 40; i++) {
            const yearEl = await browserInstance.$(yearXpath);
            if (await yearEl.isDisplayed().catch(() => false)) {
                yearFound = true;
                await yearEl.click();
                break;
            }
            await swipeVerticalInsidePopup(browserInstance, swipeDir);
        }
        if (!yearFound) throw new Error(`Year ${targetYear} not found after scrolling.`);
        await browserInstance.pause(1000);
    }

    const prevBtn = await browserInstance.$('//android.widget.ImageButton[@resource-id="android:id/prev"]');
    for (let i = 0; i < 36; i++) {
        const cur = await getCalendarMonthYear(browserInstance);
        if (!cur) break;
        const curTotal = cur.year * 12 + cur.month;
        const tgtTotal = targetYear * 12 + targetMonth;
        if (curTotal === tgtTotal) break;
        if (curTotal > tgtTotal) await prevBtn.click();
        else await swipeHorizontalCalendar(browserInstance, 'left');
        await browserInstance.pause(600);
    }
}

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

async function goToHome(browserInstance) {
    console.log("🏠 Navigating back to Home screen...");
    const homeBtn = await browserInstance.$('//android.widget.Button[@content-desc="Go to Home" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/toolbar_menu_home"]');
    await homeBtn.waitForDisplayed({ timeout: 10000 });
    await homeBtn.click();
    await browserInstance.pause(3000);
    console.log("✅ Arrived at Home screen.");
}

async function goToAllBeneficiaries(browserInstance) {
    console.log("📋 Clicking 'All Beneficiaries' module on Home screen...");
    const allBenCard = await browserInstance.$(
        '//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_icon" and .//android.widget.TextView[contains(@text, "Beneficiaries")]]'
    );
    await allBenCard.waitForDisplayed({ timeout: 10000 });
    await allBenCard.click();
    await browserInstance.pause(3000);
    console.log("✅ Opened All Beneficiaries screen.");
}

async function searchAndOpenCataractSurgery(browserInstance, firstName, lastName) {
    const fullName = `${firstName} ${lastName}`.toUpperCase();
    const halfName = firstName.substring(0, Math.ceil(firstName.length / 2));

    console.log(`\n🔎 Searching for beneficiary with half-name: "${halfName}"...`);

    const searchBar = await browserInstance.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
    await searchBar.waitForDisplayed({ timeout: 10000 });
    await searchBar.click();
    await browserInstance.pause(500);
    await searchBar.clearValue();
    await searchBar.setValue(halfName);
    await browserInstance.pause(2000);

    console.log(`✅ Typed "${halfName}" in search bar. Now locating card for: "${fullName}"...`);

    const cataractBtnXPath =
        `//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id" and @text="${fullName}"]` +
        `/ancestor::android.view.ViewGroup[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/contentLayout"]` +
        `//android.widget.LinearLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/ll_ben_details_4"]` +
        `//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_above_30" and @text="Cataract Surgery"]`;

    const cataractBtn = await browserInstance.$(cataractBtnXPath);
    await cataractBtn.waitForDisplayed({ timeout: 10000 });
    await cataractBtn.click();
    console.log(`✅ Clicked 'Cataract Surgery' button on card for "${fullName}".`);
    await browserInstance.pause(2000);

    const addBtn = await browserInstance.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnAction" and @text="ADD"]');
    await addBtn.waitForDisplayed({ timeout: 8000 });
    await addBtn.click();
    await browserInstance.pause(2000);
    console.log("✅ Opened new Cataract Surgery form.");
}

async function selectMultipleSymptoms(browserInstance, symptomsArray) {
    console.log("📝 Selecting symptoms...");
    await scrollToText(browserInstance, "Symptoms Observed");
    for (const symptom of symptomsArray) {
        const checkBox = await browserInstance.$(`//android.widget.CheckBox[@text="${symptom}"]`);
        if (await checkBox.isExisting()) {
            await checkBox.click();
            console.log(`   ✔ Symptom: [${symptom}]`);
            await browserInstance.pause(300);
        } else {
            console.warn(`   ⚠️ Symptom not found: "${symptom}"`);
        }
    }
}

async function selectEyeAffected(browserInstance, eyeSide) {
    console.log(`📝 Selecting eye affected: "${eyeSide}"...`);
    await scrollToText(browserInstance, "Eye Affected");
    const radioBtn = await browserInstance.$(`//android.widget.RadioButton[@text="${eyeSide}"]`);
    await radioBtn.waitForDisplayed({ timeout: 5000 });
    await radioBtn.click();
}

async function selectReferToOption(browserInstance, facilityType) {
    console.log(`📝 Selecting 'Refer To': "${facilityType}"...`);
    await scrollToText(browserInstance, "Select refer to");
    const dropDownField = await browserInstance.$('//android.widget.EditText[@hint="Select refer to"]');
    await dropDownField.waitForDisplayed({ timeout: 5000 });
    await dropDownField.click();
    await browserInstance.pause(1000);
    const itemSelection = await browserInstance.$(`//android.widget.TextView[@resource-id="android:id/text1" and @text="${facilityType}"]`);
    await itemSelection.waitForDisplayed({ timeout: 5000 });
    await itemSelection.click();
    await browserInstance.pause(1000);
}

async function selectFollowUpStatus(browserInstance, statusText) {
    console.log(`📝 Selecting Follow-up Status: "${statusText}"...`);
    await scrollToText(browserInstance, "Follow-up Status");
    const dropDownField = await browserInstance.$('//android.widget.EditText[@hint="Select status"]');
    await dropDownField.waitForDisplayed({ timeout: 5000 });
    await dropDownField.click();
    await browserInstance.pause(1000);
    const itemSelection = await browserInstance.$(`//android.widget.TextView[@resource-id="android:id/text1" and @text="${statusText}"]`);
    await itemSelection.waitForDisplayed({ timeout: 5000 });
    await itemSelection.click();
    await browserInstance.pause(1000);
}

async function setDateOfSurgery(browserInstance, dateObj) {
    const { day, month, year } = dateObj;
    console.log(`📅 Setting Date of Surgery: ${day}-${month}-${year}...`);
    await scrollToText(browserInstance, "Date of Surgery");
    const dateField = await browserInstance.$('//android.widget.EditText[@hint="Select date of surgery"]');
    await dateField.waitForDisplayed({ timeout: 5000 });
    await dateField.click();
    await browserInstance.pause(1000);

    await navigateCalendarToMonth(browserInstance, month, year);
    await browserInstance.pause(500);

    const paddedDay  = String(day).padStart(2, '0');
    const monthName  = MONTH_NAMES[month];
    const targetDesc = `${paddedDay} ${monthName} ${year}`;
    const dayCell    = await browserInstance.$(`//android.view.View[@content-desc="${targetDesc}"]`);
    await dayCell.waitForDisplayed({ timeout: 5000 });
    await dayCell.click();
    await browserInstance.pause(500);

    const okBtn = await browserInstance.$('//*[@text="OK" or @resource-id="android:id/button1"]');
    await okBtn.click();
    await browserInstance.pause(1500);
}

async function triggerImageUpload(browserInstance) {
    console.log("📸 Handling image upload...");
    await scrollToText(browserInstance, "PICK IMAGE");
    const pickImageBtn = await browserInstance.$('//android.widget.Button[@text="PICK IMAGE"]');
    await pickImageBtn.waitForDisplayed({ timeout: 5000 });
    await pickImageBtn.click();
    await browserInstance.pause(1500);

    const chooseFileOption = await browserInstance.$('//android.widget.TextView[@resource-id="android:id/text1" and contains(@text, "Choose File")]');
    await chooseFileOption.waitForDisplayed({ timeout: 5000 });
    await chooseFileOption.click();

    console.log("⏳ Waiting 60s for manual file selection...");
    await browserInstance.pause(60000);
    console.log("⏳ Image upload wait complete.");
}

async function submitCataractForm(browserInstance) {
    console.log("🚀 Submitting Cataract Surgery form...");
    const submitBtn = await browserInstance.$('//android.widget.Button[@text="SUBMIT" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnSave"]');
    await submitBtn.waitForDisplayed({ timeout: 5000 });
    await submitBtn.click();
    console.log("✅ Form submitted.");
    await browserInstance.pause(3000);
}

async function fillCataractForm(browserInstance, formData) {
    await selectMultipleSymptoms(browserInstance, formData.symptomsList);
    await selectEyeAffected(browserInstance, formData.eyeSelection);
    await selectReferToOption(browserInstance, formData.referralDestination);
    await selectFollowUpStatus(browserInstance, formData.followUpStatus);
    await setDateOfSurgery(browserInstance, formData.surgeryDate);
    await triggerImageUpload(browserInstance);
    await submitCataractForm(browserInstance);
}

describe('Beneficiary Registration - Cataract Surgery', function () {

    // ✅ Explicitly setting timeout to 15 minutes
    this.timeout(900000);

    const cataractFormData = {
        symptomsList:        ["Blurred Vision", "White/Gray Spot in Eye"],
        eyeSelection:        "Both",
        referralDestination: "Govt Public Facility",
        followUpStatus:      "Surgery Done",
        surgeryDate:         { day: 12, month: 6, year: 2026 }
    };

    it('(Qase ID: 1342) - Verify Cataract Surgery button visibility and successful Cataract Surgery form submission for eligible beneficiaries aged 40 years and above', async () => {

        await selectLanguage(browser, "English");
        await login(browser, "Bobita", "Test@123");
        await browser.pause(5000);
        await selectVillage(browser, "Oating");
        await browser.pause(2000);

        console.log("\n==========================================");
        console.log("▶️ STARTING REGISTRATION 1: WOMAN");
        console.log("==========================================");

        await clickAllHousehold(browser);
        await clickNewHouseholdRegistration(browser);
        await acceptConsent(browser);

        const womanData         = generateRandomWoman();
        const womanMaritalStatus = generateRandomMaritalStatus();
        console.log(`🎲 Woman Profile: ${womanData.firstName} ${womanData.lastName} [${womanMaritalStatus}]`);

        await fillHouseholdFormWithExamples(browser, { firstName: womanData.firstName, lastName: womanData.lastName });
        await browser.pause(3000);
        await fillHeadOfFamilyFormWithExamples(browser, womanMaritalStatus, "Female");
        console.log("🎉 Woman Registration completed!");
        await browser.pause(4000);

        console.log("\n==========================================");
        console.log("▶️ STARTING REGISTRATION 2: MAN");
        console.log("==========================================");

        await clickAllHousehold(browser);
        await clickNewHouseholdRegistration(browser);
        await acceptConsent(browser);

        const manData         = generateRandomMan();
        const manMaritalStatus = generateRandomMaritalStatus();
        console.log(`🎲 Man Profile: ${manData.firstName} ${manData.lastName} [${manMaritalStatus}]`);

        await fillHouseholdFormWithExamples(browser, { firstName: manData.firstName, lastName: manData.lastName });
        await browser.pause(3000);
        await fillHeadOfFamilyFormWithExamples(browser, manMaritalStatus, "Male");
        console.log("🎉 Man Registration completed!");
        await browser.pause(4000);

        console.log("\n📋 ================= SUMMARY =================");
        console.log(`👩 First Registration (Woman): ${womanData.firstName} ${womanData.lastName} [${womanMaritalStatus}]`);
        console.log(`👨 Second Registration (Man) : ${manData.firstName} ${manData.lastName} [${manMaritalStatus}]`);
        console.log("==============================================\n");

        console.log("\n==========================================");
        console.log("▶️ CATARACT SURGERY FOR WOMAN");
        console.log("==========================================");

        await goToAllBeneficiaries(browser);
        await searchAndOpenCataractSurgery(browser, womanData.firstName, womanData.lastName);
        await fillCataractForm(browser, cataractFormData);
        console.log(`🎉 Cataract Surgery form submitted for ${womanData.firstName} ${womanData.lastName}!`);

        await goToHome(browser);

        console.log("\n==========================================");
        console.log("▶️ CATARACT SURGERY FOR MAN");
        console.log("==========================================");

        await goToAllBeneficiaries(browser);
        await searchAndOpenCataractSurgery(browser, manData.firstName, manData.lastName);
        await fillCataractForm(browser, cataractFormData);
        console.log(`🎉 Cataract Surgery form submitted for ${manData.firstName} ${manData.lastName}!`);

        console.log("\n✅ All registrations and cataract surgery forms completed successfully!");
    });
});