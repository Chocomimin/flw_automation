const { remote } = require("webdriverio");
// 👇 1. IMPORT THE FORM FILLING FUNCTION
const { fillNewWomenMemberFormWithExamples } = require("./familyMemberWomenSteps.js");

async function handleConsentForm() {

    const driver = await remote({
        hostname: "localhost",
        port: 4723,
        path: "/",
        capabilities: {
            platformName: "Android",
            "appium:automationName": "UiAutomator2",
            "appium:deviceName": "Android Device",

            // continue same app state
            "appium:appPackage": "org.piramalswasthya.sakhi.mitanin.uat",
            "appium:appActivity": ".MainActivity",

            "appium:noReset": true,
            "appium:fullReset": false,
            "appium:newCommandTimeout": 300
        }
    });

    try {

        console.log("✅ Connected — Handling Consent Form");

        // ==================================================
        // 1️⃣ WAIT FOR CONSENT FORM TITLE
        // ==================================================
        const consentTitle = await driver.$(
            'android=new UiSelector().text("Consent Form")'
        );

        await consentTitle.waitForDisplayed({ timeout: 20000 });
        console.log("✅ Consent Form opened");

        // ==================================================
        // 2️⃣ CLICK CONSENT CHECKBOX
        // ==================================================
        const consentCheckbox = await driver.$(
            'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/checkBox")'
        );

        await consentCheckbox.waitForDisplayed({ timeout: 10000 });

        // click only if not already checked
        const checked = await consentCheckbox.getAttribute("checked");

        if (checked === "false") {
            await consentCheckbox.click();
            console.log("✅ Consent checkbox ticked");
        } else {
            console.log("✅ Checkbox already selected");
        }

        await driver.pause(1000);

        // ==================================================
        // 3️⃣ CLICK AGREE BUTTON
        // ==================================================
        const agreeBtn = await driver.$(
            'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/btn_positive")'
        );

        await agreeBtn.waitForDisplayed({ timeout: 10000 });
        await agreeBtn.waitForEnabled({ timeout: 10000 });

        // small delay for dialog animation
        await driver.pause(800);

        await agreeBtn.click();

        console.log("🎉 AGREE clicked successfully");

        await driver.pause(3000);

        // 👇 2. CALL THE EXTERNAL FORM SCRIPT
        console.log("🚀 Starting the New Member Form Fill Process...");
        await fillNewWomenMemberFormWithExamples(driver);

    } catch (err) {
        console.error("❌ Error running script:", err);
    }

    // keep session alive if next steps exist
    // await driver.deleteSession();
}

handleConsentForm().catch(console.error);