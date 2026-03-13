// householdFormSteps.js

async function fillFirstName(driver, firstName) {
    const firstNameField = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("First Name")');
    await firstNameField.waitForDisplayed({ timeout: 10000 });
    await firstNameField.click();
    await firstNameField.setValue(firstName);
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
    }
    console.log("✅ First Name entered successfully");
}

async function fillLastName(driver, lastName) {
    const lastNameField = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Last Name")');
    await lastNameField.waitForDisplayed({ timeout: 10000 });
    await lastNameField.click();
    await lastNameField.setValue(lastName);
    console.log("✅ Last Name entered successfully");
}

async function fillMobileNumber(driver, mobileNumber) {
    const mobileField = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Mobile No")');
    await mobileField.waitForDisplayed({ timeout: 10000 });
    await mobileField.click();
    await mobileField.setValue(mobileNumber);
    console.log("✅ Mobile Number entered successfully");
}

async function fillHouseNo(driver, houseNo) {
    const houseNoField = await driver.$('android=new UiSelector().className("android.widget.EditText").text("House No")');
    await houseNoField.waitForDisplayed({ timeout: 10000 });
    await houseNoField.click();
    await houseNoField.setValue(houseNo);
    console.log("✅ House Number entered successfully");
}

async function fillWardNo(driver, wardNo) {
    const wardNoField = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Ward No")');
    await wardNoField.waitForDisplayed({ timeout: 10000 });
    await wardNoField.click();
    await wardNoField.setValue(wardNo);
    console.log("✅ Ward Number entered successfully");
}

async function fillWardName(driver, wardName) {
    const wardNameField = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Ward Name")');
    await wardNameField.waitForDisplayed({ timeout: 10000 });
    await wardNameField.click();
    await wardNameField.setValue(wardName);
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
    }
    console.log("✅ Ward Name entered successfully");
}

async function fillMohallaName(driver, mohallaName) {
    const mohallaField = await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Mohalla Name"))');
    await mohallaField.waitForDisplayed({ timeout: 10000 });
    await mohallaField.click();
    await mohallaField.setValue(mohallaName);
    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(500);
    }
    console.log("✅ Mohalla Name entered successfully");
}

async function selectEconomicStatus(driver, status) {
    let selector = `android=new UiSelector().className("android.widget.RadioButton").text("${status}")`;
    if(status.toLowerCase() === 'dont know' || status.toLowerCase() === "don't know") {
        selector = 'android=new UiSelector().className("android.widget.RadioButton").text("Don\'t Know")';
    }
    const radioButton = await driver.$(selector);
    await radioButton.waitForDisplayed({ timeout: 10000 });
    await radioButton.click();
    console.log(`✅ Economic Status selected: ${status}`);
}

async function selectResidentialArea(driver, value = "Rural") {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Household Details"))');
    await driver.pause(1000);

    const dropdownBtn = await driver.$('android=new UiSelector().className("android.widget.Spinner").textContains("Type of residential area")');
    await dropdownBtn.waitForDisplayed({ timeout: 10000 });
    await dropdownBtn.click();
    await driver.pause(1500);

    if (await driver.isKeyboardShown()) {
        console.log("⚠️ Keyboard detected. Hiding it and re-opening the dropdown...");
        await driver.hideKeyboard();
        await driver.pause(1000);
        await dropdownBtn.click();
        await driver.pause(1500);
    }

    const { width, height } = await driver.getWindowRect();
    const x = Math.floor(width / 2);
    let y;

    switch (value) {
        case "Rural": y = Math.floor(height * 0.54); break;
        case "Urban": y = Math.floor(height * 0.58); break;
        case "Tribal": y = Math.floor(height * 0.62); break;
        case "Other": y = Math.floor(height * 0.67); break;
        case "Tea Garden": y = Math.floor(height * 0.71); break;
        default: y = Math.floor(height * 0.67);
    }

    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x, y },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    console.log(`✅ Selected Residential Area: ${value}`);
}

async function selectTypeOfHouse(driver, value = "None", isOtherResidentialAreaOpen = false) {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Type of house"))');
    await driver.pause(1000);

    // 🆕 Simplified Spinner Locator
    const typeOfHouseDropdownBtn = await driver.$('android=new UiSelector().className("android.widget.Spinner").textContains("Type of house")');
    await typeOfHouseDropdownBtn.waitForDisplayed({ timeout: 10000 });
    await typeOfHouseDropdownBtn.click();
    await driver.pause(1500);

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
        await typeOfHouseDropdownBtn.click();
        await driver.pause(1500);
    }

    const { width, height } = await driver.getWindowRect();
    const x = Math.floor(width / 2);
    let y;

    if (isOtherResidentialAreaOpen) {
        switch (value) {
            case "None": y = Math.floor(height * 0.75); break;
            case "Kuchha": y = Math.floor(height * 0.79); break;
            case "Pucca": y = Math.floor(height * 0.84); break;
            case "Other": y = Math.floor(height * 0.88); break;
            default: y = Math.floor(height * 0.75);
        }
    } else {
        switch (value) {
            case "None": y = Math.floor(height * 0.65); break;
            case "Kuchha": y = Math.floor(height * 0.69); break;
            case "Pucca": y = Math.floor(height * 0.74); break;
            case "Other": y = Math.floor(height * 0.78); break;
            default: y = Math.floor(height * 0.65);
        }
    }

    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x, y },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    console.log(`✅ Selected Type of House: ${value} (Other Res Open: ${isOtherResidentialAreaOpen})`);
}

async function selectHouseOwnership(driver, value = "Yes") {
    // Scroll to make sure House ownership is visible
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("House ownership"))');
    await driver.pause(1000);

    const options = await driver.$$(`android=new UiSelector().text("${value}")`);
    await options[0].click();
    console.log(`✅ House Ownership selected: ${value}`);
}

async function selectSeparateKitchen(driver, value = "Yes") {
    // Scroll down to the Kitchen section
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Kitchen"))');
    await driver.pause(1000);

    const options = await driver.$$(`android=new UiSelector().text("${value}")`);

    // If the House Ownership "Yes" scrolled off the top of the screen,
    // the array will only have 1 item. This safely picks index 1 if it exists, or index 0 if it doesn't.
    const targetIndex = options.length > 1 ? 1 : 0;
    await options[targetIndex].click();

    console.log(`✅ Separate Kitchen selected: ${value}`);
}

async function selectTypeOfFuel(driver, value = "Crop Residue") {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Type of fuel"))');
    await driver.pause(1000);

    // 🆕 Simplified Spinner Locator
    const fuelDropdown = await driver.$('android=new UiSelector().className("android.widget.Spinner").textContains("Type of fuel")');
    await fuelDropdown.waitForDisplayed({ timeout: 10000 });
    await fuelDropdown.click();
    await driver.pause(1500);

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
        await fuelDropdown.click();
        await driver.pause(1500);
    }

    const { width, height } = await driver.getWindowRect();
    const x = Math.floor(width / 2);
    let y;

    switch (value) {
        case "Firewood": y = height * 0.37; break;
        case "Crop Residue": y = height * 0.42; break;
        case "Cow dung cake": y = height * 0.46; break;
        case "Coal": y = height * 0.50; break;
        case "Kerosene": y = height * 0.55; break;
        case "LPG": y = height * 0.59; break;
        case "Induction": y = height * 0.63; break;
        case "Other": y = height * 0.68; break;
        default: y = height * 0.42;
    }

    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: Math.floor(x), y: Math.floor(y) },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    console.log(`✅ Fuel selected: ${value}`);
}

async function selectPrimaryWaterSource(driver, value = "Tank") {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Primary Source"))');
    await driver.pause(1000);

    // 🆕 Simplified Spinner Locator
    const waterDropdown = await driver.$('android=new UiSelector().className("android.widget.Spinner").textContains("Primary Source")');
    await waterDropdown.waitForDisplayed({ timeout: 10000 });
    await waterDropdown.click();
    await driver.pause(1500);

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
        await waterDropdown.click();
        await driver.pause(1500);
    }

    const { width, height } = await driver.getWindowRect();
    const x = Math.floor(width / 2);
    let y;

    switch (value) {
        case "Tap Water": y = height * 0.43; break;
        case "Hand pump inside house": y = height * 0.48; break;
        case "Hand pump outside of house": y = height * 0.52; break;
        case "Well": y = height * 0.57; break;
        case "Tank": y = height * 0.61; break;
        case "River": y = height * 0.66; break;
        case "Pond": y = height * 0.70; break;
        case "Other": y = height * 0.74; break;
        default: y = height * 0.61;
    }

    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: Math.floor(x), y: Math.floor(y) },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    console.log(`✅ Water source selected: ${value}`);
}

async function selectElectricityAvailability(driver, value ="Electricity Supply") {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Availability of Electricity"))');
    await driver.pause(1000);

    // 🆕 Simplified Spinner Locator
    const electricityDropdown = await driver.$('android=new UiSelector().className("android.widget.Spinner").textContains("Availability of Electricity")');
    await electricityDropdown.waitForDisplayed({ timeout: 10000 });
    await electricityDropdown.click();
    await driver.pause(2000);

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
        await electricityDropdown.click();
        await driver.pause(1500);
    }

    const { width, height } = await driver.getWindowRect();
    const x = Math.floor(width / 2);
    let y;

    switch (value) {
        case "Electricity Supply": y = height * 0.62; break;
        case "Generator":          y = height * 0.67; break;
        case "Solar Power":        y = height * 0.71; break;
        case "Kerosene Lamp":      y = height * 0.75; break;
        case "Other":              y = height * 0.80; break;
        default:                   y = height * 0.62;
    }

    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: Math.floor(x), y: Math.floor(y) },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 120 },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    console.log(`✅ Electricity selected: ${value}`);

    if (value === "Other") {
        const otherField = await driver.$('android=new UiSelector().textContains("Other availability")');
        await otherField.waitForDisplayed({ timeout: 10000 });
        await otherField.click();
        await otherField.setValue("Temporary electricity connection");
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }
    }
}

async function selectToiletAvailability(driver, value = "Flush toilet with running water") {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Availability of Toilet"))');
    await driver.pause(1000);

    // 🆕 Simplified Spinner Locator
    const toiletDropdown = await driver.$('android=new UiSelector().className("android.widget.Spinner").textContains("Availability of Toilet")');
    await toiletDropdown.waitForDisplayed({ timeout: 10000 });
    await toiletDropdown.click();
    await driver.pause(1500);

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(1000);
        await toiletDropdown.click();
        await driver.pause(1500);
    }

    const { width, height } = await driver.getWindowRect();
    const x = Math.floor(width / 2);
    let y;

    switch (value) {
        case "Flush toilet with running water": y = height * 0.65; break;
        case "Flush toilet without water": y = height * 0.69; break;
        case "Pit toilet with running water supply": y = height * 0.74; break;
        case "Pit toilet without water supply": y = height * 0.78; break;
        case "Other": y = height * 0.82; break;
        case "None": y = height * 0.87; break;
        default: y = height * 0.65;
    }

    await driver.performActions([{
        type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: Math.floor(x), y: Math.floor(y) },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    console.log(`✅ Toilet selected: ${value}`);
}

// Master function to fill the first form and trigger the transition
async function fillHouseholdFormWithExamples(driver) {
    console.log("📝 Filling household form with NEW example data...");

    await fillFirstName(driver, "Kavita");
    await fillLastName(driver, "Verma");
    await fillMobileNumber(driver, "9123456789");
    await fillHouseNo(driver, "108");
    await fillWardNo(driver, "5");
    await fillWardName(driver, "Sunrise Valley");
    await fillMohallaName(driver, "Old Bazar");

    await selectEconomicStatus(driver, "BPL");

    const residentialArea = "Urban"; // Switched to Urban
    await selectResidentialArea(driver, residentialArea);

    // Pass a flag depending on whether "Other" was selected for Residential Area
    const isOtherResidentialOpen = (residentialArea === "Other");
    await selectTypeOfHouse(driver, "Pucca", isOtherResidentialOpen); // Switched to Pucca

    await selectHouseOwnership(driver, "No"); // Switched to No
    await selectSeparateKitchen(driver, "No"); // Switched to No
    await selectTypeOfFuel(driver, "LPG"); // Switched to LPG
    await selectPrimaryWaterSource(driver, "Tap Water"); // Switched to Tap Water
    await selectElectricityAvailability(driver, "Electricity Supply");
    await selectToiletAvailability(driver, "Flush toilet with running water");

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
    }
    await driver.pause(1000);

    console.log("✅ All household form fields filled!");

    // 1. Click the Submit button on the Household Form
    console.log("🔍 Clicking Submit button...");
    const submitBtnFirstPage = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit")');
    await submitBtnFirstPage.waitForDisplayed({ timeout: 10000 });
    await submitBtnFirstPage.click();

    // 2. Handle the "ADD Head Of Family" Popup!
    console.log("⏳ Waiting for 'ADD Head Of Family' popup...");
    const addHofYesBtn = await driver.$('android=new UiSelector().textMatches("(?i)yes")');
    await addHofYesBtn.waitForDisplayed({ timeout: 10000 });
    await addHofYesBtn.click();

    console.log("✅ Clicked Yes on 'ADD Head Of Family' popup, transitioning to Head of Family form...");
}

module.exports = {
    fillHouseholdFormWithExamples
};