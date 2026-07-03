const { remote } = require('webdriverio');

// ==========================================
// APPIUM CONFIGURATION
// ==========================================

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

// ==========================================
// CONSTANTS
// ==========================================

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'
];

const PKG              = 'org.piramalswasthya.sakhi.saksham.uat';
const RECYCLER_VIEW_ID = `${PKG}:id/rv_any`;

// ==========================================
// STATUS OF WOMEN OPTIONS
// ==========================================
const STATUS_OF_WOMEN_OPTIONS = [
    'Eligible Couple',
    'Pregnant Woman',
    'Postnatal Mother',
    'Permanently Sterilised'
];

// Marital statuses that require "Do you have children?" + "Status of Women"
const MARRIED_STATUSES = ['Married', 'Divorced', 'Separated', 'Widow'];

async function scrollSpinnerToMiddle(driver, spinnerSelector) {
    try {
        const spinner = await driver.$(spinnerSelector);
        const loc = await spinner.getLocation();
        const screen = await driver.getWindowRect();
        const midY = screen.height / 2;

        if (loc.y > midY + 100) {
            console.log(`⬆️ Spinner at y=${loc.y}, scrolling toward middle...`);

            const startY = Math.floor(screen.height * 0.7);
            const endY = Math.floor(screen.height * 0.3);
            const swipeX = Math.floor(screen.width / 2);

            await driver.performActions([{
                type: 'pointer',
                id: 'finger1',
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

async function tapByCoords(driver, tapX, tapY) {
    await driver.performActions([{
        type: 'pointer',
        id: 'finger1',
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

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList) {
    // 1) Move spinner into a safer screen zone
    await scrollSpinnerToMiddle(driver, spinnerSelector);

    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc = await spinner.getLocation();
    const size = await spinner.getSize();
    console.log(`📍 Spinner @ (${loc.x}, ${loc.y}), size (${size.width}x${size.height})`);

    // 2) Tap the dropdown arrow area on the right side
    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);

    console.log(`📍 Tapping dropdown arrow at (${tapX}, ${tapY})`);
    await tapByCoords(driver, tapX, tapY);
    await driver.pause(2000);

    // Strategy 0: direct XPath
    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`✅ Selected "${value}" via XPath`);
        return;
    } catch (e) {
        console.log(`⚠️ XPath strategy failed: ${e.message}`);
    }

    // Strategy 1: UiSelector
    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via UiSelector`);
        return;
    } catch (e) {
        console.log(`⚠️ UiSelector strategy failed: ${e.message}`);
    }

    // Strategy 2: tag parse from XML
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
                const tapX = Math.floor((parseInt(boundsMatch[1]) + parseInt(boundsMatch[3])) / 2);
                const tapY = Math.floor((parseInt(boundsMatch[2]) + parseInt(boundsMatch[4])) / 2);
                console.log(`📍 Found "${value}" in XML → tap(${tapX}, ${tapY})`);
                await tapByCoords(driver, tapX, tapY);
                console.log(`✅ Selected "${value}" via XML tag parse`);
                return;
            }
        }
    } catch (e) {
        console.log(`⚠️ Tag parse failed: ${e.message}`);
    }

    // Strategy 3: regex bounds
    try {
        const source = await driver.getPageSource();
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`text="${escapedValue}"[^/]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
        const match = source.match(regex);

        if (match) {
            const tapX = Math.floor((parseInt(match[1]) + parseInt(match[3])) / 2);
            const tapY = Math.floor((parseInt(match[2]) + parseInt(match[4])) / 2);
            console.log(`📍 Found "${value}" via regex → tap(${tapX}, ${tapY})`);
            await tapByCoords(driver, tapX, tapY);
            console.log(`✅ Selected "${value}" via regex`);
            return;
        }
    } catch (e) {
        console.log(`⚠️ Regex strategy failed: ${e.message}`);
    }

    // Strategy 4: coordinate fallback
    const screen = await driver.getWindowRect();
    const idx = optionsList.indexOf(value);
    if (idx === -1) throw new Error(`"${value}" not in options list`);

    const rowHeight = size.height;
    const spinnerBottom = loc.y + size.height;
    const opensUpward = (screen.height - spinnerBottom) < (optionsList.length * rowHeight);
    const finalTapX = Math.floor(loc.x + size.width / 2);
    let finalTapY;

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

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function randomDOB(minAge = 1, maxAge = 60) {
    const birthYear = new Date().getFullYear() - randomInt(minAge, maxAge);
    const month     = randomInt(1, 12);
    const maxDay    = new Date(birthYear, month, 0).getDate();
    return { day: randomInt(1, maxDay), month, year: birthYear };
}

const MALE_FIRST   = ['RAHUL','AMIT','SURESH','VIJAY','RAVI','ANIL','MANOJ','DEEPAK','SANJAY','AJAY','RAKESH','DINESH','ROHIT','NITIN','SACHIN'];
const FEMALE_FIRST = ['PRIYA','SUNITA','KAVITA','REKHA','SEEMA','NEHA','POOJA','ANITA','SONA','MANJU','KIRAN','GEETA','MEENA','LATA','ASHA'];
const LAST_NAMES   = ['SINGH','KUMAR','SHARMA','VERMA','GUPTA','YADAV','TIWARI','MISHRA','PANDEY','THAKUR','JOSHI','PATEL','RAWAT','NEGI','DUBEY'];

function randomName(gender = 'male') {
    const pool = gender === 'male' ? MALE_FIRST : FEMALE_FIRST;
    return `${randomItem(pool)} ${randomItem(LAST_NAMES)}`;
}

function generateChildrenData(count) {
    return Array.from({ length: count }, () => {
        const sex = randomItem(['Male', 'Female']);
        return {
            name: randomName(sex === 'Male' ? 'male' : 'female'),
            dob:  randomDOB(1, 18),
            sex,
            gap:  String(randomInt(1, 5))
        };
    });
}

function generateSpouseData() {
    return {
        dob:        randomDOB(18, 50),
        fatherName: randomName('male'),
        motherName: randomName('female')
    };
}

/**
 * Calculates age from a DOB object { day, month, year }.
 */
function calculateAge(dob) {
    const today = new Date();
    let age = today.getFullYear() - dob.year;
    const m = today.getMonth() + 1 - dob.month;
    if (m < 0 || (m === 0 && today.getDate() < dob.day)) {
        age--;
    }
    return age;
}

// ==========================================
// 1. SCROLLING & UI HELPERS
// ==========================================

function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Scroll the main scrollable view to bring text into view.
 * Silent on failure (element may already be visible).
 */
async function scrollToText(driver, textToFind) {
    try {
        const sel = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${textToFind}"))`;
        await driver.$(sel).waitForExist({ timeout: 4000 });
    } catch (e) { /* already visible */ }
    await driver.pause(400);
}

/**
 * Scroll the beneficiary RecyclerView specifically to reveal a button type.
 * Tries up to maxSwipes full-list scrolls before giving up.
 */
async function scrollListForButton(driver, buttonTexts, maxSwipes = 15) {
    const textList = buttonTexts.map(t => `@text="${t}"`).join(' or ');
    const btnXPath = `//android.widget.Button[${textList}]`;

    for (let swipe = 0; swipe < maxSwipes; swipe++) {
        const btns = await driver.$$(btnXPath);
        if (btns.length > 0) {
            console.log(`✔ Found ${btns.length} eligible button(s) after ${swipe} scroll(s).`);
            return btns;
        }

        // Scroll down inside the RecyclerView
        console.log(`↕️  No buttons visible yet — scrolling list (attempt ${swipe + 1})...`);
        try {
            const scrollSel = `android=new UiScrollable(new UiSelector().resourceId("${RECYCLER_VIEW_ID}")).scrollForward()`;
            await driver.$(scrollSel).waitForExist({ timeout: 3000 });
        } catch (e) {
            // End of list reached
            console.log('⚠️  Reached end of beneficiary list.');
            break;
        }
        await driver.pause(1000);
    }

    // Final attempt after all scrolls
    const finalBtns = await driver.$$(btnXPath);
    return finalBtns;
}

// ==========================================
// 2. CALENDAR UTILITIES
// ==========================================

async function getCalendarMonthYear(driver) {
    try {
        const cells = await driver.$$('//android.view.View[@resource-id="android:id/month_view"]/android.view.View');
        for (const cell of cells) {
            const desc  = await cell.getAttribute('content-desc').catch(() => '');
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
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
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
    const size    = await driver.getWindowRect();
    const startX  = Math.floor(size.width / 2);
    const topY    = Math.floor(size.height * 0.40);
    const bottomY = Math.floor(size.height * 0.60);
    const startY  = direction === 'down' ? topY : bottomY;
    const endY    = direction === 'down' ? bottomY : topY;
    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
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
        const yearXpath = `//android.widget.TextView[@text="${targetYear}"]`;
        const swipeDir  = targetYear < currentYear ? 'down' : 'up';
        let yearFound   = false;

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
        const nextBtn = await driver.$('//android.widget.ImageButton[@resource-id="android:id/next"]');

        if (curTotal > tgtTotal) {
            await prevBtn.click();
        } else {
            await nextBtn.click();
        }
        await driver.pause(600);
    }
}

async function pickDate(driver, dateObj) {
    const { day, month, year } = dateObj;
    await navigateCalendarToMonth(driver, month, year);
    await driver.pause(500);

    const paddedDay  = String(day).padStart(2, '0');
    const targetDesc = `${paddedDay} ${MONTH_NAMES[month]} ${year}`;
    const dayCell    = await driver.$(`//android.view.View[@content-desc="${targetDesc}"]`);
    await dayCell.waitForDisplayed({ timeout: 5000 });
    await dayCell.click();
    await driver.pause(500);

    const okBtn = await driver.$('//*[@text="OK" or @resource-id="android:id/button1"]');
    await okBtn.click();
    await driver.pause(1000);
}

// ==========================================
// 3. SHARED STEPS
// ==========================================

async function navigateToAllBeneficiaries(driver) {
    console.log("🔍 Navigating to 'All Beneficiaries'...");
    const allBenBtn = await driver.$(`android=new UiSelector().textContains("Beneficiaries").resourceId("${PKG}:id/textView2")`);
    await allBenBtn.waitForDisplayed({ timeout: 10000 });
    await allBenBtn.click();
    await driver.pause(3000);
    console.log("✔ All Beneficiaries opened.");
}

async function handleConsentForm(driver) {
    console.log("📋 Handling consent form...");
    const checkbox = await driver.$(`//android.widget.CheckBox[@resource-id="${PKG}:id/checkBox"]`);
    await checkbox.waitForDisplayed({ timeout: 8000 });
    await checkbox.click();
    const agreeBtn = await driver.$(`//android.widget.Button[@text="AGREE" or @resource-id="${PKG}:id/btn_positive"]`);
    await agreeBtn.click();
    await driver.pause(2000);
    console.log("✔ Consent accepted.");
}

async function clickSubmit(driver) {
    console.log("🚀 Submitting form...");
    await scrollToText(driver, "Submit");
    const firstSubmitBtn = await driver.$(`//android.widget.Button[@resource-id="${PKG}:id/btn_submit"]`);
    await firstSubmitBtn.waitForDisplayed({ timeout: 5000 });
    await firstSubmitBtn.click();
    await driver.pause(1500);

    try {
        const finalSubmitBtn = await driver.$(`//android.widget.Button[@resource-id="${PKG}:id/btnSubmitPreview"]`);
        await finalSubmitBtn.waitForDisplayed({ timeout: 5000 });
        await finalSubmitBtn.click();
        console.log("✔ Final submit clicked. Registration complete.");
    } catch {
        console.log("⚠️  No preview screen — assuming direct submission success.");
    }
}

// ==========================================
// 4. CHILD REGISTRATION FLOW
// ==========================================

async function fillGapField(driver, driver2, childIndex, gapValue, sectionHeader) {
    const gapHintScroll = childIndex === 0
        ? "Gap between Date of marriage"
        : `Gap between ${getOrdinal(childIndex)}`;

    await scrollToText(driver, gapHintScroll);

    let gapInput = null;

    try {
        const allGapFields = await driver.$$('//android.widget.EditText[contains(@hint,"Gap between")]');
        if (allGapFields.length > childIndex) {
            gapInput = allGapFields[childIndex];
            const isVis = await gapInput.isDisplayed().catch(() => false);
            if (!isVis) {
                await scrollToText(driver, gapHintScroll);
                await driver.pause(500);
            }
        }
    } catch (e) { /* fall through */ }

    if (!gapInput) {
        try {
            const scrollSel = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Gap between"))`;
            await driver.$(scrollSel).waitForExist({ timeout: 3000 });
            const allGapFields = await driver.$$('//android.widget.EditText[contains(@hint,"Gap between")]');
            if (allGapFields.length > childIndex) {
                gapInput = allGapFields[childIndex];
            }
        } catch (e) { /* fall through */ }
    }

    if (!gapInput) throw new Error(`Could not find Gap field for ${getOrdinal(childIndex + 1)} child.`);

    await gapInput.click();
    await driver.pause(300);
    await gapInput.setValue(gapValue);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    console.log(`   ✔ Gap filled: ${gapValue}`);
}

async function fillChildDetailsLoop(driver, childrenArray) {
    for (let i = 0; i < childrenArray.length; i++) {
        const childData     = childrenArray[i];
        const childOrdinal  = getOrdinal(i + 1);
        const sectionHeader = `Details of ${childOrdinal} Child`;

        console.log(`\n👶 Entering data for ${childOrdinal} Child: ${childData.name}`);
        await scrollToText(driver, sectionHeader);
        await driver.pause(500);

        // ── 1. Child Name ──
        let nameInput = null;
        try {
            const allNameFields = await driver.$$('//android.widget.EditText[@hint="Child Name *"]');
            if (allNameFields.length > i) {
                nameInput = allNameFields[i];
            }
        } catch(e) {}

        if (!nameInput) {
            await scrollToText(driver, 'Child Name');
            const allNameFields = await driver.$$('//android.widget.EditText[@hint="Child Name *"]');
            nameInput = allNameFields[i] || allNameFields[allNameFields.length - 1];
        }

        await nameInput.waitForDisplayed({ timeout: 5000 });
        await nameInput.click();
        await driver.pause(300);
        await nameInput.setValue(childData.name);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        console.log(`   ✔ Name: ${childData.name}`);

        // ── 2. Child DOB ──
        const dobHint = `${childOrdinal} Child Date of Birth *`;
        await scrollToText(driver, dobHint);
        const dobField = await driver.$(`//android.widget.EditText[@hint="${dobHint}"]`);
        await dobField.waitForDisplayed({ timeout: 5000 });
        await dobField.click();
        await driver.pause(1000);
        await pickDate(driver, childData.dob);
        console.log(`   ✔ DOB: ${childData.dob.day}-${childData.dob.month}-${childData.dob.year}`);

        // ── 3. Child Sex ──
        const sexLabel = `${childOrdinal} Child Sex *`;
        await scrollToText(driver, sexLabel);
        const sexRadioXPath = `//android.widget.TextView[@text="${sexLabel}"]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup//android.widget.RadioButton[@text="${childData.sex}"]`;
        const sexBtn = await driver.$(sexRadioXPath);
        await sexBtn.waitForDisplayed({ timeout: 5000 });
        await sexBtn.click();
        console.log(`   ✔ Sex: ${childData.sex}`);

        // ── 4. Gap field ──
        await fillGapField(driver, null, i, childData.gap, sectionHeader);
    }
}

async function runChildRegistration(driver) {
    const childCount   = randomInt(1, 3);
    const childrenList = generateChildrenData(childCount);

    console.log(`\n🧒 Child Registration — ${childCount} child(ren):`);
    childrenList.forEach((c, i) => {
        console.log(`   ${getOrdinal(i+1)}: ${c.name} | DOB: ${c.dob.day}-${c.dob.month}-${c.dob.year} | Sex: ${c.sex} | Gap: ${c.gap}`);
    });

    await handleConsentForm(driver);

    // Fill "No. of Live Children"
    await scrollToText(driver, "No. of Live Children");
    const numInput = await driver.$(`//android.widget.EditText[@resource-id="${PKG}:id/etNumberInput"]`);
    await numInput.waitForDisplayed({ timeout: 5000 });
    await numInput.click();
    await numInput.clearValue();
    await numInput.setValue(childCount.toString());
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    await driver.pause(800);
    console.log(`✔ Set number of children: ${childCount}`);

    await fillChildDetailsLoop(driver, childrenList);
    await clickSubmit(driver);
}

// ==========================================
// 5. SPOUSE REGISTRATION FLOW
// ==========================================

/**
 * Selects "Marital Status" spinner using the generic spinner helper.
 */
async function selectMaritalStatus(driver, value = 'Married') {
    await scrollToText(driver, "Marital Status");
    await driver.pause(1000);

    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().className("android.widget.Spinner").descriptionContains("Marital Status")',
        value,
        ['Unmarried', 'Married', 'Divorced', 'Separated', 'Widow']
    );

    console.log(`✅ Marital Status: ${value}`);
}

/**
 * Selects "Status Of Women" spinner using the same generic helper.
 * Only called when marital status requires it AND age < 50.
 */
async function selectStatusOfWomen(driver, value) {
    console.log(`\n👩 Selecting Status Of Women: "${value}"...`);
    await scrollToText(driver, "Status Of Women");
    await driver.pause(1000);

    await clickSpinnerAndSelectOption(
        driver,
        'android=new UiSelector().className("android.widget.Spinner").descriptionContains("Status Of Women")',
        value,
        STATUS_OF_WOMEN_OPTIONS
    );

    console.log(`✅ Status Of Women: ${value}`);
}

/**
 * Handles the "Do you have children?" Yes/No radio button.
 * Chooses randomly (Yes or No).
 * Returns the choice made so callers can log it.
 */
async function fillDoYouHaveChildren(driver) {
    console.log("\n👶 Answering 'Do you have children?'...");
    await scrollToText(driver, "Do you have children");
    await driver.pause(500);

    const choice = randomItem(['Yes', 'No']);

    // XPath: find the RadioButton with the chosen text inside the RadioGroup
    // under the section that contains "Do you have children?"
    const radioXPath = `//android.widget.TextView[@text="Do you have children? *"]/parent::android.widget.LinearLayout/following-sibling::android.widget.RadioGroup//android.widget.RadioButton[@text="${choice}"]`;

    let radioBtn = null;
    try {
        radioBtn = await driver.$(radioXPath);
        await radioBtn.waitForDisplayed({ timeout: 5000 });
    } catch (e) {
        // Fallback: find the RadioGroup via resource-id and pick by text
        console.log(`⚠️ XPath for radio failed, trying resource-id fallback...`);
        const rg = await driver.$(`//android.widget.RadioGroup[@resource-id="${PKG}:id/rg"]`);
        await rg.waitForDisplayed({ timeout: 5000 });
        radioBtn = await rg.$(`//android.widget.RadioButton[@text="${choice}"]`);
    }

    await radioBtn.click();
    console.log(`   ✔ Do you have children: ${choice}`);
    await driver.pause(500);
    return choice;
}

/**
 * Fills the RCH ID field (optional — leaves empty if not visible).
 */
async function fillRchId(driver) {
    console.log("\n🪪 Filling RCH ID...");
    try {
        await scrollToText(driver, "RCH ID");
        const rchInput = await driver.$(`//android.widget.EditText[@hint="RCH ID"]`);
        await rchInput.waitForDisplayed({ timeout: 5000 });

        // Generate a random 12-digit RCH ID
        const rchId = String(randomInt(100000000000, 999999999999));
        await rchInput.click();
        await driver.pause(300);
        await rchInput.clearValue();
        await rchInput.setValue(rchId);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        console.log(`   ✔ RCH ID: ${rchId}`);
    } catch (e) {
        console.log(`   ℹ️ RCH ID field not visible or not required, skipping. (${e.message})`);
    }
}

/**
 * @param {object} driver  - WebdriverIO driver instance
 * @param {string} regType - 'Register Wife' | 'Register Husband'
 */
async function runSpouseRegistration(driver, regType = 'Register Wife') {
    const isWife = regType === 'Register Wife';

    const spouseData = generateSpouseData();
    const { dob, fatherName, motherName } = spouseData;

    // Calculate age to determine if "Status Of Women" should be filled
    const spouseAge = calculateAge(dob);

    // Pick a random marital status (weighted toward 'Married' for realism)
    const maritalStatus = randomItem(['Married', 'Married', 'Married', 'Divorced', 'Separated', 'Widow', 'Unmarried']);

    console.log(`\n💍 ${isWife ? 'Wife' : 'Husband'} Registration`);
    console.log(`   DOB:            ${dob.day}-${dob.month}-${dob.year}  (Age: ${spouseAge})`);
    console.log(`   Father:         ${fatherName}`);
    console.log(`   Mother:         ${motherName}`);
    console.log(`   Marital Status: ${maritalStatus}`);

    await handleConsentForm(driver);

    // ── Optional First Name + Last Name before DOB ──
    try {
        const spouseFullName = randomName('male');
        const nameParts = spouseFullName.trim().split(/\s+/);
        const firstName = nameParts[0] || 'RAHUL';
        const lastName = nameParts.slice(1).join(' ') || 'KUMAR';

        const firstNameInput = await driver.$(
            `//android.widget.EditText[@resource-id="${PKG}:id/et" and (@text="First Name *" or @hint="First Name *")]`
        );

        if (await firstNameInput.isDisplayed().catch(() => false)) {
            const firstExisting = (await firstNameInput.getText().catch(() => '') || '').trim();
            if (!firstExisting || firstExisting === 'First Name *') {
                console.log("📝 Filling First Name...");
                await firstNameInput.click();
                await driver.pause(300);
                await firstNameInput.setValue(firstName);
                if (await driver.isKeyboardShown()) await driver.hideKeyboard();
                console.log(`   ✔ First Name: ${firstName}`);
            } else {
                console.log(`   ℹ️ First Name already filled: ${firstExisting}`);
            }
        }

        const lastNameInput = await driver.$(
            `//android.widget.EditText[@resource-id="${PKG}:id/et" and (@text="Last Name / Surname *" or @hint="Last Name / Surname *")]`
        );

        if (await lastNameInput.isDisplayed().catch(() => false)) {
            const lastExisting = (await lastNameInput.getText().catch(() => '') || '').trim();
            if (!lastExisting || lastExisting === 'Last Name / Surname *') {
                console.log("📝 Filling Last Name / Surname...");
                await lastNameInput.click();
                await driver.pause(300);
                await lastNameInput.setValue(lastName);
                if (await driver.isKeyboardShown()) await driver.hideKeyboard();
                console.log(`   ✔ Last Name: ${lastName}`);
            } else {
                console.log(`   ℹ️ Last Name already filled: ${lastExisting}`);
            }
        }
    } catch (e) {
        console.log("ℹ️ First Name / Last Name section not present, skipping.");
    }

    // ── Date of Birth ──
    console.log("📅 Selecting Date of Birth...");
    const dobField = await driver.$(`//android.widget.EditText[@resource-id="${PKG}:id/et_date"]`);
    await dobField.waitForDisplayed({ timeout: 5000 });
    await dobField.click();
    await driver.pause(1000);
    await pickDate(driver, dob);
    console.log("   ✔ DOB picked.");

    // ── Marital Status ──
    console.log("💍 Selecting Marital Status...");
    await selectMaritalStatus(driver, maritalStatus);

    // ── Father's Name ──
    console.log("📝 Filling Father's Name...");
    await scrollToText(driver, "Father's Name");
    const fatherInput = await driver.$(`//android.widget.EditText[@resource-id="${PKG}:id/et" and @hint="Father's Name"]`);
    await fatherInput.waitForDisplayed({ timeout: 5000 });
    await fatherInput.setValue(fatherName);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    console.log(`   ✔ Father: ${fatherName}`);

    // ── Mother's Name ──
    console.log("📝 Filling Mother's Name...");
    await scrollToText(driver, "Mother's Name");
    const motherInput = await driver.$(`//android.widget.EditText[@resource-id="${PKG}:id/et" and @hint="Mother's Name"]`);
    await motherInput.waitForDisplayed({ timeout: 5000 });
    await motherInput.setValue(motherName);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    console.log(`   ✔ Mother: ${motherName}`);

    // ── RCH ID — only present on the wife registration form ──
    if (isWife) {
        await fillRchId(driver);
    } else {
        console.log("\n   ℹ️ Husband registration — skipping RCH ID field.");
    }

    // ── "Do you have children?" — only for Married / Divorced / Separated / Widow ──
    // ── "Do you have children?" — only for WIFE (Married / Divorced / Separated / Widow) ──
    if (isWife && MARRIED_STATUSES.includes(maritalStatus)) {
        await fillDoYouHaveChildren(driver);
    } else {
        console.log(`\n   ℹ️ Skipping "Do you have children?" field (Husband registration or unmarried).`);
    }

    // ── Status Of Women — only for WIFE (Married/Divorced/Separated/Widow AND age < 50) ──
    if (isWife && MARRIED_STATUSES.includes(maritalStatus) && spouseAge < 50) {
        const statusValue = randomItem(STATUS_OF_WOMEN_OPTIONS);
        console.log(`\n   Age is ${spouseAge} (<50) and status is "${maritalStatus}" → filling Status Of Women.`);
        await selectStatusOfWomen(driver, statusValue);
    } else if (isWife && spouseAge >= 50) {
        console.log(`\n   ℹ️ Age is ${spouseAge} (≥50) → skipping Status Of Women.`);
    } else {
        console.log(`\n   ℹ️ Skipping Status Of Women (Husband registration or unmarried).`);
    }

    // ── Optional Wife Name + Age of Marriage ──
    try {
        const wifeNameInput = await driver.$(
            `//android.widget.EditText[@resource-id="${PKG}:id/et" and (@text="Wife's Name *" or @hint="Wife's Name *")]`
        );

        if (await wifeNameInput.isDisplayed().catch(() => false)) {
            console.log("📝 Filling Wife's Name...");
            await wifeNameInput.click();
            await driver.pause(300);
            await wifeNameInput.setValue(randomName('female'));
            if (await driver.isKeyboardShown()) await driver.hideKeyboard();
            console.log("   ✔ Wife's Name filled.");

            const ageOfMarriageInput = await driver.$(
                `//android.widget.EditText[@resource-id="${PKG}:id/et" and not(@hint="Mother's Name") and not(@hint="Father's Name")]`
            );

            if (await ageOfMarriageInput.isDisplayed().catch(() => false)) {
                const existingValue = (await ageOfMarriageInput.getText().catch(() => '') || '').trim();
                if (!existingValue) {
                    console.log("📝 Filling Age of Marriage...");
                    await ageOfMarriageInput.click();
                    await driver.pause(300);
                    await ageOfMarriageInput.setValue("12");
                    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
                    console.log("   ✔ Age of Marriage: 12");
                } else {
                    console.log(`   ℹ️ Age of Marriage already filled: ${existingValue}`);
                }
            }
        }
    } catch (e) {
        console.log("ℹ️ Wife Name / Age of Marriage section not present, skipping.");
    }

    await clickSubmit(driver);
}

// ==========================================
// 6. MAIN ENTRY POINT
// ==========================================

async function main() {
    const driver = await remote(wdOpts);

    try {
        console.log("🚀 Starting Random Registration Script...\n");
        await driver.pause(3000);

        // ── Step 1: Go to All Beneficiaries ──
        await navigateToAllBeneficiaries(driver);

        // ── Step 2: Wait for RecyclerView ──
        const recycler = await driver.$(`//*[@resource-id="${RECYCLER_VIEW_ID}"]`);
        await recycler.waitForDisplayed({ timeout: 15000 });
        console.log("✔ Beneficiary list loaded.");

        // ── Step 3: Scroll list to find eligible buttons ──
        console.log("🔎 Searching for eligible buttons (scrolling list if needed)...");
        const ELIGIBLE = ['Register Children', 'Register Wife', 'Register Husband'];
        const buttons  = await scrollListForButton(driver, ELIGIBLE, 20);

        if (buttons.length === 0) {
            throw new Error("No 'Register Children / Wife / Husband' buttons found after scrolling the full list.");
        }

        // ── Step 4: Pick a random visible button ──
        const randomIndex    = Math.floor(Math.random() * buttons.length);
        const selectedButton = buttons[randomIndex];
        const buttonText     = await selectedButton.getText();
        console.log(`\n🎯 Randomly selected: "${buttonText}"`);

        try {
            const card = await driver.$(`//android.widget.Button[@text="${buttonText}"]/ancestor::android.widget.FrameLayout[@resource-id="${PKG}:id/cv_content"]//android.widget.TextView[1]`);
            const name = await card.getText().catch(() => '');
            if (name) console.log(`👤 Beneficiary: ${name}`);
        } catch { /* not critical */ }

        // ── Step 5: Click the chosen button ──
        await selectedButton.click();
        console.log(`✔ Clicked "${buttonText}". Waiting for form to open...`);
        await driver.pause(2500);

        // ── Step 6: Route to correct form ──
        if (buttonText === 'Register Children') {
            await runChildRegistration(driver);
        } else if (buttonText === 'Register Wife' || buttonText === 'Register Husband') {
            await runSpouseRegistration(driver, buttonText);
        } else {
            throw new Error(`Unrecognised button text: "${buttonText}"`);
        }

        await driver.pause(3000);
        console.log("\n✅ Script finished successfully!");

    } catch (err) {
        console.error("\n❌ Error:", err.message);
    } finally {
        if (driver) await driver.deleteSession();
    }
}

main();