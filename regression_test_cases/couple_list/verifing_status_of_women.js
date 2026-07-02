const { remote } = require("webdriverio");
const { selectLanguage, login } = require("../../steps/loginSteps");
const { selectVillage } = require("../../steps/villageSteps");
const { clickAllHousehold, clickNewHouseholdRegistration, acceptConsent } = require("../../steps/householdSteps");
const { fillHouseholdFormWithExamples } = require("../../steps/householdFormSteps");
const {
    fillHeadOfFamilyFormWithExamples,
    checkStatusOfWomenField,
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
    selectStatusOfWomenIfExists,
    handleAddSpousePopup,
    submitFinalForm,
} = require("../../steps/headOfFamilySteps");

// ==========================================
// RANDOM DATA GENERATORS
// ==========================================

function generateRandomWoman() {
    const firstNames = ["Anjali", "Priya", "Sunita", "Kavita", "Lakshmi", "Meena", "Sita", "Geeta", "Radha"];
    const lastNames  = ["Sharma", "Verma", "Reddy", "Patel", "Singh", "Das", "Rao"];
    return {
        firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
        lastName:  lastNames[Math.floor(Math.random() * lastNames.length)]
    };
}

function generateRandomMan() {
    const firstNames = ["Rahul", "Amit", "Raj", "Vikram", "Sanjay", "Anil", "Sunil", "Ravi", "Mohan"];
    const lastNames  = ["Sharma", "Verma", "Reddy", "Patel", "Singh", "Das", "Rao"];
    return {
        firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
        lastName:  lastNames[Math.floor(Math.random() * lastNames.length)]
    };
}

function generateRandomMaritalStatus() {
    const statuses = ['Unmarried', 'Married', 'Divorced', 'Separated', 'Widower'];
    return statuses[Math.floor(Math.random() * statuses.length)];
}

// Any age (18–80)
function generateRandomAge() {
    return Math.floor(Math.random() * (80 - 18 + 1)) + 18;
}

// Age strictly below 40 (18–39)
function generateRandomAgeBelow40() {
    return Math.floor(Math.random() * (39 - 18 + 1)) + 18;
}

// ==========================================
// DROPDOWN VERIFIER
// Fills the form only up to the "Status of Women" field,
// verifies all 4 options, then backs out WITHOUT submitting.
// ==========================================

async function verifyStatusOfWomenDropdownOptions(driver) {
    console.log("\n🔍 ============================================================");
    console.log("🔍 DROPDOWN VERIFICATION: Opening fresh form to check options...");
    console.log("🔍 ============================================================");

    const expectedOptions = [
        'Eligible Couple',
        'Pregnant Woman',
        'Postnatal Mother',
        'Permanently Sterilised'
    ];

    const verificationResults = [];

    // ── Open a new household + head-of-family form ─────────────────────────
    await clickAllHousehold(driver);
    await clickNewHouseholdRegistration(driver);
    await acceptConsent(driver);

    // Use a fixed dummy name so this registration is clearly a verification run
    await fillHouseholdFormWithExamples(driver, { firstName: "Verify", lastName: "Test" });
    await driver.pause(3000);

    // Fill the HoF form up to (and including) the "Status of Women" spinner
    // without submitting — we stop right after the spinner is rendered.
    await handleConsentForm(driver);
    await handleOtpVerification(driver);

    const exampleDOB = { day: 15, month: 3, year: 1985 };
    await selectDateOfBirth(driver, exampleDOB);

    await selectGender(driver, "Female");
    await selectMaritalStatus(driver, "Married");

    await fillFatherName(driver, "Rajendra Kumar");
    await fillMotherName(driver, "Meera Kumari");
    await fillSpouseNameIfExists(driver, "Krupal Singh");
    await fillAgeAtMarriageIfExists(driver, "24");
    await selectHaveChildrenIfExists(driver, "Yes");
    await selectCommunity(driver, "OBC");
    await selectReligion(driver, "Christian");

    // Scroll forward so the Status of Women spinner is visible
    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Status Of Women"))');
        await driver.pause(1000);
    } catch (e) {
        console.log("⚠️  Could not scroll to Status Of Women:", e.message);
    }

    // Confirm the field is actually present before attempting option checks
    const fieldPresent = await checkStatusOfWomenField(driver, "Dropdown Verification");
    if (!fieldPresent) {
        console.log("❌ SKIP: 'Status of Women' field not visible — cannot verify options.");
        // Navigate back to exit without submitting
        await driver.back();
        await driver.pause(1000);
        await driver.back();
        await driver.pause(1000);
        return verificationResults;
    }

    
const spinnerSelector = 'android=new UiSelector().className("android.widget.Spinner").description("Status Of Women")';

    for (let i = 0; i < expectedOptions.length; i++) {
        const expected = expectedOptions[i];
        console.log(`\n   🔁 Checking option ${i + 1}/${expectedOptions.length}: "${expected}"`);

        try {
            // 1. Open the spinner
            const spinner = await driver.$(spinnerSelector);
            await spinner.waitForDisplayed({ timeout: 5000 });

            const loc  = await spinner.getLocation();
            const size = await spinner.getSize();
            const tapX = Math.floor(loc.x + size.width - 40);
            const tapY = Math.floor(loc.y + size.height / 2);

            await driver.performActions([{
                type: 'pointer', id: 'finger1',
                parameters: { pointerType: 'touch' },
                actions: [
                    { type: 'pointerMove', duration: 0,   x: tapX, y: tapY },
                    { type: 'pointerDown', button: 0 },
                    { type: 'pause',       duration: 150 },
                    { type: 'pointerUp',   button: 0 }
                ]
            }]);
            await driver.releaseActions();
            await driver.pause(1500);

            // 2. Try to find the option by text (XPath first, then UiSelector)
            let optionFound = false;

            try {
                const item = await driver.$(`//*[@text="${expected}"]`);
                await item.waitForDisplayed({ timeout: 4000 });
                await item.click();
                optionFound = true;
                console.log(`   ✅ Option FOUND & SELECTED via XPath: "${expected}"`);
            } catch (_) {
                try {
                    const item = await driver.$(`android=new UiSelector().text("${expected}")`);
                    await item.waitForDisplayed({ timeout: 3000 });
                    await item.click();
                    optionFound = true;
                    console.log(`   ✅ Option FOUND & SELECTED via UiSelector: "${expected}"`);
                } catch (__) {
                    console.log(`   ❌ Option NOT FOUND in dropdown: "${expected}"`);
                    // Dismiss the open dropdown before continuing
                    await driver.back();
                    await driver.pause(600);
                }
            }

            await driver.pause(800);

            // 3. If option was selected, read back the displayed value to confirm
            if (optionFound) {
                try {
                    const spinnerAfter    = await driver.$(spinnerSelector);
                    const displayedText   = await spinnerAfter.getText();
                    const verified        = displayedText.includes(expected);
                    verificationResults.push({ option: expected, found: true, verified });
                    if (verified) {
                        console.log(`   ✅ VERIFIED in field: "${expected}" shown correctly.`);
                    } else {
                        console.log(`   ❌ MISMATCH: expected "${expected}" but field shows "${displayedText}"`);
                    }
                } catch (readErr) {
                    verificationResults.push({ option: expected, found: true, verified: false });
                    console.log(`   ⚠️  Could not read back spinner value: ${readErr.message}`);
                }
            } else {
                verificationResults.push({ option: expected, found: false, verified: false });
            }

        } catch (err) {
            console.log(`   ❌ Error while checking option "${expected}": ${err.message}`);
            verificationResults.push({ option: expected, found: false, verified: false });
        }
    }

    // ── Exit without submitting — press back twice to leave the form ────────
    console.log("\n🔙 Exiting verification form without submitting...");
    await driver.back();
    await driver.pause(800);

    // Dismiss "discard changes?" dialog if it appears
    try {
        const discardBtn = await driver.$('android=new UiSelector().text("Discard")');
        if (await discardBtn.isExisting()) {
            await discardBtn.click();
            console.log("✅ Dismissed 'Discard changes' dialog.");
            await driver.pause(800);
        }
    } catch (_) {}

    // One more back to return to the household list
    try {
        await driver.back();
        await driver.pause(1000);
    } catch (_) {}

    return verificationResults;
}

// ==========================================
// MAIN
// ==========================================

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

    let manStatusPresent   = false;
    let womanStatusPresent = false;
    let manData, manMaritalStatus, manAge;
    let womanData, womanMaritalStatus, womanAge;
    let dropdownVerificationResults = [];

    try {
        // ── Login & village selection ──────────────────────────────────────
        await selectLanguage(driver, "English");
        await login(driver, "Bobita", "Test@123");
        await driver.pause(5000);
        await selectVillage(driver, "Oating");
        await driver.pause(2000);

        // ================================================================
        // REGISTRATION 1: MAN (any age)
        // ================================================================
        console.log("\n==========================================");
        console.log("▶️ STARTING REGISTRATION 1: MAN");
        console.log("==========================================");

        await clickAllHousehold(driver);
        await clickNewHouseholdRegistration(driver);
        await acceptConsent(driver);

        manData          = generateRandomMan();
        manMaritalStatus = generateRandomMaritalStatus();
        manAge           = generateRandomAge();
        console.log(`🎲 Man Profile: ${manData.firstName} ${manData.lastName} [${manMaritalStatus}] Age: ${manAge}`);

        await fillHouseholdFormWithExamples(driver, { firstName: manData.firstName, lastName: manData.lastName });
        await driver.pause(3000);

        manStatusPresent = await fillHeadOfFamilyFormWithExamples(driver, manMaritalStatus, "Male", manAge);

        console.log("🎉 Man Registration completed!");
        await driver.pause(4000);

        // ================================================================
        // REGISTRATION 2: WOMAN (age below 40)
        // ================================================================
        console.log("\n==========================================");
        console.log("▶️ STARTING REGISTRATION 2: WOMAN");
        console.log("==========================================");

        await clickAllHousehold(driver);
        await clickNewHouseholdRegistration(driver);
        await acceptConsent(driver);

        womanData          = generateRandomWoman();
        womanMaritalStatus = 'Married';
        womanAge           = generateRandomAgeBelow40();
        console.log(`🎲 Woman Profile: ${womanData.firstName} ${womanData.lastName} [Married] Age: ${womanAge}`);

        await fillHouseholdFormWithExamples(driver, { firstName: womanData.firstName, lastName: womanData.lastName });
        await driver.pause(3000);

        womanStatusPresent = await fillHeadOfFamilyFormWithExamples(driver, womanMaritalStatus, "Female", womanAge);

        console.log("🎉 Woman Registration completed!");
        await driver.pause(4000);

        // ================================================================
        // VERIFY STATUS OF WOMEN DROPDOWN OPTIONS
        // This runs BEFORE any submission — opens a fresh form, navigates
        // to the "Status of Women" spinner, checks all 4 options, then
        // exits WITHOUT submitting.
        // Only runs when the woman's age is in the 15–49 range.
        // ================================================================
        if (womanAge >= 15 && womanAge <= 49) {
            dropdownVerificationResults = await verifyStatusOfWomenDropdownOptions(driver);
            await driver.pause(2000);
        } else {
            console.log(`\n⚠️  Skipping dropdown verification — woman age ${womanAge} is outside 15–49 range.`);
        }

        // ================================================================
        // SUMMARY
        // ================================================================
        console.log("\n📋 ================= SUMMARY =================");

        console.log(`👨 First Registration (Man)   : ${manData.firstName} ${manData.lastName} [${manMaritalStatus}] Age: ${manAge}`);
        if (!manStatusPresent) {
            console.log("   -> ✅ CORRECT: 'Status of Women' field was NOT shown for Male beneficiary.");
        } else {
            console.log("   -> ❌ BUG: 'Status of Women' field WAS shown for Male beneficiary!");
        }

        console.log(`👩 Second Registration (Woman): ${womanData.firstName} ${womanData.lastName} [${womanMaritalStatus}] Age: ${womanAge}`);
        if (womanStatusPresent) {
            console.log("   -> ✅ CORRECT: 'Status of Women' field WAS shown for Female beneficiary.");
        } else {
            console.log("   -> ❌ BUG: 'Status of Women' field was NOT shown for Female beneficiary!");
        }

        if (dropdownVerificationResults.length > 0) {
            console.log("\n📋 Dropdown Option Verification Results:");
            for (const result of dropdownVerificationResults) {
                if (result.verified) {
                    console.log(`   ✅ "${result.option}" — Found & verified in field.`);
                } else if (result.found) {
                    console.log(`   ⚠️  "${result.option}" — Found in list but field read-back mismatched.`);
                } else {
                    console.log(`   ❌ "${result.option}" — NOT found in dropdown list!`);
                }
            }
        }

        console.log("==============================================\n");
        console.log("\n✅ All registrations and verifications completed successfully!");

    } catch (error) {
        console.error("❌ Test failed:", error);
        try {
            const screenshot = await driver.takeScreenshot();
            const fs = require('fs');
            fs.writeFileSync(`error-dual-reg-status-women-${Date.now()}.png`, screenshot, 'base64');
            console.log("📸 Screenshot saved for debugging.");
        } catch (screenshotError) {
            console.error("Could not take screenshot:", screenshotError);
        }
    } finally {
        await driver.pause(5000);
        if (driver) {
            await driver.deleteSession();
        }
    }
}

main().catch(err => {
    console.error("❌ Main function failed:", err);
});