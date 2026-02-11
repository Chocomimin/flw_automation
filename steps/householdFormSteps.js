// householdFormSteps.js

// Fill First Name
async function fillFirstName(driver, firstName) {
    const firstNameField = await driver.$(
        'android=new UiSelector()' +
        '.className("android.widget.EditText")' +
        '.text("First Name of Head of the family *")'
    );
    await firstNameField.waitForDisplayed({ timeout: 10000 });
    await firstNameField.setValue(firstName);
    console.log("✅ First Name entered successfully");
}

// Fill Last Name
async function fillLastName(driver, lastName) {
    const lastNameField = await driver.$(
        'android=new UiSelector()' +
        '.className("android.widget.EditText")' +
        '.text("Last Name / Surname of head of the family")'
    );
    await lastNameField.waitForDisplayed({ timeout: 10000 });
    await lastNameField.setValue(lastName);
    console.log("✅ Last Name entered successfully");
}

// Fill Mobile Number
async function fillMobileNumber(driver, mobileNumber) {
    const mobileField = await driver.$(
        'android=new UiSelector()' +
        '.className("android.widget.EditText")' +
        '.text("Mobile No of Head of Family *")'
    );
    await mobileField.waitForDisplayed({ timeout: 10000 });
    await mobileField.setValue(mobileNumber);
    console.log("✅ Mobile Number entered successfully");
}

// Fill House Number
async function fillHouseNo(driver, houseNo) {
    const houseNoField = await driver.$(
        'android=new UiSelector()' +
        '.className("android.widget.EditText")' +
        '.text("House No")'
    );
    await houseNoField.waitForDisplayed({ timeout: 10000 });
    await houseNoField.setValue(houseNo);
    console.log("✅ House Number entered successfully");
}

// Fill Ward Number
async function fillWardNo(driver, wardNo) {
    const wardNoField = await driver.$(
        'android=new UiSelector()' +
        '.className("android.widget.EditText")' +
        '.text("Ward No")'
    );
    await wardNoField.waitForDisplayed({ timeout: 10000 });
    await wardNoField.setValue(wardNo);
    console.log("✅ Ward Number entered successfully");
}

// Fill Ward Name
async function fillWardName(driver, wardName) {
    const wardNameField = await driver.$(
        'android=new UiSelector()' +
        '.className("android.widget.EditText")' +
        '.text("Ward Name")'
    );
    await wardNameField.waitForDisplayed({ timeout: 10000 });
    await wardNameField.setValue(wardName);
    console.log("✅ Ward Name entered successfully");
}

// Fill Mohalla Name
async function fillMohallaName(driver, mohallaName) {
    const mohallaField = await driver.$(
        'android=new UiSelector()' +
        '.className("android.widget.EditText")' +
        '.text("Mohalla Name")'
    );
    await mohallaField.waitForDisplayed({ timeout: 10000 });
    await mohallaField.setValue(mohallaName);
    console.log("✅ Mohalla Name entered successfully");
}

// Select Economic Status (APL/BPL/Don't Know)
async function selectEconomicStatus(driver, status) {
    let selector;
    switch(status.toLowerCase()) {
        case 'apl':
            selector = 'android=new UiSelector().className("android.widget.RadioButton").text("APL")';
            break;
        case 'bpl':
            selector = 'android=new UiSelector().className("android.widget.RadioButton").text("BPL")';
            break;
        case "don't know":
        case 'dont know':
            selector = 'android=new UiSelector().className("android.widget.RadioButton").text("Don\'t Know")';
            break;
        default:
            throw new Error(`Invalid economic status: ${status}`);
    }

    const radioButton = await driver.$(selector);
    await radioButton.waitForDisplayed({ timeout: 10000 });
    await radioButton.click();
    console.log(`✅ Economic Status selected: ${status}`);
}

async function selectResidentialArea(driver, value = "Urban") {
  try {
    // Step 1: Open dropdown
    const dropdown = await driver.$(
      'android=new UiSelector()' +
      '.resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/actv_rv_dropdown")'
    );

    await dropdown.waitForDisplayed({ timeout: 10000 });
    await dropdown.click();
    console.log("📂 Dropdown opened");

    // Small wait for list to render
    await driver.pause(800);

    // Step 2: Scroll and select option
    const option = await driver.$(
      'android=new UiScrollable(new UiSelector().scrollable(true))' +
      `.scrollIntoView(new UiSelector().text("${value}"))`
    );

    await option.waitForDisplayed({ timeout: 10000 });
    await option.click();

    console.log(`✅ Dropdown value selected: ${value}`);

  } catch (error) {
    console.warn(
      `⚠️ Failed to select dropdown value "${value}"`,
      error.message
    );
  }
}

// Submit the form
async function submitForm(driver) {
    const submitButton = await driver.$(
        'android=new UiSelector()' +
        '.className("android.widget.Button")' +
        '.text("Submit")'
    );
    await submitButton.waitForDisplayed({ timeout: 10000 });
    await submitButton.click();
    console.log("✅ Form submitted successfully");
}

// Master function to fill all form fields with example data
async function fillHouseholdFormWithExamples(driver) {
    console.log("📝 Filling household form with example data...");

    await fillFirstName(driver, "Rahul");
    await driver.pause(1000);

    await fillLastName(driver, "Sharma");
    await driver.pause(1000);

    await fillMobileNumber(driver, "9876543210");
    await driver.pause(1000);

    await fillHouseNo(driver, "42");
    await driver.pause(1000);

    await fillWardNo(driver, "12");
    await driver.pause(1000);

    await fillWardName(driver, "Green Park");
    await driver.pause(1000);

    await fillMohallaName(driver, "New Colony");
    await driver.pause(1000);

    await selectEconomicStatus(driver, "APL");
    await driver.pause(1000);

    // CRITICAL PART – STOP IF THIS FAILS
    try {
        await selectResidentialArea(driver, "Urban");
    } catch (error) {
        console.error("🚫 Stopping script due to Residential Area failure.");
        throw error;      // This will STOP the entire script
    }

    await driver.pause(2000);

    console.log("✅ All form fields filled with example data!");
}


// Export all functions
module.exports = {
    fillFirstName,
    fillLastName,
    fillMobileNumber,
    fillHouseNo,
    fillWardNo,
    fillWardName,
    fillMohallaName,
    selectEconomicStatus,
    selectResidentialArea,
    submitForm,
    fillHouseholdFormWithExamples
};