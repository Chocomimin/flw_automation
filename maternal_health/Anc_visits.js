const { remote } = require('webdriverio');
const { fillAncForm } = require("./ancVisitForm");
const{fillMdsrForm}=require("./Mdsr");

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true
};


async function clickDashboardCard(driver, cardText) {
    const cardXPath = `//android.widget.TextView[@text="${cardText}"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_icon"]`;
    const cardElement = await driver.$(cardXPath);

    try {
        await cardElement.waitForDisplayed({ timeout: 10000 });
        await cardElement.click();
        console.log(`✅ Successfully clicked the '${cardText}' card.`);
    } catch (error) {
        console.error(`❌ Failed to click the '${cardText}' card. Error: ${error.message}`);
        throw error;
    }
}


async function searchAndAddAncVisit(driver, searchName) {
    try {
        console.log(`Waiting for the search bar to load...`);

        
        const searchBar = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
        await searchBar.waitForDisplayed({ timeout: 10000 });

        
        await searchBar.click();
        await driver.pause(1000); 

        
        console.log(`⌨️ Typing "${searchName}" using the keyboard...`);

        
        await driver.keys([...searchName]);

        
        await driver.pause(2000);

        
        const specificAddAncButtonXPath = `//android.widget.TextView[@text="${searchName}"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/cv_content"]//android.widget.Button[@text="ADD ANC VISIT"]`;
        const addAncButton = await driver.$(specificAddAncButtonXPath);

        
        await addAncButton.waitForDisplayed({ timeout: 10000 });
        await addAncButton.click();

        console.log(`✅ Successfully clicked "ADD ANC VISIT" for ${searchName}.`);

    } catch (error) {
        console.error(`❌ Failed during search or click process. Error: ${error.message}`);
        throw error;
    }
}


async function runTest() {
    
    const driver = await remote({
        path: '/', 
        port: 4723,
        capabilities: capabilities
    });

    try {
        console.log("App launched. Attempting to click ANC Visits...");

        
        await clickDashboardCard(driver, 'ANC Visits');

        
        await driver.pause(2000);

        
        await searchAndAddAncVisit(driver, 'SWEETY KARMAKAR');
        await fillAncForm(driver); 
        await fillMdsrForm(driver); 
    } catch (err) {
        console.error("Test execution failed.", err);
    } finally {
        
        await driver.pause(3000);
        await driver.deleteSession();
    }
}


runTest();