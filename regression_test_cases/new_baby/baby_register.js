const { remote } = require("webdriverio");
const { selectLanguage, login } = require("../../steps/loginSteps");
const { selectVillage } = require("../../steps/villageSteps");

// ─────────────────────────────────────────────────────────────
//  APPIUM CONFIGURATION
// ─────────────────────────────────────────────────────────────
const capabilities = {
  platformName: "Android",
  "appium:deviceName": "ZD222X4TDK",
  "appium:automationName": "UiAutomator2",
  "appium:appPackage": "org.piramalswasthya.sakhi.saksham.uat",
  "appium:appActivity": "org.piramalswasthya.sakhi.ui.login_activity.LoginActivity",
  "appium:noReset": false, // 🛑 CHANGED THIS TO FALSE
  "appium:autoGrantPermissions": true,
  "appium:newCommandTimeout": 300,
  "appium:language": "en",
  "appium:locale": "US",
  "appium:enforceXPath1": true
};

const wdOpts = {
  protocol: "http",
  hostname: process.env.APPIUM_HOST || "localhost",
  port: parseInt(process.env.APPIUM_PORT, 10) || 4723,
  path: "/",
  logLevel: "error",
  capabilities,
};

async function navigateToMaternalHealthAndNewborn(driver) {
  try {
    console.log("⏳ Waiting for the Home Page to load fully (Data Sync)...");

    // 1. Handle the loading spinner with a "Soft Wait"
    try {
      const loadingSpinner = await driver.$('android.widget.ProgressBar');

      // We check if it is actively displayed, not just existing in the background
      if (await loadingSpinner.isDisplayed()) {
          console.log("⏳ Spinner detected. Waiting up to 60 seconds for background sync...");

          try {
              // Increased timeout to 60s for heavy village data syncs
              await loadingSpinner.waitForDisplayed({ reverse: true, timeout: 60000 });
              console.log("✅ Loading spinner cleared naturally.");
          } catch (spinnerError) {
              console.log("⚠️ Spinner wait timed out, but proceeding to check if the dashboard loaded anyway.");
          }
      } else {
          console.log("✅ No blocking spinner visible.");
      }
    } catch (e) {
      console.log("⚠️ Could not check for spinner, moving straight to UI check.");
    }

    // 2. Wait for the Maternal Health button to be visible AND enabled
    console.log("⏳ Locating Maternal Health button...");
    const maternalHealthBtn = await driver.$('//android.widget.TextView[contains(@text, "Maternal Health")]');

    // Give the dashboard up to 15 seconds to render the buttons
    await maternalHealthBtn.waitForDisplayed({ timeout: 15000 });
    await maternalHealthBtn.waitForEnabled({ timeout: 5000 });

    console.log("✅ Home page loaded. Clicking Maternal Health...");
    await maternalHealthBtn.click();

    await driver.pause(2000);

    console.log("⏳ Navigating to Newborn Registration...");
    const newbornRegElement = await driver.$("//android.widget.TextView[@text='Newborn Registration']");
    await newbornRegElement.waitForDisplayed({ timeout: 10000 });
    await newbornRegElement.click();

    console.log("✅ Successfully reached Newborn Registration list.");
    await driver.pause(3000);

  } catch (error) {
    console.error("❌ Navigation failed:", error.message);
    throw error;
  }
}

async function randomlySelectAndRegisterBaby(driver) {
  try {
    console.log("⏳ Looking for babies to register on the current screen...");

    // Fetch all elements containing the baby names based on the XML provided
    const babyNameElements = await driver.$$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_ec_id")');
    const count = babyNameElements.length;

    if (count === 0) {
      throw new Error("No babies found on the screen to register.");
    }

    // Randomly pick an index
    const randomIndex = Math.floor(Math.random() * count);
    const selectedBabyElement = babyNameElements[randomIndex];
    const babyName = await selectedBabyElement.getText();

    console.log(`🎲 Randomly selected baby: '${babyName}' (Index: ${randomIndex + 1} of ${count})`);

    // Locate the REGISTER button corresponding to this specific baby name using XPath
    const registerBtnXPath = `//android.view.ViewGroup[.//android.widget.TextView[@text="${babyName}"]]//android.widget.Button[@text="REGISTER"]`;
    const registerBtn = await driver.$(registerBtnXPath);

    await registerBtn.waitForDisplayed({ timeout: 5000 });
    await registerBtn.click();

    console.log(`✅ Clicked REGISTER for '${babyName}'`);
    return babyName; // Returning name so we can remember it in the main flow

  } catch (error) {
    console.error("❌ Random selection failed:", error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
//  FORM FIELD HELPERS (Merged from newBorn.js)
// ─────────────────────────────────────────────────────────────

async function selectRadioOption(driver, questionText, answerText) {
  console.log(`⏳ Selecting '${answerText}' for '${questionText}'...`);
  const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("${questionText}"))`;
  await driver.$(`android=${scrollable}`).catch(() => {});
  await driver.pause(1000);

  const radioButtonXPath = `//android.widget.TextView[contains(@text, "${questionText}")]/ancestor::android.widget.LinearLayout[.//android.widget.RadioGroup][1]//android.widget.RadioButton[@text="${answerText}"]`;
  const radioButton = await driver.$(radioButtonXPath);

  await radioButton.waitForDisplayed({ timeout: 5000 });
  await radioButton.click();
  await driver.pause(1000);
}

async function fillBirthWeight(driver, weightInGrams) {
  console.log(`⏳ Entering Birth Weight: ${weightInGrams} grams...`);
  const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Weight at Birth"))`;
  await driver.$(`android=${scrollable}`).catch(() => {});
  await driver.pause(1000);

  const weightInput = await driver.$('//android.widget.EditText[contains(@hint, "Weight at Birth")]');
  await weightInput.waitForDisplayed({ timeout: 5000 });
  await weightInput.click();
  await weightInput.clearValue();
  await weightInput.setValue(weightInGrams);

  if (await driver.isKeyboardShown()) {
      await driver.hideKeyboard();
  }
  console.log(`✅ Successfully entered Birth Weight: ${weightInGrams}`);
}

async function clickSubmitButton(driver) {
  console.log("⏳ Scrolling down to find the 'Submit' button...");
  const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"))`;
  await driver.$(`android=${scrollable}`).catch(() => {});
  await driver.pause(1000);

  const submitBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit")');
  await submitBtn.waitForDisplayed({ timeout: 5000 });
  await submitBtn.click();
  console.log("✅ Successfully clicked the 'Submit' button!");
}

async function returnToHomeAndCheckLowBirthWeight(driver) {
  try {
    console.log("⏳ Returning to Home screen...");

    // 1. Click the 'Go to Home' button in the toolbar (from the Newborn Reg List screen)
    // Using XPath with content-desc to hit the toolbar icon accurately
    const goHomeBtn = await driver.$('//android.widget.Button[@content-desc="Go to Home"]');

    // Using a soft wait just in case we are already on the home screen
    if (await goHomeBtn.isExisting()) {
        await goHomeBtn.waitForDisplayed({ timeout: 5000 });
        await goHomeBtn.click();
        console.log("✅ Clicked 'Go to Home' icon.");
        await driver.pause(2000);
    }

    // 2. Click the Dashboard Tab
    console.log("⏳ Clicking on the Dashboard tab...");
    const dashboardTab = await driver.$('//android.widget.LinearLayout[@content-desc="Dashboard"]');
    await dashboardTab.waitForDisplayed({ timeout: 10000 });
    await dashboardTab.click();
    console.log("✅ Switched to Dashboard view.");
    await driver.pause(2000); // Give the dashboard a second to render data

    // 3. Scroll to and extract the Low Birth Weight Babies count
    console.log("⏳ Locating 'Low Birth Weight Babies' metric...");

    // Soft scroll to the label to ensure the card is physically visible on the screen
    const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Low Birth Weight Babies"))`;
    await driver.$(`android=${scrollable}`).catch(() => {});

    // Target the exact resource ID for the count as shown in your XML
    const lwbCountElement = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/tv_lbwb")');
    await lwbCountElement.waitForDisplayed({ timeout: 5000 });

    const countText = await lwbCountElement.getText();
    console.log(`📊 DATA EXTRACTED: Current Low Birth Weight count is [ ${countText} ]`);

    return countText;

  } catch (error) {
    console.error("❌ Failed to fetch Low Birth Weight count:", error.message);
    throw error;
  }
}

async function main() {
  let driver;
  try {
    console.log("🚀 Starting Appium session...");
    driver = await remote(wdOpts);
    console.log("✅ App launched successfully!");

    // 1. Setup & Login
    const myPreferredLanguage = "English";
    await selectLanguage(driver, myPreferredLanguage);
    await login(driver, "Bobita", "Test@123");
    await driver.pause(5000);

    // 2. Select Village
    await selectVillage(driver, "Oating");
    await driver.pause(2000);

    // 3. Navigate to Newborn
    await navigateToMaternalHealthAndNewborn(driver);

    // 4. Random Selection
    const selectedBabyName = await randomlySelectAndRegisterBaby(driver);
    await driver.pause(3000);

    console.log(`📝 Starting form fill for remembered baby: ${selectedBabyName}`);

    // 5. Fill out the Newborn Form
    await selectRadioOption(driver, "Was Corticosteroid Inj", "Yes");
    await selectRadioOption(driver, "Sex of Infant", "Female");

    const didBabyCry = "No";
    await selectRadioOption(driver, "Baby Cried Immediately", didBabyCry);
    if (didBabyCry === "No") {
        await selectRadioOption(driver, "Resuscitation Done", "Yes");
    }

    await selectRadioOption(driver, "Any birth defect seen", "No"); // Simplified for flow stability
    await fillBirthWeight(driver, "3200");
    await selectRadioOption(driver, "Breast feeding started within one hour", "Yes");
    await selectRadioOption(driver, "Is the Baby admitted to the SNCU", "Yes");

    // 6. Submit
    await clickSubmitButton(driver);
    console.log(`🎉 Registration completed for ${selectedBabyName}!`);
    await returnToHomeAndCheckLowBirthWeight(driver);

  } catch (error) {
    console.error("❌ Test failed:", error);
    if (driver) {
      try {
        const screenshot = await driver.takeScreenshot();
        require('fs').writeFileSync(`error-${Date.now()}.png`, screenshot, 'base64');
        console.log("📸 Screenshot saved for debugging");
      } catch (e) {
        console.error("Could not take screenshot:", e.message);
      }
    }
  } finally {
    if (driver) {
      await driver.pause(5000);
      await driver.deleteSession();
      console.log("🔌 Appium session closed.");
    }
  }
}

main().catch(err => {
  console.error("❌ Main function failed:", err);
});