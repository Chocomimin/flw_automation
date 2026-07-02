const { remote } = require("webdriverio");
const { selectLanguage, login } = require("../../steps/loginSteps");
const { selectVillage } = require("../../steps/villageSteps");
const {
  clickAllHousehold,
  clickNewHouseholdRegistration,
  acceptConsent
} = require("../../steps/householdSteps");

const { fillHouseholdFormWithExamples } = require("./helper/house_hold");
const { fillHeadOfFamilyFormWithExamples } = require("./helper/head_hold");
const { fillECFormDetails, processIFA } = require("./helper/couple_list_register");

// ─────────────────────────────────────────────────────────────
//  DYNAMIC DATA GENERATOR
// ─────────────────────────────────────────────────────────────
function generateRandomFemaleProfile() {
    const firstNames = ["Aarti", "Priya", "Kavita", "Neha", "Simran", "Anjali", "Roshni", "Meena", "Sita", "Sunita"];
    const lastNames  = ["Sharma", "Verma", "Singh", "Patel", "Kumar", "Das", "Devi", "Kumari", "Yadav", "Gupta"];
    const maleNames  = ["Rahul", "Amit", "Raj", "Vikram", "Suresh", "Anil", "Ravi", "Manoj", "Rajendra", "Krupal"];
    const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const firstName = randomPick(firstNames);
    const lastName  = randomPick(lastNames);

    // Constrain DOB so age at runtime is always 20–49
    const currentYear = new Date().getFullYear();
    const year  = Math.floor(Math.random() * (currentYear - 20 - (currentYear - 49) + 1)) + (currentYear - 49);
    const month = Math.floor(Math.random() * 12) + 1;
    const day   = Math.floor(Math.random() * 28) + 1;

    return {
        firstName, lastName,
        fullName:    `${firstName} ${lastName}`,
        fatherName:  `${randomPick(maleNames)} ${lastName}`,
        motherName:  `${randomPick(firstNames)} ${lastName}`,
        husbandName: `${randomPick(maleNames)} ${randomPick(lastNames)}`,
        dob: { day, month, year }
    };
}

// ─────────────────────────────────────────────────────────────
//  AGE HELPER
// ─────────────────────────────────────────────────────────────
function calculateAge({ day, month, year }) {
    const today = new Date();
    let age = today.getFullYear() - year;
    const hasHadBirthday =
        today.getMonth() + 1 > month ||
        (today.getMonth() + 1 === month && today.getDate() >= day);
    if (!hasHadBirthday) age--;
    return age;
}

// ─────────────────────────────────────────────────────────────
//  NAVIGATION HELPERS
// ─────────────────────────────────────────────────────────────
async function navigateToHome(driver) {
    console.log("🏠 Returning to home screen...");
    try {
        const homeBtn = await driver.$('//android.widget.Button[@content-desc="Go to Home"]');
        if (await homeBtn.isDisplayed().catch(() => false)) {
            await homeBtn.click();
            await driver.pause(2000);
            console.log("✅ Navigated home via toolbar Home button");
            return;
        }
    } catch (_) {}

    for (let i = 0; i < 6; i++) {
        const isHome = await driver.$(
            '//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/textView2" and contains(@text,"Eligible")]'
        ).isDisplayed().catch(() => false);
        if (isHome) { console.log("✅ Reached Home Screen!"); return; }
        await driver.pressKeyCode(4);
        await driver.pause(1500);
    }
    console.log("⚠️ Could not confirm home screen — proceeding anyway");
}

async function clickEligibleCoupleList(driver) {
    console.log("👆 Clicking Eligible Couple List...");
    const el = await driver.$(
        '//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/textView2" and contains(@text,"Eligible") and contains(@text,"List")]'
    );
    await el.waitForDisplayed({ timeout: 20000 });
    await el.click();
    await driver.pause(3000);
    console.log("✅ Clicked Eligible Couple List");
}

async function clickEligibleCoupleRegistration(driver) {
    console.log("👆 Clicking Eligible Couple Registration...");
    const el = await driver.$(
        '//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/textView2" and @text="Eligible Couple Registration"]'
    );
    await el.waitForDisplayed({ timeout: 20000 });
    await el.click();
    await driver.pause(4000);
    console.log("✅ Clicked Eligible Couple Registration");
}

// ─────────────────────────────────────────────────────────────
//  FIRST VISIT — search + click REGISTER button
// ─────────────────────────────────────────────────────────────
async function searchAndClickRegister(driver, name) {
    console.log(`\n🔍 Searching for "${name}" to REGISTER...`);

    const searchBar = await driver.$(
        '//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]'
    );
    await searchBar.waitForDisplayed({ timeout: 15000 });
    await searchBar.click();
    await driver.pause(500);
    await searchBar.setValue(name);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    await driver.pause(2500);

    const nameUpperCase = name.toUpperCase();
    const nameLabel = await driver.$(
        `//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_ec_id" and @text="${nameUpperCase}"]`
    );
    await nameLabel.waitForDisplayed({ timeout: 10000 });
    console.log(`✅ Found card for "${nameUpperCase}"`);

    // Click the REGISTER button specifically
    const registerBtn = await driver.$(
        `//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_ec_id" and @text="${nameUpperCase}"]` +
        `/ancestor::android.view.ViewGroup` +
        `//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_form_ec1" and @text="REGISTER"]`
    );

    if (await registerBtn.isDisplayed().catch(() => false)) {
        await registerBtn.click();
        console.log(`✅ Clicked REGISTER for "${nameUpperCase}"`);
    } else {
        console.log("⚠️ REGISTER button not visible — falling back to name label click...");
        await nameLabel.click();
    }
    await driver.pause(4000);
}

// ─────────────────────────────────────────────────────────────
//  SECOND VISIT — age check, then open DETAIL screen for IFA
// ─────────────────────────────────────────────────────────────
/**
 * KEY DIFFERENCE from the first visit:
 *   - We tap the BENEFICIARY NAME LABEL (not the VIEW/card button).
 *   - Tapping the name opens the detail screen which hosts the IFA button.
 *   - Tapping VIEW re-opens the registration form — wrong screen for IFA.
 *
 * Returns true if the detail screen was opened (IFA can proceed).
 * Returns false if the age check fails (IFA skipped).
 */
async function searchAndOpenDetailForIFA(driver, name, dob) {
    console.log(`\n🔍 Searching for "${name}" to open detail screen for IFA...`);

    // ── Age gate ─────────────────────────────────────────────
    const age = calculateAge(dob);
    console.log(`📅 Calculated age: ${age} years (DOB: ${dob.day}/${dob.month}/${dob.year})`);

    if (age < 20 || age > 49) {
        console.log(`⚠️  Age ${age} is outside 20–49 — IFA button will not appear. Skipping IFA.`);
        return false;
    }
    console.log(`✅ Age ${age} is within 20–49 — opening detail screen.`);

    // ── Search ───────────────────────────────────────────────
    const searchBar = await driver.$(
        '//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]'
    );
    await searchBar.waitForDisplayed({ timeout: 15000 });
    await searchBar.click();
    await driver.pause(500);
    await searchBar.setValue(name);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    await driver.pause(2500);

    const nameUpperCase = name.toUpperCase();
    const nameLabel = await driver.$(
        `//android.widget.TextView[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_ec_id" and @text="${nameUpperCase}"]`
    );
    await nameLabel.waitForDisplayed({ timeout: 10000 });
    console.log(`✅ Found card for "${nameUpperCase}"`);

    // ── Tap the NAME LABEL to open the detail screen ─────────
    // ⚠️  Do NOT click the VIEW/card button — that reopens the
    //     registration form, which does NOT have the IFA button.
    //     The detail screen (opened by tapping the name) does.
    await nameLabel.click();
    console.log(`✅ Tapped name label — detail screen should now load`);
    await driver.pause(4000);

    return true;
}

// ─────────────────────────────────────────────────────────────
//  MAIN EXECUTION
// ─────────────────────────────────────────────────────────────
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

  try {
    // ── 1. Language & Login ──────────────────────────────────
    await selectLanguage(driver, "English");
    await login(driver, "Bobita", "Test@123");
    await driver.pause(5000);

    // ── 2. Village & Household Registration ─────────────────
    await selectVillage(driver, "Oating");
    await driver.pause(1000);
    await clickAllHousehold(driver);
    await clickNewHouseholdRegistration(driver);
    await acceptConsent(driver);

    const dynamicProfile = generateRandomFemaleProfile();
    const rememberedName = dynamicProfile.fullName;
    const rememberedDob  = dynamicProfile.dob;
    console.log("📝 Generated Profile:", dynamicProfile);

    console.log("🚀 Filling Household form...");
    await fillHouseholdFormWithExamples(driver, {
      firstName: dynamicProfile.firstName,
      lastName:  dynamicProfile.lastName,
    });
    await driver.pause(3000);

    console.log("🚀 Filling Head of Family form...");
    await fillHeadOfFamilyFormWithExamples(driver);
    console.log("🎉 Household registration completed successfully!");

    // ── 3. First visit: EC List → EC Registration → REGISTER ─
    await navigateToHome(driver);
    await clickEligibleCoupleList(driver);
    await clickEligibleCoupleRegistration(driver);
    await searchAndClickRegister(driver, rememberedName);   // clicks REGISTER button

    // ── 4. Fill EC Form Details & submit ─────────────────────
    console.log("📋 Filling EC form details...");
    await fillECFormDetails(driver);
    console.log("✅ EC form submitted!");

    // ── 5. Navigate Home ─────────────────────────────────────
    await navigateToHome(driver);

    // ── 6. Second visit: EC List → EC Registration → detail screen
    console.log("🔁 Returning to EC List for IFA...");
    await clickEligibleCoupleList(driver);
    await clickEligibleCoupleRegistration(driver);

    // Age check + open detail screen by tapping the NAME LABEL
    const ageOk = await searchAndOpenDetailForIFA(driver, rememberedName, rememberedDob);

    if (ageOk) {
  // ── 7. processIFA verifies IFA button exists then fills it
  await processIFA(driver, "Yes", "30");
  console.log("🎉 IFA form submitted successfully!");
  console.log("✅ IFA button visibility for beneficiaries aged 20–49 years is verified");
} else {
  console.log("⏭️  IFA step skipped — beneficiary age outside 20–49 range.");
}

    // ── 8. Final home navigation ─────────────────────────────
    await navigateToHome(driver);
    console.log("🎯 Full flow completed for:", rememberedName);

  } catch (error) {
    console.error("❌ Test failed:", error);
    try {
      const fs = require("fs");
      const screenshot = await driver.takeScreenshot();
      const filename = `error-${Date.now()}.png`;
      fs.writeFileSync(filename, screenshot, "base64");
      console.log(`📸 Screenshot saved: ${filename}`);
    } catch (screenshotError) {
      console.error("Could not take screenshot:", screenshotError);
    }
  } finally {
    await driver.pause(5000);
    await driver.deleteSession();
  }
}

main().catch(err => {
  console.error("❌ Main function failed:", err);
});