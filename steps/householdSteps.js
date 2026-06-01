// householdSteps.js

// householdSteps.js

async function clickAllHousehold(driver) {
  // Use the resource-id instead of @text.
  // From your XML, look for the ID of the "All Household" card (cv_icon / textView2)
  // Let's target the card container directly:
  const allHousehold = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/cv_icon").index(0)');

  await allHousehold.waitForDisplayed({ timeout: 15000 });
  await allHousehold.click();
  console.log("✅ Clicked on All Household card");
}

async function clickNewHouseholdRegistration(driver) {
  // Use resource ID which is language agnostic
  const newHouseholdBtn = await driver.$('id=org.piramalswasthya.sakhi.saksham.uat:id/btn_next_page');

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