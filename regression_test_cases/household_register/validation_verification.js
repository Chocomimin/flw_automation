const { remote } = require("webdriverio");
const { selectLanguage, login } = require("./verification/loginSteps");
const { selectVillage } = require("./verification/villageSteps");
const {
  clickAllHousehold,
  clickNewHouseholdRegistration,
  acceptConsent
} = require("./verification/householdSteps");

const { fillHouseholdFormWithExamples } = require("./verification/householdFormSteps");

const {
  fillHeadOfFamilyFormWithExamples,
  selectDateOfBirth,
  selectGender,
  selectMaritalStatus,
  fillFatherName,
  fillMotherName,
  fillSpouseNameIfExists,
  fillAgeAtMarriageIfExists,
  selectHaveChildrenIfExists,
  selectCommunity,
  selectReligion,
  selectStatusOfWomenIfExists,
  fillRchIdIfExists,
  submitFinalForm,
  handleAddSpousePopup,
} = require("./verification/headOfFamilySteps");

const { randomHouseholdIdentity } = require("./verification/randomHouseholdData");
const { verifyHouseholdBySearch } = require("./verification/verifyHouseholdBySearch");
const { runTest: attemptAddFamilyMember } = require("./verification/addMember");

// ✅ New helpers for the mandatory-field validation check and the
// Agree/Disagree consent branching (steps 4-11).
const {
  submitHouseholdFormWithBlankMobile,
  handleConsentFormChoice,
  verifyAndCompleteOtp,
} = require("./verification/negativeAndConsentHelpers");

// ─────────────────────────────────────────────────────────────
//  Steps 6-9: Beneficiary registration, composed from the individual
//  headOfFamilySteps exports so we can swap in Agree/Disagree consent
//  and verified OTP handling instead of the built-in Agree-only wrapper
//  (fillHeadOfFamilyFormWithExamples is still exported above and can be
//  used directly wherever the Agree-only shortcut is good enough).
// ─────────────────────────────────────────────────────────────
async function registerBeneficiary(driver, gender, identity, consentChoice = "Agree") {
  console.log(`\n📝 Registering a ${gender} beneficiary (Consent: ${consentChoice})...`);

  // Step 6: open the Consent Form
  await handleConsentFormChoice(driver, consentChoice);

  if (consentChoice.toLowerCase() !== "agree") {
    console.log("⏭️ Consent was DISAGREED — stopping beneficiary form fill here.");
    return { registered: false };
  }

  // Step 7: Agree selected — continue
  // Step 8: OTP sent + verified
  const otpSentConfirmed = await verifyAndCompleteOtp(driver, identity.mobileNumber);

  // Step 9: complete the rest of the form for this beneficiary's gender
  const dob = identity.dob || { day: 15, month: 3, year: 1990 };
  await selectDateOfBirth(driver, dob);
  await selectGender(driver, gender);
  await selectMaritalStatus(driver, "Married");
  await fillFatherName(driver, identity.fatherName);
  await fillMotherName(driver, identity.motherName);
  await fillSpouseNameIfExists(driver, identity.spouseName);
  await fillAgeAtMarriageIfExists(driver, identity.ageAtMarriage);

  if (gender === "Female") {
    await selectHaveChildrenIfExists(driver, "Yes");
  }

  await selectCommunity(driver, "OBC");
  await selectReligion(driver, "Christian");

  if (gender === "Female") {
    await selectStatusOfWomenIfExists(driver, "Pregnant Woman");
    const randomRchId = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    await fillRchIdIfExists(driver, randomRchId);
  }

  await submitFinalForm(driver);
  await handleAddSpousePopup(driver);

  console.log(`🎉 ${gender} beneficiary registration completed. OTP confirmation seen: ${otpSentConfirmed}`);
  return { registered: true, otpSentConfirmed };
}

// ─────────────────────────────────────────────────────────────
//  Steps 4-9 for one gender: blank-mobile validation, then a full
//  successful household + beneficiary registration, then verification
//  by search (reusing your existing verifyHouseholdBySearch).
// ─────────────────────────────────────────────────────────────
async function runValidationThenSuccessfulRegistration(driver, gender) {
  console.log(`\n================ Household + ${gender} Beneficiary Flow ================`);
  const identity = randomHouseholdIdentity(gender);

  console.log("🎲 Random identity generated for this run:");
  console.log(`   Household Head: ${identity.householdName}`);
  console.log(`   Father's Name:  ${identity.fatherName}`);
  console.log(`   Mother's Name:  ${identity.motherName}`);
  console.log(`   Spouse's Name:  ${identity.spouseName}`);
  console.log(`   Mobile Number:  ${identity.mobileNumber}`);

  await clickAllHousehold(driver);
  await clickNewHouseholdRegistration(driver);
  await acceptConsent(driver);

  // Steps 4-5: leave Mobile Number blank, verify validation blocks submit
  const { blocked, message } = await submitHouseholdFormWithBlankMobile(driver, {
    firstName: identity.firstName,
    lastName: identity.lastName,
  });
  console.log(`📋 Validation result — blocked: ${blocked}, message: "${message}"`);

  // Now fill the form properly (all fields incl. Mobile Number) and submit
  await fillHouseholdFormWithExamples(driver, {
    firstName: identity.firstName,
    lastName: identity.lastName,
    mobileNumber: identity.mobileNumber
  });
  await driver.pause(3000);

  // Steps 6-9
  const result = await registerBeneficiary(driver, gender, identity, "Agree");

  // Verify: go back to the household list and search for the head's name
  const verified = await verifyHouseholdBySearch(driver, clickAllHousehold, identity.householdName);
  if (verified) {
    console.log("🎉 VERIFICATION RESULT: Household registration CONFIRMED via search.");
  } else {
    console.log("🚨 VERIFICATION RESULT: Household registration COULD NOT be confirmed via search.");
  }

  return { identity, blocked, message, verified, ...result };
}

// ─────────────────────────────────────────────────────────────
// Helper to return to the home screen after completing a flow
// ─────────────────────────────────────────────────────────────
async function goBackToHome(driver) {
  console.log("🏠 Returning to Home screen for the next flow...");
  for (let i = 0; i < 5; i++) {
    try {
      // Look for the All Household card to confirm we are on the Home screen
      const homeCard = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/cv_icon").index(0)');
      if (await homeCard.isDisplayed()) {
        console.log("✅ Home screen reached.");
        return;
      }
    } catch (e) {}
    // If not found, press Android back button
    await driver.back();
    await driver.pause(1500);
  }
  console.log("⚠️ Could not verify Home screen after 5 backs.");
}

// ─────────────────────────────────────────────────────────────
// Steps 10-11: new household, Disagree on the Consent Form, then
// attempt to add a family member.
// ─────────────────────────────────────────────────────────────
async function runDisagreeConsentThenAddMember(driver) {
  console.log(`\n================ Disagree-Consent Household Flow ================`);
  const identity = randomHouseholdIdentity("Female");

  await clickAllHousehold(driver);
  await clickNewHouseholdRegistration(driver);
  await acceptConsent(driver);

  await fillHouseholdFormWithExamples(driver, {
    firstName: identity.firstName,
    lastName: identity.lastName,
    mobileNumber: identity.mobileNumber
  });
  await driver.pause(3000);

  // Step 10: Disagree on the Beneficiary Consent Form
  const { registered } = await registerBeneficiary(driver, "Female", identity, "Disagree");
  console.log(`📋 Beneficiary registered after Disagree? ${registered} (expected: false)`);

  // Step 11: attempt to add a family member, reusing this same session
  console.log("\n👨‍👩‍👧 Attempting to add a family member...");
  try {
    // 👈 Pass the dynamic identity over to addMember!
    await attemptAddFamilyMember(driver, {
      searchName: identity.householdName,
      gender: "Female",
      relation: "Mother"
    });
    console.log("✅ Add-family-member flow completed without throwing.");
  } catch (e) {
    console.log(`⚠️ Add-family-member flow raised an error: ${e.message}`);
  }

  return { identity, registered };
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

  try {
    const myPreferredLanguage = "English"; // Change this to test other languages
    await selectLanguage(driver, myPreferredLanguage);

    await login(driver, "Bobita", "Test@123");
    await driver.pause(5000);

    console.log("debug: selectVillage typeof=", typeof selectVillage);
    if (typeof selectVillage !== "function") {
      console.error("debug: villageSteps exports=", require("./verification/villageSteps"));
      throw new Error("selectVillage is not available from verification/villageSteps");
    }

    await selectVillage(driver, "Oating");
    await driver.pause(1000);

    // ── Steps 4-9: run once per beneficiary gender ──
    const femaleResult = await runValidationThenSuccessfulRegistration(driver, "Female");
    await goBackToHome(driver); // 👈 Go back home before starting the next flow

    const maleResult = await runValidationThenSuccessfulRegistration(driver, "Male");
    await goBackToHome(driver); // 👈 Go back home before starting the next flow

    // ── Steps 10-11: Disagree flow + attempt to add a family member ──
    const disagreeResult = await runDisagreeConsentThenAddMember(driver);
    await goBackToHome(driver); // 👈 Clean state return

    console.log("\n================ SUMMARY ================");
    console.log("Female flow:", { blocked: femaleResult.blocked, registered: femaleResult.registered, verified: femaleResult.verified });
    console.log("Male flow:", { blocked: maleResult.blocked, registered: maleResult.registered, verified: maleResult.verified });
    console.log("Disagree flow:", { registered: disagreeResult.registered });

  } catch (error) {
    console.error("❌ Test failed:", error);

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
    await driver.deleteSession();
  }
}

main().catch(err => {
  console.error("❌ Main function failed:", err);
});