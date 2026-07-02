const { remote } = require('webdriverio');

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true
};
    
async function clickAllBeneficiaries(driver) {
    console.log("👆 Clicking on All Beneficiaries...");
    const allBeneficiariesBtn = await driver.$('//android.widget.TextView[@text="All\nBeneficiaries"]');
    await allBeneficiariesBtn.waitForDisplayed({ timeout: 5000 });
    await allBeneficiariesBtn.click();
    console.log("✅ Successfully clicked All Beneficiaries");
}

async function searchBeneficiary(driver, searchText, exactName) {
    console.log(`🔍 Searching for: "${searchText}"...`);

    const searchInput = await driver.$('id:org.piramalswasthya.sakhi.saksham.uat:id/searchView');
    await searchInput.waitForDisplayed({ timeout: 5000 });
    await searchInput.click();
    await searchInput.setValue(searchText);
    console.log(`✍️ Typed text: ${searchText}`);

    console.log("⌨️ Hiding the keyboard...");
    const isKeyboardOpen = await driver.isKeyboardShown();
    if (isKeyboardOpen) {
        await driver.hideKeyboard();
    }

    await driver.pause(1000);

    // CHANGED: Using exact match [@text="..."] instead of contains()
    console.log(`👆 Clicking on exact beneficiary record for "${exactName}"...`);
    const beneficiaryRecord = await driver.$(`//android.widget.TextView[@text="${exactName}"]`);
    await beneficiaryRecord.waitForDisplayed({ timeout: 5000 });
    await beneficiaryRecord.click();

    console.log(`✅ Successfully selected ${exactName}!`);
}

async function main() {

    const driver = await remote({
            path: '/',
            port: 4723,
            capabilities: capabilities
    });


    console.log("✅ App launched successfully!");

    try {

        await clickAllBeneficiaries(driver);
        await driver.pause(2000);

        await searchBeneficiary(driver, "RADHIKA", "RADHIKA SAH");
        await driver.pause(3000);
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
        await driver.deleteSession();
    }
}

main().catch(err => {
    console.error("❌ Main function failed:", err);
});
