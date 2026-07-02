const { remote } = require("webdriverio");

// Import ONLY the functions you want to test from your steps file
const {
    selectCommunity,
    selectReligion
} = require("./steps/headOfFamilySteps");

async function main() {
  // Launch Appium session (attaches to the currently open app due to noReset: true)
  const driver = await remote({
    protocol: "http",
    hostname: "localhost",
    port: 4723,
    path: "/",
    capabilities: { // <--- FIXED HERE (colon instead of equals)
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': 'ZD222X4TDK',
      'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
      'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
      'appium:noReset': true,
      'appium:enforceXPath1': true
    }
  });

  console.log("✅ App session attached successfully!");

  try {
      console.log("🚀 Testing Community and Religion Dropdowns...");
      console.log("⚠️ Note: Ensure your device is currently on the Head of Family Registration form.");

      // 1. Test Community Dropdown
      await selectCommunity(driver, "SC");
      await driver.pause(2000); // Brief pause so you can visually verify on your screen

      // 2. Test Religion Dropdown
      await selectReligion(driver, "Hindu");
      await driver.pause(2000); // Brief pause so you can visually verify on your screen

      console.log("🎉 Dropdown test completed successfully!");

  } catch (error) {
      console.error("❌ Test failed:", error);

      try {
          const screenshot = await driver.takeScreenshot();
          const fs = require('fs');
          fs.writeFileSync(`error-dropdowns-${Date.now()}.png`, screenshot, 'base64');
          console.log("📸 Screenshot saved for debugging");
      } catch (screenshotError) {
          console.error("Could not take screenshot:", screenshotError);
      }
  } finally {
      await driver.deleteSession();
  }
}

main().catch(err => {
  console.error("❌ Main function failed:", err);
});