// mandatoryFieldAndConsentFlow.js
//
// Covers steps 4-11 of the test scenario (steps 1-3 — language, login,
// village selection — are already handled by validation_verification.js
// and reused here the same way):
//
//   4. Open a new Household Registration form and leave a mandatory field
//      (Mobile Number) blank.
//   5. Verify the validation message / that submission is blocked.
//   6. Proceed to Beneficiary Registration and open the Consent Form.
//   7. Select Agree and register a beneficiary successfully.
//   8. Verify an OTP is sent to the registered mobile number and complete
//      OTP verification.
//   9. Complete beneficiary registration for a Male AND a Female
//      beneficiary (run twice, once per gender, each in its own household).
//  10. Repeat registration (a new household) and select Disagree in the
//      Consent Form.
//  11. Attempt to add a family member.
//
// ASSUMPTIONS (please adjust if they don't match your app/repo):
//   - "./verification/loginSteps" exports selectLanguage(driver, lang) and
//     login(driver, user, pass) — same as validation_verification.js.
//   - "./verification/villageSteps" exports selectVillage(driver, name).
//   - The Mobile Number validation message is detected via one of: an
//     inline TextView, a Toast, or generic on-screen text containing
//     "mobile" + required/mandatory/enter/invalid. If your app's real
//     copy differs, tighten getMobileNumberValidationError in
//     ./verification/negativeAndConsentHelpers.js.
//   - Step 11 reuses your existing addMember.js `runTest(driver)` as-is.
//     That file's TEST object currently hard-codes searchName: 'UMA CHK'.
//     If you want step 11 to target the household created *in this run*,
//     update that TEST object (or export the individual addMember.js
//     helpers so a name can be passed in) — the plumbing/session handoff
//     already supports it since runTest(driver) accepts an external driver.

const { remote } = require("webdriverio");
const { selectLanguage, login } = require("./verification/loginSteps");
const { selectVillage } = require("./verification/villageSteps");
const {
  clickAllHousehold,
  clickNewHouseholdRegistration,
  acceptConsent,
} = require("./verification/householdSteps");
const { fillHouseholdFormWithExamples } = require("./verification/householdFormSteps");
const {
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
const { runTest: attemptAddFamilyMember } = require("./verification/addMember");
const {
  submitHouseholdFormWithBlankMobile,
  handleConsentFormChoice,
  verifyAndCompleteOtp,
} = require("./verification/negativeAndConsentHelpers");

// ─────────────────────────────────────────────────────────────
//  Steps 6-9: Beneficiary registration, composed from the individual
//  headOfFamilySteps exports so we can swap in Agree/Disagree +
//  OTP-verification instead of the built-in Agree-only wrapper.
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
//  successful household + beneficiary registration.
// ─────────────────────────────────────────────────────────────
async function runValidationThenSuccessfulRegistration(driver, gender) {
  console.log(`\n================ Household + ${gender} Beneficiary Flow ================`);
  const identity = randomHouseholdIdentity(gender);

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
    mobileNumber: identity.mobileNumber,
  });
  await driver.pause(3000);

  // Steps 6-9
  const result = await registerBeneficiary(driver, gender, identity, "Agree");
  return { identity, blocked, message, ...result };
}

// ─────────────────────────────────────────────────────────────
//  Steps 10-11: new household, Disagree on the Consent Form, then
//  attempt to add a family member.
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
    mobileNumber: identity.mobileNumber,
  });
  await driver.pause(3000);

  // Step 10: Disagree on the Beneficiary Consent Form
  const { registered } = await registerBeneficiary(driver, "Female", identity, "Disagree");
  console.log(`📋 Beneficiary registered after Disagree? ${registered} (expected: false)`);

  // Step 11: attempt to add a family member, reusing this same session
  console.log("\n👨‍👩‍👧 Attempting to add a family member...");
  try {
    await attemptAddFamilyMember(driver);
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
    },
  });

  console.log("✅ App launched successfully!");

  try {
    await selectLanguage(driver, "English");
    await login(driver, "Bobita", "Test@123");
    await driver.pause(5000);
    await selectVillage(driver, "Oating");
    await driver.pause(1000);

    // Steps 4-9, run once per beneficiary gender
    const femaleResult = await runValidationThenSuccessfulRegistration(driver, "Female");
    const maleResult = await runValidationThenSuccessfulRegistration(driver, "Male");

    // Steps 10-11
    const disagreeResult = await runDisagreeConsentThenAddMember(driver);

    console.log("\n================ SUMMARY ================");
    console.log("Female flow:", { blocked: femaleResult.blocked, registered: femaleResult.registered });
    console.log("Male flow:", { blocked: maleResult.blocked, registered: maleResult.registered });
    console.log("Disagree flow:", { registered: disagreeResult.registered });
  } catch (error) {
    console.error("❌ Test failed:", error);
    try {
      const screenshot = await driver.takeScreenshot();
      const fs = require("fs");
      fs.writeFileSync(`error-${Date.now()}.png`, screenshot, "base64");
      console.log("📸 Screenshot saved for debugging");
    } catch (screenshotError) {
      console.error("Could not take screenshot:", screenshotError);
    }
  } finally {
    await driver.pause(5000);
    await driver.deleteSession();
  }
}

main().catch((err) => {
  console.error("❌ Main function failed:", err);
});

module.exports = {
  registerBeneficiary,
  runValidationThenSuccessfulRegistration,
  runDisagreeConsentThenAddMember,
};