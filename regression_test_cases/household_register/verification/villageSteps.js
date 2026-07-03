async function selectVillage(driver, villageName) {

  // Wait until spinner exists
  await driver.waitUntil(async () => {
    const els = await driver.$$(
      'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_village_dropdown")'
    );
    return els.length > 0;
  }, { timeout: 30000 });

  const villageDropdown = await driver.$(
    'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_village_dropdown")'
  );

  await villageDropdown.click();
  console.log("✅ Village dropdown opened");

  // Wait for list
  await driver.pause(1500);

  const village = await driver.$(
    `android=new UiSelector().textContains("${villageName}")`
  );

  await village.waitForDisplayed({ timeout: 20000 });
  await village.click();

  console.log(`✅ Village selected: ${villageName}`);

  const continueBtn = await driver.$(
    'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_continue")'
  );

  await continueBtn.waitForDisplayed({ timeout: 15000 });
  await continueBtn.click();

  console.log("🎉 Continue clicked");
}



module.exports = {
  selectVillage
};