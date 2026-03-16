const { remote } = require('webdriverio');
const { formRegistration } = require("./familyForm"); // FIXED IMPORT

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
        console.log(`✅ Successfully clicked the '${cardText.replace('\n', ' ')}' card.`);
    } catch (error) {
        console.error(`❌ Failed to click the '${cardText.replace('\n', ' ')}' card. Error: ${error.message}`);
        throw error;
    }
}

async function searchAndAddMember(driver, searchName) {
    try {
        console.log(`🔍 Waiting for the search bar to load...`);

        const searchBarXPath = '//android.widget.EditText[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/searchView"]';
        const searchBar = await driver.$(searchBarXPath);
        await searchBar.waitForDisplayed({ timeout: 10000 });

        await searchBar.click();
        await driver.pause(1000);

        console.log(`⌨️ Typing "${searchName}" into the search bar...`);
        await driver.keys([...searchName]);

        // Close the keyboard so it doesn't block the screen
        console.log(`⌨️ Hiding the keyboard...`);
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }

        // Wait for the app's RecyclerView to filter the results
        await driver.pause(2000);

        const formattedName = searchName.toUpperCase();
        const addMemberBtnXPath = `//android.widget.TextView[@text="${formattedName}"]/ancestor::android.widget.FrameLayout[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/parentCard"]//android.widget.Button[@text="Add Member"]`;
        const addMemberButton = await driver.$(addMemberBtnXPath);

        await addMemberButton.waitForDisplayed({ timeout: 10000 });
        await addMemberButton.click();

        console.log(`✅ Successfully clicked "Add Member" for ${formattedName}.`);

    } catch (error) {
        console.error(`❌ Failed during search or click process for Add Member. Error: ${error.message}`);
        throw error;
    }
}

async function selectGender(driver, genderInput) {
    try {
        const formattedGender = genderInput.charAt(0).toUpperCase() + genderInput.slice(1).toLowerCase();
        console.log(`⏳ Waiting for the gender selection dialog to appear...`);

        const genderRadioButtonXPath = `//android.widget.RadioButton[@text="${formattedGender}"]`;
        const genderRadioButton = await driver.$(genderRadioButtonXPath);

        await genderRadioButton.waitForDisplayed({ timeout: 10000 });
        await genderRadioButton.click();

        console.log(`✅ Successfully selected "${formattedGender}".`);
    } catch (error) {
        console.error(`❌ Failed to select the "${genderInput}" gender option. Error: ${error.message}`);
        throw error;
    }
}

async function tapByCoordinates(driver, x, y) {
    try {
        await driver.action('pointer')
            .move({ duration: 0, x: x, y: y })
            .down({ button: 0 })
            .pause(50)
            .up({ button: 0 })
            .perform();
        console.log(`✅ Tapped at coordinates: (x: ${x}, y: ${y})`);
    } catch (error) {
        console.error(`❌ Failed to tap at coordinates (${x}, ${y}). Error: ${error.message}`);
        throw error;
    }
}

async function selectRelationWithHof(driver, relation, gender = 'male') {
    try {
        console.log(`⏳ Opening the 'Relation with HOF' dropdown...`);

        const dropdownXPath = '//android.widget.Spinner[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/actv_rth"]';
        const dropdownElement = await driver.$(dropdownXPath);
        await dropdownElement.waitForDisplayed({ timeout: 10000 });
        await dropdownElement.click();

        await driver.pause(1500);

        const xCoord = 540;
        let yCoord;
        const relTarget = relation.toLowerCase();
        const genTarget = gender.toLowerCase();

        if (genTarget === 'male' || genTarget === 'transgender') {
            switch (relTarget) {
                case 'father': yCoord = 420; break;
                case 'brother': yCoord = 530; break;
                case 'husband': yCoord = 640; break;
                case 'nephew': yCoord = 750; break;
                case 'son': yCoord = 860; break;
                case 'grand father': yCoord = 970; break;
                case 'father in law': yCoord = 1080; break;
                case 'grand son': yCoord = 1190; break;
                case 'son in law': yCoord = 1300; break;
                case 'other': yCoord = 1410; break;
                default: throw new Error(`Male/Trans relationship '${relation}' not mapped.`);
            }
        } else if (genTarget === 'female') {
            switch (relTarget) {
                case 'mother': yCoord = 420; break;
                case 'sister': yCoord = 530; break;
                case 'niece': yCoord = 640; break;
                case 'daughter': yCoord = 750; break;
                case 'grand mother': yCoord = 860; break;
                case 'mother in law': yCoord = 970; break;
                case 'grand daughter': yCoord = 1080; break;
                case 'daughter in law': yCoord = 1190; break;
                case 'sister in law': yCoord = 1300; break;
                case 'other': yCoord = 1410; break;
                default: throw new Error(`Female relationship '${relation}' not mapped.`);
            }
        } else {
            throw new Error(`Gender '${gender}' coordinate mapping is not set up.`);
        }

        console.log(`Selecting '${relation}' from dropdown at Y: ${yCoord}...`);
        await tapByCoordinates(driver, xCoord, yCoord);

        await driver.pause(1000);

    } catch (error) {
        console.error(`❌ Failed to select relationship. Error: ${error.message}`);
        throw error;
    }
}

async function clickOkButton(driver) {
    try {
        const okBtnXPath = '//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btn_ok"]';
        const okButton = await driver.$(okBtnXPath);

        await okButton.waitForEnabled({ timeout: 5000 });
        await okButton.click();
        console.log(`✅ Clicked the 'Ok' button.`);
    } catch (error) {
        console.error(`❌ Failed to click 'Ok'. Error: ${error.message}`);
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
        console.log("🚀 App launched. Attempting to click All Household...");

        await clickDashboardCard(driver, 'All\nHousehold');
        await searchAndAddMember(driver, 'kavita verma');

        await driver.pause(2000);

        const targetGender = 'male';
        const targetRelation = 'husband';

        await selectGender(driver, targetGender);
        await driver.pause(1000);

        await selectRelationWithHof(driver, targetRelation, targetGender);

        await clickOkButton(driver);
        await driver.pause(2000);

        // HANDOFF TO FAMILY FORM
        await formRegistration(driver);

    } catch (err) {
        console.error("❌ Test execution failed.", err);
    } finally {
        console.log("🧹 Cleaning up and ending session...");
        await driver.pause(3000);
        await driver.deleteSession();
    }
}

runTest();