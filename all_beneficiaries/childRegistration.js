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
// 1. SCROLLING, UI & TEXT HELPERS
// ==========================================

function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

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
// 3. REGISTRATION STEPS
// ==========================================

async function navigateToAllBeneficiaries(driver) {
    console.log("🔍 Navigating to 'All Beneficiaries'...");
    const allBenBtn = await driver.$('android=new UiSelector().textContains("Beneficiaries").resourceId("org.piramalswasthya.sakhi.saksham.uat:id/textView2")');
    await allBenBtn.waitForDisplayed({ timeout: 10000 });
    await allBenBtn.click();
    await driver.pause(3000);
}

async function scrollAndClickRegisterChildren(driver, targetName) {
    console.log(`🔍 Scrolling main list to find: "${targetName}"...`);
    const scrollSelector = `android=new UiScrollable(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/rv_any")).setMaxSearchSwipes(30).scrollIntoView(new UiSelector().text("${targetName}"))`;
    await driver.$(scrollSelector).waitForExist({ timeout: 10000 });
    await driver.pause(1000);

    const specificBtnXPath = `//android.widget.TextView[@text="${targetName}"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_add_children"]`;
    const childrenBtn = await driver.$(specificBtnXPath);
    await childrenBtn.waitForDisplayed({ timeout: 5000 });
    await childrenBtn.click();
    await driver.pause(2000);
}

async function handleConsentForm(driver) {
    const checkbox = await driver.$('//android.widget.CheckBox[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/checkBox"]');
    await checkbox.waitForDisplayed({ timeout: 8000 });
    await checkbox.click();
    const agreeBtn = await driver.$('//android.widget.Button[@text="AGREE" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_positive"]');
    await agreeBtn.click();
    await driver.pause(2000);
}

async function fillNumberOfChildren(driver, numberOfChildren) {
    await scrollToText(driver, "No. of Live Children");
    const numInput = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/etNumberInput"]');
    await numInput.waitForDisplayed({ timeout: 5000 });
    await numInput.click();
    await numInput.clearValue();
    await numInput.setValue(numberOfChildren.toString());
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
}

async function fillChildDetailsLoop(driver, childrenArray) {
    for (let i = 0; i < childrenArray.length; i++) {
        const childData = childrenArray[i];
        const childOrdinal = getOrdinal(i + 1); // e.g. "1st", "2nd"
        const sectionHeader = `Details of ${childOrdinal} Child`;

        console.log(`\n👶 Entering data for ${childOrdinal} Child: ${childData.name.toUpperCase()}`);

        // Ensure the entire section header is visible
        await scrollToText(driver, sectionHeader);

        // --- 1. Child Name ---
        const nameXPath = `//android.widget.TextView[@text="${sectionHeader}"]/ancestor::android.view.ViewGroup[1]/following-sibling::android.view.ViewGroup//android.widget.EditText[@hint="Child Name *"]`;
        const nameInput = await driver.$(nameXPath);
        await nameInput.waitForDisplayed({ timeout: 5000 });

        await nameInput.click();
        await driver.pause(500);
        // Force uppercase during text injection
        await nameInput.setValue(childData.name.toUpperCase());
        await driver.pause(500);

        if (await driver.isKeyboardShown()) await driver.hideKeyboard();

        // --- 2. Child DOB ---
        const dobHint = `${childOrdinal} Child Date of Birth *`;
        await scrollToText(driver, dobHint);
        const dobField = await driver.$(`//android.widget.EditText[@hint="${dobHint}"]`);
        await dobField.waitForDisplayed({ timeout: 5000 });
        await dobField.click();
        await driver.pause(1000);

        await navigateCalendarToMonth(driver, childData.dob.month, childData.dob.year);
        await driver.pause(500);

        const paddedDay  = String(childData.dob.day).padStart(2, '0');
        const monthName  = MONTH_NAMES[childData.dob.month];
        const targetDesc = `${paddedDay} ${monthName} ${childData.dob.year}`;

        const dayCell = await driver.$(`//android.view.View[@content-desc="${targetDesc}"]`);
        await dayCell.waitForDisplayed({ timeout: 5000 });
        await dayCell.click();
        await driver.pause(500);

        const okBtn = await driver.$('//*[@text="OK" or @resource-id="android:id/button1"]');
        await okBtn.click();
        await driver.pause(1000);

        // --- 3. Child Sex ---
        const sexLabel = `${childOrdinal} Child Sex *`;
        await scrollToText(driver, sexLabel);

        const sexRadioXPath = `//android.widget.TextView[@text="${sexLabel}"]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup//android.widget.RadioButton[@text="${childData.sex}"]`;
        const sexBtn = await driver.$(sexRadioXPath);
        await sexBtn.waitForDisplayed({ timeout: 5000 });
        await sexBtn.click();

        // --- 4. Gap field ---
        const gapScrollText = i === 0 ? "Gap between Date of marriage" : `Gap between ${getOrdinal(i)}`;
        await scrollToText(driver, gapScrollText);

        const gapXPath = `//android.widget.TextView[@text="${sectionHeader}"]/ancestor::android.view.ViewGroup[1]/following-sibling::android.view.ViewGroup//android.widget.EditText[contains(@hint, "Gap between")]`;
        const gapInput = await driver.$(gapXPath);
        await gapInput.waitForDisplayed({ timeout: 5000 });

        await gapInput.click();
        await driver.pause(500);
        await gapInput.setValue(childData.gap);
        await driver.pause(500);

        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    }
}

async function clickSubmit(driver) {
    console.log("🚀 Executing initial record submission...");
    await scrollToText(driver, "Submit");
    const firstSubmitBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]');
    await firstSubmitBtn.waitForDisplayed({ timeout: 5000 });
    await firstSubmitBtn.click();

    await driver.pause(1500);

    const finalSubmitBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnSubmitPreview"]');
    try {
        await finalSubmitBtn.waitForDisplayed({ timeout: 5000 });
        await finalSubmitBtn.click();
        console.log("✔ Final Preview SUBMIT button clicked. Registration complete.");
    } catch (error) {
        console.log("⚠️ No Preview Screen detected. Assuming direct submission success.");
    }
}

// ==========================================
// 4. MASTER EXECUTION
// ==========================================

async function registerChildrenDetails(driver, testData) {
    await navigateToAllBeneficiaries(driver);

    // Ensure target search name is uppercase
    await scrollAndClickRegisterChildren(driver, testData.targetSearchName.toUpperCase());

    await handleConsentForm(driver);
    await fillNumberOfChildren(driver, testData.childrenList.length);
    await fillChildDetailsLoop(driver, testData.childrenList);
    await clickSubmit(driver);
}

async function  registerChildrenDetails() {
    const driver = await remote(wdOpts);

    // --- Data Configuration Object ---
    // All inputs have been converted to uppercase for consistency
    const inputData = {
        targetSearchName: "MENA THAKUR",
        childrenList: [
            {
                name: "RAVI SINGH",
                dob: { day: 12, month: 6, year: 2011 },
                sex: "Male",
                gap: "2"
            },
            {
                name: "PRIYA SINGH",
                dob: { day: 5, month: 3, year: 2014 },
                sex: "Female",
                gap: "3"
            }
        ]
    };

    try {
        await driver.pause(3000);
        await registerChildrenDetails(driver, inputData);
        await driver.pause(3000);
        console.log("✅ Script finished successfully!");
    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        if (driver) await driver.deleteSession();
    }
}
module.exports ={ registerChildrenDetails}
 registerChildrenDetails();