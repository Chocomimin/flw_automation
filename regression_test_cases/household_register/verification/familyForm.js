// ─── Registration Data ────────────────────────────────────────────────────────

const REG_DATA = {
    maritalStatus: "Married",
    haveChildren: "Yes",
    mobileBelongsTo: "Family Head",
    community: "OBC",
    religion: "Christian",
    rchId: "123456789012",
    statusOfWomen: "Eligible Couple"
};

// ─── Random Name Data ─────────────────────────────────────────────────────────

const MALE_NAMES = ['Rahul', 'Amit', 'Vikram', 'Rajesh', 'Suresh', 'Arjun'];
const FEMALE_NAMES = ['Priya', 'Neha', 'Kavita', 'Divya', 'Pooja', 'Anjali'];
const LAST_NAMES = ['Patel', 'Sharma', 'Singh', 'Kumar', 'Mehta', 'Chauhan'];

function getRandomName(gender) {
    const first = gender.toLowerCase() === 'female'
        ? FEMALE_NAMES[Math.floor(Math.random() * FEMALE_NAMES.length)]
        : MALE_NAMES[Math.floor(Math.random() * MALE_NAMES.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    return { first, last, full: `${first} ${last}` };
}

// ─── Utility & Scroll Functions ───────────────────────────────────────────────

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
    const elementXPath = `//*[contains(@text, "${text}") or contains(@hint, "${text}") or contains(@content-desc, "${text}")]`;
    for (let i = 0; i < maxScrolls; i++) {
        try {
            const element = await driver.$(elementXPath);
            if ((await element.isExisting()) && (await element.isDisplayed())) return;
        } catch (e) { }

        await scrollDown(driver);
    }
}

async function scrollDown(driver) {
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
    await driver.pause(800);
}

// ─── ROBUST DROPDOWN HELPERS ──────────────────────────────────────────────────

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
    } catch (e) {}
}

async function tapByCoords(driver, tapX, tapY) {
    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: tapX, y: tapY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 150 },
            { type: 'pointerUp',   button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(500);
}

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList) {
    await scrollSpinnerToMiddle(driver, spinnerSelector);

    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();
    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);

    await tapByCoords(driver, tapX, tapY);
    await driver.pause(2000);

    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`✅ Selected "${value}"`);
        return;
    } catch (e) {}

    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}"`);
        return;
    } catch (e) {}

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

    await tapByCoords(driver, finalTapX, finalTapY);
    console.log(`✅ Selected "${value}" via coordinates fallback`);
}

// ─── Dynamic Random Calendar Helper ───────────────────────────────────────────

async function pickRandomDateFromCalendar(driver, randomizeYear = false) {
    console.log(`📅 Interacting with calendar...`);
    await driver.pause(1500);

    if (randomizeYear) {
        try {
            const yearHeader = await driver.$('//android.widget.TextView[@resource-id="android:id/date_picker_header_year"]');
            if (await yearHeader.isDisplayed()) {
                await yearHeader.click();
                await driver.pause(1000);

                const years = await driver.$$('//android.widget.ListView//android.widget.TextView');
                if (years.length > 0) {
                    const randomYear = years[Math.floor(Math.random() * years.length)];
                    await randomYear.click();
                    await driver.pause(1000);
                }
            }
        } catch (e) {}
    }

    const swipes = Math.floor(Math.random() * 4);
    for (let i = 0; i < swipes; i++) {
        try {
            const goNext = Math.random() > 0.5;
            const btnId = goNext ? 'android:id/next' : 'android:id/prev';
            const btn = await driver.$(`//android.widget.ImageButton[@resource-id="${btnId}"]`);
            if (await btn.isDisplayed() && await btn.isEnabled()) {
                await btn.click();
                await driver.pause(500);
            }
        } catch (e) {}
    }

    try {
        const days = await driver.$$('//android.view.View[@resource-id="android:id/month_view"]//android.view.View[@enabled="true"]');
        let validDays = [];
        for (const day of days) {
            const desc = await day.getAttribute('content-desc');
            if (desc) validDays.push(day);
        }

        if (validDays.length > 0) {
            const randomDay = validDays[Math.floor(Math.random() * validDays.length)];
            const selectedDesc = await randomDay.getAttribute('content-desc');
            console.log(`✅ Selected Random Enabled Date: ${selectedDesc}`);
            await randomDay.click();
        }
    } catch (e) {
        const size = await driver.getWindowRect();
        await tapByCoords(driver, Math.floor(size.width / 2), Math.floor(size.height / 2));
    }

    await driver.pause(500);

    const okBtn = await driver.$('//android.widget.Button[@resource-id="android:id/button1"]');
    await okBtn.waitForDisplayed({ timeout: 5000 });
    await okBtn.click();
}

// ─── AGE PARSING ──────────────────────────────────────────────────────────────

async function readAgeInYears(driver) {
    console.log(`⏳ Reading auto-calculated Age...`);
    await driver.pause(1500);
    const ageField = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/et_num"]');

    try {
        await ageField.waitForDisplayed({ timeout: 5000 });
        const ageText = await ageField.getText();
        console.log(`✅ Extracted Age Text: ${ageText}`);

        const yearsMatch = ageText.match(/(\d+)\s*Years?/i);
        if (yearsMatch) {
            return parseInt(yearsMatch[1]);
        }

        if (ageText.match(/(\d+)\s*Months?/i) || ageText.match(/(\d+)\s*Days?/i)) {
            return 0;
        }

        return 25;
    } catch (e) {
        console.log(`⚠️ Could not read age field. Defaulting to Adult (25).`);
        return 25;
    }
}

// ─── Form Filling Functions ───────────────────────────────────────────────────

async function agreeToConsent(driver) {
    try {
        console.log(`⏳ Waiting for 'Consent Form' popup...`);
        const checkBox = await driver.$('//android.widget.CheckBox[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/checkBox"]');
        await checkBox.waitForDisplayed({ timeout: 10000 });
        await checkBox.click();
        const agreeButton = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_positive" and @text="AGREE"]');
        await agreeButton.waitForDisplayed({ timeout: 5000 });
        await agreeButton.click();
        await driver.pause(1000);
    } catch (error) {}
}

async function fillFirstAndLastName(driver, gender) {
    console.log(`⏳ Checking if First Name and Last Name need to be filled...`);
    const { first: randomFirst, last: randomLast } = getRandomName(gender);

    const firstNameField = await driver.$('//android.widget.EditText[contains(@hint, "First Name") or contains(@text, "First Name")]');
    const lastNameField = await driver.$('//android.widget.EditText[contains(@hint, "Last Name") or contains(@text, "Last Name")]');

    try {
        await firstNameField.waitForDisplayed({ timeout: 5000 });
        const currentFirstName = await firstNameField.getText();
        if (!currentFirstName || currentFirstName.includes('First Name') || currentFirstName.trim() === '') {
            console.log(`📝 First Name is empty, filling with: ${randomFirst}`);
            await firstNameField.click();
            await firstNameField.setValue(randomFirst);
            if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        }

        const currentLastName = await lastNameField.getText();
        if (!currentLastName || currentLastName.includes('Last Name') || currentLastName.trim() === '') {
            console.log(`📝 Last Name is empty, filling with: ${randomLast}`);
            await lastNameField.click();
            await lastNameField.setValue(randomLast);
            if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        }
    } catch (e) {}
}

async function fillDateOfRegistration(driver) {
    console.log(`⏳ Processing Date of Registration...`);
    const dateField = await driver.$('//android.widget.EditText[contains(@hint, "Date of Registration")]');
    try {
        await dateField.waitForDisplayed({ timeout: 5000 });
        await dateField.click();
        await driver.pause(1000);
        await pickRandomDateFromCalendar(driver, false);
        await driver.pause(1000);
    } catch (e) {}
}

async function fillDateOfBirth(driver) {
    console.log(`⏳ Processing Date of Birth...`);
    const dobField = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/et_date" or contains(@hint, "Date of Birth")]');
    try {
        await dobField.waitForDisplayed({ timeout: 5000 });
        await dobField.click();
        await driver.pause(1000);
        await pickRandomDateFromCalendar(driver, true);
        await driver.pause(1000);
    } catch (e) {}
}

async function fillFathersName(driver) {
    console.log(`⏳ Processing Father's Name...`);
    await scrollDownToText(driver, "Father's Name");
    const fatherField = await driver.$('//android.widget.EditText[contains(@hint, "Father\'s Name") or contains(@text, "Father\'s Name")]');
    try {
        await fatherField.waitForDisplayed({ timeout: 5000 });
        const { full: randomFather } = getRandomName('male');
        console.log(`📝 Filling Father's Name with: ${randomFather}`);
        await fatherField.click();
        await fatherField.clearValue();
        await fatherField.setValue(randomFather);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    } catch (e) {}
}

async function fillMothersName(driver) {
    console.log(`⏳ Processing Mother's Name...`);
    await scrollDownToText(driver, "Mother's Name");
    const motherField = await driver.$('//android.widget.EditText[contains(@hint, "Mother\'s Name") or contains(@text, "Mother\'s Name")]');
    try {
        await motherField.waitForDisplayed({ timeout: 5000 });
        const { full: randomMother } = getRandomName('female');
        console.log(`📝 Filling Mother's Name with: ${randomMother}`);
        await motherField.click();
        await motherField.clearValue();
        await motherField.setValue(randomMother);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    } catch (e) {}
}

async function fillSpouseName(driver, memberGender) {
    const isFemale = memberGender.toLowerCase() === 'female';
    const expectedHint = isFemale ? "Husband's Name" : "Wife's Name";
    const spouseGender = isFemale ? 'male' : 'female';

    console.log(`⏳ Processing ${expectedHint}...`);
    await scrollDownToText(driver, expectedHint);

    const spouseField = await driver.$('//android.widget.EditText[contains(@hint, "Husband") or contains(@hint, "Wife") or contains(@hint, "Spouse")]');

    try {
        await spouseField.waitForDisplayed({ timeout: 3000 });
        const { full: randomSpouse } = getRandomName(spouseGender);
        console.log(`📝 Filling ${expectedHint} with: ${randomSpouse}`);
        await spouseField.click();
        await spouseField.clearValue();
        await spouseField.setValue(randomSpouse);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    } catch (e) {
        console.log(`⚠️ ${expectedHint} field not present. Skipping.`);
    }
}

async function fillBirthCertificateNo(driver) {
    console.log(`⏳ Processing Birth Certificate No...`);
    await scrollDownToText(driver, "Birth Certificate No");
    const bcField = await driver.$('//android.widget.EditText[contains(@hint, "Birth Certificate") or contains(@text, "Birth Certificate")]');
    try {
        await bcField.waitForDisplayed({ timeout: 5000 });
        const randomBc = Math.floor(Math.random() * 1000000000).toString();
        console.log(`📝 Filling Birth Certificate No with: ${randomBc}`);
        await bcField.click();
        await bcField.setValue(randomBc);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    } catch (e) {}
}

// ─── DROPDOWN & CONDITIONAL FORM FILLERS ──────────────────────────────────────

async function fillSpouseName(driver, memberGender) {
    const isFemale = memberGender.toLowerCase() === 'female';
    const expectedHint = isFemale ? "Husband's Name" : "Wife's Name";
    const spouseGender = isFemale ? 'male' : 'female';

    console.log(`⏳ Processing ${expectedHint}...`);
    await scrollDownToText(driver, expectedHint);

    const spouseField = await driver.$('//android.widget.EditText[contains(@hint, "Husband") or contains(@hint, "Wife") or contains(@hint, "Spouse")]');

    try {
        await spouseField.waitForDisplayed({ timeout: 3000 });
        const { full: randomSpouse } = getRandomName(spouseGender);
        console.log(`📝 Filling ${expectedHint} with: ${randomSpouse}`);

        await spouseField.click();
        await driver.pause(500); // Give the field time to gain focus
        await spouseField.clearValue();

        // CHANGED: Use driver.keys() to simulate real typing stroke-by-stroke
        await driver.keys([...randomSpouse]);
        await driver.pause(500); // Give the app time to register the text state

        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        await driver.pause(500); // Wait for layout to settle
    } catch (e) {
        console.log(`⚠️ ${expectedHint} field not present. Skipping.`);
    }
}

async function fillPlaceOfBirth(driver, place) {
    console.log(`⏳ Processing Place of Birth...`);
    await scrollDownToText(driver, "Place of birth");
    const spinnerSelector = 'android=new UiSelector().className("android.widget.Spinner").descriptionContains("Place of birth")';
    const options = [
        'Home', 'Sub-Centre', 'PHC', 'CHC', 'Sub-District Hospital',
        'District Hospital', 'Medical College Hospital', 'In Transit',
        'Private Hospital', 'Accredited Private Hospital', 'Other'
    ];
    await clickSpinnerAndSelectOption(driver, spinnerSelector, place, options);
}

async function fillMaritalStatus(driver, status) {
    console.log(`⏳ Processing Marital Status...`);
    await scrollDownToText(driver, "Marital Status");
    const spinnerSelector = 'android=new UiSelector().className("android.widget.Spinner").description("Marital Status")';
    await clickSpinnerAndSelectOption(driver, spinnerSelector, status, ['Unmarried', 'Married', 'Divorced', 'Separated', 'Widow']);
}

async function fillHaveChildren(driver, option) {
    console.log(`⏳ Processing Do you have children?...`);

    // Step 1: Scroll to the question text
    await scrollDownToText(driver, "Do you have children?");

    // Step 2: Give the UI a moment to settle
    await driver.pause(500);

    try {
        // Step 3: Find the specific RadioButton by its exact text ("Yes" or "No")
        const rb = await driver.$(`//android.widget.RadioButton[@text="${option}"]`);
        await rb.waitForDisplayed({ timeout: 5000 });

        // Fetch the location and size dynamically to guarantee a center tap
        const loc = await rb.getLocation();
        const size = await rb.getSize();

        const tapX = Math.floor(loc.x + (size.width / 2));
        const tapY = Math.floor(loc.y + (size.height / 2));

        console.log(`📍 Tapping '${option}' for Have Children at coordinates (${tapX}, ${tapY})...`);
        await tapByCoords(driver, tapX, tapY);
        await driver.pause(500);

    } catch (e) {
        console.log(`⚠️ Could not interact with '${option}' for Have Children: ${e.message}`);
    }
}

async function fillMobileNumberBelongsTo(driver, belongsTo) {
    console.log(`⏳ Processing Mobile Number Belongs To...`);
    await scrollDownToText(driver, "Mobile Number belongs to");
    const spinnerSelector = 'android=new UiSelector().className("android.widget.Spinner").description("Mobile Number belongs to")';
    await clickSpinnerAndSelectOption(driver, spinnerSelector, belongsTo, ['Family Head', 'Self', 'Other Family Member', 'Other']);
}

async function fillCommunity(driver, community) {
    console.log(`⏳ Processing Community...`);
    await scrollDownToText(driver, "Community");
    const spinnerSelector = 'android=new UiSelector().className("android.widget.Spinner").description("Community")';
    await clickSpinnerAndSelectOption(driver, spinnerSelector, community, ['General', 'SC', 'ST', 'BC', 'OBC', 'OC', 'PVTG – Primitive Vulnerable Tribal Groups', 'Not given']);
}

async function fillReligion(driver, religion) {
    console.log(`⏳ Processing Religion...`);
    await scrollDownToText(driver, "Religion");
    const spinnerSelector = 'android=new UiSelector().className("android.widget.Spinner").description("Religion")';
    await clickSpinnerAndSelectOption(driver, spinnerSelector, religion, ['Hindu', 'Muslim', 'Christian', 'Sikhism', 'Buddhism', 'Jainism', 'Parsi', 'Other', 'Not disclosed']);
}

async function fillRchId(driver, rchId) {
    console.log(`⏳ Processing RCH ID...`);
    await scrollDownToText(driver, "RCH ID", 2);
    const rchField = await driver.$('//android.widget.EditText[@text="RCH ID" or contains(@hint, "RCH ID")]');
    try {
        await rchField.waitForDisplayed({ timeout: 4000 });
        await rchField.click();
        await rchField.clearValue();
        await driver.keys([...String(rchId)]);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        await driver.pause(500);
        console.log(`✅ Filled RCH ID: ${rchId}`);
    } catch (e) {}
}

async function fillStatusOfWomen(driver, status) {
    console.log(`⏳ Processing Status Of Women...`);
    await scrollDownToText(driver, "Status Of Women");
    const spinnerSelector = 'android=new UiSelector().className("android.widget.Spinner").description("Status Of Women")';
    await clickSpinnerAndSelectOption(driver, spinnerSelector, status, ['Eligible Couple', 'Pregnant Woman', 'Postnatal Mother', 'Permanently Sterilised']);
}

// ─── SUBMISSION ───────────────────────────────────────────────────────────────

async function clickSubmitButton(driver) {
    console.log(`⏳ Scrolling to and clicking Submit...`);
    await scrollDownToText(driver, "Submit", 5);
    const submitBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_submit" and @text="Submit"]');
    await submitBtn.waitForDisplayed({ timeout: 5000 });
    await submitBtn.click();
    console.log(`✅ Submit clicked!`);
    await driver.pause(2000);
}

async function clickPreviewSubmitButton(driver) {
    console.log(`⏳ Waiting for the Preview Submit button...`);
    const submitBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnSubmitPreview"]');
    await submitBtn.waitForDisplayed({ timeout: 5000 });
    await submitBtn.click();
    console.log(`✅ Preview Submit clicked successfully!`);
    await driver.pause(2000);
}
async function fillChildRegisteredAtSchool(driver, option) {
    console.log(`⏳ Processing Child Registered at School...`);
    try {
        // Updated text to exactly match the XML hint/content-desc
        await scrollDownToText(driver, "Is the Child registered at School");
        const spinnerSelector = 'android=new UiSelector().className("android.widget.Spinner").descriptionContains("Child registered at School")';

        // Wait briefly to see if the element exists
        const spinner = await driver.$(spinnerSelector);
        await spinner.waitForDisplayed({ timeout: 3000 });

        // If found, proceed to click and select
        await clickSpinnerAndSelectOption(driver, spinnerSelector, option, ['Yes', 'No']);
    } catch (e) {
        console.log(`⚠️ 'Is the Child registered at School' field not present. Skipping.`);
    }
}

async function formRegistration(driver, gender = 'Female') {
    console.log("🚀 Starting Family Member Registration Form...");

    await agreeToConsent(driver);
    await driver.pause(1000);

    // Initial Registration Logic
    await fillFirstAndLastName(driver, gender);
    await fillDateOfRegistration(driver);
    await fillDateOfBirth(driver);

    // Read automatically calculated age to determine available form fields
    const ageInYears = await readAgeInYears(driver);
    console.log(`👤 Beneficiary parsed Age: ${ageInYears} years`);

    // ─── BRANCH 1: Under 3 Years Old ──────────────────────────────────────────
    if (ageInYears < 3) {
        console.log(`👶 Executing flow for Age < 3...`);

        // ADDED: Fill Father and Mother's name for infants
        await fillFathersName(driver);
        await fillMothersName(driver);

        if (REG_DATA.community) await fillCommunity(driver, REG_DATA.community);
        if (REG_DATA.religion) await fillReligion(driver, REG_DATA.religion);
        if (REG_DATA.rchId) await fillRchId(driver, REG_DATA.rchId);
        await fillBirthCertificateNo(driver);

        const places = ['Home', 'Sub-Centre', 'PHC', 'District Hospital', 'Private Hospital'];
        await fillPlaceOfBirth(driver, places[Math.floor(Math.random() * places.length)]);
    }

    // ─── BRANCH 2: Between 3 and 14 Years Old ─────────────────────────────────
    else if (ageInYears >= 3 && ageInYears < 15) {
        console.log(`🎒 Executing flow for 3 <= Age < 15...`);

        // ADDED: Fill Father and Mother's name for children
        await fillFathersName(driver);
        await fillMothersName(driver);

        if (REG_DATA.community) await fillCommunity(driver, REG_DATA.community);
        if (REG_DATA.religion) await fillReligion(driver, REG_DATA.religion);
        if (REG_DATA.rchId) await fillRchId(driver, REG_DATA.rchId);

        const randomSchool = Math.random() > 0.5 ? 'Yes' : 'No';
        await fillChildRegisteredAtSchool(driver, randomSchool);

        await fillBirthCertificateNo(driver);

        const places = ['Home', 'Sub-Centre', 'PHC', 'District Hospital', 'Private Hospital'];
        await fillPlaceOfBirth(driver, places[Math.floor(Math.random() * places.length)]);
    }

    // ─── BRANCH 3: Adults (15+ Years Old) ─────────────────────────────────────
    else {
        console.log(`👩‍💼 Executing flow for Adults (Age >= 15)...`);
        await fillFathersName(driver);
        await fillMothersName(driver);

        if (REG_DATA.maritalStatus) {
            await fillMaritalStatus(driver, REG_DATA.maritalStatus);
        }

        const isFemale = gender.toLowerCase() === 'female';
        const isEverMarried = ['Married', 'Divorced', 'Separated', 'Widow'].includes(REG_DATA.maritalStatus);

        if (isEverMarried) {
            await fillSpouseName(driver, gender);
        }

        // Only show "Do you have children?" if Female AND (Married, Divorced, Separated, Widow)
        if (isFemale && isEverMarried) {
            if (REG_DATA.haveChildren) await fillHaveChildren(driver, REG_DATA.haveChildren);
        }

        if (REG_DATA.mobileBelongsTo) await fillMobileNumberBelongsTo(driver, REG_DATA.mobileBelongsTo);
        if (REG_DATA.community) await fillCommunity(driver, REG_DATA.community);
        if (REG_DATA.religion) await fillReligion(driver, REG_DATA.religion);

        if (REG_DATA.rchId) {
            await fillRchId(driver, REG_DATA.rchId);
        }

        // Only show Status of Women if Female, Ever Married, AND Age is less than 49
        if (isFemale && isEverMarried) {
            if (ageInYears >= 49) {
                console.log(`✅ Skipping Status of Women (Beneficiary is Age 49+)`);
            } else if (REG_DATA.statusOfWomen) {
                await fillStatusOfWomen(driver, REG_DATA.statusOfWomen);
            }
        } else {
            console.log(`✅ Skipping Status of Women (Beneficiary is Unmarried or not Female)`);
        }
    }

    // Submit sequence
    await clickSubmitButton(driver);
    await clickPreviewSubmitButton(driver);

    console.log("🎉 Registration form completed successfully!");
}
module.exports = { formRegistration };