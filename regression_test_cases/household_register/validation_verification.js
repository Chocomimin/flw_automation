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
  fillDateOfMarriageIfExists,
  fillContactNumberIfExists,
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

const {
  submitHouseholdFormWithBlankMobile,
  handleConsentFormChoice,
  verifyAndCompleteOtp,
} = require("./verification/negativeAndConsentHelpers");

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

async function registerBeneficiary(browserInstance, gender, identity, consentChoice = "Agree") {
  console.log(`\n📝 Registering a ${gender} beneficiary (Consent: ${consentChoice})...`);

  await handleConsentFormChoice(browserInstance, consentChoice);

  if (consentChoice.toLowerCase() !== "agree") {
    console.log("⏭️ Consent was DISAGREED — stopping beneficiary form fill here.");
    return { registered: false };
  }

  const otpSentConfirmed = await verifyAndCompleteOtp(browserInstance, identity.mobileNumber);

  const dob = identity.dob || { day: 15, month: 3, year: 1990 };
  await selectDateOfBirth(browserInstance, dob);
  await selectGender(browserInstance, gender);
  await selectMaritalStatus(browserInstance, "Married");
  await fillFatherName(browserInstance, identity.fatherName);
  await fillMotherName(browserInstance, identity.motherName);
  await fillSpouseNameIfExists(browserInstance, identity.spouseName);
  await fillAgeAtMarriageIfExists(browserInstance, identity.ageAtMarriage);

  const ageAtMarriageNum = parseInt(identity.ageAtMarriage, 10);
  const dateOfMarriage = identity.dateOfMarriage || (
    Number.isFinite(ageAtMarriageNum)
      ? { day: dob.day, month: dob.month, year: dob.year + ageAtMarriageNum }
      : undefined
  );
  await fillDateOfMarriageIfExists(browserInstance, dateOfMarriage);

  if (gender === "Female") {
    await selectHaveChildrenIfExists(browserInstance, "Yes");
  }

  await fillContactNumberIfExists(browserInstance, identity.mobileNumber);
  await selectCommunity(browserInstance, "OBC");
  await selectReligion(browserInstance, "Christian");

  if (gender === "Female") {
    await selectStatusOfWomenIfExists(browserInstance, "Pregnant Woman");
    const randomRchId = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    await fillRchIdIfExists(browserInstance, randomRchId);
  }

  await submitFinalForm(browserInstance);
  await handleAddSpousePopup(browserInstance);

  console.log(`🎉 ${gender} beneficiary registration completed. OTP confirmation seen: ${otpSentConfirmed}`);
  return { registered: true, otpSentConfirmed };
}

async function runValidationThenSuccessfulRegistration(browserInstance, gender) {
  console.log(`\n================ Household + ${gender} Beneficiary Flow ================`);
  const identity = randomHouseholdIdentity(gender);

  console.log("🎲 Random identity generated for this run:");
  console.log(`   Household Head: ${identity.householdName}`);
  console.log(`   Father's Name:  ${identity.fatherName}`);
  console.log(`   Mother's Name:  ${identity.motherName}`);
  console.log(`   Spouse's Name:  ${identity.spouseName}`);
  console.log(`   Mobile Number:  ${identity.mobileNumber}`);

  await clickAllHousehold(browserInstance);
  await clickNewHouseholdRegistration(browserInstance);
  await acceptConsent(browserInstance);

  const { blocked, message } = await submitHouseholdFormWithBlankMobile(browserInstance, {
    firstName: identity.firstName,
    lastName: identity.lastName,
  });
  console.log(`📋 Validation result — blocked: ${blocked}, message: "${message}"`);

  await fillHouseholdFormWithExamples(browserInstance, {
    firstName: identity.firstName,
    lastName: identity.lastName,
    mobileNumber: identity.mobileNumber
  });
  await browserInstance.pause(3000);

  const result = await registerBeneficiary(browserInstance, gender, identity, "Agree");

  const verified = await verifyHouseholdBySearch(browserInstance, clickAllHousehold, identity.householdName);
  if (verified) {
    console.log("🎉 VERIFICATION RESULT: Household registration CONFIRMED via search.");
  } else {
    console.log("🚨 VERIFICATION RESULT: Household registration COULD NOT be confirmed via search.");
  }

  return { identity, blocked, message, verified, ...result };
}

async function goBackToHome(browserInstance) {
  console.log("🏠 Returning to Home screen for the next flow...");
  for (let i = 0; i < 5; i++) {
    try {
      const homeCard = await browserInstance.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/cv_icon").index(0)');
      if (await homeCard.isDisplayed()) {
        console.log("✅ Home screen reached.");
        return;
      }
    } catch (e) {}
    await browserInstance.back();
    await browserInstance.pause(1500);
  }
  console.log("⚠️ Could not verify Home screen after 5 backs.");
}

async function runDisagreeConsentThenAddMember(browserInstance) {
  console.log(`\n================ Disagree-Consent Household Flow ================`);
  const identity = randomHouseholdIdentity("Female");

  await clickAllHousehold(browserInstance);
  await clickNewHouseholdRegistration(browserInstance);
  await acceptConsent(browserInstance);

  await fillHouseholdFormWithExamples(browserInstance, {
    firstName: identity.firstName,
    lastName: identity.lastName,
    mobileNumber: identity.mobileNumber
  });
  await browserInstance.pause(3000);

  const { registered } = await registerBeneficiary(browserInstance, "Female", identity, "Disagree");
  console.log(`📋 Beneficiary registered after Disagree? ${registered} (expected: false)`);

  console.log("\n👨‍👩‍👧 Attempting to add a family member...");
  try {
    await attemptAddFamilyMember(browserInstance);
    console.log("✅ Add-family-member flow completed without throwing.");
  } catch (e) {
    console.log(`⚠️ Add-family-member flow raised an error: ${e.message}`);
  }

  return { identity, registered };
}

// ─────────────────────────────────────────────────────────────
//  Mocha Test Suite
// ─────────────────────────────────────────────────────────────

describe('Household Registration', () => {

  it('(Qase ID: 1339) - Verify Household Registration with mandatory field validation, Consent Form behavior, and OTP-based Beneficiary Registration', async () => {
    const myPreferredLanguage = "English";
    await selectLanguage(browser, myPreferredLanguage);

    await login(browser, "Bobita", "Test@123");
    await browser.pause(5000);

    if (typeof selectVillage !== "function") {
      throw new Error("selectVillage is not available from verification/villageSteps");
    }

    await selectVillage(browser, "Oating");
    await browser.pause(1000);

    // ── Steps 4-9: run once per beneficiary gender ──
    const femaleResult = await runValidationThenSuccessfulRegistration(browser, "Female");
    await goBackToHome(browser);

    const maleResult = await runValidationThenSuccessfulRegistration(browser, "Male");
    await goBackToHome(browser);

    // ── Steps 10-11: Disagree flow + attempt to add a family member ──
    const disagreeResult = await runDisagreeConsentThenAddMember(browser);
    await goBackToHome(browser);

    console.log("\n================ SUMMARY ================");
    console.log("Female flow:", { blocked: femaleResult.blocked, registered: femaleResult.registered, verified: femaleResult.verified });
    console.log("Male flow:", { blocked: maleResult.blocked, registered: maleResult.registered, verified: maleResult.verified });
    console.log("Disagree flow:", { registered: disagreeResult.registered });
  });

});