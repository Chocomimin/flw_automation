const { fillHouseholdFormWithExamples } = require('./house_hold_form.js');
const { fillHeadOfFamilyFormWithExamples, handleConsentForm } = require('./head_of_family.js');

/**
 * Executes the end-to-end flow from the Home screen to creating a new Household
 * and its Head of Family.
 * * @param {WebdriverIO.Browser} driver - The Appium driver instance
 */
async function createNewHouseholdFlow(driver) {
    console.log("🏠 Starting New Household Creation Flow...");

    // ─────────────────────────────────────────────────────────────
    // STEP 1: Click "All Household" on Home Screen
    // ─────────────────────────────────────────────────────────────
    console.log("🔍 Looking for 'All Household' icon...");

    // The XML shows the text as "All&#10;Household" (multiline).
    // textMatches("(?i)All.*Household") safely catches it across layouts.
    const allHouseholdIcon = await driver.$('android=new UiSelector().textMatches("(?i)All.*Household")');
    await allHouseholdIcon.waitForDisplayed({ timeout: 15000 });
    await allHouseholdIcon.click();
    console.log("✅ Clicked on 'All Household' icon");

    await driver.pause(2500); // Allow screen transition to complete

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Click "New Household"
    // ─────────────────────────────────────────────────────────────
    console.log("🔍 Looking for 'New Household' button...");

    // Note: Since the XML for the second screen wasn't provided, this locator
    // assumes standard text. You may need to tweak this to a resource-id or
    // content-desc (e.g., a Floating Action Button) if your app uses an icon.
    const newHouseholdBtn = await driver.$('android=new UiSelector().textMatches("(?i).*New Household.*")');

    // Alternative fallback if it's an 'Add' icon/FAB:
    // const newHouseholdBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/fab_add")');

    await newHouseholdBtn.waitForDisplayed({ timeout: 10000 });
    await newHouseholdBtn.click();
    console.log("✅ Clicked to add 'New Household'");

    await driver.pause(2000); // Wait for the form to render

    // ─────────────────────────────────────────────────────────────
    // STEP 2b: Handle Consent Form
    // ─────────────────────────────────────────────────────────────
    // A Consent Form popup (checkbox + AGREE/DISAGREE) appears immediately
    // after tapping "New Household", before the household details form loads.
    console.log("📋 Handling Consent Form (appears right after New Household)...");
    await handleConsentForm(driver);

    // ─────────────────────────────────────────────────────────────
    // STEP 3: Fill Household Form
    // ─────────────────────────────────────────────────────────────
    // We pass customized test data, but it will fallback to your defaults if omitted
    const householdData = {
        firstName: "Vikram",
        lastName: "Sharma",
        mobileNumber: "9876543210",
        houseNo: "101",
        wardNo: "12",
        wardName: "Kalyan Nagar",
        mohallaName: "Station Road",
        economicStatus: "APL",
        typeOfHouse: "Pucca",
        houseOwnership: "Yes",
        separateKitchen: "Yes",
        typeOfFuel: "LPG",
        primaryWaterSource: "Tap Water",
        electricity: "Electricity Supply",
        toilet: "Flush toilet with running water"
    };

    // Note: Your helper script already handles clicking the First Submit,
    // Final Submit, and the "Yes" button for the Head of Family popup.
    await fillHouseholdFormWithExamples(driver, householdData);

    console.log("➡️ Transitioning to Head of Family Form...");
    await driver.pause(3000);

    // ─────────────────────────────────────────────────────────────
    // STEP 4: Fill Head of Family Form
    // ─────────────────────────────────────────────────────────────
    // Passing "Married" and "Male" as the profile to test the specific logical
    // bypasses you built into `fillHeadOfFamilyFormWithExamples`.
    const maritalStatus = "Married";
    const gender = "Male";

    const statusOfWomenFound = await fillHeadOfFamilyFormWithExamples(driver, maritalStatus, gender);

    if (!statusOfWomenFound && gender === "Female") {
         console.log("⚠️ Note: Expected Status of Women field for Female profile, but it was skipped.");
    }

    console.log("🎉 End-to-End Household Creation Flow finished successfully!");
}

module.exports = { createNewHouseholdFlow };