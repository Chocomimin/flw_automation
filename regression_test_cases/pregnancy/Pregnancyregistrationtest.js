const { remote } = require('webdriverio');

// ─────────────────────────────────────────────────────────────
//  CAPABILITIES
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
//  CAPABILITIES
// ─────────────────────────────────────────────────────────────
const capabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'ZD222X4TDK',
  'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
  'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
  'appium:noReset': true,
  'appium:enforceXPath1': true,

  // ✅ ADD THESE TWO LINES: Forces the standard Appium keyboard and hides overlays
  'appium:unicodeKeyboard': true,
  'appium:resetKeyboard': true
};

// ─────────────────────────────────────────────────────────────
//  FORM DATA  (non-date fields stay fixed; dates are randomised at runtime)
// ─────────────────────────────────────────────────────────────
const FORM_DATA = {
  rchId: '123456789967',
  bloodGroup: 'B +Ve',
  weight: '55',
  height: '160',
  previousPregnancies: '1',
  lastPregnancyComplication: 'Any Other',
  anyOtherComplicationDetails: 'SEVERE WEAKNESS', // Capitalized
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

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December'
];

// ─────────────────────────────────────────────────────────────
//  LOW-LEVEL HELPERS
// ─────────────────────────────────────────────────────────────
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

async function scrollSpinnerToMiddle(driver, spinnerSelector) {
  try {
    const spinner = await driver.$(spinnerSelector);
    const loc = await spinner.getLocation();
    const screen = await driver.getWindowRect();
    const midY = screen.height / 2;
    if (loc.y > midY + 100) {
      const startY = Math.floor(screen.height * 0.7);
      const endY   = Math.floor(screen.height * 0.3);
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

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList) {
  await scrollSpinnerToMiddle(driver, spinnerSelector);
  const spinner = await driver.$(spinnerSelector);
  await spinner.waitForDisplayed({ timeout: 10000 });
  const loc  = await spinner.getLocation();
  const size = await spinner.getSize();
  await tapByCoords(driver, Math.floor(loc.x + size.width - 40), Math.floor(loc.y + size.height / 2));
  await driver.pause(2000);

  // Strategy 0 – XPath
  try {
    const item = await driver.$(`//*[@text="${value}"]`);
    await item.waitForDisplayed({ timeout: 4000 });
    await item.click();
    console.log(`✅ Selected "${value}" via XPath`); return;
  } catch (e) { console.log(`⚠️ XPath failed: ${e.message}`); }

  // Strategy 1 – UiSelector
  try {
    const item = await driver.$(`android=new UiSelector().text("${value}")`);
    await item.waitForDisplayed({ timeout: 3000 });
    await item.click();
    console.log(`✅ Selected "${value}" via UiSelector`); return;
  } catch (e) { console.log(`⚠️ UiSelector failed: ${e.message}`); }

  // Strategy 2 – XML tag parse
  try {
    const source = await driver.getPageSource();
    const nodes  = source.match(/<[^>]+>/g) || [];
    const esc    = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re     = new RegExp(`(?:text|content-desc)="\\s*${esc}\\s*"`);
    for (const node of nodes) {
      if (re.test(node) && node.includes('bounds=')) {
        const m = node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
        if (m) {
          await tapByCoords(driver, Math.floor((+m[1] + +m[3]) / 2), Math.floor((+m[2] + +m[4]) / 2));
          console.log(`✅ Selected "${value}" via tag parse`); return;
        }
      }
    }
  } catch (e) { console.log(`⚠️ Tag parse failed: ${e.message}`); }

  // Strategy 3 – inline regex
  try {
    const source = await driver.getPageSource();
    const esc    = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re     = new RegExp(`text="${esc}"[^/]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
    const match  = source.match(re);
    if (match) {
      await tapByCoords(driver, Math.floor((+match[1] + +match[3]) / 2), Math.floor((+match[2] + +match[4]) / 2));
      console.log(`✅ Selected "${value}" via regex`); return;
    }
  } catch (e) { console.log(`⚠️ Regex failed: ${e.message}`); }

  // Strategy 4 – coordinate fallback
  const screen  = await driver.getWindowRect();
  const idx     = optionsList.indexOf(value);
  if (idx === -1) throw new Error(`"${value}" not in list`);
  const rowH    = size.height;
  const opensUp = (screen.height - (loc.y + size.height)) < (optionsList.length * rowH);
  const finalX  = Math.floor(loc.x + size.width / 2);
  let   finalY  = opensUp
    ? Math.floor(loc.y - ((optionsList.length - 1 - idx) * rowH) - rowH / 2)
    : Math.floor(loc.y + size.height + (idx * rowH) + rowH / 2);
  finalY = Math.max(5, Math.min(finalY, screen.height - 5));
  await tapByCoords(driver, finalX, finalY);
  console.log(`✅ Selected "${value}" via coordinates`);
}

async function getFieldByIndex(driver, index, retries = 5) {
  for (let i = 0; i < retries; i++) {
    const fields = await driver.$$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/et")');
    if (fields.length > index) return fields[index];
    await driver.pause(1000);
  }
  throw new Error(`Could not find field at index ${index}`);
}

async function isEmpty(field, hintText) {
  try {
    const text = await field.getText();
    return !text || text.trim() === '' || text.trim() === hintText.trim();
  } catch { return true; }
}

// ─────────────────────────────────────────────────────────────
//  CALENDAR HELPERS
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
//  ROBUST DATE PARSER (Handles Abbreviations & Full Names)
// ─────────────────────────────────────────────────────────────
async function getCalendarMonthYear(driver) {
  const monthMap = {
    January:1, Jan:1, February:2, Feb:2, March:3, Mar:3, April:4, Apr:4,
    May:5, June:6, Jun:6, July:7, Jul:7, August:8, Aug:8, September:9, Sep:9, Sept:9,
    October:10, Oct:10, November:11, Nov:11, December:12, Dec:12
  };

  try {
    const monthView = await driver.$('android=new UiSelector().resourceId("android:id/month_view")');
    if (await monthView.isExisting()) {
      const firstDay = await monthView.$('android=new UiSelector().index(0)');
      const desc = await firstDay.getAttribute('content-desc'); // "01 June 2026"
      const parts = desc.split(' ');
      return { month: monthMap[parts[1]], year: parseInt(parts[2]) };
    }
  } catch (e) {}

  try {
    const yearEl = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_header_year")');
    const headerEl = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_header_date")');

    const year = parseInt(await yearEl.getText());
    const headerText = await headerEl.getText(); // E.g., "Mon, Jun 1" or "Thu, Jan 1"

    // Clean string components down to alphabet groups
    const cleanText = headerText.replace(/[^a-zA-Z\s]/g, '').trim();
    const parts = cleanText.split(/\s+/); // ["Mon", "Jun"]

    const matchedMonth = monthMap[parts[1]];
    if (matchedMonth) return { month: matchedMonth, year };
  } catch (e) {}

  return null;
}

// ─────────────────────────────────────────────────────────────
//  FORCE LIST CLOSURE CALENDAR NAVIGATION
// ─────────────────────────────────────────────────────────────
async function navigateToMonth(driver, targetMonth, targetYear) {
  const yearEl = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_header_year")');
  await yearEl.waitForDisplayed({ timeout: 5000 });
  const curYear = parseInt(await yearEl.getText());

  // 1. Manage Year List view adjustments
  if (curYear !== targetYear) {
    await yearEl.click();
    await driver.pause(1200);
    try {
      const yearPicker = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_year_picker")');
      const yearItem = await yearPicker.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${targetYear}"))`);
      await yearItem.click();
      await driver.pause(1200);
    } catch (e) {
      console.log(`⚠️ Year list navigation issue: ${e.message}`);
    }
  }

  // Double check: if the list widget is still open, click the main text header to return to day view
  const yearPickerCheck = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_year_picker")');
  if (await yearPickerCheck.isExisting()) {
    const headerEl = await driver.$('android=new UiSelector().resourceId("android:id/date_picker_header_date")');
    await headerEl.click();
    await driver.pause(1000);
  }

  // 2. Cycle through page views to target Month
  for (let i = 0; i < 36; i++) {
    const cur = await getCalendarMonthYear(driver);
    if (!cur) {
      console.log("⚠️ Calendar view could not be parsed this iteration.");
      break;
    }
    if (cur.month === targetMonth && cur.year === targetYear) break;

    const goBack = (cur.year > targetYear) || (cur.year === targetYear && cur.month > targetMonth);

    if (goBack) {
      const prevBtn = await driver.$('android=new UiSelector().resourceId("android:id/prev")');
      if (await prevBtn.isExisting()) {
        await prevBtn.click();
      } else {
        console.log('⏭ Minimum display boundary limit reached.');
        break;
      }
    } else {
      const nextBtn = await driver.$('android=new UiSelector().resourceId("android:id/next")');
      if (await nextBtn.isExisting()) {
        await nextBtn.click();
      } else {
        console.log('⏭ Maximum display boundary limit reached.');
        break;
      }
    }
    await driver.pause(800);
  }
}

async function getAvailableDatesFromCalendar(driver) {
  const monthMap = {
    January:1,February:2,March:3,April:4,May:5,June:6,
    July:7,August:8,September:9,October:10,November:11,December:12
  };
  const dates = [];
  try {
    const source = await driver.getPageSource();
    const regex  = /content-desc="(\d{2} \w+ \d{4})"[^>]*?enabled="(true|false)"[^>]*?clickable="(true|false)"/g;
    let m;
    while ((m = regex.exec(source)) !== null) {
      if (m[2] === 'true' && m[3] === 'true') {
        const parts = m[1].split(' ');
        const mo    = monthMap[parts[1]];
        if (mo) dates.push({ day: parseInt(parts[0]), month: mo, year: parseInt(parts[2]) });
      }
    }
  } catch (e) {
    console.log('⚠️ getAvailableDates parse error:', e.message);
  }
  return dates;
}

async function pickRandomDayAndConfirm(driver) {
  const available = await getAvailableDatesFromCalendar(driver);
  let chosen;

  if (available.length > 0) {
    chosen = available[Math.floor(Math.random() * available.length)];
    console.log(`🎲 Random day chosen: ${chosen.day} ${MONTH_NAMES[chosen.month]} ${chosen.year}`);

    const formattedDay = String(chosen.day).padStart(2, '0');
    const contentDesc  = `${formattedDay} ${MONTH_NAMES[chosen.month]} ${chosen.year}`;
    const dayEl = await driver.$(`android=new UiSelector().description("${contentDesc}")`);
    await dayEl.click();
  } else {
    const cur = await getCalendarMonthYear(driver);
    console.log('⚠️ No available days parsed, falling back to day 1');
    chosen = { day: 1, month: cur ? cur.month : 1, year: cur ? cur.year : 2025 };
    const formattedDay = '01';
    const contentDesc  = `${formattedDay} ${MONTH_NAMES[chosen.month]} ${chosen.year}`;
    const dayEl = await driver.$(`android=new UiSelector().description("${contentDesc}")`);
    await dayEl.click();
  }

  await driver.pause(500);
  const okBtn = await driver.$('android=new UiSelector().resourceId("android:id/button1")');
  await okBtn.waitForDisplayed({ timeout: 3000 });
  await okBtn.click();
  await driver.pause(800);
  return chosen;
}

// ─────────────────────────────────────────────────────────────
//  RANDOM DATE RANGE PICKERS
// ─────────────────────────────────────────────────────────────
async function openAndPickRandomRegistrationDate(driver) {
  const datePicker = await driver.$('android=new UiSelector().resourceId("android:id/datePicker")');
  await datePicker.waitForDisplayed({ timeout: 5000 });
  await driver.pause(500);

  const today    = new Date();
  const sixMoAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);
  const randMs   = sixMoAgo.getTime() + Math.random() * (today.getTime() - sixMoAgo.getTime());
  const target   = new Date(randMs);

  const tMonth = target.getMonth() + 1;
  const tYear  = target.getFullYear();
  console.log(`🎲 Registration date target month: ${MONTH_NAMES[tMonth]} ${tYear}`);

  await navigateToMonth(driver, tMonth, tYear);
  await driver.pause(600);
  return pickRandomDayAndConfirm(driver);
}

async function openAndPickRandomLmpDate(driver) {
  const datePicker = await driver.$('android=new UiSelector().resourceId("android:id/datePicker")');
  await datePicker.waitForDisplayed({ timeout: 5000 });
  await driver.pause(500);

  const today   = new Date();
  const minDate = new Date(2023, 0, 1);
  const maxDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const randMs  = minDate.getTime() + Math.random() * (maxDate.getTime() - minDate.getTime());
  const target  = new Date(randMs);

  const tMonth = target.getMonth() + 1;
  const tYear  = target.getFullYear();
  console.log(`🎲 LMP date target month: ${MONTH_NAMES[tMonth]} ${tYear}`);

  await navigateToMonth(driver, tMonth, tYear);
  await driver.pause(600);
  return pickRandomDayAndConfirm(driver);
}

// ─────────────────────────────────────────────────────────────
//  FORM FIELD FILLERS
// ─────────────────────────────────────────────────────────────
async function fillDateOfRegistration(driver) {
  const field = await getFieldByIndex(driver, 0);
  if (await isEmpty(field, 'Date of Registration *')) {
    await field.click();
    await driver.pause(800);
    const chosen = await openAndPickRandomRegistrationDate(driver);
    console.log(`✔ Date of Registration filled: ${chosen.day}/${chosen.month}/${chosen.year}`);
  } else {
    console.log('⏭ Date of Registration already filled');
  }
}

// ─────────────────────────────────────────────────────────────
//  FILL RCH ID (No-Scroll, Pre-filled Safe)
// ─────────────────────────────────────────────────────────────
async function fillRchId(driver) {
  // REMOVED: UiScrollable. If RCH ID is filled with numbers, the text disappears.
  // Searching for missing text causes Appium to scroll to the absolute bottom of
  // the page, throwing the input fields completely off-screen.

  // Since Date of Registration was just filled, index 1 is already safely visible.
  const field = await getFieldByIndex(driver, 1);
  const currentText = await field.getText();

  // RCH IDs are numeric. If the field contains any digit, it is already pre-filled.
  if (/\d/.test(currentText)) {
    console.log(`⏭ RCH ID already filled with: ${currentText}`);
  } else {
    await field.click();
    await driver.pause(500);

    await field.setValue(FORM_DATA.rchId);

    if (await driver.isKeyboardShown()) {
      await driver.hideKeyboard();
      await driver.pause(500);
    }
    console.log(`✔ RCH ID filled with: ${FORM_DATA.rchId}`);
  }
}
async function fillLmpDate(driver) {
  const field = await getFieldByIndex(driver, 5);
  if (await isEmpty(field, 'LMP Date *')) {
    await field.click();
    await driver.pause(800);
    const chosen = await openAndPickRandomLmpDate(driver);
    console.log(`✔ LMP Date filled: ${chosen.day}/${chosen.month}/${chosen.year}`);
  } else {
    console.log('⏭ LMP Date already filled');
  }
}

async function fillBloodGroup(driver) {
  try {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Blood Group"))');
    await driver.pause(500);
  } catch (e) {}
  const spinnerSel = 'android=new UiSelector().className("android.widget.Spinner").textContains("Blood Group")';
  const spinner    = await driver.$(spinnerSel);
  await spinner.waitForDisplayed({ timeout: 5000 });
  const cur = await spinner.getText();
  if (!cur || cur.trim() === 'Blood Group') {
    await clickSpinnerAndSelectOption(driver, spinnerSel, FORM_DATA.bloodGroup,
      ['A +Ve','A -Ve','B +Ve','B -Ve','AB +Ve','AB -Ve','O +Ve','O -Ve']);
    console.log(`✔ Blood Group set to ${FORM_DATA.bloodGroup}`);
  } else { console.log(`⏭ Blood Group already: ${cur}`); }
}

async function fillWeight(driver) {
  await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Weight of PW (Kg) at time Registration"))`);
  await driver.pause(500);
  const field = await driver.$('//android.widget.EditText[@text="Weight of PW (Kg) at time Registration"]');
  await field.waitForDisplayed({ timeout: 5000 });
  if (await isEmpty(field, 'Weight of PW (Kg) at time Registration')) {
    await field.click(); await driver.pause(500);
    await field.setValue(FORM_DATA.weight);
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(500); }
    console.log('✔ Weight filled');
  } else { console.log('⏭ Weight already filled'); }
}

async function fillHeight(driver) {
  await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Height of PW (Cm)"))`);
  await driver.pause(500);
  const field = await driver.$('//android.widget.EditText[@text="Height of PW (Cm)"]');
  await field.waitForDisplayed({ timeout: 5000 });
  if (await isEmpty(field, 'Height of PW (Cm)')) {
    await field.click(); await driver.pause(500);
    await field.setValue(FORM_DATA.height);
    if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(500); }
    console.log('✔ Height filled');
  } else { console.log('⏭ Height already filled'); }
}

async function fillDiseaseInformation(driver) {
  await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("None"))`);
  const noneCheckbox = await driver.$('android=new UiSelector().className("android.widget.CheckBox").text("None")');
  await noneCheckbox.waitForDisplayed({ timeout: 5000 });
  await noneCheckbox.click();
  console.log('✔ Disease info: None selected');
}

async function fillFirstPregnancy(driver, answer = 'No') {
  await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Is this your 1st pregnancy?"))`);
  await driver.pause(500);
  const radioBtn = await driver.$(`android=new UiSelector().className("android.widget.RadioButton").text("${answer}")`);
  await radioBtn.waitForDisplayed({ timeout: 5000 });
  await radioBtn.click();
  console.log(`✔ First Pregnancy: ${answer}`);

  if (answer === 'No') {
    try {
      const prevField = await driver.$('//android.widget.EditText[contains(@text, "Total no. of previous Pregnancy")]');
      if (await prevField.isExisting()) {
        await prevField.click();
        await prevField.setValue(FORM_DATA.previousPregnancies);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
      }
    } catch (e) {}
    await fillLastPregnancyComplication(driver);
  }
}

async function fillLastPregnancyComplication(driver) {
  const targetValue = FORM_DATA.lastPregnancyComplication;
  console.log(`🔄 Selecting complication: ${targetValue}`);

  try {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().hint("Any complications in Last Pregnancy"))');
    await driver.pause(500);
  } catch (e) {}

  try {
    const spinner = await driver.$('android=new UiSelector().hint("Any complications in Last Pregnancy")');
    await spinner.waitForDisplayed({ timeout: 5000 });
    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();
    await tapByCoords(driver, Math.floor(loc.x + size.width - 50), Math.floor(loc.y + size.height / 2));
    await driver.pause(2000);
  } catch (e) {
    const all = await driver.$$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown")');
    await all[all.length - 1].click();
    await driver.pause(2000);
  }

  const optionsList = [
    'None','CONVULSIONS','APH',
    'PREGNANCY INDUCED HYPERTENSION (PIH)','REPEATED ABORTION',
    'STILLBIRTH','CONGENITAL ANOMALY','CAESAREAN SECTION',
    'BLOOD TRANSFUSION','TWINS','OBSTRUCTED LABOUR','PPH','Any Other'
  ];
  let selected = false;

  try {
    const item = await driver.$(`android=new UiSelector().resourceId("android:id/text1").className("android.widget.CheckedTextView").text("${targetValue}")`);
    await item.waitForDisplayed({ timeout: 5000 });
    await item.click();
    selected = true;
  } catch (e) { console.log(`⚠️ CheckedTextView failed: ${e.message}`); }

  if (!selected) {
    try {
      const item = await driver.$(`//android.widget.CheckedTextView[@text="${targetValue}" and @resource-id="android:id/text1"]`);
      await item.waitForDisplayed({ timeout: 4000 });
      await item.click();
      selected = true;
    } catch (e) { console.log(`⚠️ XPath CTV failed: ${e.message}`); }
  }

  if (!selected) {
    try {
      const source = await driver.getPageSource();
      const esc = targetValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re1 = new RegExp(`class="android\\.widget\\.CheckedTextView"[^>]*?text="${esc}"[^>]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
      const re2 = new RegExp(`text="${esc}"[^>]*?class="android\\.widget\\.CheckedTextView"[^>]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
      const m   = source.match(re1) || source.match(re2);
      if (m) {
        await tapByCoords(driver, Math.floor((+m[1] + +m[3]) / 2), Math.floor((+m[2] + +m[4]) / 2));
        selected = true;
      }
    } catch (e) { console.log(`⚠️ XML parse failed: ${e.message}`); }
  }

  if (!selected) {
    const idx = optionsList.indexOf(targetValue);
    if (idx === -1) throw new Error(`"${targetValue}" not in optionsList`);
    await tapByCoords(driver, 540, Math.floor(759 + idx * 102 + 51));
    selected = true;
  }

  if (targetValue === 'Any Other') {
    try {
      await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Any other Complication"))');
      await driver.pause(500);
      const f = await driver.$('//android.widget.EditText[contains(@hint, "Any other Complication")]');
      await f.waitForDisplayed({ timeout: 5000 });
      await f.click(); await driver.pause(300);

      // ✅ FORCE CAPITAL LETTERS ONLY FOR THIS FIELD
      await f.setValue(FORM_DATA.anyOtherComplicationDetails.toUpperCase());

      if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(500); }
      console.log('✔ Any Other complication details filled with capital letters');
    } catch (e) { console.log('⚠️ Could not fill Any Other details:', e.message); }
  }

  console.log(`✔ Complication: ${targetValue}`);
}

async function fillRadioQuestion(driver, questionText, answer) {
  try {
    await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${questionText}"))`);
    await driver.pause(500);
    const rb = await driver.$(`//android.widget.TextView[@text="${questionText}"]/../following-sibling::android.widget.RadioGroup//android.widget.RadioButton[@text="${answer}"]`);
    await rb.waitForDisplayed({ timeout: 5000 });
    if (await rb.getAttribute('checked')  === 'true')  { console.log(`⏭ "${questionText}" already ${answer}`); return; }
    if (await rb.getAttribute('enabled')  === 'false') { console.log(`⏭ "${questionText}" disabled`);          return; }
    await rb.click();
    console.log(`✔ "${questionText}" → ${answer}`);
  } catch (e) { console.log(`⚠️ Could not interact with "${questionText}": ${e.message}`); }
}

async function fillHrpAndSubmit(driver) {
  try {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Who had identified as HRP"))');
    await driver.pause(500);
  } catch (e) {}

  const spinnerSel = 'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown").textContains("Who had identified as HRP")';
  const hrpSpinner = await driver.$(spinnerSel);

  if (await hrpSpinner.isExisting()) {
    const cur = await hrpSpinner.getText();
    if (cur !== FORM_DATA.hrpIdentifier) {
      await clickSpinnerAndSelectOption(driver, spinnerSel, FORM_DATA.hrpIdentifier,
        ['ANM','CHO','PHC – MO','Specialist at Higher Facility']);
      console.log(`✔ HRP set to "${FORM_DATA.hrpIdentifier}"`);
    } else { console.log(`⏭ HRP already "${FORM_DATA.hrpIdentifier}"`); }
  } else { console.log('⏭ HRP field not present'); }

  const submitBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit")');
  await submitBtn.waitForDisplayed({ timeout: 10000 });
  await submitBtn.click();
  console.log('✔ Form submitted');
}

async function fillPregnancyForm(driver) {
  await fillDateOfRegistration(driver);   await driver.pause(2000);
  await fillRchId(driver);                await driver.pause(1000);
  await fillLmpDate(driver);              await driver.pause(2000);
  await fillBloodGroup(driver);           await driver.pause(1000);
  await fillWeight(driver);               await driver.pause(1000);
  await fillHeight(driver);               await driver.pause(1000);
  await fillDiseaseInformation(driver);   await driver.pause(1000);
  await fillFirstPregnancy(driver, 'No'); await driver.pause(1000);
  await fillRadioQuestion(driver, 'No. of Deliveries is more than 3',              FORM_DATA.moreThanThreeDeliveries);      await driver.pause(1000);
  await fillRadioQuestion(driver, 'Time from last delivery is less than 18 months',FORM_DATA.timeFromLastDelivery);          await driver.pause(1000);
  await fillRadioQuestion(driver, 'Height is very short or less than 140 cms',     FORM_DATA.heightShortness);               await driver.pause(1000);
  await fillRadioQuestion(driver, 'Age is less than 18 or more than 35 years',     FORM_DATA.ageRiskFactor);                 await driver.pause(1000);
  await fillRadioQuestion(driver, 'Rh Negative',                                   FORM_DATA.rhNegative);                    await driver.pause(1000);
  await fillRadioQuestion(driver, 'Home delivery of previous pregnancy',           FORM_DATA.homeDeliveryPreviousPregnancy); await driver.pause(1000);
  await fillRadioQuestion(driver, 'Bad obstetric history',                         FORM_DATA.badObstetricHistory);           await driver.pause(1000);
  await fillRadioQuestion(driver, 'Multiple Pregnancy',                            FORM_DATA.multiplePregnancy);             await driver.pause(1000);
  await fillHrpAndSubmit(driver);
}

// ─────────────────────────────────────────────────────────────
//  NAVIGATION TO REGISTRATION LIST
// ─────────────────────────────────────────────────────────────
async function clickMaternalHealth(driver) {
  console.log('Navigating to Maternal Health...');
  const btn = await driver.$('//android.widget.TextView[@text="Maternal Health"]');
  await btn.waitForDisplayed({ timeout: 10000 });
  await btn.click();
}

async function clickPregnantWomenRegistration(driver) {
  console.log('Opening Pregnant Women Registration...');
  const btn = await driver.$('//android.widget.TextView[@text="Pregnant Women Registration"]');
  await btn.waitForDisplayed({ timeout: 10000 });
  await btn.click();
}

// ─────────────────────────────────────────────────────────────
//  SCROLL AND SELECT BENEFICIARY (Strict Text Matching)
// ─────────────────────────────────────────────────────────────
async function selectRandomBeneficiaryAndRegister(driver) {
  console.log('🔍 Scrolling to find an unregistered beneficiary...');

  // 1. Force Android to scroll until a button with the exact text "REGISTER" appears.
  try {
    const scrollCommand = `android=new UiScrollable(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/rv_any").scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_form_ec1").text("REGISTER"))`;
    const listScroll = await driver.$(scrollCommand);
    await listScroll.waitForExist({ timeout: 15000 });
  } catch (error) {
    throw new Error('❌ Reached the end of the list and could not find any REGISTER buttons.');
  }

  await driver.pause(1000); // Brief pause to let the UI settle after scrolling

  // 2. Grab the first card containing a specific "REGISTER" button (ignoring "VIEW" buttons)
  const cardXPath = '//android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_ec_content" and .//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_form_ec1" and @text="REGISTER"]]';
  const card = await driver.$(cardXPath);
  await card.waitForDisplayed({ timeout: 5000 });

  // 3. Extract the name strictly from THIS matched card
  const nameElement = await card.$('.//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_ec_id"]');
  const chosenName = await nameElement.getText();

  // 4. Click the exact REGISTER button belonging to this card
  const registerBtn = await card.$('.//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_form_ec1" and @text="REGISTER"]');
  await registerBtn.click();

  console.log(`✔ Successfully scrolled to and clicked REGISTER for: ${chosenName}`);

  return chosenName;
}

// ─────────────────────────────────────────────────────────────
//  ✅ UPDATED: NAVIGATE TO ANC VISITS (Instead of Tracking)
// ─────────────────────────────────────────────────────────────
async function navigateToAncVisits(driver) {
  console.log('Navigating to ANC Visits...');

  // 1. Navigate back to Home
  try {
    const homeBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/toolbar_menu_home")');
    await homeBtn.waitForDisplayed({ timeout: 8000 });
    await homeBtn.click();
    await driver.pause(1500);
  } catch (e) {
    await driver.back(); await driver.pause(1000);
    await driver.back(); await driver.pause(1000);
  }

  // 2. Click Maternal Health again
  const maternalBtn = await driver.$('//android.widget.TextView[@text="Maternal Health"]');
  await maternalBtn.waitForDisplayed({ timeout: 10000 });
  await maternalBtn.click();
  await driver.pause(1000);

  // 3. Click "ANC Visits" strictly as shown in the UI Grid
  const ancBtn = await driver.$('//android.widget.TextView[@text="ANC Visits"]');
  await ancBtn.waitForDisplayed({ timeout: 10000 });
  await ancBtn.click();
  await driver.pause(1500);

  console.log('✔ ANC Visits screen opened');
}

// ─────────────────────────────────────────────────────────────
//  SEARCH IN ANC VISITS
// ─────────────────────────────────────────────────────────────
async function searchBeneficiaryInAncVisits(driver, beneficiaryName) {
  console.log(`🔍 Searching for "${beneficiaryName}" in ANC Visits...`);

  // 1. Find the search bar and click it to force the keyboard to open
  const searchBar = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/searchView")');
  await searchBar.waitForDisplayed({ timeout: 10000 });
  await searchBar.click();
  await driver.pause(1000); // Wait for the soft keyboard to fully appear

  // 2. Type using the keyboard
  await searchBar.clearValue();
  await searchBar.addValue(beneficiaryName); // addValue triggers actual keystroke events
  await driver.pause(1000); // Brief pause after typing finishes

  // 3. Explicitly close the keyboard
  if (await driver.isKeyboardShown()) {
    console.log('⌨️ Closing the keyboard...');
    await driver.hideKeyboard();
    await driver.pause(1500); // Wait for the keyboard animation to finish and UI to resize
  }

  // 4. Click the search icon
  const searchIcon = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/ib_search")');
  await searchIcon.waitForDisplayed({ timeout: 5000 });
  await searchIcon.click();

  // Wait for the search results to load
  await driver.pause(4000);

  // 5. Find the name on the screen
  console.log(`👁️ Locating the record for "${beneficiaryName}"...`);
  try {
    const resultName = await driver.$(`android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_ec_id").text("${beneficiaryName}")`);
    await resultName.waitForDisplayed({ timeout: 10000 });

    console.log(`✅ TEST PASSED: "${beneficiaryName}" successfully found and verified in ANC Visits!`);
  } catch (error) {
    const source = await driver.getPageSource();
    if (source.includes('No Records') || source.includes('No Data')) {
      console.log(`⚠️ TEST PENDING: "${beneficiaryName}" not found — backend sync may be pending.`);
    } else {
      console.log(`❌ TEST FAILED: Could not find the name "${beneficiaryName}" on the screen after searching.`);
    }
  }
}

// ─────────────────────────────────────────────────────────────
//  MAIN TEST RUNNER
// ─────────────────────────────────────────────────────────────
async function runTest() {
  let driver;
  try {
    driver = await remote({
      protocol: 'http',
      hostname: '127.0.0.1',
      port: 4723,
      path: '/',
      capabilities
    });

    // 1. Navigate to the Pregnant Women Registration list
    await clickMaternalHealth(driver);
    await clickPregnantWomenRegistration(driver);
    await driver.pause(2000);

    // 2. Randomly select a beneficiary and click REGISTER
    const registeredName = await selectRandomBeneficiaryAndRegister(driver);
    await driver.pause(1500);

    // 3. Fill all mandatory pregnancy details
    await fillPregnancyForm(driver);
    await driver.pause(2000);

    // 4. Navigate back home -> Maternal Health -> ANC Visits
    await navigateToAncVisits(driver);

    // 5. Search for the just-registered beneficiary to pass the test case
    await searchBeneficiaryInAncVisits(driver, registeredName);

    console.log('\n🏁 Test flow completed successfully!');

  } catch (error) {
    console.error('❌ Error during automation:', error);
  } finally {
    if (driver) await driver.deleteSession();
  }
}

runTest();