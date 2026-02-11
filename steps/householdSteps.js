// householdSteps.js

async function clickAllHousehold(driver) {
  const allHousehold = await driver.$(
    'android=new UiSelector().className("android.view.ViewGroup").instance(1)'
  );
  await allHousehold.click();
  console.log("✅ Clicked on All Household");
}

async function clickNewHouseholdRegistration(driver) {
  const newHouseholdBtn = await driver.$(
    'id=org.piramalswasthya.sakhi.mitanin.uat:id/btn_next_page'
  );
  await newHouseholdBtn.click();
  console.log("✅ Clicked on New Household Registration");
}

async function acceptConsent(driver) {
  const consentCheckbox = await driver.$(
    'id=org.piramalswasthya.sakhi.mitanin.uat:id/checkBox'
  );
  const isChecked = await consentCheckbox.getAttribute("checked");

  if (isChecked === "false") {
    await consentCheckbox.click();
    console.log("✅ Checked the consent checkbox");
  }

  const agreeBtn = await driver.$(
    'id=org.piramalswasthya.sakhi.mitanin.uat:id/btn_positive'
  );
  await agreeBtn.click();
  console.log("✅ Clicked on AGREE");
}

module.exports = {
  clickAllHousehold,
  clickNewHouseholdRegistration,
  acceptConsent,
};
