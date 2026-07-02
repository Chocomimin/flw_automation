// steps/loginSteps.js

async function selectLanguage(driver, language = "English") {
  // 1. Click the main language dropdown to open the bottom sheet
  const langDropdown = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/ll_select_lang")');
  await langDropdown.waitForDisplayed({ timeout: 5000 });
  await langDropdown.click();
  console.log("✅ Language dropdown clicked");

  // Wait a brief moment for the bottom sheet animation to render
  await driver.pause(1000);

  // 2. Map the input parameter to the exact localized text rendered in the new UI
  const langMap = {
    "English": "English",
    "Hindi": "हिंदी",
    "Assamese": "অসমীয়া",
    "Bengali": "বাংলা"
  };

  const uiLanguageText = langMap[language];

  if (!uiLanguageText) {
      throw new Error(`Language '${language}' is not supported in the langMap.`);
  }

  // 3. Find the specific language option in the GridView by matching its text
  const langOption = await driver.$(`android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/tv_lang_name").text("${uiLanguageText}")`);

  await langOption.waitForDisplayed({ timeout: 5000 });
  await langOption.click();
  console.log(`✅ ${language} language selected`);

  // Wait for the bottom sheet to close and the UI to transition back
  await driver.pause(2000);
}

async function login(driver, username, password) {
  const usernameField = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/et_username")');
  await usernameField.waitForDisplayed({ timeout: 10000 });
  await usernameField.setValue(username);
  console.log("✅ Username entered");

  const passwordField = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/et_password")');
  await passwordField.waitForDisplayed({ timeout: 10000 });
  await passwordField.setValue(password);
  console.log("✅ Password entered");

  const loginButton = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_login")');
  await loginButton.waitForDisplayed({ timeout: 10000 });
  await loginButton.click();
  console.log("✅ Login button clicked");
}

module.exports = {
  selectLanguage,
  login
};