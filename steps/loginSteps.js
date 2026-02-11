async function selectEnglish(driver) {
  const englishRadio = await driver.$(
    'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/rb_eng")'
  );
  await englishRadio.waitForDisplayed({ timeout: 5000 });
  await englishRadio.click();
  console.log("✅ English language selected");
}

async function login(driver, username, password) {
  const usernameField = await driver.$(
    'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/et_username")'
  );
  await usernameField.waitForDisplayed({ timeout: 10000 });
  await usernameField.setValue(username);
  console.log("✅ Username entered");

  const passwordField = await driver.$(
    'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/et_password")'
  );
  await passwordField.waitForDisplayed({ timeout: 10000 });
  await passwordField.setValue(password);
  console.log("✅ Password entered");

  const loginButton = await driver.$(
    'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/btn_login")'
  );
  await loginButton.waitForDisplayed({ timeout: 10000 });
  await loginButton.click();
  console.log("✅ Login button clicked");
}

module.exports = {
  selectEnglish,
  login
};
