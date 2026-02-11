const { remote } = require("webdriverio");

async function main() {
  // Launch Appium session
  const driver = await remote({
    protocol: "http",
    hostname: "localhost",
    port: 4723,
    path: "/",
    capabilities: {
      platformName: "Android",
      "appium:deviceName": "ZD222X4TDK",
      "appium:automationName": "UiAutomator2",
      "appium:appPackage": "org.piramalswasthya.sakhi.mitanin.uat",
      "appium:appActivity": "org.piramalswasthya.sakhi.ui.login_activity.LoginActivity",
      "appium:noReset": false,
      "appium:autoGrantPermissions": true,
      "appium:newCommandTimeout": 300,
      "appium:language": "en",       // ✅ Add this
      "appium:locale": "US"
    }
  });

  console.log("✅ App launched successfully!");

  // Step 0.5: Select English language
  const englishRadio = await driver.$(
    'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/rb_eng")'
  );
  await englishRadio.waitForDisplayed({ timeout: 5000 });
  await englishRadio.click();
  console.log("✅ English language selected");

  // Step 1: Enter username
  const usernameField = await driver.$(
    'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/et_username")'
  );
  await usernameField.waitForDisplayed({ timeout: 10000 });
  await usernameField.setValue("lily");
  console.log("✅ Username entered");

  // Step 2: Enter password
  const passwordField = await driver.$(
    'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/et_password")'
  );
  await passwordField.waitForDisplayed({ timeout: 10000 });
  await passwordField.setValue("Test@123");
  console.log("✅ Password entered");

  // Step 3: Click login
  const loginButton = await driver.$(
    'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/btn_login")'
  );
  await loginButton.waitForDisplayed({ timeout: 10000 });
  await loginButton.click();
  console.log("✅ Login button clicked");

  // Step 4: Select village
  const villageDropdown = await driver.$(
    'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/actv_village_dropdown")'
  );
  await villageDropdown.waitForDisplayed({ timeout: 15000 });
  await villageDropdown.click();
  console.log("✅ Village dropdown opened");

  const villageOption = await driver.$(
    'android=new UiSelector().text("Dakhinhengra TE")'
  );
  await villageOption.waitForDisplayed({ timeout: 10000 });
  await villageOption.click();
  console.log("✅ 'Dakhinhengra TE' selected");

  const continueButton = await driver.$(
    'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/btn_continue")'
  );
  await continueButton.waitForDisplayed({ timeout: 10000 });
  await continueButton.click();
  console.log("🎉 Continue button clicked - process completed successfully!");

  // Step 5: Wait for home/dashboard screen
  await driver.pause(5000);

  // Step 6: Click on Household section/card
  const householdCard = await driver.$(
    'android=new UiSelector().textContains("Household")'
  );
  await householdCard.waitForDisplayed({ timeout: 10000 });
  await householdCard.click();
  console.log("🏠 Household section opened successfully!");
  // Click on "New Household Registration" button
const newHouseholdBtn = await driver.$(
  'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/btn_next_page")'
);

await newHouseholdBtn.waitForDisplayed({ timeout: 10000 });
await newHouseholdBtn.click();

console.log("✅ New Household Registration button clicked");
// Consent checkbox
const consentCheckbox = await driver.$(
  'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/checkBox")'
);
await consentCheckbox.waitForDisplayed({ timeout: 15000 });
await consentCheckbox.click();
console.log("✅ Consent checkbox clicked");

// Small pause for UI stability
await driver.pause(1000);

// Agree button
const agreeButton = await driver.$(
  'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/btn_positive")'
);
await agreeButton.waitForDisplayed({ timeout: 15000 });
await agreeButton.click();
console.log("✅ AGREE button clicked");


  // Optional pause to observe
  await driver.pause(3000);


}


main().catch(err => {
  console.error("❌ Test failed:", err);
});
