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

/**
 * Universal helper function to tap an exact pixel on the screen using W3C Actions.
 */
async function tapAt(driver, x, y) {
    await driver.action('pointer')
        .move({ duration: 0, x: x, y: y })
        .down({ button: 0 })
        .pause(100) // Brief pause to simulate a real human finger tap
        .up({ button: 0 })
        .perform();
}

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
    console.log(`Scrolling to find member: '${targetName}'...`);
    const scrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${targetName}"))`;
    const nameElement = await driver.$(`android=${scrollSelector}`);
    await nameElement.waitForDisplayed({ timeout: 15000 });

    const registerBtnXPath = `//*[@text='${targetName}']/ancestor::android.view.ViewGroup//android.widget.Button[@text='REGISTER']`;
    const registerBtn = await driver.$(registerBtnXPath);
    await registerBtn.waitForDisplayed({ timeout: 5000 });
    await registerBtn.click();
    console.log(`Successfully clicked the REGISTER button for '${targetName}'`);
}

async function setVisitDate(driver, dateString) {
    console.log(`Attempting to set Visit Date to: '${dateString}'...`);

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const parts = dateString.split("-");
    const day = parts[0].padStart(2, '0');
    const monthStr = months[parseInt(parts[1], 10) - 1];
    const year = parts[2];

    const targetContentDesc = `${day} ${monthStr} ${year}`;

    const visitDateField = await driver.$("//android.widget.EditText[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/et']");
    await visitDateField.waitForDisplayed({ timeout: 10000 });
    await visitDateField.click();
    console.log("Clicked Visit Date field. Waiting for calendar to open...");

    await driver.pause(2000);

    try {
        const yearHeader = await driver.$("//*[@resource-id='android:id/date_picker_header_year']");
        const currentYear = await yearHeader.getText();

        if (currentYear !== year) {
            console.log(`Changing year from ${currentYear} to ${year}...`);
            await yearHeader.click();
            await driver.pause(1000);

            const yearSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${year}"))`;
            const yearElement = await driver.$(`android=${yearSelector}`);
            await yearElement.click();
            await driver.pause(1000);
        }

        console.log(`Finding date: '${targetContentDesc}'...`);
        const daySelector = `new UiScrollable(new UiSelector().resourceId("android:id/day_picker_view_pager")).setAsHorizontalList().scrollIntoView(new UiSelector().description("${targetContentDesc}"))`;
        const dayElement = await driver.$(`android=${daySelector}`);

        await dayElement.waitForDisplayed({ timeout: 10000 });
        await dayElement.click();
        console.log(`Selected day: ${targetContentDesc}`);

        const okBtn = await driver.$("//*[@resource-id='android:id/button1']");
        await okBtn.click();

        console.log(`Successfully applied date '${dateString}' from calendar.`);

    } catch (error) {
        console.error("Failed to select the date inside the calendar picker:", error.message);
    }
}

/**
 * Fills the Date of Test using the calendar picker
 */
async function setDateOfTest(driver, dateString) {
    try {
        console.log(`Attempting to set Date of Test to: '${dateString}'...`);

        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textStartsWith("Date of Test"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const parts = dateString.split("-");
        const day = parts[0].padStart(2, '0');
        const monthStr = months[parseInt(parts[1], 10) - 1];
        const year = parts[2];

        const targetContentDesc = `${day} ${monthStr} ${year}`;

        const dateOfTestField = await driver.$(`//android.widget.EditText[contains(@hint, "Date of Test") or contains(@text, "Date of Test")]`);
        await dateOfTestField.waitForDisplayed({ timeout: 10000 });
        await dateOfTestField.click();
        console.log("Clicked Date of Test field. Waiting for calendar to open...");

        await driver.pause(2000);

        const yearHeader = await driver.$("//*[@resource-id='android:id/date_picker_header_year']");
        const currentYear = await yearHeader.getText();

        if (currentYear !== year) {
            console.log(`Changing year from ${currentYear} to ${year}...`);
            await yearHeader.click();
            await driver.pause(1000);

            const yearSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${year}"))`;
            const yearElement = await driver.$(`android=${yearSelector}`);
            await yearElement.click();
            await driver.pause(1000);
        }

        console.log(`Finding date: '${targetContentDesc}'...`);
        const daySelector = `new UiScrollable(new UiSelector().resourceId("android:id/day_picker_view_pager")).setAsHorizontalList().scrollIntoView(new UiSelector().description("${targetContentDesc}"))`;
        const dayElement = await driver.$(`android=${daySelector}`);

        await dayElement.waitForDisplayed({ timeout: 10000 });
        await dayElement.click();
        console.log(`Selected day: ${targetContentDesc}`);

        const okBtn = await driver.$("//*[@resource-id='android:id/button1']");
        await okBtn.click();

        console.log(`Successfully applied Date of Test '${dateString}' from calendar.`);

    } catch (error) {
        console.error("Failed to select the Date of Test inside the calendar picker:", error.message);
    }
}

/**
 * Fills the Date of Death using the calendar picker
 */
async function setDateOfDeath(driver, dateString) {
    try {
        console.log(`Attempting to set Date of death to: '${dateString}'...`);

        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textStartsWith("Date of death"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const parts = dateString.split("-");
        const day = parts[0].padStart(2, '0');
        const monthStr = months[parseInt(parts[1], 10) - 1];
        const year = parts[2];

        const targetContentDesc = `${day} ${monthStr} ${year}`;

        const dateOfDeathField = await driver.$(`//android.widget.EditText[contains(@hint, "Date of death") or contains(@text, "Date of death")]`);
        await dateOfDeathField.waitForDisplayed({ timeout: 10000 });
        await dateOfDeathField.click();
        console.log("Clicked Date of death field. Waiting for calendar to open...");

        await driver.pause(2000);

        const yearHeader = await driver.$("//*[@resource-id='android:id/date_picker_header_year']");
        const currentYear = await yearHeader.getText();

        if (currentYear !== year) {
            console.log(`Changing year from ${currentYear} to ${year}...`);
            await yearHeader.click();
            await driver.pause(1000);

            const yearSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${year}"))`;
            const yearElement = await driver.$(`android=${yearSelector}`);
            await yearElement.click();
            await driver.pause(1000);
        }

        console.log(`Finding date: '${targetContentDesc}'...`);
        const daySelector = `new UiScrollable(new UiSelector().resourceId("android:id/day_picker_view_pager")).setAsHorizontalList().scrollIntoView(new UiSelector().description("${targetContentDesc}"))`;
        const dayElement = await driver.$(`android=${daySelector}`);

        await dayElement.waitForDisplayed({ timeout: 10000 });
        await dayElement.click();
        console.log(`Selected day: ${targetContentDesc}`);

        const okBtn = await driver.$("//*[@resource-id='android:id/button1']");
        await okBtn.click();

        console.log(`Successfully applied Date of death '${dateString}' from calendar.`);

    } catch (error) {
        console.error("Failed to select the Date of death inside the calendar picker:", error.message);
    }
}

/**
 * Fills the Beneficiary Status using coordinate mapping
 */
async function fillBeneficiaryStatus(driver, statusText) {
    try {
        console.log(`Processing 'Beneficiary Status' Dropdown for: "${statusText}"...`);

        const dropdowns = await driver.$$("//*[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown']");

        if (dropdowns.length > 0) {
            console.log("⏳ Opening 'Beneficiary Status' Dropdown...");
            await dropdowns[0].click();

            await driver.pause(1500);

            const STATUS_COORDS = {
                'Not Applicable':         { x: 500, y: 600 },
                'Recovering':             { x: 500, y: 700 },
                'Cured':                  { x: 500, y: 800 },
                'Death':                  { x: 500, y: 1000 },
                'Recurrence of Symptoms': { x: 500, y: 1000 }
            };

            const coords = STATUS_COORDS[statusText];
            if (coords) {
                console.log(`⏳ Tapping coordinates X:${coords.x} Y:${coords.y} for '${statusText}'`);
                await tapAt(driver, coords.x, coords.y);
                console.log(`✔ Status updated to '${statusText}' via coordinates.`);
            } else {
                console.error(`❌ "${statusText}" is not defined in the coordinate map.`);
            }

            await driver.pause(1000);

        } else {
            console.log(`➡ 'Beneficiary Status' dropdown is not visible. Skipping.`);
        }
    } catch (error) {
        console.error('❌ Error processing Beneficiary Status dropdown:', error.message);
    }
}

/**
 * Fills the Reason for Death Dropdown using coordinate mapping
 */
async function fillReasonForDeath(driver, reasonText) {
    try {
        console.log(`Processing 'Reason for Death' Dropdown for: "${reasonText}"...`);

        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Reason for Death"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const exactDropdown = await driver.$(`//android.widget.Spinner[contains(@hint, "Reason for Death") or contains(@text, "Reason for Death")]`);

        if (await exactDropdown.isExisting()) {
            console.log("⏳ Opening 'Reason for Death' Dropdown...");
            await exactDropdown.click();

            await driver.pause(1500);

            const REASON_COORDS = {
                'Fever':         { x: 500, y: 1200 },
                'other Disease': { x: 500, y: 1300 },
                'Other':         { x: 500, y: 1400 }
            };

            const coords = REASON_COORDS[reasonText];
            if (coords) {
                console.log(`⏳ Tapping coordinates X:${coords.x} Y:${coords.y} for '${reasonText}'`);
                await tapAt(driver, coords.x, coords.y);
                console.log(`✔ Reason for Death updated to '${reasonText}' via coordinates.`);
            } else {
                console.error(`❌ "${reasonText}" is not defined in the coordinate map.`);
            }

            await driver.pause(1000);

        } else {
            console.log(`➡ 'Reason for Death' dropdown is not visible. Skipping.`);
        }
    } catch (error) {
        console.error('❌ Error processing Reason for Death dropdown:', error.message);
    }
}

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
        } else {
            console.log(`➡ 'Other Reason of Death' text field not found or visible. Skipping.`);
        }
    } catch (error) {
        console.error('❌ Error filling Other Reason of Death text field:', error.message);
    }
}

async function fillCaseStatus(driver, caseText) {
    try {
        console.log(`Processing 'Case Status' Dropdown for: "${caseText}"...`);

        const dropdowns = await driver.$$("//*[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown']");

        if (dropdowns.length > 1) {
            console.log("⏳ Opening 'Case Status' Dropdown...");
            await dropdowns[1].click();

            await driver.pause(1500);

            const CASE_COORDS = {
                'Suspected':         { x: 500, y: 850 },
                'Confirmed':         { x: 500, y: 950 },
                'Not Confirmed':     { x: 500, y: 1050 },
                'Treatment Started': { x: 500, y: 1150 }
            };

            const coords = CASE_COORDS[caseText];
            if (coords) {
                console.log(`⏳ Tapping coordinates X:${coords.x} Y:${coords.y} for '${caseText}'`);
                await tapAt(driver, coords.x, coords.y);
                console.log(`✔ Case Status updated to '${caseText}' via coordinates.`);
            } else {
                console.error(`❌ "${caseText}" is not defined in the coordinate map.`);
            }

            await driver.pause(1000);

        } else {
            console.log(`➡ 'Case Status' dropdown is not visible. Skipping.`);
        }
    } catch (error) {
        console.error('❌ Error processing Case Status dropdown:', error.message);
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
        } else {
            console.log(`➡ RDT option '${resultText}' not found or visible. Skipping.`);
        }
    } catch (error) {
        console.error('❌ Error processing RDT radio button:', error.message);
    }
}

async function fillReferredTo(driver, facilityText) {
    try {
        console.log(`Processing 'Referred To' Dropdown for: "${facilityText}"...`);

        const scrollSelector = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Referred To"))`;
        await driver.$(scrollSelector).waitForExist({ timeout: 3000 }).catch(() => {});

        const dropdowns = await driver.$$("//*[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown']");

        let targetDropdown;
        const exactDropdown = await driver.$("//*[@text='Referred To' or @hint='Referred To']");

        if (await exactDropdown.isExisting()) {
            targetDropdown = exactDropdown;
        } else if (dropdowns.length > 2) {
            targetDropdown = dropdowns[2];
        }

        if (targetDropdown) {
            console.log("⏳ Opening 'Referred To' Dropdown...");
            await targetDropdown.click();

            await driver.pause(1500);

            const REFERRED_COORDS = {
                'Primary Health Centre':        { x: 500, y: 1200 },
                'Community Health Centre':      { x: 500, y: 1310 },
                'District Hospital':            { x: 500, y: 1420 },
                'Medical College and Hospital': { x: 500, y: 1530 },
                'Referral Hospital':            { x: 500, y: 1640 },
                'Other Private Hospital':       { x: 500, y: 1750 },
                'Other':                        { x: 500, y: 1860 }
            };

            const coords = REFERRED_COORDS[facilityText];
            if (coords) {
                console.log(`⏳ Tapping coordinates X:${coords.x} Y:${coords.y} for '${facilityText}'`);
                await tapAt(driver, coords.x, coords.y);
                console.log(`✔ Referred To updated to '${facilityText}' via coordinates.`);
            } else {
                console.error(`❌ "${facilityText}" is not defined in the coordinate map.`);
            }

            await driver.pause(1000);

        } else {
            console.log(`➡ 'Referred To' dropdown is not visible. Skipping.`);
        }
    } catch (error) {
        console.error('❌ Error processing Referred To dropdown:', error.message);
    }
}

async function fillPlaceOfDeath(driver, placeText) {
    try {
        console.log(`Processing 'Place of Death' Dropdown for: "${placeText}"...`);

        const placeDropdown = await driver.$(`//android.widget.Spinner[contains(@hint, "Place of Death") or contains(@text, "Place of Death")]`);

        if (await placeDropdown.isExisting()) {
            console.log("⏳ Opening 'Place of Death' Dropdown...");
            await placeDropdown.click();
            await driver.pause(1500);

            const PLACE_COORDS = {
                'Home':     { x: 500, y: 1050 },
                'Facility': { x: 500, y: 1150 },
                'Other':    { x: 500, y: 1250 }
            };

            const coords = PLACE_COORDS[placeText];
            if (coords) {
                console.log(`⏳ Tapping coordinates X:${coords.x} Y:${coords.y} for '${placeText}'`);
                await tapAt(driver, coords.x, coords.y);
                console.log(`✔ Place of Death updated to '${placeText}' via coordinates.`);
            } else {
                console.error(`❌ "${placeText}" is not defined in the coordinate map.`);
            }
            await driver.pause(1000);
        }
    } catch (error) {
        console.error('❌ Error processing Place of Death dropdown:', error.message);
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

async function main() {
    console.log("Initializing Appium session...");
    let driver;

    try {
        driver = await remote(wdioOptions);

        await clickElementByText(driver, 'Disease Control');
        await clickElementByText(driver, 'Kala Azar');

        await searchForText(driver, 'ranudevi gg');
        await driver.pause(2000);
        await clickFirstMemberButton(driver);
        await driver.pause(2000);

        await scrollAndClickRegisterByName(driver, 'GOLU JSBS');

        await setVisitDate(driver, "15-03-2026");

        // 1. Fill Beneficiary Status
        const statusToSelect = 'Death';
        await fillBeneficiaryStatus(driver, statusToSelect);

        // 2. Conditional Form Logic based on 'Death'
        if (statusToSelect === 'Death') {
            console.log(`💡 '${statusToSelect}' selected. Triggering 'Death' workflow...`);

            await setDateOfDeath(driver, "16-03-2026");

            const reasonForDeathToSelect = "Other";
            const placeToSelect = "Other"; // FIX: Variable now defined

            await fillReasonForDeath(driver, reasonForDeathToSelect);

            if (reasonForDeathToSelect === "Other") {
                console.log(`💡 Reason for Death '${reasonForDeathToSelect}' selected. Triggering 'Other Reason' workflow...`);
                await fillOtherReasonOfDeath(driver, "Unknown Complications");
            }

            await fillPlaceOfDeath(driver, placeToSelect);

            if (placeToSelect === "Other") {
                await fillOtherPlaceOfDeath(driver, "Street Side");
            }

        } else {
            console.log(`💡 '${statusToSelect}' selected. Triggering standard workflow...`);

            const caseStatusToSelect = 'Confirmed';
            await fillCaseStatus(driver, caseStatusToSelect);

            if (caseStatusToSelect) {
                console.log(`💡 Case Status '${caseStatusToSelect}' selected. Triggering 'Referred To' workflow...`);
                await fillReferredTo(driver, 'Primary Health Centre');
            }

            const requiresRDT = ['Cured', 'Not Applicable', 'Recovering', 'Recurrence of Symptoms'].includes(statusToSelect);
            if (requiresRDT) {
                console.log(`💡 '${statusToSelect}' selected. Triggering 'RDT' workflow...`);
                const rdtResult = 'Positive';
                await fillRDT(driver, rdtResult);

                if (rdtResult === 'Positive' || rdtResult === 'Negative') {
                    console.log(`💡 RDT is '${rdtResult}'. Triggering 'Date of Test' workflow...`);
                    await setDateOfTest(driver, "16-03-2026");
                }
            }
        }
        console.log("Scrolling to Submit button...");
        const scrollSubmit = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Submit"))`;
        await driver.$(scrollSubmit).waitForExist({ timeout: 5000 });

        console.log("Clicking Submit via coordinates [539, 1507]...");
        await tapAt(driver, 539, 1507); // Centered X and Y based on bounds [446,1456][633,1558]
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

main();