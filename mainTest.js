const { remote } = require("webdriverio");
const { selectEnglish, login } = require("./steps/loginSteps");
const { selectVillage } = require("./steps/villageSteps");
const {
  clickAllHousehold,
  clickNewHouseholdRegistration,
  acceptConsent
} = require("./steps/householdSteps");

// Import all form filling functions
const { fillHouseholdFormWithExamples } = require("./steps/householdFormSteps");
// ✅ IMPORT THE NEW SECOND PAGE FUNCTION
const { fillHeadOfFamilyFormWithExamples } = require("./steps/headOfFamilySteps");

async function main() {
  const driver = await remote({
    protocol: "http",
    hostname: "localhost",
    port: 4723,
    path: "/",
    capabilities: {
      platformName: "Android",
      "appium:deviceName": "ZD222X4TDK",
      "appium:automationName": "UiAutomator2",
      "appium:appPackage": "org.piramalswasthya.sakhi.saksham.uat", // Updated package name
      "appium:appActivity": "org.piramalswasthya.sakhi.ui.login_activity.LoginActivity",
      "appium:noReset": false,
      "appium:autoGrantPermissions": true,
      "appium:newCommandTimeout": 300,
      "appium:language": "en",
      "appium:locale": "US",
    }
  });

  console.log("✅ App launched successfully!");

  try {
    // Existing steps
    await selectEnglish(driver);
    await login(driver, "Amina", "Test@123");
    await driver.pause(5000); // wait for the next page to render

    // Diagnostic: ensure exported function exists (helps debug earlier TypeError)
    console.log("debug: selectVillage typeof=", typeof selectVillage);
    if (typeof selectVillage !== "function") {
      console.error("debug: villageSteps exports=", require("./steps/villageSteps"));
      throw new Error("selectVillage is not available from steps/villageSteps");
    }

    await selectVillage(driver, "Dakhinhengra TE");
    await driver.pause(1000);
    // Household steps
    await clickAllHousehold(driver);
    await clickNewHouseholdRegistration(driver);
    await acceptConsent(driver);

    // 🏠 1. Fill ALL Household Form fields with example data
    console.log("🚀 Starting to fill the first form (Household)...");
    await fillHouseholdFormWithExamples(driver);

    // Pause briefly to let the app transition screens
    await driver.pause(3000);

    // 👨‍👩‍👦 2. Fill the second form (Head of Family)
    console.log("🚀 Starting to fill the second form (Head of Family)...");
    await fillHeadOfFamilyFormWithExamples(driver);

    console.log("🎉 Household registration completed successfully!");

  } catch (error) {
    console.error("❌ Test failed:", error);
    // Take screenshot on failure (if supported)
    try {
      const screenshot = await driver.takeScreenshot();
      const fs = require('fs');
      fs.writeFileSync(`error-${Date.now()}.png`, screenshot, 'base64');
      console.log("📸 Screenshot saved for debugging");
    } catch (screenshotError) {
      console.error("Could not take screenshot:", screenshotError);
    }
  } finally {
    await driver.pause(5000);
    // await driver.deleteSession(); // Uncomment if you want to close session
  }
}

main().catch(err => {
  console.error("❌ Main function failed:", err);
});