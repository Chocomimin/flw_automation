const { remote } = require('webdriverio');

// --- Constants & Data ---
const FORM_DATA = {
    // Add the MDSR Date here:
    mdsrDate: { day: 12, month: 3, year: 2026 },

    // You can add more MDSR fields here later (like Cause of Death, etc.)
};

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

const CALENDAR = {
    prevMonthBtn:  { x: 274, y: 924 },
    nextMonthBtn:  { x: 806, y: 924 },
    okBtn:         { x: 790, y: 1754 },
    cancelBtn:     { x: 610, y: 1754 },
    yearHeader:    { x: 280, y: 670 },
};

// ── W3C Actions Helpers ─────────────────────────────────────────
async function tapAt(driver, x, y) {
    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x, y },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerUp', button: 0 },
        ],
    }]);
    await driver.releaseActions();
}

async function swipeHorizontal(driver, direction) {
    const size = await driver.getWindowRect();
    const startX = direction === 'left' ? Math.floor(size.width * 0.8) : Math.floor(size.width * 0.2);
    const endX = direction === 'left' ? Math.floor(size.width * 0.2) : Math.floor(size.width * 0.8);
    const startY = Math.floor(size.height * 0.5);

    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: startX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerMove', duration: 500, x: endX, y: startY },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(1000);
}

async function scrollDownToText(driver, text, maxScrolls = 3) {
    const elementXPath = `//*[contains(@text, "${text}") or contains(@hint, "${text}")]`;
    for (let i = 0; i < maxScrolls; i++) {
        try {
            const element = await driver.$(elementXPath);
            if ((await element.isExisting()) && (await element.isDisplayed())) {
                return; // Element found, stop scrolling
            }
        } catch (e) { } // Keep scrolling

        const size = await driver.getWindowRect();
        const startX = Math.floor(size.width / 2);
        const startY = Math.floor(size.height * 0.70);
        const endY = Math.floor(size.height * 0.30);

        await driver.performActions([{
            type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: startX, y: startY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 100 },
                { type: 'pointerMove', duration: 600, x: startX, y: endY },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
        await driver.releaseActions();
        await driver.pause(1000);
    }
}

async function isEmpty(field, hintText) {
    try {
        const text = await field.getText();
        return !text || text.trim() === '' || text.trim() === hintText.trim();
    } catch { return true; }
}

// ── Calendar Helpers ──────────────────────────────────────────────────────────
async function getCalendarMonthYear(driver) {
    try {
        const dayElement = await driver.$('android=new UiSelector().text("15")');
        const contentDesc = await dayElement.getAttribute('content-desc');
        const parts = contentDesc.split(' ');
        return { month: MONTH_NAMES.indexOf(parts[1]), year: parseInt(parts[2]) };
    } catch (error) { return null; }
}

async function navigateToMonth(driver, targetMonth, targetYear) {
    const yearHeader = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_header_year")');
    const currentYear = parseInt(await yearHeader.getText());

    if (currentYear !== targetYear) {
        await yearHeader.click();
        await driver.pause(1000);
        const yearEl = await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${targetYear}")`);
        await yearEl.click();
        await driver.pause(1000);
    }

    for (let i = 0; i < 12; i++) {
        const cur = await getCalendarMonthYear(driver);
        if (!cur) break;

        if (cur.month === targetMonth) break;

        const direction = cur.month < targetMonth ? 'left' : 'right';
        await swipeHorizontal(driver, direction);
    }
}

async function pickDateFromCalendar(driver, dateObj) {
    const { day, month, year } = dateObj;
    await (await driver.$('android=new UiSelector().resourceId("android:id/datePicker")')).waitForDisplayed({ timeout: 5000 });

    await navigateToMonth(driver, month, year);

    // FIXED: Uses robust text clicking
    const formattedDay = String(day);
    const dayToClick = await driver.$(`android=new UiSelector().text("${formattedDay}").clickable(true)`);
    await dayToClick.click();
    await driver.pause(500);

    const okBtn = await driver.$('//android.widget.Button[@text="OK" or @resource-id="android:id/button1"]');
    await okBtn.click();
}

// ── MDSR Form Filling Functions ────────────────────────────────────────────────────
async function fillMdsrDate(driver) {
    console.log('Processing MDSR Date...');

    // Scroll down just in case it's off-screen
    await scrollDownToText(driver, "Date", 2);

    // Locate the exact field using the hint from your XML
    const field = await driver.$('//android.widget.EditText[@text="Date" or @hint="Date"]');
    await field.waitForDisplayed({ timeout: 5000 });

    if (await isEmpty(field, 'Date')) {
        await field.click();
        await driver.pause(1000); // Wait for the calendar popup to appear

        // Call your robust calendar helper
        await pickDateFromCalendar(driver, FORM_DATA.mdsrDate);
        console.log('✔ MDSR Date filled successfully.');
    } else {
        console.log('➡ MDSR Date is already filled.');
    }
}
async function uploadDocument(driver, documentName) {
    console.log(`Processing Document Upload: ${documentName}...`);

    // Scroll to make sure the specific document label is visible
    await scrollDownToText(driver, documentName, 2);

    // Locate the "add file" button directly next to the specific text
    const addFileBtn = await driver.$(`//android.widget.TextView[@text="${documentName}"]/following-sibling::android.widget.ImageView[@content-desc="add file"]`);

    if (await addFileBtn.isExisting() && await addFileBtn.isDisplayed()) {
        await addFileBtn.click();
        await driver.pause(1500); // Wait for the modal menu to pop up

        // Locate and click "Pick from Gallery"
        const galleryBtn = await driver.$('//android.widget.Button[@text="Pick from Gallery" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnGallery"]');

        if (await galleryBtn.isExisting()) {
            await galleryBtn.click();
            console.log(`⏳ Clicked "Pick from Gallery" for ${documentName}. PLEASE PICK AN IMAGE NOW. Waiting 20 seconds...`);

            // Wait for 20 seconds as requested
            await driver.pause(20000);
            console.log(`✔ Finished waiting for ${documentName} upload.`);
        } else {
            console.error(`❌ Could not find "Pick from Gallery" button for ${documentName}.`);
        }
    } else {
        console.error(`❌ Could not find "add file" button for ${documentName}.`);
    }
}

async function clickSubmitButton(driver) {
    console.log('Clicking Submit button...');

    // Scroll down to ensure Submit is visible
    await scrollDownToText(driver, "Submit", 2);
    const submitBtn = await driver.$('//android.widget.Button[@text="Submit" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]');

    if (await submitBtn.isExisting()) {
        await submitBtn.click();
        console.log('✔ Submit button clicked successfully!');
    } else {
        console.error('❌ Could not find the Submit button.');
    }
}

async function fillMdsrForm(driver) {
    console.log("--- Starting MDSR Form Entry ---");

    // 1. Fill the Date using your existing function
    await fillMdsrDate(driver);
    await driver.pause(1000);

    // ... [Call functions for any other text fields here] ...

    // 2. Upload ANM 1 Form
    await uploadDocument(driver, "MDSR form from ANM 1");
    await driver.pause(1000);

    // 3. Upload ANM 2 Form
    await uploadDocument(driver, "MDSR form from ANM 2");
    await driver.pause(1000);

    // 4. Upload Death Certificate
    await uploadDocument(driver, "Death Certificate");
    await driver.pause(1000);

    // 5. Submit the Form
    await clickSubmitButton(driver);
    await driver.pause(2000);

    console.log("✅ MDSR Form entry complete.");
}

module.exports = { fillMdsrForm };