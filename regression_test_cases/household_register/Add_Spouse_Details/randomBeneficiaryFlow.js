const { fillHouseholdFormWithExamples } = require('./house_hold_form.js');
const {
    handleConsentForm,
    handleOtpVerification,
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
    checkStatusOfWomenField,
    selectStatusOfWomenIfExists,
    fillRchIdIfExists,
    submitFinalForm,
    handleAddSpousePopup
} = require('./head_of_family.js');

// ─────────────────────────────────────────────────────────────
// DATA GENERATOR HELPERS
// ─────────────────────────────────────────────────────────────

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomProfile() {
    const maleNames = ["Aarav", "Vikram", "Rahul", "Amit", "Raj", "Suresh", "Karan"];
    const femaleNames = ["Priya", "Anjali", "Sita", "Meera", "Kavita", "Lakshmi", "Neha"];
    const lastNames = ["Sharma", "Verma", "Singh", "Patel", "Kumar", "Reddy", "Rao"];
    const communities = ['General', 'SC', 'ST', 'BC', 'OBC', 'OC'];
    const religions = ['Hindu', 'Muslim', 'Christian', 'Sikhism'];

    const gender = getRandomItem(["Male", "Female"]);
    const firstName = gender === "Male" ? getRandomItem(maleNames) : getRandomItem(femaleNames);
    const lastName = getRandomItem(lastNames);

    const motherName = `${getRandomItem(femaleNames)} ${getRandomItem(lastNames)}`;
    const fatherName = `${getRandomItem(maleNames)} ${getRandomItem(lastNames)}`;

    let spouseName = "";
    if (gender === "Male") {
        spouseName = `${getRandomItem(femaleNames)} ${getRandomItem(lastNames)}`;
    } else {
        spouseName = `${getRandomItem(maleNames)} ${getRandomItem(lastNames)}`;
    }

    // Restrict random choices to trigger the required conditional logic frequently
    const maritalStatuses = ['Unmarried', 'Married', 'Divorced', 'Separated', 'Widower'];
    const maritalStatus = getRandomItem(maritalStatuses);

    // Random Date of Birth (Between 1980 and 2000 to ensure adult beneficiary)
    const year = Math.floor(Math.random() * (2000 - 1980 + 1)) + 1980;
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1; // Capped at 28 to safely avoid month-end leap year issues

    return {
        gender,
        firstName,
        lastName,
        motherName,
        fatherName,
        spouseName,
        maritalStatus,
        community: getRandomItem(communities),
        religion: getRandomItem(religions),
        dob: { day, month, year }
    };
}

// ─────────────────────────────────────────────────────────────
// MAIN EXECUTION FLOW
// ─────────────────────────────────────────────────────────────

/**
 * Executes the end-to-end randomized Beneficiary Registration flow.
 * @param {WebdriverIO.Browser} driver - The Appium driver instance
 */
async function registerRandomBeneficiary(driver) {
    console.log("🎲 Generating Random Beneficiary Profile...");
    const profile = generateRandomProfile();
    console.log(JSON.stringify(profile, null, 2));

    // ─────────────────────────────────────────────────────────────
    // STEP 1 & 2: Navigate and fill Base Household Form
    // ─────────────────────────────────────────────────────────────
    console.log("🔍 Navigating to New Household...");
    const allHouseholdIcon = await driver.$('android=new UiSelector().textMatches("(?i)All.*Household")');
    await allHouseholdIcon.waitForDisplayed({ timeout: 15000 });
    await allHouseholdIcon.click();
    await driver.pause(2500);

    const newHouseholdBtn = await driver.$('android=new UiSelector().textMatches("(?i).*New Household.*")');
    await newHouseholdBtn.waitForDisplayed({ timeout: 10000 });
    await newHouseholdBtn.click();
    await driver.pause(2000);

    // The Consent Form popup (checkbox + AGREE/DISAGREE) appears immediately
    // after tapping "New Household", before the household details form loads.
    console.log("📋 Handling Consent Form (appears right after New Household)...");
    await handleConsentForm(driver);

    // Fill the first page with our random names and a generated mobile number
    const householdData = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        mobileNumber: `9${Math.floor(100000000 + Math.random() * 900000000)}`, // Random 10-digit starting with 9
        houseNo: `${Math.floor(Math.random() * 999)}A`,
        wardNo: "08",
        wardName: "Green Park",
        mohallaName: "Meera Nagar",
        economicStatus: "APL",
        typeOfHouse: "Pucca",
        houseOwnership: "Yes",
        separateKitchen: "Yes",
        typeOfFuel: "LPG",
        primaryWaterSource: "Tap Water",
        electricity: "Electricity Supply",
        toilet: "Flush toilet with running water"
    };

    await fillHouseholdFormWithExamples(driver, householdData);
    console.log("➡️ Transitioning to Head of Family Form...");
    await driver.pause(3000);

    // ─────────────────────────────────────────────────────────────
    // STEP 3: Fill Head of Family Form (Atomic Step Orchestration)
    // ─────────────────────────────────────────────────────────────

    await handleConsentForm(driver);
    await handleOtpVerification(driver);

    // Calendar logic strictly utilizes the popup interaction
    await selectDateOfBirth(driver, profile.dob);

    await selectGender(driver, profile.gender);
    await selectMaritalStatus(driver, profile.maritalStatus);

    await fillFatherName(driver, profile.fatherName);
    await fillMotherName(driver, profile.motherName);

    // Spouse & Marriage logic
    const requiresMarriageDetails = ['Married', 'Divorced', 'Separated', 'Widower'].includes(profile.maritalStatus);

    if (requiresMarriageDetails) {
        await fillSpouseNameIfExists(driver, profile.spouseName);

        // Random age at marriage between 18 and 25
        const ageAtMarriage = Math.floor(Math.random() * 8) + 18;
        await fillAgeAtMarriageIfExists(driver, ageAtMarriage.toString());
    }

    // ─────────────────────────────────────────────────────────────
    // WOMEN BENEFICIARY LOGIC
    // ─────────────────────────────────────────────────────────────
    if (profile.gender === "Female" && requiresMarriageDetails) {
        console.log("👩 Women Beneficiary detected with qualifying marital status. Checking for children...");

        // Randomize having children if the field appears
        const hasChildren = getRandomItem(["Yes", "No"]);
        await selectHaveChildrenIfExists(driver, hasChildren);

        // Status of Women checks
        const statusOfWomenFound = await checkStatusOfWomenField(driver, profile.gender);
        if (statusOfWomenFound) {
            await selectStatusOfWomenIfExists(driver, "Eligible Couple");

            // Generate a random 12-digit RCH ID
            const randomRchId = Math.floor(100000000000 + Math.random() * 900000000000).toString();
            await fillRchIdIfExists(driver, randomRchId);
        }
    } else if (profile.gender === "Female") {
        console.log("👩 Unmarried Women Beneficiary detected. Skipping marriage/children specifics.");
    } else {
        console.log("👨 Male Beneficiary detected. Bypassing women-specific fields.");
    }

    // ─────────────────────────────────────────────────────────────
    // FINALIZATION
    // ─────────────────────────────────────────────────────────────
    await selectCommunity(driver, profile.community);
    await selectReligion(driver, profile.religion);

    await submitFinalForm(driver);
    await handleAddSpousePopup(driver);

    console.log("🎉 Random Beneficiary Registration completed successfully!");
}

module.exports = { registerRandomBeneficiary };