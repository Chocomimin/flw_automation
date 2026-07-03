const { remote } = require("webdriverio");
const { selectLanguage, login } = require("../../steps/loginSteps");
const { selectVillage } = require("../../steps/villageSteps");

/**
 * Helper to dynamically scroll down until an element by XPath becomes visible.
 * This is much more reliable than UiScrollable when targeting @hint attributes.
 */
async function scrollAndFind(driver, xpath, maxScrolls = 10) {
  let element = await driver.$(xpath);

  for (let i = 0; i < maxScrolls; i++) {
    // Return element if it exists and is on the screen
    if (await element.isExisting() && await element.isDisplayed()) {
      return element;
    }

    // Perform a swipe up (scrolling the screen down)
    const { width, height } = await driver.getWindowRect();
    await driver.performActions([{
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: width / 2, y: height * 0.75 },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 150 },
        { type: 'pointerMove', duration: 600, origin: 'viewport', x: width / 2, y: height * 0.25 },
        { type: 'pointerUp', button: 0 }
      ]
    }]);

    // FIX: Use releaseActions() instead of an empty performActions()
    await driver.releaseActions();
    await driver.pause(1000); // Wait for scroll animation to settle

    // Re-fetch the element after scrolling
    element = await driver.$(xpath);
  }
  return null;
}

/**
 * Helper to swipe back up to the top of the form for verification.
 */
async function scrollToTop(driver, swipes = 5) {
  const { width, height } = await driver.getWindowRect();
  for (let i = 0; i < swipes; i++) {
    await driver.performActions([{
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: width / 2, y: height * 0.25 },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 150 },
        { type: 'pointerMove', duration: 600, origin: 'viewport', x: width / 2, y: height * 0.8 },
        { type: 'pointerUp', button: 0 }
      ]
    }]);

    // FIX: Use releaseActions() instead of an empty performActions()
    await driver.releaseActions();
    await driver.pause(500);
  }
}

async function updateProfileFields(driver, profileData) {
  console.log("✍️ Modifying editable field inputs...");

  for (const [hintText, inputValue] of Object.entries(profileData)) {
    const xpath = `//android.widget.EditText[@hint="${hintText}"]`;

    // Scroll dynamically to the element using W3C pointer actions
    const inputField = await scrollAndFind(driver, xpath);

    if (!inputField) {
      console.warn(`⚠️ Warning: Field with hint '${hintText}' not found after scrolling. Skipping.`);
      continue;
    }

    await inputField.click();
    await inputField.clearValue();
    await inputField.setValue(inputValue);

    console.log(`📝 Updated '${hintText}' to: ${inputValue}`);

    // Hide keyboard after inputting text to ensure it doesn't block the next fields
    if (await driver.isKeyboardShown()) {
      await driver.hideKeyboard();
    }
  }
}

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
      "appium:appPackage": "org.piramalswasthya.sakhi.saksham.uat",
      "appium:appActivity": "org.piramalswasthya.sakhi.ui.login_activity.LoginActivity",
      "appium:noReset": false,
      "appium:autoGrantPermissions": true,
      "appium:newCommandTimeout": 300,
      "appium:language": "en",
      "appium:locale": "US",
    }
  });

  console.log("✅ App launched successfully!");

  // Comprehensive profile dataset matching your sequential screen requirements
  const testProfileData = {
    "Alternate Mobile No.": "7000739563",
    "Father or Spouse": "Shiv",
    "Bank Account": "8538982420",
    "IFSC": "SBIN0004244",
    "Population Covered under ASHA": "3399",
    "ASHA Supervisor Name": "BOBITA TANTI",
    "ASHA Supervisor Contact No.": "9876543210",
    "CHO Name": "CHO NAME",
    "Mobile No. of CHO": "9123456789",
    "Name of AWW": "RAJ",
    "Mobile No. AWW": "7665563568",
    "Name of ANM1": "NAME OF ANM1",
    "Mobile Number of ANM1": "9988776644",
    "Name of ANM2": "NAME OF ANM2",
    "Mobile Number of ANM2": "9988776655",
    "ABHA Number :": "12345678901234"
  };

  try {
    // STEP 1: Login
    const myPreferredLanguage = "English";
    await selectLanguage(driver, myPreferredLanguage);
    await login(driver, "Bobita", "Test@123");
    await driver.pause(5000);

    // STEP 2: Select Village
    console.log("🏡 Selecting Village...");
    if (typeof selectVillage !== "function") {
      throw new Error("selectVillage is not available from steps/villageSteps");
    }
    await selectVillage(driver, "Oating");
    await driver.pause(2000);

    // STEP 3: Open Navigation Drawer
    console.log("👆 Opening Navigation Drawer...");
    const navDrawerBtn = await driver.$('//android.widget.ImageButton[@content-desc="Open navigation drawer"]');
    await navDrawerBtn.waitForDisplayed({ timeout: 10000 });
    await navDrawerBtn.click();
    await driver.pause(2000);

    // STEP 4: Verify User Details in Drawer
    console.log("🔍 Verifying Header Profile Meta Elements...");
    const profileNameTxt = await driver.$('//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_nav_name"]');
    const profileIdTxt = await driver.$('//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_nav_id"]');

    await profileNameTxt.waitForDisplayed({ timeout: 5000 });
    if (await profileNameTxt.isDisplayed() && await profileIdTxt.isDisplayed()) {
      console.log(`✅ Displayed: ${await profileNameTxt.getText()}`);
      console.log(`✅ Displayed: ${await profileIdTxt.getText()}`);
    } else {
      throw new Error("User details configuration checking failed in the navigation drawer.");
    }

    // STEP 5: Navigate to User Profile
    console.log("👆 Tapping 'Profile' option...");
    const profileMenuOption = await driver.$('//android.widget.CheckedTextView[@text="Profile"]');
    await profileMenuOption.click();
    await driver.pause(3000);

    // STEP 6: Tap 'Edit Profile' (Floating Action Button) - NOW SCROLLS DOWN TO FIND IT
    console.log("📜 Scrolling to find the Edit Pencil Action Button (FAB)...");
    const fabXPath = '//android.widget.ImageButton[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/fab_edit"]';
    const fabEditBtn = await scrollAndFind(driver, fabXPath);

    if (!fabEditBtn) {
        throw new Error("Could not find the FAB Edit button even after scrolling.");
    }
    await fabEditBtn.click();
    await driver.pause(2000);

    // STEP 7: Call the custom function to input all data (Auto-scrolls)
    await updateProfileFields(driver, testProfileData);

    // STEP 8: Save Changes
    console.log("💾 Committing profile mutations...");
    const fabSaveBtn = await scrollAndFind(driver, fabXPath); // Scroll back to the button to click save
    if(fabSaveBtn) {
        await fabSaveBtn.click();
    }
    await driver.pause(3000);

    // STEP 9: Reopen profile and verify changes
    console.log("🔄 Performing profile view validation refresh checklist...");

    // Scroll back to top before verifying to ensure a clean sweep
    console.log("📜 Scrolling back to the top of the form...");
    await scrollToTop(driver);

    let verificationPassed = true;
    for (const [hintText, expectedValue] of Object.entries(testProfileData)) {
      const xpath = `//android.widget.EditText[@hint="${hintText}"]`;
      const inputField = await scrollAndFind(driver, xpath);

      if (inputField) {
        const actualTextValue = await inputField.getText();
        if (actualTextValue !== expectedValue) {
          console.error(`❌ Mismatch for '${hintText}'. Expected: '${expectedValue}', Found: '${actualTextValue}'`);
          verificationPassed = false;
        }
      } else {
        console.error(`❌ Verification Error: Could not locate '${hintText}' after save.`);
        verificationPassed = false;
      }
    }

    if (verificationPassed) {
      console.log("🎉 Success! All database entity alterations match input updates perfectly.");
    } else {
      throw new Error("Profile verification failed for one or more fields.");
    }

  } catch (error) {
    console.error("❌ Test failed:", error);
    try {
      const screenshot = await driver.takeScreenshot();
      const fs = require('fs');
      fs.writeFileSync(`error-profile-${Date.now()}.png`, screenshot, 'base64');
      console.log("📸 Error context snapshot frame captured successfully.");
    } catch (screenshotError) {
      console.error("Could not capture diagnostic screenshot sequence:", screenshotError);
    }
  } finally {
    await driver.pause(2000);
    await driver.deleteSession();
    console.log("🏁 Test suite processing execution finished cleaner wrapper termination.");
  }
}

main().catch(err => {
  console.error("❌ Root script execution runtime error occurred:", err);
});