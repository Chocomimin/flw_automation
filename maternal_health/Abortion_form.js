const { remote } = require('webdriverio');

// ── Configuration & Data ──────────────────────────────────────────────────────

const FORM_DATA = {
    visitDate: { day: 15, month: 11, year: 2025 },
    serialNumber: '12345',
    methodOfTermination: 'MVA',
    terminationDoneBy: 'Doctor',
    familyPlanningMethod: 'PAIUCD',
    familyPlanningMethodConfirmed: 'Yes',
    remarks: 'Patient responded well to termination procedure. Scheduled for follow-up in 2 weeks.'
};

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

const METHOD_OF_TERMINATION_COORDS = {
    'MVA': { x: 500, y: 1500 },
    'EVA': { x: 500, y: 1630 },
    'MMA': { x: 500, y: 1760 },
    'Others': { x: 500, y: 1890 }
};

const TERMINATION_DONE_BY_COORDS = {
    'Doctor': { x: 500, y: 1630 },
    'Nurse': { x: 500, y: 1740 }
};

// ── Touch & Scroll Helpers ────────────────────────────────────────────────────

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
                return;
            }
        } catch (e) { }

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

    const formattedDay = String(day);
    const dayToClick = await driver.$(`android=new UiSelector().text("${formattedDay}").clickable(true)`);
    await dayToClick.click();
    await driver.pause(500);

    const okBtn = await driver.$('//android.widget.Button[@text="OK" or @resource-id="android:id/button1"]');
    await okBtn.click();
}

// ── Form Filling Functions ────────────────────────────────────────────────────

async function fillVisitDate(driver) {
    console.log('Processing Visit Date...');
    const field = await driver.$('//android.widget.EditText[contains(@hint, "Visit Date")]');
    await field.waitForDisplayed({ timeout: 10000 });

    if (await isEmpty(field, 'Visit Date *')) {
        await field.click();
        await driver.pause(1500);
        await pickDateFromCalendar(driver, FORM_DATA.visitDate);
        console.log('✔ Visit Date filled successfully.');
    } else {
        console.log('➡ Visit Date is already filled.');
    }
}

async function fillSerialNumber(driver) {
    console.log('Processing Serial Number...');
    const hintText = "Serial no as per Admission/ Evacuation register";

    await scrollDownToText(driver, "Serial no as per", 2);
    const serialField = await driver.$('//android.widget.EditText[contains(@hint, "Serial no as per")]');

    if (await serialField.isExisting()) {
        const currentText = await serialField.getText();

        if (currentText !== FORM_DATA.serialNumber && await isEmpty(serialField, hintText)) {
            await serialField.click();
            await serialField.clearValue();
            await serialField.setValue(FORM_DATA.serialNumber);

            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
            }
            console.log(`✔ Serial Number set to "${FORM_DATA.serialNumber}".`);
        } else {
            console.log(`➡ Serial Number is already set or matches "${FORM_DATA.serialNumber}".`);
        }
    } else {
        console.error('❌ Could not find the "Serial no" input field.');
    }
}

async function fillMethodOfTermination(driver) {
    console.log('Processing Method of Termination Dropdown...');
    await scrollDownToText(driver, "Method of Termination", 2);

    const spinnerXPath = `//android.widget.Spinner[contains(@text, "Method of Termination") or contains(@hint, "Method of Termination")]`;
    const spinner = await driver.$(spinnerXPath);

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();

        if (currentText !== FORM_DATA.methodOfTermination) {
            const arrowXPath = `${spinnerXPath}/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            if (await dropdownArrow.isExisting()) {
                await dropdownArrow.click();
                await driver.pause(1000);

                if (await driver.isKeyboardShown()) {
                    await driver.hideKeyboard();
                    await driver.pause(1000);
                    await dropdownArrow.click(); // retry opening
                    await driver.pause(1500);
                } else {
                    await driver.pause(500);
                }

                const coords = METHOD_OF_TERMINATION_COORDS[FORM_DATA.methodOfTermination];
                if (coords) {
                    await tapAt(driver, coords.x, coords.y);
                    console.log(`✔ "Method of Termination" updated to "${FORM_DATA.methodOfTermination}".`);
                } else {
                    console.error(`❌ Option "${FORM_DATA.methodOfTermination}" not found in coordinate map.`);
                }
            } else {
                console.error('❌ Could not find the dropdown arrow for "Method of Termination".');
            }
        } else {
            console.log(`➡ "Method of Termination" is already set to "${FORM_DATA.methodOfTermination}".`);
        }
    } else {
        console.error('❌ Could not find "Method of Termination" dropdown field.');
    }
}

async function fillTerminationDoneBy(driver) {
    console.log('Processing Termination Done By Dropdown...');
    await scrollDownToText(driver, "Termination done by", 2);

    const spinnerXPath = `//android.widget.Spinner[contains(@text, "Termination done by") or contains(@hint, "Termination done by")]`;
    const spinner = await driver.$(spinnerXPath);

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();

        if (currentText !== FORM_DATA.terminationDoneBy) {
            const arrowXPath = `${spinnerXPath}/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            if (await dropdownArrow.isExisting()) {
                await dropdownArrow.click();
                await driver.pause(1000);

                if (await driver.isKeyboardShown()) {
                    await driver.hideKeyboard();
                    await driver.pause(1000);
                    await dropdownArrow.click(); // retry opening
                    await driver.pause(1500);
                } else {
                    await driver.pause(500);
                }

                const coords = TERMINATION_DONE_BY_COORDS[FORM_DATA.terminationDoneBy];
                if (coords) {
                    await tapAt(driver, coords.x, coords.y);
                    console.log(`✔ "Termination done by" updated to "${FORM_DATA.terminationDoneBy}".`);
                } else {
                    console.error(`❌ Option "${FORM_DATA.terminationDoneBy}" not found in coordinate map.`);
                }
            } else {
                console.error('❌ Could not find the dropdown arrow for "Termination done by".');
            }
        } else {
            console.log(`➡ "Termination done by" is already set to "${FORM_DATA.terminationDoneBy}".`);
        }
    } else {
        console.error('❌ Could not find "Termination done by" dropdown field.');
    }
}

async function fillFamilyPlanningMethod(driver) {
    console.log('Processing Family Planning Method...');
    await scrollDownToText(driver, "What family planning method", 2);

    if (!FORM_DATA.familyPlanningMethod) return;

    let radioTextToMatch = "";
    if (FORM_DATA.familyPlanningMethod === 'PAIUCD') {
        radioTextToMatch = "PAIUCD been inserted";
    } else if (FORM_DATA.familyPlanningMethod === 'Tubectomy') {
        radioTextToMatch = "permanent sterilization (Tubectomy)";
    }

    if (radioTextToMatch) {
        const primaryRadioXPath = `//android.widget.RadioButton[contains(@text, "${radioTextToMatch}")]`;
        const primaryRadioButton = await driver.$(primaryRadioXPath);

        if (await primaryRadioButton.isExisting()) {
            const isChecked = await primaryRadioButton.getAttribute('checked');

            if (isChecked !== 'true') {
                await primaryRadioButton.click();
                console.log(`✔ Selected "${FORM_DATA.familyPlanningMethod}". Waiting for Yes/No options to open...`);

                await driver.pause(1500);
            } else {
                console.log(`➡ Family Planning Method is already set to "${FORM_DATA.familyPlanningMethod}".`);
            }

            if (FORM_DATA.familyPlanningMethodConfirmed) {
                await scrollDownToText(driver, FORM_DATA.familyPlanningMethodConfirmed, 1);

                const yesNoXPath = `//android.widget.RadioButton[@text="${FORM_DATA.familyPlanningMethodConfirmed}"]`;
                const yesNoButton = await driver.$(yesNoXPath);

                if (await yesNoButton.isExisting()) {
                    const isYesNoChecked = await yesNoButton.getAttribute('checked');
                    if (isYesNoChecked !== 'true') {
                        await yesNoButton.click();
                        console.log(`✔ Confirmed Family Planning Method with "${FORM_DATA.familyPlanningMethodConfirmed}".`);
                    } else {
                        console.log(`➡ Family Planning Confirmation is already set to "${FORM_DATA.familyPlanningMethodConfirmed}".`);
                    }
                } else {
                    console.error(`❌ Could not find the "${FORM_DATA.familyPlanningMethodConfirmed}" radio button.`);
                }
            }

        } else {
            console.error(`❌ Could not find RadioButton for "${FORM_DATA.familyPlanningMethod}".`);
        }
    }
}

async function fillRemarks(driver) {
    console.log('Processing Remarks...');

    await scrollDownToText(driver, "Remarks", 2);
    const remarksField = await driver.$('//android.widget.EditText[@hint="Remarks" or @text="Remarks"]');

    if (await remarksField.isExisting()) {
        const currentText = await remarksField.getText();

        if (currentText !== FORM_DATA.remarks && await isEmpty(remarksField, "Remarks")) {
            await remarksField.click();
            await remarksField.clearValue();
            await remarksField.setValue(FORM_DATA.remarks);

            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
            }
            console.log(`✔ Remarks set to: "${FORM_DATA.remarks}".`);
        } else {
            console.log(`➡ Remarks are already set or match the target data.`);
        }
    } else {
        console.error('❌ Could not find the "Remarks" input field.');
    }
}

async function uploadSummaryFile(driver, summaryName) {
    console.log(`Processing file upload for ${summaryName}...`);

    await scrollDownToText(driver, summaryName, 2);

    const addFileBtnXPath = `//android.widget.TextView[contains(@text, "${summaryName}")]/following-sibling::android.widget.ImageView[@content-desc="add file"]`;
    const addFileBtn = await driver.$(addFileBtnXPath);

    if (await addFileBtn.isExisting() && await addFileBtn.isDisplayed()) {
        await addFileBtn.click();
        await driver.pause(1500);

        const galleryBtn = await driver.$('//android.widget.Button[@text="Pick from Gallery" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnGallery"]');

        if (await galleryBtn.isExisting()) {
            await galleryBtn.click();
            console.log(`✔ Clicked "Pick from Gallery" for ${summaryName}. Waiting 20 seconds for upload process...`);

            await driver.pause(20000);
            console.log(`✔ Finished waiting for ${summaryName} upload.`);
        } else {
            console.error(`❌ Could not find "Pick from Gallery" button for ${summaryName}.`);
        }
    } else {
        console.error(`❌ Could not find "add file" button for ${summaryName}.`);
    }
}

async function clickSubmitButton(driver) {
    console.log('Clicking Submit button...');

    // Ensure we are scrolled down to the bottom
    await scrollDownToText(driver, "Submit", 2);

    const submitBtn = await driver.$('//android.widget.Button[@text="Submit" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]');

    if (await submitBtn.isExisting() && await submitBtn.isDisplayed()) {
        await submitBtn.click();
        console.log('✅ Submit button clicked successfully!');
    } else {
        console.error('❌ Could not find or click the Submit button.');
    }
}

// ── Main Execution ────────────────────────────────────────────────────────────

async function fillAbortionForm(driver) {
    console.log("--- Starting Abortion Form Details ---");

    await fillVisitDate(driver);
    await driver.pause(1000);

    await fillSerialNumber(driver);
    await driver.pause(1000);

    await fillMethodOfTermination(driver);
    await driver.pause(1000);

    await fillTerminationDoneBy(driver);
    await driver.pause(1000);

    await fillFamilyPlanningMethod(driver);
    await driver.pause(1000);

    await fillRemarks(driver);
    await driver.pause(1000);

    await uploadSummaryFile(driver, "Summary 1");
    await driver.pause(1000);

    await uploadSummaryFile(driver, "Summary 2");
    await driver.pause(1000);

    await clickSubmitButton(driver);
    await driver.pause(2000); // Small pause to let the network request go out

    console.log("--- Finished Abortion Form Details ---");
}

module.exports = { fillAbortionForm };