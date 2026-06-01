const FORM_DATA = {
  dateOfRegistration: { day: 6, month: 3, year: 2026 },
  rchId: '123456789967',
  lmpDate: { day: 1, month: 1, year: 2026 },
  bloodGroup: 'B +Ve',
  weight: '55',
  height: '160',
  previousPregnancies: '1',
  lastPregnancyComplication: 'Any Other',
  anyOtherComplicationDetails: 'Severe weakness',
  moreThanThreeDeliveries: 'No',
  timeFromLastDelivery: 'No',
  heightShortness: 'Yes',
  ageRiskFactor: 'Yes',
  rhNegative: 'Yes',
  homeDeliveryPreviousPregnancy: 'No',
  badObstetricHistory: 'No',
  multiplePregnancy: 'No',
  hrpIdentifier: 'ANM'
};

// ─────────────────────────────────────────────────────────────
//  CORE HELPER — Shared spinner click + XML bounds tap
//  Paste this below your scrollSpinnerToMiddle function
// ─────────────────────────────────────────────────────────────

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList) {
    // 1. Force the spinner to the safe middle zone of the screen BEFORE clicking
    await scrollSpinnerToMiddle(driver, spinnerSelector);

    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();
    console.log(`📍 Spinner @ (${loc.x}, ${loc.y}), size (${size.width}x${size.height})`);

    // 2. Click the RIGHT side of the spinner to explicitly hit the dropdown arrow
    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);

    console.log(`📍 Tapping dropdown arrow at (${tapX}, ${tapY})`);
    await tapByCoords(driver, tapX, tapY);
    await driver.pause(2000);

    // ─── STRATEGY 0: Direct XPath ───
    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`✅ Selected "${value}" via XPath`);
        return;
    } catch (e) {
        console.log(`⚠️  XPath strategy failed: ${e.message}`);
    }

    // ─── STRATEGY 1: UiSelector ───
    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via UiSelector`);
        return;
    } catch (e) {
        console.log(`⚠️  UiSelector strategy failed: ${e.message}`);
    }

    // ─── STRATEGY 2: Tag-by-tag XML parse ───
    try {
        const source = await driver.getPageSource();
        const nodes = source.match(/<[^>]+>/g) || [];
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const textRegex = new RegExp(`(?:text|content-desc)="\\s*${escapedValue}\\s*"`);
        let foundNode = null;

        for (const node of nodes) {
            if (textRegex.test(node) && node.includes('bounds=')) {
                foundNode = node;
                break;
            }
        }

        if (foundNode) {
            const boundsMatch = foundNode.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
            if (boundsMatch) {
                const bTapX = Math.floor((parseInt(boundsMatch[1]) + parseInt(boundsMatch[3])) / 2);
                const bTapY = Math.floor((parseInt(boundsMatch[2]) + parseInt(boundsMatch[4])) / 2);
                console.log(`📍 Found "${value}" in XML (tag parse) → tap(${bTapX},${bTapY})`);
                await tapByCoords(driver, bTapX, bTapY);
                console.log(`✅ Selected "${value}" via tag parse`);
                return;
            }
        }
        console.log(`⚠️  "${value}" not found via tag parse, trying regex strategy...`);
    } catch (e) {
        console.log(`⚠️  Tag parse failed: ${e.message}`);
    }

    // ─── STRATEGY 3: Inline regex bounds ───
    try {
        const source = await driver.getPageSource();
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`text="${escapedValue}"[^/]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
        const match = source.match(regex);

        if (match) {
            const rTapX = Math.floor((parseInt(match[1]) + parseInt(match[3])) / 2);
            const rTapY = Math.floor((parseInt(match[2]) + parseInt(match[4])) / 2);
            console.log(`📍 Found "${value}" via regex → tap(${rTapX},${rTapY})`);
            await tapByCoords(driver, rTapX, rTapY);
            console.log(`✅ Selected "${value}" via regex`);
            return;
        }
        console.log(`⚠️  "${value}" not found via regex, trying coordinate fallback...`);
    } catch (e) {
        console.log(`⚠️  Regex strategy failed: ${e.message}`);
    }

    // ─── STRATEGY 4: Coordinate fallback ───
    const screen = await driver.getWindowRect();
    const idx = optionsList.indexOf(value);
    if (idx === -1) throw new Error(`"${value}" not in list: [${optionsList.join(', ')}]`);

    const rowHeight     = size.height;
    const spinnerBottom = loc.y + size.height;
    const opensUpward   = (screen.height - spinnerBottom) < (optionsList.length * rowHeight);
    const finalTapX     = Math.floor(loc.x + size.width / 2);
    let   finalTapY;

    if (opensUpward) {
        const reversedIdx = (optionsList.length - 1) - idx;
        finalTapY = Math.floor(loc.y - (reversedIdx * rowHeight) - (rowHeight / 2));
    } else {
        finalTapY = Math.floor(spinnerBottom + (idx * rowHeight) + (rowHeight / 2));
    }
    finalTapY = Math.max(5, Math.min(finalTapY, screen.height - 5));

    console.log(`📍 Coordinate fallback → tap(${finalTapX}, ${finalTapY})`);
    await tapByCoords(driver, finalTapX, finalTapY);
    console.log(`✅ Selected "${value}" via coordinates`);
}


const COMPLICATION_SPINNER_TAP = { x: 997, y: 417 };


const HRP_SPINNER_TAP = { x: 997, y: 2148 };

const SUBMIT_BTN_TAP = { x: 540, y: 2272 };

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December'
];

async function tapByCoords(driver, tapX, tapY) {
  await driver.performActions([{
    type: 'pointer', id: 'finger1',
    parameters: { pointerType: 'touch' },
    actions: [
      { type: 'pointerMove', duration: 0, x: tapX, y: tapY },
      { type: 'pointerDown', button: 0 },
      { type: 'pause', duration: 150 },
      { type: 'pointerUp', button: 0 }
    ]
  }]);
  await driver.releaseActions();
  await driver.pause(500);
}

async function tapAt(driver, x, y) {
  await driver.performActions([{
    type: 'pointer', id: 'finger1',
    parameters: { pointerType: 'touch' },
    actions: [
      { type: 'pointerMove', duration: 0, x, y },
      { type: 'pointerDown', button: 0 },
      { type: 'pause', duration: 100 },
      { type: 'pointerUp', button: 0 }
    ]
  }]);
  await driver.releaseActions();
}

async function scrollSpinnerToMiddle(driver, spinnerSelector) {
  try {
    const spinner = await driver.$(spinnerSelector);
    const loc = await spinner.getLocation();
    const screen = await driver.getWindowRect();
    const midY = screen.height / 2;

    if (loc.y > midY + 100) {
      const startY = Math.floor(screen.height * 0.7);
      const endY = Math.floor(screen.height * 0.3);
      const swipeX = Math.floor(screen.width / 2);

      await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: swipeX, y: startY },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 200 },
          { type: 'pointerMove', duration: 1000, x: swipeX, y: endY },
          { type: 'pointerUp', button: 0 }
        ]
      }]);
      await driver.releaseActions();
      await driver.pause(1500);
    }
  } catch (e) {
    console.log('⚠️ scrollSpinnerToMiddle skipped:', e.message);
  }
}

async function getFieldByIndex(driver, index, retries = 5) {
  for (let i = 0; i < retries; i++) {
    const fields = await driver.$$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/et")');
    if (fields.length > index) return fields[index];
    await driver.pause(1000);
  }
  throw new Error(`Could not find field at index ${index} after ${retries} retries`);
}

async function isEmpty(field, hintText) {
  try {
    const text = await field.getText();
    return !text || text.trim() === '' || text.trim() === hintText.trim();
  } catch {
    return true;
  }
}

async function scrollDownToText(driver, text, maxScrolls = 5) {
  const elementXPath = `//*[@text="${text}"]`;
  for (let i = 0; i < maxScrolls; i++) {
    try {
      const element = await driver.$(elementXPath);
      if ((await element.isExisting()) && (await element.isDisplayed())) return;
    } catch (e) {}

    const size = await driver.getWindowRect();
    const startX = Math.floor(size.width / 2);
    const startY = Math.floor(size.height * 0.70);
    const endY = Math.floor(size.height * 0.30);

    await driver.performActions([{
      type: 'pointer', id: 'finger1',
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
}

async function getCalendarMonthYear(driver) {
  try {
    const monthView = await driver.$('android=new UiSelector().resourceId("android:id/month_view")');
    const firstDay = await monthView.$('android=new UiSelector().index(0)');
    const contentDesc = await firstDay.getAttribute('content-desc');
    const parts = contentDesc.split(' ');
    const monthMap = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4,
      'May': 5, 'June': 6, 'July': 7, 'August': 8,
      'September': 9, 'October': 10, 'November': 11, 'December': 12
    };
    return { month: monthMap[parts[1]], year: parseInt(parts[2]) };
  } catch (error) {
    try {
      const headerDate = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_header_date")');
      const yearHeader = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_header_year")');
      const year = parseInt(await yearHeader.getText());
      const headerText = await headerDate.getText();
      const shortMonthMap = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
      };
      const monthAbbr = headerText.split(', ')[1].split(' ')[0];
      return { month: shortMonthMap[monthAbbr], year };
    } catch (e) {
      return null;
    }
  }
}

async function navigateToMonth(driver, targetMonth, targetYear) {
  const yearHeader = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_header_year")');
  const currentYear = parseInt(await yearHeader.getText());

  if (currentYear !== targetYear) {
    await yearHeader.click();
    await driver.pause(1000);
    const yearEl = await driver.$(`android=new UiScrollable(new UiSelector().resourceId("android:id/animator")).scrollIntoView(new UiSelector().text("${targetYear}"))`);
    await yearEl.click();
    await driver.pause(1000);
  }

  for (let i = 0; i < 24; i++) {
    const cur = await getCalendarMonthYear(driver);
    if (!cur) break;
    if (cur.month === targetMonth && cur.year === targetYear) break;

    const needPrev = (cur.year > targetYear) || (cur.year === targetYear && cur.month > targetMonth);

    if (needPrev) {
      const prevBtn = await driver.$('android=new UiSelector().resourceId("android:id/prev")');
      await prevBtn.click();
    } else {
      const nextBtn = await driver.$('android=new UiSelector().resourceId("android:id/next")');
      await nextBtn.click();
    }
    await driver.pause(600);
  }
}

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

  const okBtn = await driver.$('android=new UiSelector().resourceId("android:id/button1")');
  await okBtn.waitForDisplayed({ timeout: 3000 });
  await okBtn.click();
  await driver.pause(800);
}

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
  try {
    await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("RCH ID"))`);
    await driver.pause(500);
  } catch (e) {}

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

// ✅ NEW DYNAMIC VERSION
async function fillBloodGroup(driver) {
    // 1. Dynamically scroll to the Blood Group field
    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Blood Group"))');
        await driver.pause(500);
    } catch (e) {
        // Ignore if already in view
    }

    const spinnerSelector = 'android=new UiSelector().className("android.widget.Spinner").textContains("Blood Group")';
    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 5000 });

    const currentValue = await spinner.getText();

    // 2. Check if it's currently at the default placeholder
    if (!currentValue || currentValue.trim() === 'Blood Group') {
        console.log(`🔄 Opening Blood Group dropdown to select: ${FORM_DATA.bloodGroup}`);

        // 3. Call the dynamic helper function
        await clickSpinnerAndSelectOption(
            driver,
            spinnerSelector,
            FORM_DATA.bloodGroup,
            ['A +Ve', 'A -Ve', 'B +Ve', 'B -Ve', 'AB +Ve', 'AB -Ve', 'O +Ve', 'O -Ve']
        );
        console.log(`✔ Blood Group successfully set to ${FORM_DATA.bloodGroup}`);
    } else {
        console.log(`⏭ Blood Group already filled with: ${currentValue}`);
    }
}

async function fillWeight(driver) {
  await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Weight of PW (Kg) at time Registration"))`);
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
  await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Height of PW (Cm)"))`);
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

async function fillDiseaseInformation(driver) {
  await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("None"))`);

  const noneCheckbox = await driver.$('android=new UiSelector().className("android.widget.CheckBox").text("None")');
  await noneCheckbox.waitForDisplayed({ timeout: 5000 });
  await noneCheckbox.click();
  console.log('✔ Clicked None');

  const nextQuestion = await driver.$(`android=new UiSelector().text("Is this your 1st pregnancy? *")`);
  if (await nextQuestion.isExisting()) {
    await nextQuestion.click();
  }
}

// Ensure this function is defined BEFORE fillPregnancyForm
async function fillFirstPregnancy(driver, answer = 'No') {
    console.log(`🔄 Setting 'Is this your 1st pregnancy?' to: ${answer}`);

    // 1. Scroll to the question
    await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Is this your 1st pregnancy?"))`);
    await driver.pause(500);

    // 2. Select the Radio Button
    const radioBtn = await driver.$(`android=new UiSelector().className("android.widget.RadioButton").text("${answer}")`);
    await radioBtn.waitForDisplayed({ timeout: 5000 });
    await radioBtn.click();
    console.log(`✔ First Pregnancy set to: ${answer}`);

    // 3. IF NO, trigger the additional fields
    if (answer === 'No') {
        console.log("📝 Handling non-first pregnancy fields...");

        // Find and fill "Total no. of previous Pregnancy"
        const prevPregField = await driver.$('//android.widget.EditText[contains(@text, "Total no. of previous Pregnancy")]');
        if (await prevPregField.isExisting()) {
            await prevPregField.click();
            await prevPregField.setValue(FORM_DATA.previousPregnancies);
            if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        }

        // Now trigger the complication dropdown
        await fillLastPregnancyComplication(driver);
    }
}
async function fillLastPregnancyComplication(driver) {
    const targetValue = FORM_DATA.lastPregnancyComplication;
    console.log(`🔄 Attempting to select complication: ${targetValue}`);

    // 1. Scroll the spinner into the middle of the screen so the popup opens downward
    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().hint("Any complications in Last Pregnancy"))');
        await driver.pause(500);
    } catch (e) {
        console.log('⚠️ Scroll skipped:', e.message);
    }

    // 2. Find the complication spinner specifically by its hint attribute
    const spinnerSelector = 'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown").description("Show dropdown menu").instance(0)';

    // Use the drop icon button directly — it's more reliable than the spinner body
    let dropdownBtn;
    try {
        // Find the spinner with the complication hint, then tap its dropdown arrow
        const spinner = await driver.$('android=new UiSelector().hint("Any complications in Last Pregnancy")');
        await spinner.waitForDisplayed({ timeout: 5000 });

        const loc  = await spinner.getLocation();
        const size = await spinner.getSize();

        // Tap the right-side arrow of the spinner
        const tapX = Math.floor(loc.x + size.width - 50);
        const tapY = Math.floor(loc.y + size.height / 2);
        console.log(`📍 Tapping complication spinner arrow at (${tapX}, ${tapY})`);
        await tapByCoords(driver, tapX, tapY);
        await driver.pause(2000);
    } catch (e) {
        console.log('⚠️ Could not tap spinner by hint, trying resourceId fallback:', e.message);
        // Fallback: tap the last actv_rv_dropdown on screen (complication is always after blood group)
        const allSpinners = await driver.$$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown")');
        const last = allSpinners[allSpinners.length - 1];
        await last.click();
        await driver.pause(2000);
    }

    // 3. Now select from the popup using CheckedTextView + exact text + resourceId
    //    This is exactly what the XML shows: class="android.widget.CheckedTextView" resource-id="android:id/text1"
    const optionsList = [
        'None', 'CONVULSIONS', 'APH',
        'PREGNANCY INDUCED HYPERTENSION (PIH)', 'REPEATED ABORTION',
        'STILLBIRTH', 'CONGENITAL ANOMALY', 'CAESAREAN SECTION',
        'BLOOD TRANSFUSION', 'TWINS', 'OBSTRUCTED LABOUR', 'PPH', 'Any Other'
    ];

    let selected = false;

    // Strategy A: CheckedTextView by resourceId + text (most precise for this popup)
    try {
        const item = await driver.$(
            `android=new UiSelector().resourceId("android:id/text1").className("android.widget.CheckedTextView").text("${targetValue}")`
        );
        await item.waitForDisplayed({ timeout: 5000 });
        await item.click();
        console.log(`✅ Selected "${targetValue}" via CheckedTextView UiSelector`);
        selected = true;
    } catch (e) {
        console.log(`⚠️ CheckedTextView UiSelector failed: ${e.message}`);
    }

    // Strategy B: XPath scoped to CheckedTextView class
    if (!selected) {
        try {
            const item = await driver.$(
                `//android.widget.CheckedTextView[@text="${targetValue}" and @resource-id="android:id/text1"]`
            );
            await item.waitForDisplayed({ timeout: 4000 });
            await item.click();
            console.log(`✅ Selected "${targetValue}" via scoped XPath`);
            selected = true;
        } catch (e) {
            console.log(`⚠️ Scoped XPath failed: ${e.message}`);
        }
    }

    // Strategy C: Read XML, find the CheckedTextView bounds for this exact text, tap it
    if (!selected) {
        try {
            const source = await driver.getPageSource();
            const escapedValue = targetValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Match only CheckedTextView nodes containing the target text
            const regex = new RegExp(
                `class="android\\.widget\\.CheckedTextView"[^>]*?text="${escapedValue}"[^>]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`
            );
            const altRegex = new RegExp(
                `text="${escapedValue}"[^>]*?class="android\\.widget\\.CheckedTextView"[^>]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`
            );
            const match = source.match(regex) || source.match(altRegex);

            if (match) {
                const tapX = Math.floor((parseInt(match[1]) + parseInt(match[3])) / 2);
                const tapY = Math.floor((parseInt(match[2]) + parseInt(match[4])) / 2);
                console.log(`📍 Found "${targetValue}" in XML → tap(${tapX}, ${tapY})`);
                await tapByCoords(driver, tapX, tapY);
                console.log(`✅ Selected "${targetValue}" via XML bounds`);
                selected = true;
            }
        } catch (e) {
            console.log(`⚠️ XML bounds strategy failed: ${e.message}`);
        }
    }

    // Strategy D: Coordinate fallback using known popup bounds from XML
    // Popup: [43,742][1037,2102], each row ~102px tall, first item "None" starts at y=759
    if (!selected) {
        const idx = optionsList.indexOf(targetValue);
        if (idx === -1) throw new Error(`"${targetValue}" not found in optionsList`);

        const ROW_HEIGHT = 102;
        const POPUP_START_Y = 759; // from XML: first CheckedTextView top bound
        const tapX = 540; // center of popup width
        const tapY = Math.floor(POPUP_START_Y + (idx * ROW_HEIGHT) + (ROW_HEIGHT / 2));

        console.log(`📍 Coordinate fallback → idx=${idx}, tap(${tapX}, ${tapY})`);
        await tapByCoords(driver, tapX, tapY);
        console.log(`✅ Selected "${targetValue}" via coordinate fallback`);
        selected = true;
    }

    if (!selected) throw new Error(`❌ Could not select "${targetValue}" from complication dropdown`);

    // 4. Handle "Any Other" extra text field
    if (targetValue === 'Any Other') {
        try {
            await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Any other Complication"))');
            await driver.pause(500);
            const anyOtherField = await driver.$('//android.widget.EditText[contains(@hint, "Any other Complication")]');
            await anyOtherField.waitForDisplayed({ timeout: 5000 });
            await anyOtherField.click();
            await driver.pause(300);
            await anyOtherField.setValue(FORM_DATA.anyOtherComplicationDetails);
            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
                await driver.pause(500);
            }
            console.log('✔ Any Other complication details filled');
        } catch (e) {
            console.log('⚠️ Could not fill Any Other details:', e.message);
        }
    }

    console.log(`✔ Last Pregnancy Complication set to: ${targetValue}`);
}
async function fillRadioQuestion(driver, questionText, answer) {
  try {
    await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${questionText}"))`);
    await driver.pause(500);

    const radioBtnXpath = `//android.widget.TextView[@text="${questionText}"]/../following-sibling::android.widget.RadioGroup//android.widget.RadioButton[@text="${answer}"]`;
    const radioBtn = await driver.$(radioBtnXpath);
    await radioBtn.waitForDisplayed({ timeout: 5000 });

    if (await radioBtn.getAttribute('checked') === 'true') {
      console.log(`⏭ "${questionText}" already set to ${answer}`);
      return;
    }

    if (await radioBtn.getAttribute('clickable') === 'false' || await radioBtn.getAttribute('enabled') === 'false') {
      console.log(`⏭ "${questionText}" not clickable/disabled, skipping`);
      return;
    }

    await radioBtn.click();
    console.log(`✔ "${questionText}" set to: ${answer}`);
  } catch (error) {
    console.log(`⚠️ Could not interact with "${questionText}". Skipping...`);
  }
}

// ✅ NEW DYNAMIC VERSION
async function fillHrpAndSubmit(driver) {
    // 1. Dynamically scroll to the HRP field (if it exists)
    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Who had identified as HRP"))');
        await driver.pause(500);
    } catch (e) {
        // Ignore if already visible or not present
    }

    const spinnerSelector = 'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown").textContains("Who had identified as HRP")';
    const hrpSpinner = await driver.$(spinnerSelector);
    const isHrpPresent = await hrpSpinner.isExisting();

    // 2. Handle the dropdown dynamically
    if (isHrpPresent) {
        const currentValue = await hrpSpinner.getText();
        const targetValue = FORM_DATA.hrpIdentifier;

        if (currentValue !== targetValue) {
            console.log(`🔄 Opening HRP dropdown to select: ${targetValue}`);

            // Note: Make sure the hyphen matches exactly what's in the XML (often an en-dash \u2013)
            const optionsList = ['ANM', 'CHO', 'PHC – MO', 'Specialist at Higher Facility'];

            await clickSpinnerAndSelectOption(
                driver,
                spinnerSelector,
                targetValue,
                optionsList
            );
            console.log(`✔ HRP successfully set to "${targetValue}"`);
        } else {
            console.log(`⏭ HRP already set to "${targetValue}"`);
        }
    } else {
        console.log('⏭ HRP field not present. Skipping...');
    }

    // 3. Dynamically tap the Submit button using its ID
    console.log('🔍 Clicking Submit button...');
    const submitBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit")');
    await submitBtn.waitForDisplayed({ timeout: 10000 });
    await submitBtn.click();

    console.log('✔ Form submitted successfully');
}

async function fillPregnancyForm(driver) {
  await fillDateOfRegistration(driver);
  await driver.pause(2000);

  await fillRchId(driver);
  await driver.pause(1000);

  await fillLmpDate(driver);
  await driver.pause(2000);

  await fillBloodGroup(driver);
  await driver.pause(1000);

  await fillWeight(driver);
  await driver.pause(1000);

  await fillHeight(driver);
  await driver.pause(1000);

  await fillDiseaseInformation(driver);
  await driver.pause(1000);

  await fillFirstPregnancy(driver, 'No');
  await driver.pause(1000);

  await fillRadioQuestion(driver, 'No. of Deliveries is more than 3', FORM_DATA.moreThanThreeDeliveries);
  await driver.pause(1000);

  await fillRadioQuestion(driver, 'Time from last delivery is less than 18 months', FORM_DATA.timeFromLastDelivery);
  await driver.pause(1000);

  await fillRadioQuestion(driver, 'Height is very short or less than 140 cms', FORM_DATA.heightShortness);
  await driver.pause(1000);

  await fillRadioQuestion(driver, 'Age is less than 18 or more than 35 years', FORM_DATA.ageRiskFactor);
  await driver.pause(1000);

  await fillRadioQuestion(driver, 'Rh Negative', FORM_DATA.rhNegative);
  await driver.pause(1000);

  await fillRadioQuestion(driver, 'Home delivery of previous pregnancy', FORM_DATA.homeDeliveryPreviousPregnancy);
  await driver.pause(1000);

  await fillRadioQuestion(driver, 'Bad obstetric history', FORM_DATA.badObstetricHistory);
  await driver.pause(1000);

  await fillRadioQuestion(driver, 'Multiple Pregnancy', FORM_DATA.multiplePregnancy);
  await driver.pause(1000);

  await fillHrpAndSubmit(driver);
}

module.exports = { fillPregnancyForm };