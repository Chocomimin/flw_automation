
const FORM_DATA = {
    
    deliveryDate: { day: 10, month: 3, year: 2026 },

    
    deliveryTime: { hour: "10", minute: "30", ampm: "AM" },

    
    placeOfDelivery: 'Primary Health Centre',
    
    typeOfDelivery: 'Normal', 
    
    complicationsDuringDelivery: 'Yes', 
    deliveryComplication: 'RETAINED PLACENTA',
    
    totalBirths: "1", 
    
    liveBirths: "1", 
    
    stillbirths: "0", 
    
    dischargeDate: { day: 12, month: 3, year: 2026 }, 
    
    dischargeTime: { hour: "11", minute: "45", ampm: "AM" }, 
    
    jsyBeneficiary: 'Yes', 
};

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];


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

// ── Calendar & Time Helpers ───────────────────────────────────────────────────
async function getCalendarMonthYear(driver) {
    try {
        const dayElement = await driver.$('android=new UiSelector().text("15")');
        const contentDesc = await dayElement.getAttribute('content-desc');
        if (contentDesc) {
            const parts = contentDesc.split(' ');
            return { month: MONTH_NAMES.indexOf(parts[1]), year: parseInt(parts[2]) };
        }
        return null;
    } catch (error) { return null; }
}

async function navigateToMonth(driver, targetMonth, targetYear) {
    console.log(`[Calendar] Navigating to target: ${MONTH_NAMES[targetMonth]} ${targetYear}`);

    const yearHeader = await driver.$('//android.widget.TextView[@resource-id="android:id/date_picker_header_year"]');

    if (await yearHeader.isExisting()) {
        const currentYear = parseInt(await yearHeader.getText());
        if (currentYear !== targetYear) {
            console.log(`[Calendar] Clicking year header to change year from ${currentYear} to ${targetYear}`);
            await yearHeader.click();
            await driver.pause(1000);

            const yearEl = await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${targetYear}")`);
            await yearEl.click();
            await driver.pause(1500);
        }
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

    const datePicker = await driver.$('//*[@resource-id="android:id/datePicker"]');
    await datePicker.waitForDisplayed({ timeout: 5000 });

    await navigateToMonth(driver, month, year);

    console.log(`[Calendar] Tapping on day: ${day}`);
    const formattedDay = String(day);
    const dayToClick = await driver.$(`//android.view.View[@text="${formattedDay}"]`);

    await dayToClick.waitForDisplayed({ timeout: 3000 });
    await dayToClick.click();
    await driver.pause(1000);

    console.log(`[Calendar] Clicking OK`);
    const okBtn = await driver.$('//android.widget.Button[@text="OK" or @text="Ok"]');
    await okBtn.waitForDisplayed({ timeout: 5000 });
    await okBtn.click();
}

async function pickTimeFromClock(driver, timeObj) {
    const { hour, minute, ampm } = timeObj;

    const timePicker = await driver.$('//*[@resource-id="android:id/timePicker"]');
    await timePicker.waitForDisplayed({ timeout: 5000 });

    console.log(`[Clock] Switching to Text Input Mode...`);
    const toggleModeBtn = await driver.$('//*[@content-desc="Switch to text input mode for the time input." or @resource-id="android:id/toggle_mode"]');

    if (await toggleModeBtn.isExisting()) {
        await toggleModeBtn.click();
        await driver.pause(1500);
    }

    console.log(`[Clock] Setting Hour: ${hour}`);
    const hourInput = await driver.$('//*[@resource-id="android:id/input_hour"]');
    if (await hourInput.isExisting()) {
        await hourInput.click();
        await hourInput.clearValue();
        await hourInput.setValue(hour);
    }

    console.log(`[Clock] Setting Minute: ${minute}`);
    const minuteInput = await driver.$('//*[@resource-id="android:id/input_minute"]');
    if (await minuteInput.isExisting()) {
        await minuteInput.click();
        await minuteInput.clearValue();
        await minuteInput.setValue(minute);
    }

    try {
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
            await driver.pause(1500);
        }
    } catch(e) {}

    console.log(`[Clock] Setting AM/PM: ${ampm}`);
    const ampmLower = ampm.toLowerCase();
    const ampmUpper = ampm.toUpperCase();

    const ampmRadio = await driver.$(`//android.widget.RadioButton[@text="${ampmUpper}" or @text="${ampmLower}"]`);
    if (await ampmRadio.isExisting()) {
        await ampmRadio.click();
    } else {
        const ampmSpinner = await driver.$('//*[@resource-id="android:id/am_pm_spinner"]');
        if (await ampmSpinner.isExisting()) {
            await ampmSpinner.click();
            await driver.pause(1000);

            const ampmOption = await driver.$(`//*[@text="${ampmUpper}" or @text="${ampmLower}"]`);
            if (await ampmOption.isExisting()) {
                await ampmOption.click();
                await driver.pause(1500);
            } else {
                await tapAt(driver, 500, 200);
            }
        }
    }

    console.log(`[Clock] Clicking OK`);
    const okBtn = await driver.$('//*[@resource-id="android:id/button1" or @text="OK" or @text="Ok"]');
    await okBtn.waitForDisplayed({ timeout: 5000 });
    await okBtn.click();
}



async function fillDeliveryDate(driver) {
    console.log('Processing Date of Delivery...');
    await scrollDownToText(driver, "Date of Delivery", 2);

    const field = await driver.$('//android.widget.EditText[contains(@hint, "Date of Delivery")]');
    await field.waitForDisplayed({ timeout: 5000 });

    if (await field.isExisting() && await field.isDisplayed()) {
        const currentText = await field.getText();
        const targetDateString = `${String(FORM_DATA.deliveryDate.day).padStart(2, '0')}-${String(FORM_DATA.deliveryDate.month).padStart(2, '0')}-${FORM_DATA.deliveryDate.year}`;

        if (await isEmpty(field, 'Date of Delivery *') || currentText !== targetDateString) {
            console.log(`⏳ Clicking Date of Delivery field to open calendar...`);
            await field.click();
            await driver.pause(2000);

            await pickDateFromCalendar(driver, FORM_DATA.deliveryDate);
            console.log('✔ Date of Delivery filled successfully.');
        } else {
            console.log(`➡ Date of Delivery is already correctly filled with: ${currentText}`);
        }
    } else {
        console.error('❌ Could not find "Date of Delivery" field.');
    }
}

async function fillTimeOfDelivery(driver) {
    console.log('Processing Time of Delivery...');
    await scrollDownToText(driver, "Time of Delivery", 2);

    const field = await driver.$('//android.widget.EditText[contains(@hint, "Time of Delivery")]');
    await field.waitForDisplayed({ timeout: 5000 });

    if (await field.isExisting() && await field.isDisplayed()) {
        const currentText = await field.getText();

        if (await isEmpty(field, 'Time of Delivery') || currentText.includes('Time')) {
            console.log(`⏳ Clicking Time of Delivery field to open clock...`);
            await field.click();
            await driver.pause(2000);

            await pickTimeFromClock(driver, FORM_DATA.deliveryTime);
            console.log('✔ Time of Delivery filled successfully.');
        } else {
            console.log(`➡ Time of Delivery is already filled with: ${currentText}`);
        }
    } else {
        console.error('❌ Could not find "Time of Delivery" field.');
    }
}

async function fillPlaceOfDelivery(driver) {
    console.log('Processing Place of Delivery Dropdown...');

    
    await scrollDownToText(driver, "Place of Delivery", 2);

    const spinner = await driver.$('//android.widget.Spinner[@text="Place of Delivery" or @hint="Place of Delivery"]');

    if (await spinner.isExisting()) {
        const currentText = await spinner.getText();

        if (currentText !== FORM_DATA.placeOfDelivery) {
            console.log("⏳ Opening 'Place of Delivery' Dropdown...");

            const arrowXPath = `//android.widget.Spinner[@text="Place of Delivery"]/following-sibling::android.widget.LinearLayout//android.widget.ImageButton[@content-desc="Show dropdown menu"]`;
            const dropdownArrow = await driver.$(arrowXPath);

            if (await dropdownArrow.isExisting()) {
                await dropdownArrow.click();
                await driver.pause(1500); 

                if (await driver.isKeyboardShown()) {
                    await driver.hideKeyboard();
                    await driver.pause(1000);
                    await dropdownArrow.click();
                    await driver.pause(1500);
                }

                
                
                const targetOption = await driver.$(`//*[@text="${FORM_DATA.placeOfDelivery}"]`);

                if (await targetOption.isExisting()) {
                    console.log(`⏳ Found text "${FORM_DATA.placeOfDelivery}", tapping it directly...`);
                    await targetOption.click();
                    console.log(`✔ Place of Delivery updated to "${FORM_DATA.placeOfDelivery}".`);
                } else {
                    console.log(`⚠ Could not find text natively, falling back to coordinates...`);

                    
                    
                    

                    const PLACE_OF_DELIVERY_COORDS = {
                        'District Hospital':           { x: 500, y: 966 },
                        'Community Health Centre':     { x: 500, y: 1020 }, 
                        'Primary Health Centre':       { x: 500, y: 1074 }, 
                        'Sub Centre':                  { x: 500, y: 1128 }, 
                        'Other Public Facility':       { x: 500, y: 1182 },
                        'Accredited Private Hospital': { x: 500, y: 1236 },
                        'Other Private Hospital':      { x: 500, y: 1290 },
                        'Home':                        { x: 500, y: 1344 },
                        'Sub District Hospital':       { x: 500, y: 1398 },
                        'Medical College Hospital':    { x: 500, y: 1452 },
                        'In Transit':                  { x: 500, y: 1506 }
                    };

                    const coords = PLACE_OF_DELIVERY_COORDS[FORM_DATA.placeOfDelivery];
                    if (coords) {
                        console.log(`⏳ Tapping coordinates X:${coords.x} Y:${coords.y} for ${FORM_DATA.placeOfDelivery}`);
                        await tapAt(driver, coords.x, coords.y);
                        console.log(`✔ Place of Delivery updated via coordinates.`);
                    }
                }
            } else {
                console.error('❌ Could not find the dropdown arrow for Place of Delivery.');
            }
        } else {
            console.log(`➡ Place of Delivery is already set to "${FORM_DATA.placeOfDelivery}".`);
        }
    } else {
        console.error('❌ Could not find "Place of Delivery" dropdown field.');
    }
}

async function clickSubmitButton(driver) {
    console.log('Clicking Submit button...');
    await scrollDownToText(driver, "Submit", 2);
    const submitBtn = await driver.$('//android.widget.Button[@text="Submit" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"]');

    if (await submitBtn.isExisting()) {
        await submitBtn.click();
        console.log('✔ Submit button clicked successfully!');
    } else {
        console.error('❌ Could not find the Submit button.');
    }
}

async function fillTypeOfDelivery(driver) {
    console.log('Processing Type of Delivery...');

    
    await scrollDownToText(driver, "Type of Delivery *", 2);

    
    const typeField = await driver.$('//android.widget.TextView[@text="Type of Delivery *" and @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_nullable"]');

    if (await typeField.isExisting()) {
        console.log("⏳ Opening 'Type of Delivery' Dropdown...");
        await typeField.click();
        await driver.pause(1500); 

        
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
            await driver.pause(1000);
        }

        
        const targetOption = await driver.$(`//*[@text="${FORM_DATA.typeOfDelivery}"]`);

        if (await targetOption.isExisting()) {
            console.log(`⏳ Tapping option: "${FORM_DATA.typeOfDelivery}"`);
            await targetOption.click();
            console.log(`✔ Type of Delivery updated to "${FORM_DATA.typeOfDelivery}".`);
        } else {
            console.error(`❌ Could not find text "${FORM_DATA.typeOfDelivery}" in the dropdown list.`);
        }
    } else {
        console.error('❌ Could not find "Type of Delivery *" field.');
    }
}

async function fillComplicationsDuringDelivery(driver) {
    console.log('Processing Complications during Delivery...');

    
    await scrollDownToText(driver, "Complications during Delivery?", 2);

    const optionText = FORM_DATA.complicationsDuringDelivery;

    
    const radioBtnXPath = `//android.widget.TextView[@text="Complications during Delivery?"]/parent::*/following-sibling::android.widget.RadioGroup//android.widget.RadioButton[@text="${optionText}"]`;

    const radioBtn = await driver.$(radioBtnXPath);

    if (await radioBtn.isExisting()) {
        const isChecked = await radioBtn.getAttribute('checked');

        
        if (isChecked !== 'true' && isChecked !== true) {
            console.log(`⏳ Tapping '${optionText}' for Complications during Delivery...`);
            await radioBtn.click();
            console.log(`✔ Complications during Delivery set to "${optionText}".`);
        } else {
            console.log(`➡ Complications during Delivery is already set to "${optionText}".`);
        }
    } else {
        console.error(`❌ Could not find the '${optionText}' radio button for Complications during Delivery. XPath failed.`);
    }
}

async function fillDeliveryComplication(driver) {
    
    if (FORM_DATA.complicationsDuringDelivery !== 'Yes') {
        console.log('➡ Complications marked as "No" or not set. Skipping Delivery Complication dropdown.');
        return;
    }

    console.log('Checking for Delivery Complication Dropdown...');

    
    await scrollDownToText(driver, "Delivery Complication", 2);

    
    const dropdownBox = await driver.$('//*[contains(@text, "Delivery Complication") or contains(@hint, "Delivery Complication")]');

    
    if ((await dropdownBox.isExisting()) && (await dropdownBox.isDisplayed())) {
        console.log("⏳ 'Delivery Complication' is visible. Opening dropdown...");

        
        const arrowXPath = `//*[contains(@text, "Delivery Complication")]/following-sibling::*//android.widget.ImageButton`;
        const dropdownArrow = await driver.$(arrowXPath);

        if (await dropdownArrow.isExisting()) {
            await dropdownArrow.click();
        } else {
            await dropdownBox.click();
        }

        await driver.pause(1500); 

        
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
            await driver.pause(1000);
            await dropdownBox.click();
            await driver.pause(1500);
        }

        
        
        const location = await dropdownBox.getLocation();
        const size = await dropdownBox.getSize();

        
        const boxBottomY = location.y + size.height;

        
        const itemHeight = 112;

        
        const fixedX = Math.floor(location.x + (size.width / 2));

        
        const COMPLICATION_COORDS = {
            'PPH':                   { x: fixedX, y: boxBottomY + (itemHeight * 0.5) },
            'RETAINED PLACENTA':     { x: fixedX, y: boxBottomY + (itemHeight * 1.5) },
            'OBSTRUCTED DELIVERY':   { x: fixedX, y: boxBottomY + (itemHeight * 2.5) },
            'PROLAPSED CORD':        { x: fixedX, y: boxBottomY + (itemHeight * 3.5) },
            'TWINS PREGNANCY':       { x: fixedX, y: boxBottomY + (itemHeight * 4.5) },
            'CONVULSIONS':           { x: fixedX, y: boxBottomY + (itemHeight * 5.5) },
            'DEATH':                 { x: fixedX, y: boxBottomY + (itemHeight * 6.5) },
            'ANY OTHER (SPECIFY)':   { x: fixedX, y: boxBottomY + (itemHeight * 7.5) },
            'DON\'T KNOW':           { x: fixedX, y: boxBottomY + (itemHeight * 8.5) }
        };

        const targetCoords = COMPLICATION_COORDS[FORM_DATA.deliveryComplication];

        if (targetCoords) {
            console.log(`⏳ Tapping relative coordinates X:${targetCoords.x} Y:${targetCoords.y} for ${FORM_DATA.deliveryComplication}`);
            await tapAt(driver, targetCoords.x, targetCoords.y);
            console.log(`✔ Delivery Complication updated.`);
        } else {
            console.error(`❌ Option "${FORM_DATA.deliveryComplication}" not found in coordinate map.`);
        }

    } else {
        
        console.log('➡ "Delivery Complication" dropdown is not visible on screen. Skipping.');
    }
}


async function enterNumericText(driver, element, value) {
    await element.click();
    await driver.pause(1000); 

    
    await driver.execute('mobile: pressKey', { keycode: 67 });
    await driver.execute('mobile: pressKey', { keycode: 67 });

    
    const KEYCODES = { '0': 7, '1': 8, '2': 9, '3': 10, '4': 11, '5': 12, '6': 13, '7': 14, '8': 15, '9': 16 };

    
    for (const char of value) {
        if (KEYCODES[char]) {
            await driver.execute('mobile: pressKey', { keycode: KEYCODES[char] });
            await driver.pause(300);
        }
    }

    
    try {
        await driver.hideKeyboard();
    } catch (e) {
        
        await driver.execute('mobile: pressKey', { keycode: 4 });
    }
    await driver.pause(1000);
}
async function fillTotalBirths(driver) {
    console.log('Processing Total births...');
    await scrollDownToText(driver, "Total births", 2);

    const inputField = await driver.$('//android.widget.EditText[contains(@hint, "Total births")]');

    if (await inputField.isExisting()) {
        const currentText = await inputField.getText();

        if (currentText !== FORM_DATA.totalBirths) {
            console.log(`⏳ Entering '${FORM_DATA.totalBirths}' for Total births...`);
            await enterNumericText(driver, inputField, FORM_DATA.totalBirths);
            console.log(`✔ Total births set to "${FORM_DATA.totalBirths}".`);
        } else {
            console.log(`➡ Total births is already set to "${FORM_DATA.totalBirths}". Skipping.`);
        }
    } else {
        console.error('❌ Could not find "Total births" input field.');
    }
}

async function fillLiveBirths(driver) {
    console.log('Processing Number of Live Births...');
    await scrollDownToText(driver, "Number of Live Births", 2);

    const inputField = await driver.$('//android.widget.EditText[contains(@hint, "Number of Live Births")]');

    if (await inputField.isExisting()) {
        const currentText = await inputField.getText();

        if (currentText !== FORM_DATA.liveBirths) {
            console.log(`⏳ Entering '${FORM_DATA.liveBirths}' for Number of Live Births...`);
            await enterNumericText(driver, inputField, FORM_DATA.liveBirths);
            console.log(`✔ Number of Live Births set to "${FORM_DATA.liveBirths}".`);
        } else {
            console.log(`➡ Number of Live Births is already set to "${FORM_DATA.liveBirths}". Skipping.`);
        }
    } else {
        console.error('❌ Could not find "Number of Live Births" input field.');
    }
}

async function fillStillbirths(driver) {
    console.log('Processing Number of Stillbirths...');
    await scrollDownToText(driver, "Number of Stillbirths", 2);

    const inputField = await driver.$('//android.widget.EditText[contains(@hint, "Number of Stillbirths")]');

    if (await inputField.isExisting()) {
        const currentText = await inputField.getText();

        if (currentText !== FORM_DATA.stillbirths) {
            console.log(`⏳ Entering '${FORM_DATA.stillbirths}' for Number of Stillbirths...`);
            await enterNumericText(driver, inputField, FORM_DATA.stillbirths);
            console.log(`✔ Number of Stillbirths set to "${FORM_DATA.stillbirths}".`);
        } else {
            console.log(`➡ Number of Stillbirths is already set to "${FORM_DATA.stillbirths}". Skipping.`);
        }
    } else {
        console.error('❌ Could not find "Number of Stillbirths" input field.');
    }
}
async function fillDischargeDate(driver) {
    console.log('Processing Date of Discharge...');

    
    await scrollDownToText(driver, "Date of Discharge", 2);

    const field = await driver.$('//android.widget.EditText[contains(@hint, "Date of Discharge") or contains(@text, "Date of Discharge")]');
    await field.waitForDisplayed({ timeout: 5000 });

    if (await field.isExisting() && await field.isDisplayed()) {
        const currentText = await field.getText();
        const targetDateString = `${String(FORM_DATA.dischargeDate.day).padStart(2, '0')}-${String(FORM_DATA.dischargeDate.month).padStart(2, '0')}-${FORM_DATA.dischargeDate.year}`;

        
        if (await isEmpty(field, 'Date of Discharge') || currentText !== targetDateString) {
            console.log(`⏳ Clicking Date of Discharge field to open calendar...`);
            await field.click();
            await driver.pause(2000);

            
            await pickDateFromCalendar(driver, FORM_DATA.dischargeDate);
            console.log('✔ Date of Discharge filled successfully.');
        } else {
            console.log(`➡ Date of Discharge is already correctly filled with: ${currentText}`);
        }
    } else {
        console.error('❌ Could not find "Date of Discharge" field.');
    }
}

async function fillTimeOfDischarge(driver) {
    console.log('Processing Time of Discharge...');

    
    await scrollDownToText(driver, "Time of Discharge", 2);

    const field = await driver.$('//android.widget.EditText[contains(@hint, "Time of Discharge") or contains(@text, "Time of Discharge")]');
    await field.waitForDisplayed({ timeout: 5000 });

    if (await field.isExisting() && await field.isDisplayed()) {
        const currentText = await field.getText();

        
        if (await isEmpty(field, 'Time of Discharge') || currentText.includes('Time')) {
            console.log(`⏳ Clicking Time of Discharge field to open clock...`);
            await field.click();
            await driver.pause(2000);

            
            await pickTimeFromClock(driver, FORM_DATA.dischargeTime);
            console.log('✔ Time of Discharge filled successfully.');
        } else {
            console.log(`➡ Time of Discharge is already filled with: ${currentText}`);
        }
    } else {
        console.error('❌ Could not find "Time of Discharge" field.');
    }
}
async function fillJSYBeneficiary(driver) {
    console.log('Processing JSY Beneficiary...');

    
    await scrollDownToText(driver, "Is the Pregnant Woman a JSY Beneficiary?", 2);

    const optionText = FORM_DATA.jsyBeneficiary;

    
    const radioBtnXPath = `//android.widget.TextView[@text="Is the Pregnant Woman a JSY Beneficiary?"]/parent::*/following-sibling::android.widget.RadioGroup//android.widget.RadioButton[@text="${optionText}"]`;

    const radioBtn = await driver.$(radioBtnXPath);

    if (await radioBtn.isExisting()) {
        const isChecked = await radioBtn.getAttribute('checked');

        if (isChecked !== 'true' && isChecked !== true) {
            console.log(`⏳ Tapping '${optionText}' for JSY Beneficiary...`);
            await radioBtn.click();
            console.log(`✔ JSY Beneficiary set to "${optionText}".`);
        } else {
            console.log(`➡ JSY Beneficiary is already set to "${optionText}".`);
        }
    } else {
        console.error(`❌ Could not find the '${optionText}' radio button for JSY Beneficiary.`);
    }
}




async function uploadMCPCard(driver, cardTitle) {
    console.log(`Processing upload for ${cardTitle}...`);

    
    await scrollDownToText(driver, cardTitle, 2);

    
    
    const addFileIconXPath = `//android.widget.TextView[@text="${cardTitle}"]/parent::*//android.widget.ImageView[@content-desc="add file"]`;
    const addFileBtn = await driver.$(addFileIconXPath);

    if (await addFileBtn.isExisting()) {
        console.log(`⏳ Clicking 'add file' for ${cardTitle}...`);
        await addFileBtn.click();
        await driver.pause(1500); 

        
        const galleryBtn = await driver.$('//android.widget.Button[@text="Pick from Gallery"]');
        if (await galleryBtn.isExisting()) {
            await galleryBtn.click();
            console.log(`✔ Clicked 'Pick from Gallery'. Waiting 20 seconds for user selection...`);

            
            await driver.pause(20000);
        } else {
            console.error(`❌ Could not find 'Pick from Gallery' button on dialog.`);
        }
    } else {
        console.error(`❌ Could not find 'add file' icon for ${cardTitle}.`);
    }
}


async function uploadMCPCards(driver) {
    await uploadMCPCard(driver, "MCP Card 1");
    await driver.pause(1000);
    await uploadMCPCard(driver, "MCP Card 2");
}
async function fillDeliveryOutcomeForm(driver) {
    console.log("--- Starting Delivery Outcome Form Entry ---");

    
    await fillDeliveryDate(driver);
    await driver.pause(1000);

    
    await fillTimeOfDelivery(driver);
    await driver.pause(1000);

    
    await fillPlaceOfDelivery(driver);
    await driver.pause(1000);
    
    await fillTypeOfDelivery(driver);
    await driver.pause(1000);
    await fillComplicationsDuringDelivery(driver);
    await driver.pause(1000);
    await fillDeliveryComplication(driver);
    await driver.pause(1000);
    
    await fillTotalBirths(driver);
    await driver.pause(1000);

    
    await fillLiveBirths(driver);
    await driver.pause(1000);
    
    await fillStillbirths(driver);
    await driver.pause(1000);
    
    await fillDischargeDate(driver);
    await driver.pause(1000);
    
    await fillTimeOfDischarge(driver);
    await driver.pause(1000);
    await fillJSYBeneficiary(driver);
    await driver.pause(1000);
    await uploadMCPCards(driver);
    await driver.pause(1000);

    
    await clickSubmitButton(driver);
    

    console.log("✅ Delivery Outcome Form entry complete.");
}

module.exports = { fillDeliveryOutcomeForm };