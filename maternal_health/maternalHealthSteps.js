const { remote } = require('webdriverio');
const{fillPregnancyForm} = require("./pregnancyRegistrationForm");

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true   
};




async function clickMaternalHealth(driver) {
    console.log("Navigating to Maternal Health...");
    
    const maternalHealthBtn = await driver.$('//android.widget.TextView[@text="Maternal Health"]');
    await maternalHealthBtn.waitForDisplayed({ timeout: 10000 });
    await maternalHealthBtn.click();
}

async function clickPregnantWomenRegistration(driver) {
    console.log("Opening Pregnant Women Registration...");
    const pwRegBtn = await driver.$('//android.widget.TextView[@text="Pregnant Women Registration"]');
    await pwRegBtn.waitForDisplayed({ timeout: 10000 });
    await pwRegBtn.click();
}

async function searchName(driver, searchQuery) {
    console.log(`Focusing on search bar to open keyboard...`);
    const searchBar = await driver.$('//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]');
    await searchBar.waitForDisplayed({ timeout: 10000 });

    
    await searchBar.click();

    console.log(`Typing '${searchQuery}'...`);
    
    await searchBar.setValue(searchQuery);

    
    await driver.pause(500);

    console.log("Pressing the 'Enter/Search' key on the keyboard...");
    
    await driver.pressKeyCode(66);
}

async function clickRegister(driver) {
    console.log("Clicking Register button...");
    
    const registerBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_form_ec1"]');
    await registerBtn.waitForDisplayed({ timeout: 10000 });
    await registerBtn.click();
}



async function runTest() {
    let driver;
    try {
        
        driver = await remote({
            protocol: "http",
            hostname: "127.0.0.1",
            port: 4723,
            path: "/", 
            capabilities: capabilities
        });

        
        await clickMaternalHealth(driver);
        await clickPregnantWomenRegistration(driver);
        await searchName(driver, "krishna");
        await clickRegister(driver);
        await fillPregnancyForm(driver); 

        console.log("Test flow completed successfully!");

    } catch (error) {
        console.error("An error occurred during automation:", error);
    } finally {
        if (driver) {
            
            await driver.deleteSession();
        }
    }
}


runTest();