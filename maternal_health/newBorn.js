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
    hostname: process.env.APPIUM_HOST || 'localhost',
    port: parseInt(process.env.APPIUM_PORT, 10) || 4723,
    logLevel: 'error',
    capabilities,
};


async function clickNewbornRegistration(driver) {
    try {
        console.log("⏳ Looking for 'Newborn Registration' icon...");
        const newbornRegElement = await driver.$("//android.widget.TextView[@text='Newborn Registration']");
        await newbornRegElement.waitForDisplayed({ timeout: 5000 });
        await newbornRegElement.click();
        console.log("✅ Successfully clicked on 'Newborn Registration'");
    } catch (error) {
        console.error("❌ Failed to click on 'Newborn Registration':", error.message);
        throw error;
    }
}



async function scrollAndRegisterBaby(driver, targetName) {
    try {
        console.log(`⏳ Scrolling through the list to find '${targetName}'...`);

        
        
        const androidScrollSelector = `new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${targetName}")`;
        const nameElement = await driver.$(`android=${androidScrollSelector}`);

        
        await nameElement.waitForDisplayed({ timeout: 15000 });
        console.log(`✅ Found '${targetName}' on the screen!`);

        console.log(`⏳ Locating the specific REGISTER button for '${targetName}'...`);

        
        const specificRegisterButtonXPath = `//android.view.ViewGroup[.//android.widget.TextView[@text="${targetName}"]]//android.widget.Button[@text="REGISTER"]`;

        const registerButton = await driver.$(specificRegisterButtonXPath);
        await registerButton.waitForDisplayed({ timeout: 5000 });

        
        await registerButton.click();
        console.log(`✅ Successfully clicked the 'REGISTER' button for '${targetName}'`);

    } catch (error) {
        console.error(`❌ Failed during Scroll and Register for '${targetName}':`, error.message);
        throw error;
    }
}

async function selectCorticosteroidInjection(driver, answer) {
    try {
        console.log(`⏳ Selecting '${answer}' for Corticosteroid Injection...`);

        
        
        const radioButtonXPath = `//android.widget.LinearLayout[.//android.widget.TextView[@text="Was Corticosteroid Inj. given?"]]//android.widget.RadioButton[@text="${answer}"]`;

        const radioButton = await driver.$(radioButtonXPath);

        
        await radioButton.waitForDisplayed({ timeout: 5000 });
        await radioButton.click();

        console.log(`✅ Successfully selected '${answer}' for Corticosteroid Injection.`);
    } catch (error) {
        console.error(`❌ Failed to select '${answer}' for Corticosteroid Injection:`, error.message);
        throw error;
    }
}

async function selectInfantSex(driver, sex) {
    try {
        console.log(`⏳ Selecting '${sex}' for Sex of Infant...`);

        
        const radioButtonXPath = `//android.widget.LinearLayout[.//android.widget.TextView[@text="Sex of Infant *"]]//android.widget.RadioButton[@text="${sex}"]`;

        const radioButton = await driver.$(radioButtonXPath);

        
        await radioButton.waitForDisplayed({ timeout: 5000 });
        await radioButton.click();

        console.log(`✅ Successfully selected '${sex}' for Sex of Infant.`);
    } catch (error) {
        console.error(`❌ Failed to select '${sex}' for Sex of Infant:`, error.message);
        throw error;
    }
}

async function selectBabyCried(driver, answer) {
    try {
        console.log(`⏳ Selecting '${answer}' for Baby Cried Immediately after Birth...`);

        
        const radioButtonXPath = `//android.widget.LinearLayout[.//android.widget.TextView[@text="Baby Cried Immediately after Birth"]]//android.widget.RadioButton[@text="${answer}"]`;

        const radioButton = await driver.$(radioButtonXPath);

        
        await radioButton.waitForDisplayed({ timeout: 5000 });
        await radioButton.click();

        console.log(`✅ Successfully selected '${answer}' for Baby Cried Immediately after Birth.`);
    } catch (error) {
        console.error(`❌ Failed to select '${answer}' for Baby Cried Immediately after Birth:`, error.message);
        throw error;
    }
}

async function selectResuscitationDone(driver, answer) {
    try {
        console.log(`⏳ Selecting '${answer}' for Resuscitation Done...`);

        
        const radioButtonXPath = `//android.widget.LinearLayout[.//android.widget.TextView[@text="If No, Resuscitation Done *"]]//android.widget.RadioButton[@text="${answer}"]`;

        const radioButton = await driver.$(radioButtonXPath);

        
        await radioButton.waitForDisplayed({ timeout: 5000 });
        await radioButton.click();

        console.log(`✅ Successfully selected '${answer}' for Resuscitation Done.`);
    } catch (error) {
        console.error(`❌ Failed to select '${answer}' for Resuscitation Done:`, error.message);
        throw error;
    }
}

async function selectBirthDefect(driver, answer) {
    try {
        console.log(`⏳ Selecting '${answer}' for Any birth defect seen in at birth...`);

        
        const radioButtonXPath = `//android.widget.LinearLayout[.//android.widget.TextView[@text="Any birth defect seen in at birth?"]]//android.widget.RadioButton[@text="${answer}"]`;

        const radioButton = await driver.$(radioButtonXPath);

        
        await radioButton.waitForDisplayed({ timeout: 5000 });
        await radioButton.click();

        console.log(`✅ Successfully selected '${answer}' for Any birth defect seen in at birth.`);
    } catch (error) {
        console.error(`❌ Failed to select '${answer}' for Any birth defect seen in at birth:`, error.message);
        throw error;
    }
}

async function selectDefectByCoordinates(driver, defectName) {
    
    
    const coordinatesMap = {
        "Cleft Lip / Cleft Palate": { x: 540, y: 1550 },
        "Club Foot": { x: 540, y: 1650 },
        "Down's Syndrome": { x: 540, y: 1750 },
        "Hydrocephalus": { x: 540, y: 1850 },
        "Imperforate Anus": { x: 540, y: 1950 },
        "Neural Tube Defect (Spinal Bifida)": { x: 540, y: 2050 },
        "Other": { x: 540, y: 2150 }
    };

    try {
        
        if (!coordinatesMap[defectName]) {
            throw new Error(`Defect '${defectName}' not found in the coordinates map.`);
        }

        const targetCoords = coordinatesMap[defectName];
        console.log(`⏳ Opening the 'Defect seen at birth' dropdown...`);

        
        const dropdownIcon = await driver.$('//android.widget.ImageButton[@content-desc="Show dropdown menu"]');
        await dropdownIcon.waitForDisplayed({ timeout: 5000 });
        await dropdownIcon.click();

        console.log(`⏳ Waiting for dropdown menu to appear...`);
        await driver.pause(1500); 

        console.log(`👇 Tapping '${defectName}' at coordinates (X: ${targetCoords.x}, Y: ${targetCoords.y})...`);

        
        await driver.action('pointer')
            .move({ x: targetCoords.x, y: targetCoords.y })
            .down()
            .pause(100) 
            .up()
            .perform();

        console.log(`✅ Successfully selected '${defectName}'.`);
    } catch (error) {
        console.error(`❌ Failed to select defect using coordinates:`, error.message);
        throw error;
    }
}
async function runTest() {
    let driver;
    try {
        console.log("🚀 Starting Test Flow...");
        driver = await remote(wdOpts);

        
        await clickNewbornRegistration(driver);
        await driver.pause(3000);
        await scrollAndRegisterBaby(driver, "1st baby of KULSUMA");

        
        await selectCorticosteroidInjection(driver, "Yes");
        await selectInfantSex(driver, "Female");

        
        const didBabyCry = "No";
        await selectBabyCried(driver, didBabyCry);
        if (didBabyCry === "No") {
            await selectResuscitationDone(driver, "Yes");
        }

        
        await selectBirthDefect(driver, "No"); 

        await driver.pause(3000);
        console.log("🎉 Test Flow Completed Successfully!");
        await selectDefectByCoordinates(driver, "Hydrocephalus");
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