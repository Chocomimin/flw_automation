const { remote } = require('webdriverio');

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true
};

const wdioOptions = {
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities: capabilities
};

// ─────────────────────────────────────────────────────────────
//  TEST INPUT DATA
// ─────────────────────────────────────────────────────────────

const inputData = {
    diseaseCategory: 'Disease Control',
    diseaseType: 'Kala Azar',
    searchName: 'AJOY MAJHI',
    targetMemberName: 'AJOY MAJHI',
    visitDate: '15-03-2026',

    // Status can be: 'Not Applicable', 'Recovering', 'Cured', 'Death', 'Recurrence of Symptoms'
    beneficiaryStatus: 'Recovering',

    // Death Workflow Inputs
    dateOfDeath: '16-03-2026',
    reasonForDeath: 'Other', // 'Fever', 'other Disease', 'Other'
    otherReasonText: 'Unknown Complications',
    placeOfDeath: 'Other', // 'Home', 'Facility', 'Other'
    otherPlaceText: 'Street Side',

    // Standard Workflow Inputs (If not 'Death')
    caseStatus: 'Confirmed', // 'Suspected', 'Confirmed', 'Not Confirmed', 'Treatment Started'
    referredTo: 'Primary Health Centre',
    rdtResult: 'Positive', // 'Positive', 'Negative'
    dateOfTest: '16-03-2026'
};

// ─────────────────────────────────────────────────────────────
//  CORE HELPERS — Shared Spinner click + Coordinate fallbacks
// ─────────────────────────────────────────────────────────────

async function scrollSpinnerToMiddle(driver, spinnerSelector) {
    try {
        const spinner = await driver.$(spinnerSelector);
        const loc = await spinner.getLocation();
        const screen = await driver.getWindowRect();
        const midY = screen.height / 2;

        if (loc.y > midY + 100) {
            console.log(`⬆️  Spinner at y=${loc.y}, scrolling toward middle...`);
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
        console.log('⚠️  scrollSpinnerToMiddle skipped:', e.message);
    }
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
    console.log(`📍 Spinner @ (${loc.x}, ${loc.y}), size (${size.width}x${size.height})`);

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
                const tapX = Math.floor((parseInt(boundsMatch[1]) + parseInt(boundsMatch[3])) / 2);
                const tapY = Math.floor((parseInt(boundsMatch[2]) + parseInt(boundsMatch[4])) / 2);
                console.log(`📍 Found "${value}" in XML (tag parse) → tap(${tapX},${tapY})`);
                await tapByCoords(driver, tapX, tapY);
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
            const tapX = Math.floor((parseInt(match[1]) + parseInt(match[3])) / 2);
            const tapY = Math.floor((parseInt(match[2]) + parseInt(match[4])) / 2);
            console.log(`📍 Found "${value}" via regex → tap(${tapX},${tapY})`);
            await tapByCoords(driver, tapX, tapY);
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

// ─────────────────────────────────────────────────────────────
//  STANDARD FIELD HELPERS
// ─────────────────────────────────────────────────────────────

async function clickElementByText(driver, text) {
    console.log(`Looking for element with text: '${text}'...`);
    const element = await driver.$(`//*[@text='${text}']`);
    await element.waitForDisplayed({ timeout: 10000 });
    await element.click();
    console.log(`Successfully clicked on '${text}'`);
}

async function searchForText(driver, searchText) {
    console.log(`Typing '${searchText}' into the search bar...`);
    const searchBox = await driver.$("//*[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/searchView']");
    await searchBox.waitForDisplayed({ timeout: 10000 });
    await searchBox.click();
    await searchBox.setValue(searchText);
    await driver.pressKeyCode(66);
    console.log(`Search triggered for '${searchText}'`);
}

async function clickFirstMemberButton(driver) {
    console.log(`Looking for the Members button...`);
    const memberBtn = await driver.$("//android.widget.Button[contains(@text, 'Members')]");
    await memberBtn.waitForDisplayed({ timeout: 10000 });
    await memberBtn.click();
    console.log(`Successfully clicked on the Members button`);
}

async function scrollAndClickRegisterByName(driver, targetName) {
    console.log(`Manually scrolling to find main beneficiary: '${targetName}'...`);
    let isFound = false;
    let maxSwipes = 20;

    const strictNameXPath = `//*[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/ll_title_tb_screening_list_bar']/*[@text='${targetName}']`;

    for (let i = 0; i < maxSwipes; i++) {
        const nameElements = await driver.$$(strictNameXPath);

        if (nameElements.length > 0 && await nameElements[0].isDisplayed()) {
            console.log(`✔ Found main beneficiary: '${targetName}' on screen after ${i} swipes.`);
            isFound = true;
            break;
        }

        console.log(`Beneficiary not found yet. Swiping up (Attempt ${i + 1}/${maxSwipes})...`);
        const screen = await driver.getWindowRect();
        const startX = Math.floor(screen.width / 2);
        const startY = Math.floor(screen.height * 0.75);
        const endY   = Math.floor(screen.height * 0.25);

        await driver.performActions([{
            type: 'pointer', id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: startX, y: startY },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 300 },
                { type: 'pointerMove', duration: 1500, x: startX, y: endY },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
        await driver.releaseActions();
        await driver.pause(1500);
    }

    if (!isFound) {
        throw new Error(`❌ Could not find main beneficiary '${targetName}' after ${maxSwipes} swipes.`);
    }

    const nameElements = await driver.$$(strictNameXPath);
    const nameLoc  = await nameElements[0].getLocation();
    const nameSize = await nameElements[0].getSize();

    console.log(`📍 Name element found at y=${nameLoc.y}, height=${nameSize.height}`);

    try {
        const registerXPath =
            `//*[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/ll_title_tb_screening_list_bar']` +
            `/*[@text='${targetName}']` +
            `/ancestor::*[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/cv_content']` +
            `//android.widget.Button[@text='REGISTER']`;

        const registerBtn = await driver.$(registerXPath);
        await registerBtn.waitForDisplayed({ timeout: 5000 });

        const btnLoc = await registerBtn.getLocation();
        console.log(`📍 REGISTER button found at y=${btnLoc.y}`);

        if (btnLoc.y < nameLoc.y) {
            throw new Error(`REGISTER button (y=${btnLoc.y}) is above name (y=${nameLoc.y}) — wrong card!`);
        }

        await registerBtn.click();
        console.log(`✔ Successfully clicked the REGISTER button for '${targetName}'`);
        return;

    } catch (e) {
        console.log(`⚠️  Strategy 1 failed: ${e.message}. Falling back to coordinate tap...`);
    }

    const screen = await driver.getWindowRect();
    const tapX = Math.floor(screen.width * 0.9);
    const tapY = Math.floor(nameLoc.y + 280);

    console.log(`📍 Coordinate fallback → tap(${tapX}, ${tapY})`);

    if (tapY > screen.height) {
        throw new Error(`❌ Calculated tap Y (${tapY}) exceeds screen height (${screen.height})`);
    }

    await tapByCoords(driver, tapX, tapY);
    console.log(`✔ Tapped REGISTER for '${targetName}' via coordinate fallback`);
}

async function setDateViaCalendar(driver, fieldSelector, targetContentDesc, year) {
    const field = await driver.$(fieldSelector);
    await field.waitForDisplayed({ timeout: 10000 });
    await field.click();
    await driver.pause(2000);

    const yearHeader = await driver.$("//*[@resource-id='android:id/date_picker_header_year']");
    const currentYear = await yearHeader.getText();

    if (currentYear !== year) {
        await yearHeader.click();
        await driver.pause(1000);
        const yearSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${year}"))`;
        const yearElement = await driver.$(`android=${yearSelector}`);
        await yearElement.click();
        await driver.pause(1000);
    }

    const daySelector = `new UiScrollable(new UiSelector().resourceId("android:id/day_picker_view_pager")).setAsHorizontalList().scrollIntoView(new UiSelector().description("${targetContentDesc}"))`;
    const dayElement = await driver.$(`android=${daySelector}`);
    await dayElement.waitForDisplayed({ timeout: 10000 });
    await dayElement.click();

    const okBtn = await driver.$("//*[@resource-id='android:id/button1']");
    await okBtn.click();
}

async function parseDateString(dateString) {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const parts = dateString.split("-");
    const day = parts[0].padStart(2, '0');
    const monthStr = months[parseInt(parts[1], 10) - 1];
    const year = parts[2];
    return { targetContentDesc: `${day} ${monthStr} ${year}`, year };
}

async function setVisitDate(driver, dateString) {
    try {
        console.log(`Attempting to set Visit Date to: '${dateString}'...`);
        const { targetContentDesc, year } = await parseDateString(dateString);
        await setDateViaCalendar(driver, "//android.widget.EditText[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/et']", targetContentDesc, year);
        console.log(`Successfully applied Visit Date '${dateString}'`);
    } catch (error) {
        console.error("Failed to select Visit Date:", error.message);
    }
}

async function setDateOfTest(driver, dateString) {
    try {
        console.log(`Attempting to set Date of Test to: '${dateString}'...`);
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textStartsWith("Date of Test"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const { targetContentDesc, year } = await parseDateString(dateString);
        await setDateViaCalendar(driver, `//android.widget.EditText[contains(@hint, "Date of Test") or contains(@text, "Date of Test")]`, targetContentDesc, year);
        console.log(`Successfully applied Date of Test '${dateString}'`);
    } catch (error) {
        console.error("Failed to select Date of Test:", error.message);
    }
}

async function setDateOfDeath(driver, dateString) {
    try {
        console.log(`Attempting to set Date of death to: '${dateString}'...`);
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textStartsWith("Date of death"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const { targetContentDesc, year } = await parseDateString(dateString);
        await setDateViaCalendar(driver, `//android.widget.EditText[contains(@hint, "Date of death") or contains(@text, "Date of death")]`, targetContentDesc, year);
        console.log(`Successfully applied Date of death '${dateString}'`);
    } catch (error) {
        console.error("Failed to select Date of death:", error.message);
    }
}

// ─────────────────────────────────────────────────────────────
//  NEW REFACTORED DROPDOWN METHODS (Matches householdFormSteps.js format)
// ─────────────────────────────────────────────────────────────

async function fillBeneficiaryStatus(driver, value) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Beneficiary Status"))');
    await driver.pause(1000);
    await clickSpinnerAndSelectOption(
        driver,
        "(//*[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown'])[1]",
        value,
        ['Not Applicable', 'Recovering', 'Cured', 'Death', 'Recurrence of Symptoms']
    );
    console.log(`✅ Beneficiary Status: ${value}`);
}

async function fillReasonForDeath(driver, value) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Reason for Death"))');
    await driver.pause(1000);
    await clickSpinnerAndSelectOption(
        driver,
        '//android.widget.Spinner[contains(@hint, "Reason for Death") or contains(@text, "Reason for Death")]',
        value,
        ['Fever', 'other Disease', 'Other']
    );
    console.log(`✅ Reason for Death: ${value}`);
}

async function fillCaseStatus(driver, value) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Case Status"))');
    await driver.pause(1000);
    await clickSpinnerAndSelectOption(
        driver,
        "(//*[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown'])[2]",
        value,
        ['Suspected', 'Confirmed', 'Not Confirmed', 'Treatment Started']
    );
    console.log(`✅ Case Status: ${value}`);
}

async function fillReferredTo(driver, value) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Referred To"))');
    await driver.pause(1000);
    await clickSpinnerAndSelectOption(
        driver,
        "//*[@text='Referred To' or @hint='Referred To'] | (//*[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown'])[3]",
        value,
        ['Primary Health Centre', 'Community Health Centre', 'District Hospital', 'Medical College and Hospital', 'Referral Hospital', 'Other Private Hospital', 'Other']
    );
    console.log(`✅ Referred To: ${value}`);
}

async function fillPlaceOfDeath(driver, value) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Place of Death"))');
    await driver.pause(1000);
    await clickSpinnerAndSelectOption(
        driver,
        '//android.widget.Spinner[contains(@hint, "Place of Death") or contains(@text, "Place of Death")]',
        value,
        ['Home', 'Facility', 'Other']
    );
    console.log(`✅ Place of Death: ${value}`);
}

// ─────────────────────────────────────────────────────────────
//  REMAINING FORM ACTIONS
// ─────────────────────────────────────────────────────────────

async function fillOtherReasonOfDeath(driver, otherReasonText) {
    try {
        console.log(`Filling 'Other Reason of Death' field with: "${otherReasonText}"...`);
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Other Reason of Death"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const otherReasonField = await driver.$(`//android.widget.EditText[contains(@hint, "Other Reason of Death") or contains(@text, "Other Reason of Death")]`);
        if (await otherReasonField.isExisting()) {
            await otherReasonField.click();
            await otherReasonField.setValue(otherReasonText);
            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
            }
            console.log(`✔ Typed '${otherReasonText}' into Other Reason of Death field.`);
        }
    } catch (error) {
        console.error('❌ Error filling Other Reason of Death text field:', error.message);
    }
}

async function fillOtherPlaceOfDeath(driver, otherPlaceText) {
    try {
        console.log(`Filling 'Other Place of Death' field with: "${otherPlaceText}"...`);
        const otherField = await driver.$(`//android.widget.EditText[contains(@hint, "Other Place of Death")]`);
        if (await otherField.isExisting()) {
            await otherField.click();
            await otherField.setValue(otherPlaceText);
            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
            }
            console.log(`✔ Typed '${otherPlaceText}' into Other Place of Death.`);
        }
    } catch (error) {
        console.error('❌ Error filling Other Place of Death field:', error.message);
    }
}

async function fillRDT(driver, resultText) {
    try {
        console.log(`Processing 'Rapid Diagnostic Test (RDT)' for: "${resultText}"...`);
        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Rapid Diagnostic Test"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const radioBtn = await driver.$(`//android.widget.RadioButton[@text="${resultText}"]`);
        if (await radioBtn.isExisting()) {
            await radioBtn.click();
            console.log(`✔ RDT updated to '${resultText}'.`);
        }
    } catch (error) {
        console.error('❌ Error processing RDT radio button:', error.message);
    }
}

// ─────────────────────────────────────────────────────────────
//  MASTER FUNCTION
// ─────────────────────────────────────────────────────────────

async function main(data) {
    console.log("Initializing Appium session...");
    let driver;

    try {
        driver = await remote(wdioOptions);

        await clickElementByText(driver, data.diseaseCategory);
        await clickElementByText(driver, data.diseaseType);

        await searchForText(driver, data.searchName);
        await driver.pause(2000);
        await clickFirstMemberButton(driver);
        await driver.pause(2000);

        await scrollAndClickRegisterByName(driver, data.targetMemberName);

        await setVisitDate(driver, data.visitDate);

        // 1. Fill Beneficiary Status
        await fillBeneficiaryStatus(driver, data.beneficiaryStatus);

        // 2. Conditional Form Logic
        if (data.beneficiaryStatus === 'Death') {
            console.log(`💡 '${data.beneficiaryStatus}' selected. Triggering 'Death' workflow...`);

            await setDateOfDeath(driver, data.dateOfDeath);
            await fillReasonForDeath(driver, data.reasonForDeath);

            if (data.reasonForDeath === "Other") {
                console.log(`💡 Reason for Death '${data.reasonForDeath}' selected. Triggering 'Other Reason' workflow...`);
                await fillOtherReasonOfDeath(driver, data.otherReasonText);
            }

            await fillPlaceOfDeath(driver, data.placeOfDeath);

            if (data.placeOfDeath === "Other") {
                await fillOtherPlaceOfDeath(driver, data.otherPlaceText);
            }

        } else {
            console.log(`💡 '${data.beneficiaryStatus}' selected. Triggering standard workflow...`);

            await fillCaseStatus(driver, data.caseStatus);

            if (data.caseStatus === 'Confirmed') {
                console.log(`💡 Case Status 'Confirmed' selected. Triggering Kala Azar RDT, Date, and Referral...`);
                await fillRDT(driver, data.rdtResult);
                await setDateOfTest(driver, data.dateOfTest);
                await fillReferredTo(driver, data.referredTo);
            }
        }

        console.log("Scrolling to Submit button...");
        const scrollSubmit = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Submit"))`;
        await driver.$(scrollSubmit).waitForExist({ timeout: 5000 });

        console.log('🔍 Clicking Submit via exact selector logic...');
        const submitBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit")');
        await submitBtn.waitForDisplayed({ timeout: 10000 });
        await submitBtn.click();

        console.log("✔ Form Submitted successfully.");

    } catch (error) {
        console.error("An error occurred during automation:", error.message);
    } finally {
        if (driver) {
            await driver.pause(3000);
            await driver.deleteSession();
        }
    }
}

// Pass the extracted data object into the execution block
main(inputData);