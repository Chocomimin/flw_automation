// ─────────────────────────────────────────────────────────────
//  CORE HELPER — Scroll to Top (Physical Swipe)
// ─────────────────────────────────────────────────────────────
async function fillFirstName(driver, firstName) {
    const f = await driver.$('//android.widget.EditText[contains(@hint, "First Name") or contains(@text, "First Name")] | //android.widget.TextView[contains(@text, "First Name")]/parent::*//android.widget.EditText');
    await f.waitForDisplayed({ timeout: 10000 });
    await f.click();
    await f.clearValue();
    await f.setValue(firstName);

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(500);
    }
    console.log('✅ First Name entered/edited successfully');
}

async function fillLastName(driver, lastName) {
    const f = await driver.$('//android.widget.EditText[contains(@hint, "Last Name") or contains(@text, "Last Name")] | //android.widget.TextView[contains(@text, "Last Name")]/parent::*//android.widget.EditText');
    await f.waitForDisplayed({ timeout: 10000 });
    await f.click();
    await f.clearValue();
    await f.setValue(lastName);

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(500);
    }
    console.log('✅ Last Name entered/edited successfully');
}
/**
 * Taps the Mobile Number field (so it registers as "touched" for any
 * on-blur validation) and hides the keyboard WITHOUT typing anything.
 * This is what leaves the mandatory field blank.
 */
async function touchAndLeaveMobileNumberBlank(driver) {
  await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().className("android.widget.EditText").textContains("Mobile No"))');
  const f = await driver.$('android=new UiSelector().className("android.widget.EditText").textContains("Mobile No")');
  await f.waitForDisplayed({ timeout: 10000 });
  await f.click();
  console.log("⏭️  Mobile Number field focused but deliberately left BLANK");
  if (await driver.isKeyboardShown()) { await driver.hideKeyboard(); await driver.pause(500); }
}

async function clickHouseholdSubmit(driver) {
  const submitBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit")');
  await submitBtn.waitForDisplayed({ timeout: 10000 });
  await submitBtn.click();
  console.log("🔍 Clicked Submit with Mobile Number left blank");
  await driver.pause(1500);
}

/**
 * Looks for a validation message using several common Android patterns.
 * If your app's real error copy differs, tighten the regexes below.
 */
async function getMobileNumberValidationError(driver) {
  console.log("🔍 Checking for a Mobile Number validation message...");

  // Strategy 1: inline field error text
  try {
    const inlineError = await driver.$('android=new UiSelector().textContains("Mobile").className("android.widget.TextView")');
    if (await inlineError.isExisting()) {
      const text = await inlineError.getText();
      if (/required|enter|invalid|mandatory/i.test(text)) {
        console.log(`✅ Inline validation message found: "${text}"`);
        return text;
      }
    }
  } catch (e) {}

  // Strategy 2: Toast (short-lived — must be checked immediately after submit)
  try {
    const toast = await driver.$('android=new UiSelector().className("android.widget.Toast")');
    if (await toast.isExisting()) {
      const text = await toast.getText();
      console.log(`✅ Toast validation message found: "${text}"`);
      return text;
    }
  } catch (e) {}

  // Strategy 3: any on-screen text mentioning mobile + required/mandatory/etc.
  try {
    const generic = await driver.$('android=new UiSelector().textMatches("(?i).*(mobile).*(required|mandatory|enter|invalid).*")');
    if (await generic.isExisting()) {
      const text = await generic.getText();
      console.log(`✅ Validation message found: "${text}"`);
      return text;
    }
  } catch (e) {}

  console.log("❌ No validation message could be detected on screen.");
  return null;
}

/**
 * Full negative-path flow: fills minimal identifying fields, leaves
 * Mobile Number blank, submits, and reports whether the app correctly
 * blocked submission.
 */
async function submitHouseholdFormWithBlankMobile(driver, data = {}) {
  console.log("📝 Filling household form leaving Mobile Number BLANK (negative test)...");
  await fillFirstName(driver, data.firstName || "mina");
  await fillLastName(driver, data.lastName || "Verma");
  await touchAndLeaveMobileNumberBlank(driver);

  await clickHouseholdSubmit(driver);
  const message = await getMobileNumberValidationError(driver);

  // If the Submit button is still present, the form did not advance —
  // i.e. the blank mandatory field correctly blocked submission.
  let blocked = false;
  try {
    const submitBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit")');
    blocked = await submitBtn.isExisting();
  } catch (e) {}

  if (blocked) {
    console.log("✅ VALIDATION PASSED: Household form correctly blocked submission with Mobile Number blank.");
  } else {
    console.log("🚨 VALIDATION CONCERN: Form appears to have moved on even though Mobile Number was blank!");
  }

  return { blocked, message };
}

// ─────────────────────────────────────────────────────────────
//  STEP 6/10: Beneficiary Consent Form — Agree or Disagree
// ─────────────────────────────────────────────────────────────

async function handleConsentFormChoice(driver, choice = "Agree") {
  console.log(`⏳ Waiting for Consent Form popup to select "${choice}"...`);
  try {
    if (choice.toLowerCase() === "agree") {
      const agreeBtn = await driver.$('android=new UiSelector().textMatches("(?i)agree")');
      await agreeBtn.waitForDisplayed({ timeout: 15000 });

      const checkbox = await driver.$('android=new UiSelector().className("android.widget.CheckBox")');
      if (await checkbox.isExisting()) {
        await checkbox.click();
        console.log("✅ Checked the Consent Checkbox");
      }
      await driver.pause(1000);
      await agreeBtn.click();
      console.log("✅ Clicked AGREE on Consent Form");
    } else {
      const disagreeBtn = await driver.$('android=new UiSelector().textMatches("(?i)disagree")');
      await disagreeBtn.waitForDisplayed({ timeout: 15000 });
      await disagreeBtn.click();
      console.log("✅ Clicked DISAGREE on Consent Form");
    }
    await driver.pause(2000);
  } catch (error) {
    console.log(`ℹ️ Consent Form did not appear or "${choice}" could not be selected: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────
//  STEP 7-8: Trigger OTP, verify a "sent" confirmation appears,
//  then complete verification (mirrors handleOtpVerification but
//  reports whether a confirmation was actually seen).
// ─────────────────────────────────────────────────────────────

async function verifyAndCompleteOtp(driver, mobileNumber) {
  console.log("📲 Triggering OTP and checking for a 'sent' confirmation...");
  let otpSentConfirmed = false;

  try {
    const otpButton = await driver.$('android=new UiSelector().textContains("OTP")');
    await otpButton.waitForDisplayed({ timeout: 10000 });
    await otpButton.click();
    console.log("✅ Clicked OTP trigger button.");
    await driver.pause(2000);

    const lastFour = mobileNumber ? mobileNumber.slice(-4) : null;
    try {
      const sentMsg = await driver.$('android=new UiSelector().textMatches("(?i).*(otp).*(sent|resend).*")');
      if (await sentMsg.isExisting()) {
        const text = await sentMsg.getText();
        console.log(`✅ OTP-sent confirmation found: "${text}"`);
        otpSentConfirmed = true;
        if (lastFour && text.includes(lastFour)) {
          console.log(`✅ Confirmation references the registered mobile number ending "${lastFour}"`);
        }
      } else {
        console.log("⚠️ No explicit 'OTP sent' text found on screen.");
      }
    } catch (e) {}

    console.log("⏳ Waiting 20 seconds for OTP auto-read/manual entry...");
    await driver.pause(20000);

    const nextButton = await driver.$('android=new UiSelector().textContains("Next")');
    if (await nextButton.isExisting()) {
      await nextButton.click();
      console.log("✅ Clicked Next after OTP.");
      await driver.pause(2000);
    }
  } catch (e) {
    console.log(`⚠️ OTP flow encountered an issue: ${e.message}`);
  }

  return otpSentConfirmed;
}

module.exports = {
  submitHouseholdFormWithBlankMobile,
  getMobileNumberValidationError,
  handleConsentFormChoice,
  verifyAndCompleteOtp,
};