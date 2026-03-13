// householdSteps.js

// householdSteps.js

async function clickAllHousehold(driver) {
  // Wait for the Home/Dashboard screen to load and target the specific text
  const allHousehold = await driver.$('//android.widget.TextView[contains(@text, "Household")]');

  // Wait for it to be visible before clicking
  await allHousehold.waitForDisplayed({ timeout: 15000 });
  await allHousehold.click();
  console.log("✅ Clicked on All Household");
}

async function clickNewHouseholdRegistration(driver) {
  const newHouseholdBtn = await driver.$(
    'id=org.piramalswasthya.sakhi.saksham.uat:id/btn_next_page'
  );

  await newHouseholdBtn.waitForDisplayed({ timeout: 10000 });
  await newHouseholdBtn.click();
  console.log("✅ Clicked on New Household Registration");
}

async function acceptConsent(driver) {
  const consentCheckbox = await driver.$(
    'id=org.piramalswasthya.sakhi.saksham.uat:id/checkBox'
  );

  await consentCheckbox.waitForDisplayed({ timeout: 10000 });
  const isChecked = await consentCheckbox.getAttribute("checked");

  if (isChecked === "false") {
    await consentCheckbox.click();
    console.log("✅ Checked the consent checkbox");
  }

  const agreeBtn = await driver.$(
    'id=org.piramalswasthya.sakhi.saksham.uat:id/btn_positive'
  );
  await agreeBtn.click();
  console.log("✅ Clicked on AGREE");
}

module.exports = {
  clickAllHousehold,
  clickNewHouseholdRegistration,
  acceptConsent,
};