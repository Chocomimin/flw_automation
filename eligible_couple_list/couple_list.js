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

const wdioOptions = {
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities: capabilities,
    logLevel: 'error'
};

const formData = {
    rchId: '919751675533', // Kavita's Beneficiary ID
    lmpDate: '15-01-2026', // A realistic recent LMP date
    nayiPahalKit: 'Yes',
    noOfDeliveriesMoreThan3: 'No', // At 22, this is likely a 1st or 2nd pregnancy
    timeFromLastDeliveryLess18: 'No',
    heightShortLess140: 'No',
    ageLess18OrMore35: 'No', // She is exactly 22, so this is 'No'
    miscarriageAbortion: 'No',
    homeDelivery: 'No',
    medicalIssuesDuringPregnancy: 'No',
    pastCSection: 'No',
};

async function clickEligibleCoupleList(driver) {
    console.log("👆 Clicking Eligible Couple List...");
    const el = await driver.$(
        'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/textView2").textContains("Eligible")'
    );
    await el.waitForDisplayed({ timeout: 20000 });
    await el.click();
    await driver.pause(3000);
    console.log("✅ Clicked Eligible Couple List");
}

async function clickEligibleCoupleRegistration(driver) {
    console.log("👆 Clicking Eligible Couple Registration...");
    const el = await driver.$('android=new UiSelector().text("Eligible Couple Registration")');
    await el.waitForDisplayed({ timeout: 20000 });
    await el.click();
    await driver.pause(4000);
    console.log("✅ Clicked Eligible Couple Registration");
}

async function scrollToNameAndClickCard(driver, name) {
    console.log(`\n🔄 Scrolling to find "${name}"...`);
    let found = false;

    // 1. First attempt: Scroll to find the name
    try {
        await driver.$(
            `android=new UiScrollable(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/rv_any"))` +
            `.setMaxSearchSwipes(15).scrollIntoView(new UiSelector().textContains("${name}"))`
        );
    } catch {
        try {
            await driver.$(
                `android=new UiScrollable(new UiSelector().scrollable(true))` +
                `.setMaxSearchSwipes(15).scrollIntoView(new UiSelector().textContains("${name}"))`
            );
        } catch {}
    }

    await driver.pause(1000);
    const nameEl = await driver.$(`android=new UiSelector().textContains("${name}")`);

    try {
        found = await nameEl.isDisplayed();
    } catch (e) {
        found = false;
    }

    // 2. Fallback: If scrolling failed, use the Search Bar & Button
    if (!found) {
        console.log(`⚠️ "${name}" not found via scrolling. Falling back to search bar...`);

        try {
            const searchInput = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/searchView")');
            await searchInput.waitForDisplayed({ timeout: 5000 });
            await searchInput.click();
            await searchInput.clearValue();

            // Type just the first part of the name to be safe
            const firstName = name.split(" ")[0];
            await searchInput.setValue(firstName);

            if (await driver.isKeyboardShown()) {
                await driver.hideKeyboard();
            }

            // Click the search/microphone icon next to the text box
            console.log(`👆 Clicking search icon for "${firstName}"...`);
            const searchBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/ib_search")');
            await searchBtn.click();

            await driver.pause(3000); // Give the list time to filter
        } catch (searchErr) {
            console.log("❌ Search bar fallback failed:", searchErr.message);
        }
    }

    // 3. Ensure the element is now visible and click it
    await nameEl.waitForDisplayed({ timeout: 10000 });
    console.log(`✅ "${name}" visible — clicking...`);

    let clicked = false;
    const xpaths = [
        `//android.widget.TextView[contains(@text,"${name}")]/../..//android.widget.Button`,
        `//android.widget.TextView[contains(@text,"${name}")]/../../..//android.widget.Button`,
        `//android.widget.TextView[contains(@text,"${name}")]/../..//android.widget.ImageButton`,
        `//android.widget.TextView[contains(@text,"${name}")]/../../..//*[@clickable="true"]`,
        `//android.widget.TextView[contains(@text,"${name}")]/..//*[@clickable="true"]`,
    ];

    for (const xpath of xpaths) {
        try {
            const btn = await driver.$(xpath);
            const visible = await btn.isDisplayed().catch(() => false);
            if (visible) {
                await btn.click();
                clicked = true;
                console.log("✅ Clicked Register via XPath");
                break;
            }
        } catch {}
    }

    if (!clicked) {
        await nameEl.click();
        console.log(`✅ Clicked "${name}" card row`);
    }

    await driver.pause(3000);
}

async function scrollFormToTop(driver) {
    console.log("⬆️ Scrolling form to top...");
    try {

        await driver.$(
            `android=new UiScrollable(new UiSelector().className("android.widget.ScrollView").scrollable(true))` +
            `.scrollToBeginning(10)`
        );
        console.log("✅ Scrolled to top via scrollToBeginning");
    } catch {

        for (let i = 0; i < 8; i++) {
            await driver.execute('mobile: scrollGesture', {
                left: 540, top: 800, width: 400, height: 800,
                direction: 'up',
                percent: 1.0
            });
            await driver.pause(200);
        }
        console.log("✅ Scrolled to top via gesture");
    }
    await driver.pause(1000);
}


async function fillFieldByHint(driver, hint, value) {
    console.log(`✏️  Filling "${hint}" with "${value}"`);
    try {

        const field = await driver.$(`//android.widget.EditText[@hint="${hint}"]`);


        await driver.execute('mobile: scrollGesture', {
            left: 540, top: 1200, width: 400, height: 800,
            direction: 'up',
            percent: 0.5
        }).catch(() => {});

        await field.waitForDisplayed({ timeout: 8000 });
        await field.click();
        await driver.pause(500);
        await field.clearValue();
        await driver.pause(200);

        const adbText = value.toString().replace(/ /g, '%s');
        await driver.execute('mobile: shell', {
            command: 'input',
            args: ['text', adbText]
        });

        await driver.pause(500);
        await driver.execute('mobile: hideKeyboard').catch(() => {});
        await driver.pause(300);
        console.log(`✅ Filled "${hint}"`);
    } catch (e) {
        console.log(`⚠️ Could not fill "${hint}": ${e.message}`);
    }
}

async function fillDateField(driver, hint, dateValue) {
    console.log(`📅 Filling date "${hint}" with "${dateValue}"`);
    try {

        const field = await driver.$(`//android.widget.EditText[@hint="${hint}"]`);
        await field.waitForDisplayed({ timeout: 8000 });
        await field.click();
        await driver.pause(2000);

        const okBtn = await driver.$('android=new UiSelector().text("OK")');
        const okVisible = await okBtn.isDisplayed().catch(() => false);

        if (okVisible) {
            const [day, month, year] = dateValue.split('-');
            try {

                const keyboardIcon = await driver.$('//android.widget.ImageButton[@content-desc="Switch to text input mode"]');
                const iconVisible = await keyboardIcon.isDisplayed().catch(() => false);
                if (iconVisible) {
                    await keyboardIcon.click();
                    await driver.pause(500);
                }
            } catch {}

            const dateInput = await driver.$('android=new UiSelector().className("android.widget.EditText")');
            const inputVisible = await dateInput.isDisplayed().catch(() => false);
            if (inputVisible) {
                await dateInput.clearValue();
                await dateInput.setValue(`${month}/${day}/${year}`);
                await driver.pause(500);
            }
            await okBtn.click();
            console.log(`✅ Date set via picker for "${hint}"`);
        } else {
            await field.clearValue();
            await driver.execute('mobile: shell', {
                command: 'input',
                args: ['text', dateValue]
            });
            await driver.execute('mobile: hideKeyboard').catch(() => {});
            console.log(`✅ Date typed for "${hint}"`);
        }
        await driver.pause(500);
    } catch (e) {
        console.log(`⚠️ Could not fill date "${hint}": ${e.message}`);
    }
}


async function selectRadioByLabel(driver, questionText, answer) {
    console.log(`🔘 "${questionText}" → "${answer}"`);
    try {

        await driver.$(
            `android=new UiScrollable(new UiSelector().className("android.widget.ScrollView").scrollable(true))` +
            `.scrollIntoView(new UiSelector().textContains("${questionText.substring(0, 20)}"))`
        ).catch(() => {});

        await driver.pause(500);


        const radioBtn = await driver.$(
            `//android.widget.TextView[contains(@text,"${questionText}")]` +
            `/following::android.widget.RadioButton[@text="${answer}"][1]`
        );
        await radioBtn.waitForDisplayed({ timeout: 8000 });
        await radioBtn.click();
        await driver.pause(400);
        console.log(`✅ Selected "${answer}" for "${questionText}"`);
    } catch (e) {
        console.log(`⚠️ Could not select radio for "${questionText}": ${e.message}`);
    }
}

async function fillRegistrationForm(driver, data) {
    console.log("\n📋 Filling Registration Form...");

    await scrollFormToTop(driver);

    await fillFieldByHint(driver, 'RCH ID No. of Woman', data.rchId);
    await fillDateField(driver, 'LMP Date *', data.lmpDate);

    await selectRadioByLabel(driver, 'Is Nayi Pahal kit handed over to couple?', data.nayiPahalKit);
    await selectRadioByLabel(driver, 'No. of Deliveries is more than 3', data.noOfDeliveriesMoreThan3);
    await selectRadioByLabel(driver, 'Time from last delivery is less than 18 months', data.timeFromLastDeliveryLess18);
    await selectRadioByLabel(driver, 'Height is very short or less than 140 cms', data.heightShortLess140);
    await selectRadioByLabel(driver, 'Age is less than 18 or more than 35 years', data.ageLess18OrMore35);
    await selectRadioByLabel(driver, 'Miscarriage/abortion', data.miscarriageAbortion);
    await selectRadioByLabel(driver, 'Home delivery of previous pregnancy', data.homeDelivery);
    await selectRadioByLabel(driver, 'During pregnancy or delivery you faced any medical issues', data.medicalIssuesDuringPregnancy);
    await selectRadioByLabel(driver, 'Past C', data.pastCSection);
    console.log("\n✅ All fields filled!");
}

async function submitForm(driver) {
    console.log("\n🚀 Submitting form...");
    try {
        await driver.$(
            `android=new UiScrollable(new UiSelector().scrollable(true))` +
            `.scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit"))`
        ).catch(() => {});

        const submitBtn = await driver.$(
            'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit")'
        );
        await submitBtn.waitForDisplayed({ timeout: 8000 });
        await submitBtn.click();
        await driver.pause(3000);
        console.log("✅ Form Submitted!");
    } catch (e) {
        console.log(`⚠️ Submit failed: ${e.message}`);
    }
}

async function main() {
    console.log("🚀 Starting Appium session...");
    const driver = await remote(wdioOptions);

    try {
        await driver.pause(5000);

        await clickEligibleCoupleList(driver);
        await clickEligibleCoupleRegistration(driver);
        await scrollToNameAndClickCard(driver, "KAVTA VERMA");
        await fillRegistrationForm(driver, formData);
        await driver.pause(3000);
        await submitForm(driver);

        console.log("\n🎯 Flow Completed Successfully!");

    } catch (error) {
        console.error("❌ Test Failed:", error.message);
    } finally {
        if (driver) {
            console.log("🛑 Closing session...");
            await driver.pause(3000);
            await driver.deleteSession();
        }
    }
}

main();