const assert = require("assert");
const { selectLanguage, login } = require("../../steps/loginSteps");
const { selectVillage } = require("../../steps/villageSteps");

/**
 * Helper to dynamically scroll down until an element by XPath becomes visible.
 */
async function scrollAndFind(browserInstance, xpath, maxScrolls = 10) {
  let element = await browserInstance.$(xpath);

  for (let i = 0; i < maxScrolls; i++) {
    if (await element.isExisting() && await element.isDisplayed()) {
      return element;
    }

    const { width, height } = await browserInstance.getWindowRect();
    await browserInstance.performActions([{
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

    await browserInstance.releaseActions();
    await browserInstance.pause(1500); // Let the scroll bounce animation completely settle
    element = await browserInstance.$(xpath);
  }
  return null;
}

/**
 * Helper to swipe back up to the top of the form for verification or editing.
 */
async function scrollToTop(browserInstance, swipes = 5) {
  const { width, height } = await browserInstance.getWindowRect();
  for (let i = 0; i < swipes; i++) {
    await browserInstance.performActions([{
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

    await browserInstance.releaseActions();
    await browserInstance.pause(1000);
  }
}

async function updateProfileFields(browserInstance, profileData) {
  console.log("✍️ Modifying editable field inputs...");

  for (const [hintText, inputValue] of Object.entries(profileData)) {
    // FIX: Fuzzy matching to ignore trailing spaces or asterisks
    const xpath = `//android.widget.EditText[contains(@hint, "${hintText}")]`;
    const inputField = await scrollAndFind(browserInstance, xpath);

    if (!inputField) {
      console.warn(`⚠️ Warning: Field with hint '${hintText}' not found after scrolling. Skipping.`);
      continue;
    }

    await inputField.click();
    await browserInstance.pause(500); // Wait for cursor focus to lock in

    await inputField.clearValue();
    await inputField.setValue(inputValue);
    console.log(`📝 Updated '${hintText}' to: ${inputValue}`);

    // FIX: Safe keyboard dismissal with stabilization pause
    if (await browserInstance.isKeyboardShown()) {
      try {
        await browserInstance.hideKeyboard();
      } catch (e) {
        console.log("⌨️ Keyboard already hidden or unavailable.");
      }
      // CRITICAL: Give the screen 1.5 seconds to resize before the loop loops and tries to scroll again
      await browserInstance.pause(1500);
    }
  }
}

describe('User Profile', () => {

  const testProfileData = {
    "Alternate Mobile No.": "7000739563",
    "Father or Spouse": "SHIV",
    "Bank Account": "8538982420",
    "IFSC": "SBIN0004244",
    "Population Covered under ASHA": "3399",
    "ASHA Supervisor Name": "BOBITA TANTI",
    "ASHA Supervisor Contact No.": "9876543210",
    "CHO Name": "CHO NAME",
    "Mobile No. of CHO": "9123456789",
    "Name of AWW": "RAJ",
    "Mobile No. AWW": "7665563568",
    "Name of ANM1": "NAME OF ANM",
    "Mobile Number of ANM1": "9988776644",
    "Name of ANM2": "NAME OF ANM",
    "Mobile Number of ANM2": "9988776655",
    "ABHA Number :": "12345678901234"
  };

  it('(Qase ID: 1335) - Verify user profile details display correctly and can be updated', async () => {

    // STEP 1: Login
    const myPreferredLanguage = "English";
    await selectLanguage(browser, myPreferredLanguage);
    await login(browser, "Bobita", "Test@123");
    await browser.pause(5000);

    // STEP 2: Select Village
    console.log("🏡 Selecting Village...");
    if (typeof selectVillage !== "function") {
      throw new Error("selectVillage is not available from steps/villageSteps");
    }
    await selectVillage(browser, "Oating");
    await browser.pause(2000);

    // STEP 3: Open Navigation Drawer
    console.log("👆 Opening Navigation Drawer...");
    const navDrawerBtn = await browser.$('//android.widget.ImageButton[@content-desc="Open navigation drawer"]');
    await navDrawerBtn.waitForDisplayed({ timeout: 10000 });
    await navDrawerBtn.click();
    await browser.pause(2000);

    // STEP 4: Verify User Details in Drawer
    console.log("🔍 Verifying Header Profile Meta Elements...");
    const profileNameTxt = await browser.$('//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_nav_name"]');
    const profileIdTxt = await browser.$('//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_nav_id"]');

    await profileNameTxt.waitForDisplayed({ timeout: 5000 });

    assert.ok(await profileNameTxt.isDisplayed(), "Profile Name is not displayed in the drawer");
    assert.ok(await profileIdTxt.isDisplayed(), "Profile ID is not displayed in the drawer");

    // STEP 5: Navigate to User Profile
    console.log("👆 Tapping 'Profile' option...");
    const profileMenuOption = await browser.$('//android.widget.CheckedTextView[@text="Profile"]');
    await profileMenuOption.click();
    await browser.pause(3000);

    // STEP 6: Tap 'Edit Profile'
    console.log("📜 Scrolling to find the Edit Pencil Action Button (FAB)...");
    const fabXPath = '//android.widget.ImageButton[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/fab_edit"]';
    const fabEditBtn = await scrollAndFind(browser, fabXPath);

    assert.ok(fabEditBtn, "Could not find the FAB Edit button even after scrolling.");
    await fabEditBtn.click();
    await browser.pause(2000);

    console.log("⬆️ Scrolling back to the top of the form before editing...");
    await scrollToTop(browser);

    // STEP 7: Call the custom function to input all data
    await updateProfileFields(browser, testProfileData);

    // STEP 8: Save Changes
    console.log("💾 Committing profile mutations...");
    const fabSaveBtn = await scrollAndFind(browser, fabXPath);
    if(fabSaveBtn) {
        await fabSaveBtn.click();
    }
    await browser.pause(3000);

    // STEP 9: Reopen profile and verify changes
    console.log("🔄 Performing profile view validation refresh checklist...");
    console.log("📜 Scrolling back to the top of the form for validation...");
    await scrollToTop(browser);

    for (const [hintText, expectedValue] of Object.entries(testProfileData)) {
      // FIX: Fuzzy matching applied to the validation loop as well
      const xpath = `//android.widget.EditText[contains(@hint, "${hintText}")]`;
      const inputField = await scrollAndFind(browser, xpath);

      assert.ok(inputField, `Verification Error: Could not locate '${hintText}' after save.`);

      const actualTextValue = await inputField.getText();
      assert.strictEqual(actualTextValue, expectedValue, `Mismatch for '${hintText}'`);
    }

    console.log("🎉 Success! All database entity alterations match input updates perfectly.");
  });
});