const { remote } = require('webdriverio');
const { selectLanguage, login } = require('../steps/loginSteps');
const { selectVillage } = require('../steps/villageSteps');

function getTestInputs() {
    return {
        targetName: "Jina Singh",
        mobileNumber: "9391345768"
    };
}

async function tapByCoords(driver, tapX, tapY) {
    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: tapX, y: tapY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 150 },
            { type: 'pointerUp',   button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(500);
}

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList) {
    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();

    // Tap the dropdown menu icon on the right edge
    const arrowX = Math.floor(loc.x + size.width - 40);
    const arrowY = Math.floor(loc.y + size.height / 2);
    await tapByCoords(driver, arrowX, arrowY);
    await driver.pause(2000);

    // Strategy 0: Direct XPath
    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`✅ Selected "${value}" via XPath`);
        return;
    } catch (e) {}

    // Strategy 1: UiSelector
    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via UiSelector`);
        return;
    } catch (e) {}

    // Strategy 2: Tag Parse Fallback
    try {
        const source = await driver.getPageSource();
        const nodes = source.match(/<[^>]+>/g) || [];
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const textRegex = new RegExp(`(?:text|content-desc)="\\s*${escapedValue}\\s*"`);
        let foundNode = null;

        for (const node of nodes) {
            if (textRegex.test(node) && node.includes('bounds=')) {
                foundNode = node;
                break;
            }
        }

        if (foundNode) {
            const boundsMatch = foundNode.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
            if (boundsMatch) {
                const tapX = Math.floor((parseInt(boundsMatch[1]) + parseInt(boundsMatch[3])) / 2);
                const tapY = Math.floor((parseInt(boundsMatch[2]) + parseInt(boundsMatch[4])) / 2);
                await tapByCoords(driver, tapX, tapY);
                console.log(`✅ Selected "${value}" via tag parse`);
                return;
            }
        }
    } catch (e) {}

    // Strategy 3: Coordinate Fallback calculation
    const screen = await driver.getWindowRect();
    const idx = optionsList.indexOf(value);
    if (idx === -1) throw new Error(`"${value}" not in list options`);

    const rowHeight = size.height;
    const spinnerBottom = loc.y + size.height;
    const opensUpward = (screen.height - spinnerBottom) < (optionsList.length * rowHeight);
    const finalTapX = Math.floor(loc.x + size.width / 2);
    let finalTapY;

    if (opensUpward) {
        const reversedIdx = (optionsList.length - 1) - idx;
        finalTapY = Math.floor(loc.y - (reversedIdx * rowHeight) - (rowHeight / 2));
    } else {
        finalTapY = Math.floor(spinnerBottom + (idx * rowHeight) + (rowHeight / 2));
    }
    finalTapY = Math.max(5, Math.min(finalTapY, screen.height - 5));

    await tapByCoords(driver, finalTapX, finalTapY);
    console.log(`✅ Selected "${value}" via coordinates fallback`);
}

// ─────────────────────────────────────────────────────────────
//  MAIN EXECUTION ROUTINE
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
        // --- 1. APP LOGIN & SETUP ---
        const myPreferredLanguage = "English";
        await selectLanguage(driver, myPreferredLanguage);

        await login(driver, "Bobita", "Test@123");
        await driver.pause(5000);

        if (typeof selectVillage !== "function") {
            throw new Error("selectVillage is not available from steps/villageSteps");
        }

        await selectVillage(driver, "Oating");
        await driver.pause(2000);

        // --- 2. ABHA VERIFICATION WORKFLOW ---
        const testData = getTestInputs();
        console.log('🚀 Starting ABHA verification test cases...');

        // Click on All Beneficiaries card panel
        console.log('⏳ Waiting for Home Dashboard Screen...');
        const allBenCard = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/cv_icon").instance(1)');
        await allBenCard.waitForDisplayed({ timeout: 15000 });
        await allBenCard.click();
        console.log('✅ Clicked on All Beneficiaries card');
        await driver.pause(1500);

        // Search name from the view's search bar field
        const searchView = await driver.$('id=org.piramalswasthya.sakhi.saksham.uat:id/searchView');
        await searchView.waitForDisplayed({ timeout: 10000 });
        await searchView.click();
        await driver.pause(500);

        // Split the name and type only the first name to bypass app space-bug
        const searchKeyword = testData.targetName.split(' ')[0];
        await driver.keys([...searchKeyword]);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        console.log(`✅ Searched using partial name: "${searchKeyword}"`);
        await driver.pause(2000);

        // Click on ABHA Button inside the row layout container view
        const formattedName = testData.targetName.toUpperCase();
        const abhaBtn = await driver.$(
            `//android.widget.TextView[@text="${formattedName}"]/ancestor::android.view.ViewGroup[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/contentLayout"]//android.widget.Button[@text="ABHA"]`
        );

        // Fallback to generic ID if the specific one isn't found
        if (!(await abhaBtn.isExisting())) {
            const genericAbhaBtn = await driver.$('id=org.piramalswasthya.sakhi.saksham.uat:id/btn_abha');
            await genericAbhaBtn.click();
        } else {
            await abhaBtn.click();
        }
        console.log(`✅ Clicked on ABHA registration trigger button for ${formattedName}`);

        // Wait for 20 seconds to load initial setup views securely
        console.log('⏳ Waiting for 20 seconds (20,000ms) to ensure initialization rules process...');
        await driver.pause(20000);

        // Click on Search ABHA tab toggle
        const searchAbhaToggle = await driver.$('id=org.piramalswasthya.sakhi.saksham.uat:id/searchToggle');
        await searchAbhaToggle.waitForDisplayed({ timeout: 10000 });
        await searchAbhaToggle.click();
        console.log('✅ Switched to Search ABHA view mode');
        await driver.pause(1000);

        // Enter the target Mobile Number string
        const mobileInput = await driver.$('id=org.piramalswasthya.sakhi.saksham.uat:id/tiet_mobile_number');
        await mobileInput.waitForDisplayed({ timeout: 10000 });
        await mobileInput.click();
        await mobileInput.setValue(testData.mobileNumber);
        if (await driver.isKeyboardShown()) await driver.hideKeyboard();
        console.log(`✅ Input Mobile Number parameter value: ${testData.mobileNumber}`);
        await driver.pause(1000);

        // Click on Search validation execution button
        const searchActionBtn = await driver.$('id=org.piramalswasthya.sakhi.saksham.uat:id/btn_search_abha');
        await searchActionBtn.waitForEnabled({ timeout: 10000 });
        await searchActionBtn.click();
        console.log('✅ Clicked on Search button');
        await driver.pause(3000);

        // Select Name option value context choice from floating dropdown listspinner
        const selectNameSpinner = 'id=org.piramalswasthya.sakhi.saksham.uat:id/abha_dropdown';
        await clickSpinnerAndSelectOption(driver, selectNameSpinner, formattedName, [formattedName]);
        await driver.pause(1500);

        // Click on Disclaimer confirmation Consent Checkbox
        const consentCheckbox = await driver.$('id=org.piramalswasthya.sakhi.saksham.uat:id/aadharConsentCheckBox');
        await consentCheckbox.waitForDisplayed({ timeout: 10000 });
        await consentCheckbox.click();
        console.log('✅ Checked consent verification option box');
        await driver.pause(1000);

        // Click on Send OTP trigger switch button
        const sendOtpBtn = await driver.$('id=org.piramalswasthya.sakhi.saksham.uat:id/btn_generate_otp');
        await sendOtpBtn.waitForEnabled({ timeout: 10000 });
        await sendOtpBtn.click();
        console.log('✅ Clicked Send OTP validation process option');

        // Wait for 20 seconds for secure operational network dispatching delivery
        console.log('⏳ Waiting for 20 seconds (20,000ms) for secure OTP generation transmission...');
        await driver.pause(20000);

        // Manual OTP Entry & Verification
        console.log('⏳ Please enter the OTP manually on the device...');
        console.log('⏳ Script will wait up to 60 seconds for you to enter it.');

        const verifyOtpBtn = await driver.$('id=org.piramalswasthya.sakhi.saksham.uat:id/btn_verify_OTP');
        await verifyOtpBtn.waitForEnabled({ timeout: 60000 });
        await verifyOtpBtn.click();
        console.log('✅ Clicked "Verify OTP" successfully!');

        // Handle ABHA Card Download Prompt
        console.log('⏳ Waiting for ABHA creation confirmation and download prompt...');
        const downloadYesBtn = await driver.$('id=org.piramalswasthya.sakhi.saksham.uat:id/btn_download_abha_yes');
        await downloadYesBtn.waitForDisplayed({ timeout: 30000 });
        await downloadYesBtn.click();
        console.log('✅ Clicked "Yes" to download the ABHA card successfully!');

        await driver.pause(5000);
        console.log('🎉 Workflow execution processing iteration loops ran safely!');

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
        console.log('🧹 Closing active sessions...');
        await driver.pause(5000);
        await driver.deleteSession();
    }
}

// Start the script
main().catch(err => {
    console.error("❌ Main function failed:", err);
});