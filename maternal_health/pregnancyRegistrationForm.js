const FORM_DATA = {
  dateOfRegistration: { day: 6, month: 3, year: 2026 },   // 06 March 2026
  rchId: '123456789967',
  lmpDate: { day: 1, month: 1, year: 2026 },              // 01 January 2026
  bloodGroup: 'B +Ve',
  weight: '55',
  height: '160',
  previousPregnancies: '1',
  lastPregnancyComplication: 'Any Other',
  anyOtherComplicationDetails: 'Severe weakness',
  moreThanThreeDeliveries: 'No',
  timeFromLastDelivery: 'No',
  heightShortness: 'No',
  ageRiskFactor: 'No',
  rhNegative: 'No',
  homeDeliveryPreviousPregnancy: 'No',
  badObstetricHistory: 'No',
  multiplePregnancy: 'No',
  hrpIdentifier: 'ANM' // <-- Added for conditional HRP dropdown
};

const BLOOD_GROUP_COORDS = {
  'A +Ve':  { x: 540, y: 1000 },
  'A -Ve':  { x: 540, y: 1120 },
  'B +Ve':  { x: 540, y: 1240 },
  'B -Ve':  { x: 540, y: 1360 },
  'AB +Ve': { x: 540, y: 1480 },
  'AB -Ve': { x: 540, y: 1600 },
  'O +Ve':  { x: 540, y: 1720 },
  'O -Ve':  { x: 540, y: 1840 },
};

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December'
];

// Calendar dialog button coordinates extracted directly from your XML bounds
const CALENDAR = {
  prevMonthBtn:  { x: 274, y: 924 },   // android:id/prev bounds [214,864][334,984]
  nextMonthBtn:  { x: 806, y: 924 },   // Estimated symmetrical position for next button
  okBtn:         { x: 790, y: 1754 },  // android:id/button1 bounds [710,1694][870,1814]
  cancelBtn:     { x: 610, y: 1754 },  // android:id/button2 bounds [530,1694][690,1814]
  yearHeader:    { x: 280, y: 670 },   // android:id/date_picker_header_year bounds [220,629][340,711]
};

const COMPLICATION_COORDS = {
  'None':                                 { x: 540, y: 450 },
  'CONVULSIONS':                          { x: 540, y: 570 },
  'APH':                                  { x: 540, y: 690 },
  'PREGNANCY INDUCED HYPERTENSION (PIH)': { x: 540, y: 810 },
  'REPEATED ABORTION':                    { x: 540, y: 930 },
  'STILLBIRTH':                           { x: 540, y: 1050 },
  'CONGENITAL ANOMALY':                   { x: 540, y: 1170 },
  'CAESAREAN SECTION':                    { x: 540, y: 1290 },
  'BLOOD TRANSFUSION':                    { x: 540, y: 1410 },
  'TWINS':                                { x: 540, y: 1530 },
  'OBSTRUCTED LABOUR':                    { x: 540, y: 1650 },
  'PPH':                                  { x: 540, y: 1770 },
  'Any Other':                            { x: 540, y: 1890 }
};

const HRP_COORDS = {
  'ANM':                           { x: 540, y: 1550 },
  'CHO':                           { x: 540, y: 1680 },
  'PHC - MO':                      { x: 540, y: 1810 },
  'Specialist at Higher Facility': { x: 540, y: 1940 }
};

// ── W3C Actions Tap (Fixes GET/Body error) ────────────────────────────────────
async function tapAt(driver, x, y) {
  await driver.performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x, y },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 100 },
        { type: 'pointerUp', button: 0 },
      ],
    },
  ]);
  await driver.releaseActions();
}

// ── Get current month/year shown in the calendar view ─────────────────────────
async function getCalendarMonthYear(driver) {
  try {
    const dayElement = await driver.$('android=new UiSelector().text("15")');
    const contentDesc = await dayElement.getAttribute('content-desc');
    const parts = contentDesc.split(' ');
    const monthFull = parts[1];
    const year = parseInt(parts[2]);

    const monthMap = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4,
      'May': 5, 'June': 6, 'July': 7, 'August': 8,
      'September': 9, 'October': 10, 'November': 11, 'December': 12
    };

    return { month: monthMap[monthFull], year: year };
  } catch (error) {
    console.log('Could not determine current calendar month:', error);
    return null;
  }
}

// ── Navigate calendar to target month/year ────────────────────────────────────
async function navigateToMonth(driver, targetMonth, targetYear) {
  const yearHeader = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_header_year")');
  const currentYear = parseInt(await yearHeader.getText());

  if (currentYear !== targetYear) {
    await tapAt(driver, CALENDAR.yearHeader.x, CALENDAR.yearHeader.y);
    await driver.pause(1000);
    const yearSelector = `new UiScrollable(new UiSelector().resourceId("android:id/animator")).scrollIntoView(new UiSelector().text("${targetYear}"))`;
    const yearEl = await driver.$(`android=${yearSelector}`);
    await yearEl.click();
    await driver.pause(1000);
  }

  for (let i = 0; i < 12; i++) {
    const cur = await getCalendarMonthYear(driver);
    if (!cur || cur.month === targetMonth) break;

    if (cur.month > targetMonth) {
      await tapAt(driver, CALENDAR.prevMonthBtn.x, CALENDAR.prevMonthBtn.y);
    } else {
      await tapAt(driver, CALENDAR.nextMonthBtn.x, CALENDAR.nextMonthBtn.y);
    }
    await driver.pause(500);
  }
}

// ── Pick date from calendar dialog ───────────────────────────────────────────
async function pickDateFromCalendar(driver, dateObj) {
  const { day, month, year } = dateObj;

  const datePicker = await driver.$('android=new UiSelector().resourceId("android:id/datePicker")');
  await datePicker.waitForDisplayed({ timeout: 5000 });
  await driver.pause(500);

  await navigateToMonth(driver, month, year);
  await driver.pause(500);

  const formattedDay = String(day).padStart(2, '0');
  const contentDesc = `${formattedDay} ${MONTH_NAMES[month]} ${year}`;

  const dayEl = await driver.$(`android=new UiSelector().description("${contentDesc}")`);
  await dayEl.click();
  await driver.pause(500);

  await tapAt(driver, CALENDAR.okBtn.x, CALENDAR.okBtn.y);
  await driver.pause(500);
}

// ── Helper: Get EditText fields by index ──────────────────────────────────────
async function getFieldByIndex(driver, index) {
  const fields = await driver.$$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/et")');
  return fields[index];
}

// ── Helper: Check if field is empty ───────────────────────────────────────────
async function isEmpty(field, hintText) {
  try {
    const text = await field.getText();
    return !text || text.trim() === '' || text.trim() === hintText.trim();
  } catch {
    return true;
  }
}

// ── Helper: Explicitly Scroll Down to Text ────────────────────────────────────
async function scrollDownToText(driver, text, maxScrolls = 5) {
  // Uses wildcard (*) to find Text in ANY widget (TextView, Spinner, Button, etc.)
  const elementXPath = `//*[@text="${text}"]`;

  for (let i = 0; i < maxScrolls; i++) {
    try {
      const element = await driver.$(elementXPath);
      if ((await element.isExisting()) && (await element.isDisplayed())) {
        return;
      }
    } catch (e) {
      // Not found, keep scrolling
    }

    const size = await driver.getWindowRect();
    const startX = Math.floor(size.width / 2);
    const startY = Math.floor(size.height * 0.70);
    const endY = Math.floor(size.height * 0.30);

    await driver.performActions([{
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
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
  console.log(`⚠️ Reached max scrolls without finding: "${text}"`);
}

// ── Form Field Functions ──────────────────────────────────────────────────────
async function fillDateOfRegistration(driver) {
  const field = await getFieldByIndex(driver, 0);
  if (await isEmpty(field, 'Date of Registration *')) {
    await field.click();
    await driver.pause(800);
    await pickDateFromCalendar(driver, FORM_DATA.dateOfRegistration);
    console.log('✔ Date of Registration filled');
  } else {
    console.log('⏭ Date of Registration already filled');
  }
}

async function fillRchId(driver) {
  const field = await getFieldByIndex(driver, 1);

  if (await isEmpty(field, 'RCH ID')) {
    await field.click();
    await driver.pause(500);
    await field.setValue(FORM_DATA.rchId);

    if (await driver.isKeyboardShown()) {
      await driver.hideKeyboard();
      await driver.pause(500);
    }

    console.log('✔ RCH ID filled');
  } else {
    console.log('⏭ RCH ID already filled');
  }
}

async function fillLmpDate(driver) {
  const field = await getFieldByIndex(driver, 5);
  if (await isEmpty(field, 'LMP Date *')) {
    await field.click();
    await driver.pause(800);
    await pickDateFromCalendar(driver, FORM_DATA.lmpDate);
    console.log('✔ LMP Date filled');
  } else {
    console.log('⏭ LMP Date already filled');
  }
}

async function fillBloodGroup(driver) {
  const spinner = await driver.$("//android.widget.Spinner[contains(@resource-id, 'id/actv_rv_dropdown')]");

  await spinner.waitForDisplayed({ timeout: 5000 });
  const value = await spinner.getText();

  if (!value || value.trim() === 'Blood Group') {
    await spinner.click();
    await driver.pause(1500);

    const coords = BLOOD_GROUP_COORDS[FORM_DATA.bloodGroup];
    if (!coords) throw new Error(`Blood group "${FORM_DATA.bloodGroup}" not found`);

    await tapAt(driver, coords.x, coords.y);
    console.log(`✔ Blood Group set to ${FORM_DATA.bloodGroup} via coordinates`);
  } else {
    console.log('⏭ Blood Group already filled');
  }
}

async function fillWeight(driver) {
  const scrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Weight of PW (Kg) at time Registration"))`;
  await driver.$(`android=${scrollSelector}`);
  await driver.pause(500);

  const field = await driver.$('//android.widget.EditText[@text="Weight of PW (Kg) at time Registration"]');
  await field.waitForDisplayed({ timeout: 5000 });

  if (await isEmpty(field, 'Weight of PW (Kg) at time Registration')) {
    await field.click();
    await driver.pause(500);
    await field.setValue(FORM_DATA.weight);

    if (await driver.isKeyboardShown()) {
      await driver.hideKeyboard();
      await driver.pause(500);
    }

    console.log('✔ Weight filled');
  } else {
    console.log('⏭ Weight already filled');
  }
}

async function fillHeight(driver) {
    const scrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Height of PW (Cm)"))`;
    await driver.$(`android=${scrollSelector}`);
    await driver.pause(500);

    const field = await driver.$('//android.widget.EditText[@text="Height of PW (Cm)"]');
    await field.waitForDisplayed({ timeout: 5000 });

    if (await isEmpty(field, 'Height of PW (Cm)')) {
      await field.click();
      await driver.pause(500);
      await field.setValue(FORM_DATA.height);

      if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(500);
      }

      console.log('✔ Height filled');
    } else {
      console.log('⏭ Height already filled');
    }
}

async function selectDiseaseChecks(driver, diseases) {
  for (const disease of diseases) {
    const selector = `new UiSelector().className("android.widget.CheckBox").text("${disease}")`;
    const checkbox = await driver.$(`android=${selector}`);
    await checkbox.waitForDisplayed({ timeout: 5000 });

    let isChecked = await checkbox.getAttribute('checked');

    if (isChecked === 'false') {
      await checkbox.click();
      await driver.pause(1000);

      isChecked = await checkbox.getAttribute('checked');
      if (isChecked === 'false') {
        console.log(`⚠️ ${disease} didn't stay checked. Retrying...`);
        const location = await checkbox.getLocation();
        const size = await checkbox.getSize();
        const centerX = location.x + (size.width / 2);
        const centerY = location.y + (size.height / 2);
        await tapAt(driver, centerX, centerY);
      }
      console.log(`✔ Checked: ${disease}`);
    }
  }
}

async function fillDiseaseInformation(driver) {
  console.log('Processing Past Illness section...');

  const scrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("None"))`;
  await driver.$(`android=${scrollSelector}`);

  const noneCheckbox = await driver.$('android=new UiSelector().className("android.widget.CheckBox").text("None")');
  await noneCheckbox.waitForDisplayed({ timeout: 5000 });
  await noneCheckbox.click();
  console.log('✔ Clicked None');

  const nextQText = "Is this your 1st pregnancy? *";
  const nextQuestion = await driver.$(`android=new UiSelector().text("${nextQText}")`);

  if (await nextQuestion.isExisting()) {
      await nextQuestion.click();
      console.log('✔ Focus shifted to next question');
  }
}

async function fillFirstPregnancy(driver, answer = "Yes") {
  const scrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${answer}"))`;
  await driver.$(`android=${scrollSelector}`);

  try {
    const radioBtn = await driver.$(`android=new UiSelector().className("android.widget.RadioButton").text("${answer}")`);
    await radioBtn.click();
    console.log(`✔ First Pregnancy set to: ${answer}`);
  } catch (err) {
    const fallbackBtn = await driver.$(`android=new UiSelector().text("${answer}")`);
    await fallbackBtn.click();
  }

  if (answer === "No") {
    await driver.pause(1000);

    console.log('Nudging screen up by 5%...');
    const size = await driver.getWindowRect();
    const startX = size.width / 2;

    const startY = Math.floor(size.height * 0.60);
    const endY = Math.floor(size.height * 0.55);

    await driver.performActions([{
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
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

    const prevPregField = await driver.$('//android.widget.EditText[@text="Total no. of previous Pregnancy"]');
    await prevPregField.waitForDisplayed({ timeout: 5000 });

    if (await isEmpty(prevPregField, 'Total no. of previous Pregnancy')) {
      await prevPregField.click();
      await driver.pause(500);
      await prevPregField.setValue(FORM_DATA.previousPregnancies);

      if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(500);
      }
      console.log('✔ Total no. of previous Pregnancy filled');
    }

    await fillLastPregnancyComplication(driver);
  }
}

async function fillLastPregnancyComplication(driver) {
  console.log('Processing Complications in Last Pregnancy...');

  const spinners = await driver.$$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown")');

  if (!spinners || spinners.length === 0) {
    throw new Error("❌ Could not find any dropdown spinners on the screen. The UI may not have rendered yet.");
  }

  const spinner = spinners[spinners.length - 1];
  await spinner.waitForDisplayed({ timeout: 5000 });

  const value = await spinner.getText();

  if (value === 'None' && FORM_DATA.lastPregnancyComplication !== 'None') {
    await spinner.click();
    await driver.pause(1500);

    const coords = COMPLICATION_COORDS[FORM_DATA.lastPregnancyComplication];
    if (!coords) throw new Error(`Complication "${FORM_DATA.lastPregnancyComplication}" not found in coordinates object.`);

    await tapAt(driver, coords.x, coords.y);
    console.log(`✔ Last Pregnancy Complication set to: ${FORM_DATA.lastPregnancyComplication} via coordinates`);

    if (FORM_DATA.lastPregnancyComplication === 'Any Other') {
      await driver.pause(1000);

      console.log('Nudging screen up to reveal "Any other Complication" field...');
      const size = await driver.getWindowRect();
      const startX = size.width / 2;
      const startY = Math.floor(size.height * 0.70);
      const endY = Math.floor(size.height * 0.40);

      await driver.performActions([{
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
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

      const anyOtherField = await driver.$('//android.widget.EditText[@text="Any other Complication *"]');
      await anyOtherField.waitForDisplayed({ timeout: 5000 });

      if (await isEmpty(anyOtherField, 'Any other Complication *')) {
        await anyOtherField.click();
        await driver.pause(500);
        await anyOtherField.setValue(FORM_DATA.anyOtherComplicationDetails);

        if (await driver.isKeyboardShown()) {
          await driver.hideKeyboard();
          await driver.pause(500);
        }
        console.log('✔ Any other Complication details filled');
      } else {
        console.log('⏭ Any other Complication details already filled');
      }
    }
  } else {
    console.log(`⏭ Last Pregnancy Complication already set or default "None" kept`);
  }
}

async function fillMoreThanThreeDeliveries(driver, answer) {
  const questionText = "No. of Deliveries is more than 3";
  console.log(`Processing "${questionText}"... Target: ${answer}`);

  // 1. Scroll into view
  const scrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${questionText}"))`;
  await driver.$(`android=${scrollSelector}`);
  await driver.pause(500);

  // 2. Exact XPath based on XML: Find the Text, go up to its parent Layout, then find the sibling RadioGroup, then the answer button
  const radioBtnXpath = `//android.widget.TextView[@text="${questionText}"]/../following-sibling::android.widget.RadioGroup//android.widget.RadioButton[@text="${answer}"]`;
  const radioBtn = await driver.$(radioBtnXpath);

  await radioBtn.waitForDisplayed({ timeout: 5000 });

  // 3. Check the current state
  const isChecked = await radioBtn.getAttribute('checked');

  // 4. Click if it's not already set to the desired answer
  if (isChecked === 'true') {
    console.log(`⏭ "${questionText}" is already set to ${answer}.`);
  } else {
    await radioBtn.click();
    console.log(`✔ "${questionText}" set to: ${answer}`);
  }
}

async function fillTimeFromLastDelivery(driver, answer) {
  const questionText = "Time from last delivery is less than 18 months";
  console.log(`Processing "${questionText}"... Target: ${answer}`);

  // 1. Scroll into view
  const scrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${questionText}"))`;
  await driver.$(`android=${scrollSelector}`);
  await driver.pause(500);

  // 2. Exact XPath based on XML: Find the Text, go up to its parent Layout, then find the sibling RadioGroup, then the answer button
  const radioBtnXpath = `//android.widget.TextView[@text="${questionText}"]/../following-sibling::android.widget.RadioGroup//android.widget.RadioButton[@text="${answer}"]`;
  const radioBtn = await driver.$(radioBtnXpath);

  await radioBtn.waitForDisplayed({ timeout: 5000 });

  // 3. Check the current state
  const isChecked = await radioBtn.getAttribute('checked');

  // 4. Click if it's not already set to the desired answer
  if (isChecked === 'true') {
    console.log(`⏭ "${questionText}" is already set to ${answer}.`);
  } else {
    await radioBtn.click();
    console.log(`✔ "${questionText}" set to: ${answer}`);
  }
}

async function fillHeightShortness(driver, answer) {
  const questionText = "Height is very short or less than 140 cms";
  console.log(`Processing "${questionText}"... Target: ${answer}`);

  try {
    // 1. Scroll into view
    const scrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${questionText}"))`;
    await driver.$(`android=${scrollSelector}`);
    await driver.pause(500);

    // 2. Exact XPath based on XML: Find the Text, go up to its parent Layout, then find the sibling RadioGroup, then the answer button
    const radioBtnXpath = `//android.widget.TextView[@text="${questionText}"]/../following-sibling::android.widget.RadioGroup//android.widget.RadioButton[@text="${answer}"]`;
    const radioBtn = await driver.$(radioBtnXpath);

    await radioBtn.waitForDisplayed({ timeout: 5000 });

    // 3. Check the current state
    const isChecked = await radioBtn.getAttribute('checked');
    if (isChecked === 'true') {
      console.log(`⏭ "${questionText}" is already set to ${answer}.`);
      return; // Exit the function early if already filled
    }

    // 4. Check if the element is clickable or enabled
    const isClickable = await radioBtn.getAttribute('clickable');
    const isEnabled = await radioBtn.getAttribute('enabled');

    if (isClickable === 'false' || isEnabled === 'false') {
      console.log(`⏭ "${questionText}" is not clickable or is disabled. Moving to next column...`);
      return; // Exit the function early to skip
    }

    // 5. Click the button
    await radioBtn.click();
    console.log(`✔ "${questionText}" set to: ${answer}`);

  } catch (error) {
    // If Appium throws an interception or element not interactable error, catch it and move on
    console.log(`⚠️ Could not interact with "${questionText}". Skipping to next column...`);
  }
}

async function fillAgeRiskFactor(driver, answer) {
  const questionText = "Age is less than 18 or more than 35 years";
  console.log(`Processing "${questionText}"... Target: ${answer}`);

  try {
    await scrollDownToText(driver, questionText);
    await driver.pause(500);

    const radioBtnXpath = `//android.widget.TextView[@text="${questionText}"]/../following-sibling::android.widget.RadioGroup//android.widget.RadioButton[@text="${answer}"]`;
    const radioBtn = await driver.$(radioBtnXpath);

    await radioBtn.waitForDisplayed({ timeout: 5000 });

    const isChecked = await radioBtn.getAttribute('checked');
    if (isChecked === 'true') {
      console.log(`⏭ "${questionText}" is already set to ${answer}.`);
      return;
    }

    const isClickable = await radioBtn.getAttribute('clickable');
    const isEnabled = await radioBtn.getAttribute('enabled');

    if (isClickable === 'false' || isEnabled === 'false') {
      console.log(`⏭ "${questionText}" is not clickable or is disabled. Moving to next column...`);
      return;
    }

    await radioBtn.click();
    console.log(`✔ "${questionText}" set to: ${answer}`);

  } catch (error) {
    console.log(`⚠️ Could not interact with "${questionText}". Skipping to next column...`);
  }
}

async function fillRhNegative(driver, answer) {
  const questionText = "Rh Negative";
  console.log(`Processing "${questionText}"... Target: ${answer}`);

  try {
    await scrollDownToText(driver, questionText);
    await driver.pause(500);

    const radioBtnXpath = `//android.widget.TextView[@text="${questionText}"]/../following-sibling::android.widget.RadioGroup//android.widget.RadioButton[@text="${answer}"]`;
    const radioBtn = await driver.$(radioBtnXpath);

    await radioBtn.waitForDisplayed({ timeout: 5000 });

    const isChecked = await radioBtn.getAttribute('checked');
    if (isChecked === 'true') {
      console.log(`⏭ "${questionText}" is already set to ${answer}.`);
      return;
    }

    const isClickable = await radioBtn.getAttribute('clickable');
    const isEnabled = await radioBtn.getAttribute('enabled');

    if (isClickable === 'false' || isEnabled === 'false') {
      console.log(`⏭ "${questionText}" is not clickable or is disabled. Moving to next column...`);
      return;
    }

    await radioBtn.click();
    console.log(`✔ "${questionText}" set to: ${answer}`);

  } catch (error) {
    console.log(`⚠️ Could not interact with "${questionText}". Skipping to next column...`);
  }
}

async function fillHomeDeliveryPreviousPregnancy(driver, answer) {
  const questionText = "Home delivery of previous pregnancy";
  console.log(`Processing "${questionText}"... Target: ${answer}`);

  try {
    await scrollDownToText(driver, questionText);
    await driver.pause(500);

    const radioBtnXpath = `//android.widget.TextView[@text="${questionText}"]/../following-sibling::android.widget.RadioGroup//android.widget.RadioButton[@text="${answer}"]`;
    const radioBtn = await driver.$(radioBtnXpath);

    await radioBtn.waitForDisplayed({ timeout: 5000 });

    const isChecked = await radioBtn.getAttribute('checked');
    if (isChecked === 'true') {
      console.log(`⏭ "${questionText}" is already set to ${answer}.`);
      return;
    }

    const isClickable = await radioBtn.getAttribute('clickable');
    const isEnabled = await radioBtn.getAttribute('enabled');

    if (isClickable === 'false' || isEnabled === 'false') {
      console.log(`⏭ "${questionText}" is not clickable or is disabled. Moving to next column...`);
      return;
    }

    await radioBtn.click();
    console.log(`✔ "${questionText}" set to: ${answer}`);

  } catch (error) {
    console.log(`⚠️ Could not interact with "${questionText}". Skipping to next column...`);
  }
}

async function fillBadObstetricHistory(driver, answer) {
  const questionText = "Bad obstetric history";
  console.log(`Processing "${questionText}"... Target: ${answer}`);

  try {
    await scrollDownToText(driver, questionText);
    await driver.pause(500);

    const radioBtnXpath = `//android.widget.TextView[@text="${questionText}"]/../following-sibling::android.widget.RadioGroup//android.widget.RadioButton[@text="${answer}"]`;
    const radioBtn = await driver.$(radioBtnXpath);

    await radioBtn.waitForDisplayed({ timeout: 5000 });

    const isChecked = await radioBtn.getAttribute('checked');
    if (isChecked === 'true') {
      console.log(`⏭ "${questionText}" is already set to ${answer}.`);
      return;
    }

    const isClickable = await radioBtn.getAttribute('clickable');
    const isEnabled = await radioBtn.getAttribute('enabled');

    if (isClickable === 'false' || isEnabled === 'false') {
      console.log(`⏭ "${questionText}" is not clickable or is disabled. Moving to next column...`);
      return;
    }

    await radioBtn.click();
    console.log(`✔ "${questionText}" set to: ${answer}`);

  } catch (error) {
    console.log(`⚠️ Could not interact with "${questionText}". Skipping to next column...`);
  }
}

async function fillMultiplePregnancy(driver, answer) {
  const questionText = "Multiple Pregnancy";
  console.log(`Processing "${questionText}"... Target: ${answer}`);

  try {
    await scrollDownToText(driver, questionText);
    await driver.pause(500);

    const radioBtnXpath = `//android.widget.TextView[@text="${questionText}"]/../following-sibling::android.widget.RadioGroup//android.widget.RadioButton[@text="${answer}"]`;
    const radioBtn = await driver.$(radioBtnXpath);

    await radioBtn.waitForDisplayed({ timeout: 5000 });

    const isChecked = await radioBtn.getAttribute('checked');
    if (isChecked === 'true') {
      console.log(`⏭ "${questionText}" is already set to ${answer}.`);
      return;
    }

    const isClickable = await radioBtn.getAttribute('clickable');
    const isEnabled = await radioBtn.getAttribute('enabled');

    if (isClickable === 'false' || isEnabled === 'false') {
      console.log(`⏭ "${questionText}" is not clickable or is disabled. Moving to next column...`);
      return;
    }

    await radioBtn.click();
    console.log(`✔ "${questionText}" set to: ${answer}`);

  } catch (error) {
    console.log(`⚠️ Could not interact with "${questionText}". Skipping to next column...`);
  }
}

async function fillHrpAndSubmit(driver) {
  const hrpText = "Who had identified as HRP? *";

  // 1. First, scroll down to see if the element appears at the bottom
  await scrollDownToText(driver, hrpText, 3); // Max 3 scrolls to check

  // 2. Check if the specific spinner exists
  const hrpSpinner = await driver.$(`//android.widget.Spinner[@text="${hrpText}"]`);
  const isHrpPresent = await hrpSpinner.isExisting();

  if (isHrpPresent) {
    console.log('⚠️ HRP field detected. Processing...');
    await hrpSpinner.click();
    await driver.pause(1500); // Wait for dropdown to fully open

    // Get the coordinates from your HRP_COORDS object
    const coords = HRP_COORDS[FORM_DATA.hrpIdentifier];
    if (!coords) {
      throw new Error(`❌ HRP choice "${FORM_DATA.hrpIdentifier}" not found in coordinates object.`);
    }

    await tapAt(driver, coords.x, coords.y);
    console.log(`✔ HRP set to "${FORM_DATA.hrpIdentifier}" via coordinates`);
    await driver.pause(1000);
  } else {
    console.log('⏭ HRP field not present. Skipping directly to Submit...');
  }

  // 3. Find and click the Submit button
  await scrollDownToText(driver, "Submit", 3);
  const submitBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit")');

  await submitBtn.waitForDisplayed({ timeout: 5000 });
  await submitBtn.click();
  console.log('✔ Form submitted successfully');
}

// ── Exported Execution Function ───────────────────────────────────────────────
async function fillPregnancyForm(driver) {
  await fillDateOfRegistration(driver);
  await driver.pause(1000);
  await fillRchId(driver);
  await driver.pause(1000);
  await fillLmpDate(driver);
  await driver.pause(1000);
  await fillBloodGroup(driver);
  await driver.pause(1000);
  await fillWeight(driver);
  await driver.pause(1000);
  await fillHeight(driver);
  await driver.pause(1000);
  await fillDiseaseInformation(driver);
  await driver.pause(1000);

  await fillFirstPregnancy(driver, "No");
  await driver.pause(1000);
  // New Delivery History logic
  await fillMoreThanThreeDeliveries(driver, FORM_DATA.moreThanThreeDeliveries);
  await driver.pause(1000);
  await fillTimeFromLastDelivery(driver, FORM_DATA.timeFromLastDelivery);
  await driver.pause(1000);
  // New Delivery History logic
  await fillHeightShortness(driver, FORM_DATA.heightShortness);
  await driver.pause(1000);
  await fillAgeRiskFactor(driver, FORM_DATA.ageRiskFactor);
  await driver.pause(1000);
  await fillRhNegative(driver, FORM_DATA.rhNegative);
  await driver.pause(1000);
  await fillHomeDeliveryPreviousPregnancy(driver, FORM_DATA.homeDeliveryPreviousPregnancy);
  await driver.pause(1000);
  await fillBadObstetricHistory(driver, FORM_DATA.badObstetricHistory);
  await driver.pause(1000);
  await fillMultiplePregnancy(driver, FORM_DATA.multiplePregnancy);
  await driver.pause(1000);

  // Replaced submitForm with combined HRP & Submit handler
  await fillHrpAndSubmit(driver);
}

module.exports = { fillPregnancyForm };