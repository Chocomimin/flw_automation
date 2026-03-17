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

const wdOpts = {
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities: capabilities,
    logLevel: 'error'
};

async function clickChildRegistration(driver) {
    try {
        console.log("⏳ Looking for 'Child Registration' icon...");

        const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Child Registration"))`;
        await driver.$(`android=${scrollable}`).catch(() => {});
        await driver.pause(1000);

        const childRegText = await driver.$('//android.widget.TextView[@text="Child Registration"]');
        await childRegText.waitForDisplayed({ timeout: 5000 });
        await childRegText.click();

        console.log("✅ Successfully clicked on 'Child Registration'!");
        await driver.pause(2000);

    } catch (error) {
        console.error(`❌ Failed to click on 'Child Registration':`, error.message);
        throw error;
    }
}

async function searchAndClickRegister(driver, childName) {
    try {
        console.log(`\n🔍 Searching for '${childName}'...`);

        const searchInput = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/searchView")');
        await searchInput.waitForDisplayed({ timeout: 5000 });
        await searchInput.click();
        await searchInput.clearValue();

        // Simulate typing and hitting "Enter/Search"
        await searchInput.setValue(childName + '\n');
        await driver.pause(3000);

        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }

        const nameElement = await driver.$(`android=new UiSelector().text("${childName}")`);
        await nameElement.waitForDisplayed({ timeout: 10000 });
        console.log(`✅ Found '${childName}' in the filtered list!`);

        console.log(`⏳ Locating the REGISTER button for '${childName}'...`);
        const specificRegisterButtonXPath = `//android.view.ViewGroup[.//android.widget.TextView[@text="${childName}"]]//android.widget.Button[@text="REGISTER"]`;
        const registerButton = await driver.$(specificRegisterButtonXPath);

        await registerButton.waitForDisplayed({ timeout: 5000 });
        await registerButton.click();
        console.log(`✅ Successfully clicked the 'REGISTER' button!`);

        await driver.pause(3000);

    } catch (error) {
        console.error(`❌ Failed to search and register '${childName}':`, error.message);
        throw error;
    }
}

async function fillChildRchId(driver, rchIdNumber) {
    try {
        console.log(`\n✍️ Filling RCH ID No. of Child with '${rchIdNumber}'...`);

        // Locate the Child's RCH ID input field using its exact text from the XML
        const childRchIdInput = await driver.$(`//android.widget.EditText[@text="RCH ID No. of Child"]`);

        await childRchIdInput.waitForDisplayed({ timeout: 5000 });
        await childRchIdInput.click();
        await childRchIdInput.clearValue();
        await childRchIdInput.setValue(rchIdNumber);

        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }

        console.log(`✅ Successfully filled RCH ID No. of Child with '${rchIdNumber}'!`);

    } catch (error) {
        console.error(`❌ Failed to fill RCH ID No. of Child:`, error.message);
        throw error;
    }
}

async function fillBirthCertificateNumber(driver, certNumber) {
    try {
        console.log(`\n✍️ Filling Birth Certificate Number with '${certNumber}'...`);

        const birthCertInput = await driver.$(`//android.widget.EditText[@text="Birth Certificate Number"]`);
        await birthCertInput.waitForDisplayed({ timeout: 5000 });
        await birthCertInput.click();
        await birthCertInput.clearValue();
        await birthCertInput.setValue(certNumber);

        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }

        console.log(`✅ Successfully filled Birth Certificate Number with '${certNumber}'!`);

    } catch (error) {
        console.error(`❌ Failed to fill Birth Certificate Number:`, error.message);
        throw error;
    }
}

async function uploadFrontAndBackImages(driver) {
    try {
        console.log(`\n📜 Scrolling down to find 'Front Side'...`);

        const scrollFront = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Front Side"))`;
        await driver.$(`android=${scrollFront}`).catch(() => {});
        await driver.pause(1000);

        console.log(`📸 Starting Front Side image upload...`);

        const frontSideAddBtn = await driver.$(`//android.view.ViewGroup[.//android.widget.TextView[@text="Front Side"]]//android.widget.ImageView[@content-desc="add file"]`);
        await frontSideAddBtn.waitForDisplayed({ timeout: 5000 });
        await frontSideAddBtn.click();

        const pickFromGallery = await driver.$(`//*[@text="Pick from gallery" or @text="Pick from Gallery"]`);
        await pickFromGallery.waitForDisplayed({ timeout: 5000 });
        await pickFromGallery.click();

        console.log(`⏳ Waiting 20 seconds for Front Side upload...`);
        await driver.pause(20000);

        console.log(`\n📜 Scrolling down to find 'Back Side'...`);

        const scrollBack = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Back Side"))`;
        await driver.$(`android=${scrollBack}`).catch(() => {});
        await driver.pause(1000);

        console.log(`📸 Starting Back Side image upload...`);

        const backSideAddBtn = await driver.$(`//android.view.ViewGroup[.//android.widget.TextView[@text="Back Side"]]//android.widget.ImageView[@content-desc="add file"]`);
        await backSideAddBtn.waitForDisplayed({ timeout: 5000 });
        await backSideAddBtn.click();

        const pickFromGalleryBack = await driver.$(`//*[@text="Pick from gallery" or @text="Pick from Gallery"]`);
        await pickFromGalleryBack.waitForDisplayed({ timeout: 5000 });
        await pickFromGalleryBack.click();

        console.log(`⏳ Waiting 20 seconds for Back Side upload...`);
        await driver.pause(20000);

        console.log(`✅ Front and Back Side image uploads processed successfully!`);

    } catch (error) {
        console.error(`❌ Failed during image upload:`, error.message);
        throw error;
    }
}

async function runTest() {
    let driver;
    try {
        console.log("🚀 Starting Test Flow...");
        driver = await remote(wdOpts);

        await clickChildRegistration(driver);
        await searchAndClickRegister(driver, "baby of PRIYA");

        // Updated sequence
        await fillChildRchId(driver, "987654321098");
        await fillBirthCertificateNumber(driver, "B-2026-9876543");
        await uploadFrontAndBackImages(driver);

        console.log("🎉 Test Flow Completed Successfully!");

    } catch (error) {
        console.error("🛑 Test execution stopped due to an error:", error.message);
    } finally {
        if (driver) {
            await driver.deleteSession();
            console.log("🔌 Appium session closed.");
        }
    }
}

runTest();