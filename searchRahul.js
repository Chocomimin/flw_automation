const { remote } = require("webdriverio");

async function searchRahulSharma() {

    const driver = await remote({
        hostname: "localhost",
        port: 4723,
        path: "/",
        capabilities: {
            platformName: "Android",
            "appium:automationName": "UiAutomator2",
            "appium:deviceName": "Android Device",
            "appium:appPackage": "org.piramalswasthya.sakhi.mitanin.uat",
            "appium:appActivity": ".MainActivity",

            // continue from current state
            "appium:noReset": true,
            "appium:fullReset": false,
            "appium:newCommandTimeout": 300
        }
    });

    try {

        console.log("✅ Connected to running app");

        // ==================================================
        // 1️⃣ OPEN HOUSEHOLD
        // ==================================================
        const householdBtn = await driver.$(
            'android=new UiSelector().textContains("Household")'
        );

        if (await householdBtn.isExisting()) {
            await householdBtn.click();
            console.log("✅ Household opened");
            await driver.pause(3000);
        }

        // ==================================================
        // 2️⃣ SEARCH FIELD
        // ==================================================
        const searchField = await driver.$(
            'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/searchView")'
        );

        await searchField.waitForDisplayed({ timeout: 20000 });
        await searchField.click();
        await driver.pause(1000);

        try { await searchField.clearValue(); } catch(e){}

        // ==================================================
        // 3️⃣ TYPE TEXT (🔥 MICROPHONE FIX)
        // ==================================================
        await driver.execute("mobile: shell", {
            command: "input",
            args: ["text", "rahul%ssharma"]
        });

        console.log("✅ Typed Rahul Sharma");

        // ✅ PRESS ENTER (VERY IMPORTANT)
        await driver.pressKeyCode(66);
        await driver.pause(800);

        // ✅ CLOSE KEYBOARD
        try {
            if (await driver.isKeyboardShown()) {
                await driver.back();
                await driver.pause(800);
            }
        } catch(e){}

        // ✅ REMOVE SEARCH FOCUS (prevents microphone)
        const { width, height } = await driver.getWindowSize();

        await driver.performActions([{
            type: "pointer",
            id: "focusKill",
            parameters: { pointerType: "touch" },
            actions: [
                { type: "pointerMove", duration: 0, x: Math.floor(width/2), y: 200 },
                { type: "pointerDown", button: 0 },
                { type: "pause", duration: 80 },
                { type: "pointerUp", button: 0 }
            ]
        }]);
        await driver.releaseActions();

        console.log("✅ Keyboard + focus removed");

        // ==================================================
        // 4️⃣ CLICK SEARCH
        // ==================================================
        const searchButton = await driver.$(
            'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/ib_search")'
        );

        await searchButton.waitForDisplayed({ timeout: 10000 });
        await searchButton.click();

        console.log("✅ Search executed");
        await driver.pause(5000);

        // ==================================================
        // 5️⃣ CLICK ADD MEMBER
        // ==================================================
        const addMemberBtn = await driver.$(
            'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/button4")'
        );

        await addMemberBtn.waitForDisplayed({ timeout: 20000 });
        await addMemberBtn.click();

        console.log("✅ Add Member clicked");
        await driver.pause(2000);

        // ==================================================
        // 6️⃣ SELECT FEMALE
        // ==================================================
        const femaleRadio = await driver.$(
            'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/rb_female")'
        );

        await femaleRadio.waitForDisplayed({ timeout: 10000 });
        await femaleRadio.click();

        console.log("✅ Female selected");

        // ==================================================
        // 7️⃣ CLICK OK
        // ==================================================
        const okBtn = await driver.$(
            'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/btn_ok")'
        );

        await okBtn.waitForDisplayed({ timeout: 10000 });
        await okBtn.click();

        console.log("✅ OK clicked");
        await driver.pause(3000);

        // ==================================================
        // 8️⃣ OPEN RELATION DROPDOWN
        // ==================================================
        await driver.performActions([{
            type: "pointer",
            id: "openDropdown",
            parameters: { pointerType: "touch" },
            actions: [
                { type: "pointerMove", duration: 0, x: 920, y: 1480 },
                { type: "pointerDown", button: 0 },
                { type: "pause", duration: 120 },
                { type: "pointerUp", button: 0 }
            ]
        }]);
        await driver.releaseActions();

        console.log("✅ Relation dropdown opened");
        await driver.pause(2000);

        // ==================================================
        // 9️⃣ SELECT "MOTHER" (FIXED COORDINATE)
        // ==================================================
        const tapX = Math.round(width / 2);
        const tapY = Math.round(height * 0.16); // Mother position

        await driver.performActions([{
            type: "pointer",
            id: "selectMother",
            parameters: { pointerType: "touch" },
            actions: [
                { type: "pointerMove", duration: 0, x: tapX, y: tapY },
                { type: "pointerDown", button: 0 },
                { type: "pause", duration: 120 },
                { type: "pointerUp", button: 0 }
            ]
        }]);

        await driver.releaseActions();

        console.log("🎉 Mother selected successfully");

        await driver.pause(3000);

    } catch (err) {
        console.error("❌ Error:", err);
    }


// ==================================================
// 7️⃣ CLICK OK (STABLE METHOD)
// ==================================================
const okBtn = await driver.$(
    'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/btn_ok")'
);

// wait until visible
await okBtn.waitForDisplayed({ timeout: 15000 });

// small pause for dialog animation
await driver.pause(1000);

// scroll focus away if keyboard exists
try {
    if (await driver.isKeyboardShown()) {
        await driver.back();
        await driver.pause(800);
    }
} catch(e){}

// ensure element is enabled
await okBtn.waitForEnabled({ timeout: 10000 });

// ⭐ SAFE CLICK
await okBtn.click();

console.log("✅ OK button clicked successfully");

// wait next screen
await driver.pause(3000);
}


searchRahulSharma().catch(console.error);