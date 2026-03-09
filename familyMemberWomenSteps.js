// ✅ FINAL STABLE VERSION: Fixed Parameter Mismatches & Keyboard Handling

//--------------------------------------------------
// GLOBAL HELPERS
//--------------------------------------------------

async function closeKeyboard(driver) {
    try {
        if (await driver.isKeyboardShown()) {
            console.log("⌨️ Hiding keyboard safely...");
            // 66 is the Android keycode for "Enter" / "Done".
            await driver.pressKeyCode(66);
            await driver.pause(1000);

            // Failsafe: Tap top of screen if still shown
            if (await driver.isKeyboardShown()) {
                const { width } = await driver.getWindowRect();
                await driver.performActions([{
                    type: 'pointer', id: 'hideKbTouch', parameters: { pointerType: 'touch' },
                    actions: [
                        { type: 'pointerMove', duration: 0, x: Math.floor(width / 2), y: 150 },
                        { type: 'pointerDown', button: 0 },
                        { type: 'pause', duration: 100 },
                        { type: 'pointerUp', button: 0 }
                    ]
                }]);
                await driver.releaseActions();
                await driver.pause(1000);
            }
        }
    } catch (e) {}
}

async function typeIfEmpty(driver, element, value) {
    const text = await element.getText();
    // Identifies if the field contains placeholder text like "Mother's Name" or is empty
    const isPlaceholder = text.includes("Name") || text.includes("Enter") || text.trim() === "" || text.includes("*");

    if (!text || isPlaceholder) {
        await element.click();
        await element.setValue(value);
        console.log("✅ Entered:", value);
        await driver.pause(500);
        // Automatically close keyboard after typing to keep UI clear
        await closeKeyboard(driver);
    } else {
        console.log("ℹ️ Already contains data:", text);
    }
}

//--------------------------------------------------
// 1️⃣ Consent Form
//--------------------------------------------------

async function handleConsentForm(driver) {
    try {
        const agreeBtn = await driver.$('android=new UiSelector().textMatches("(?i)agree")');
        await agreeBtn.waitForDisplayed({ timeout: 5000 });

        const checkbox = await driver.$('android=new UiSelector().className("android.widget.CheckBox")');
        if (await checkbox.isExisting()) {
            await checkbox.click();
        }

        await agreeBtn.click();
        await driver.pause(2000);
        console.log("✅ Consent accepted");
    } catch {
        console.log("ℹ️ Consent not shown");
    }
}

//--------------------------------------------------
// 2️⃣ Name Section
//--------------------------------------------------

async function fillNames(driver, first, last) {
    const firstName = await driver.$('//android.widget.EditText[contains(@hint,"First Name")]');
    await firstName.waitForDisplayed({ timeout: 10000 });
    await typeIfEmpty(driver, firstName, first.toUpperCase());

    const lastName = await driver.$('//android.widget.EditText[contains(@hint,"Last Name")]');
    await typeIfEmpty(driver, lastName, last.toUpperCase());
}

//--------------------------------------------------
// 3️⃣ Age Picker
//--------------------------------------------------

async function fillAge(driver, age = "26") {
    const ageField = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/et_num")');
    await ageField.waitForDisplayed({ timeout: 10000 });
    await ageField.click();

    const okBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/btn_ok")');
    await okBtn.waitForDisplayed({ timeout: 5000 });

    const pickerInput = await driver.$('android=new UiSelector().resourceId("android:id/numberpicker_input")');
    await pickerInput.click();
    await pickerInput.clearValue();
    await pickerInput.addValue(age);

    await driver.pressKeyCode(66); // Close number pad
    await driver.pause(1000);
    await okBtn.click();
    await driver.pause(2000);
    console.log("✅ Age selected");
}

//--------------------------------------------------
// 4️⃣ Marital Status
//--------------------------------------------------

async function selectMaritalStatus(driver, value="Married") {
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Marital Status"))');

    const dropdown = await driver.$('android=new UiSelector().className("android.widget.Spinner").textContains("Marital Status")');
    await dropdown.click();
    await driver.pause(1500);

    const {width, height} = await driver.getWindowRect();
    const x = Math.floor(width / 2);
    let y;
    switch(value){
        case "Unmarried": y = height*0.50; break;
        case "Married": y = height*0.55; break;
        default: y = height*0.55;
    }

    await driver.performActions([{
        type:'pointer', id:'finger1', parameters:{pointerType:'touch'},
        actions:[
            {type:'pointerMove',duration:0, x, y: Math.floor(y)},
            {type:'pointerDown',button:0},
            {type:'pause',duration:200},
            {type:'pointerUp',button:0}
        ]
    }]);
    await driver.releaseActions();
}

//--------------------------------------------------
// 5️⃣ Age At Marriage
//--------------------------------------------------

async function fillAgeAtMarriage(driver, value = "15") {
    console.log("📝 Filling Age At Marriage...");
    await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Age At Marriage"))');

    const field = await driver.$('android=new UiSelector().textContains("Age At Marriage")');

    // Use the helper but ensure driver is passed correctly
    await typeIfEmpty(driver, field, value);

    // ✅ FORCE CLOSE KEYBOARD to ensure the next dropdown is visible and clickable
    await closeKeyboard(driver);
}

//--------------------------------------------------
// 6️⃣ Parents
//--------------------------------------------------
async function fillParents(driver, father, mother) {
    // Ensure keyboard is closed before starting
    await closeKeyboard(driver);

    // Find and fill Father's Name
    const fatherField = await driver.$('android=new UiSelector().textContains("Father\'s Name")');
    await fatherField.waitForDisplayed({ timeout: 5000 });
    await typeIfEmpty(driver, fatherField, father);

    // ✅ CLOSE KEYBOARD immediately after Father's Name
    console.log("⌨️ Closing keyboard after Father's Name...");
    await closeKeyboard(driver);

    // Find and fill Mother's Name
    const motherField = await driver.$('android=new UiSelector().textContains("Mother\'s Name")');
    await motherField.waitForDisplayed({ timeout: 5000 });
    await typeIfEmpty(driver, motherField, mother);

    // Close keyboard again after Mother's Name
    await closeKeyboard(driver);
}

//--------------------------------------------------
// 7️⃣ Community
//--------------------------------------------------

async function selectCommunity(driver, value = "OBC") {
    await closeKeyboard(driver);
    console.log("🔍 Checking Community field...");

    // 1. Precise Scroll: Scroll until the text "Community" is visible, don't just jump to the end
    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("Community")');
    } catch (e) {
        console.log("⚠️ Precise scroll failed, trying aggressive scroll...");
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollToEnd(1)');
    }

    // 2. Updated Selector: Find the Spinner that is a child of the Community container
    const dropdown = await driver.$('//android.widget.Spinner[contains(@resource-id, "dropdown") or contains(@text, "Community") or .//*[contains(@text, "Community")]]');

    await dropdown.waitForDisplayed({ timeout: 10000 });

    // 3. Check if already filled
    const currentText = await dropdown.getText();
    if (currentText && currentText !== "Community" && currentText.trim() !== "") {
        console.log("ℹ️ Community already filled with:", currentText);
        return;
    }

    await dropdown.click();
    await driver.pause(1500);

    // Keep your coordination logic exactly as it was
    const { width, height } = await driver.getWindowRect();
    const x = Math.floor(width / 2);
    const map = { "General": 0.40, "SC": 0.47, "ST": 0.54, "BC": 0.61, "OBC": 0.68 };
    const y = Math.floor(height * (map[value] || 0.40));

    await driver.performActions([{
        type: 'pointer', id: 'finger2', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x, y },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 200 },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    console.log(`✅ Community (${value}) selected`);
}

//--------------------------------------------------
// 7.5️⃣ Status Of Women
//--------------------------------------------------

async function selectStatusOfWomen(driver, option = "Eligible Couple") {
    console.log("🔍 Looking for Status Of Women dropdown...");

    // 1. Ensure keyboard is closed BEFORE scrolling so it doesn't mess up the view
    await closeKeyboard(driver);
    await driver.pause(1000);

    // 2. Precise Scroll: Scroll until the specific text is visible
    try {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("Status Of Women *")');
    } catch (e) {
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollToEnd(1)');
    }

    // 3. Find the dropdown
    let dropdown = await driver.$('//*[@resource-id="org.piramalswasthya.sakhi.mitanin.uat:id/actv_rv_dropdown" and (contains(@text, "Status") or contains(@text, "Select"))]');
    await dropdown.waitForDisplayed({ timeout: 8000 });

    // --- KEYBOARD WORKAROUND ---
    // First click: This triggers the keyboard
    console.log("👆 First click (Keyboard might open)...");
    await dropdown.click();
    await driver.pause(1000);

    // Force close the keyboard safely
    await closeKeyboard(driver);

    // ⏳ CRITICAL: Wait 2 seconds for the screen to slide back down and settle
    await driver.pause(2000);

    // RE-FIND THE ELEMENT: The screen shifted when the keyboard closed!
    // If we don't re-find it, Appium will click the stale coordinates (which is why it hit Mobile Number).
    dropdown = await driver.$('//*[@resource-id="org.piramalswasthya.sakhi.mitanin.uat:id/actv_rv_dropdown" and (contains(@text, "Status") or contains(@text, "Select"))]');

    // Second click: Now that the UI is settled, open the actual dropdown list
    console.log("👆 Second click to open the dropdown options...");
    await dropdown.click();
    await driver.pause(1500);
    // ---------------------------

    // 4. Coordination click (Kept exactly as requested)
    const { width, height } = await driver.getWindowRect();
    const x = Math.floor(width / 2);

    const map = {
        "Eligible Couple": 0.65,
        "Pregnant Woman": 0.72,
        "Postnatal Mother": 0.79,
        "Permanently Sterilised": 0.86
    };

    const y = Math.floor(height * (map[option] || 0.65));

    console.log(`👆 Tapping coordinates x:${x}, y:${y} for '${option}'...`);
    await driver.performActions([{
        type: 'pointer', id: 'fingerStatus', parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x, y },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 200 },
            { type: 'pointerUp', button: 0 }
        ]
    }]);
    await driver.releaseActions();
    console.log(`✅ Status Of Women (${option}) selected`);
}

//--------------------------------------------------
// 8️⃣ Preview Submit
//--------------------------------------------------

//--------------------------------------------------
// 8️⃣ Preview Submit
//--------------------------------------------------

async function submitPreview(driver) {
    console.log("🔍 Attempting to find and click the Preview button...");

    // Ensure keyboard is closed so it doesn't block the scroll or the button
    await closeKeyboard(driver);
    await driver.pause(1000); // Small pause to let UI settle

    try {
        // Automatically scroll down until the Preview button is in view
        // Using both resource-id and text for maximum accuracy based on your XML snippet
        const btnSelector = 'new UiSelector().resourceId("org.piramalswasthya.sakhi.mitanin.uat:id/btn_submit").textMatches("(?i)Preview")';
        await driver.$(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(${btnSelector})`);
    } catch (e) {
        console.log("⚠️ Precise scroll to Preview button failed, scrolling to the absolute bottom...");
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollToEnd(2)');
    }

    // Now find the button and click it
    const btn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.mitanin.uat:id/btn_submit"]');

    await btn.waitForDisplayed({ timeout: 5000 });
    await btn.click();

    console.log("✅ 'Preview' button clicked successfully!");
}

//--------------------------------------------------
// 🚀 MASTER FLOW
//--------------------------------------------------
//--------------------------------------------------
// 9️⃣ Final Submit (After Preview)
//--------------------------------------------------

async function confirmSubmit(driver) {
    console.log("🔍 Waiting for Final SUBMIT button on Preview screen...");

    try {
        // Wait up to 10 seconds for the Preview screen to load
        const submitBtn = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.mitanin.uat:id/btnSubmitPreview"]');
        await submitBtn.waitForDisplayed({ timeout: 10000 });

        // Click the final submit button
        await submitBtn.click();
        console.log("✅ Final 'SUBMIT' button clicked successfully! Form submitted.");

        // Optional: Pause to allow the success message or next screen to load
        await driver.pause(2000);
    } catch (e) {
        console.log("⚠️ Could not find the final SUBMIT button. It might be off-screen.");
        // Fallback: Scroll to the bottom just in case the preview screen is very long
        await driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollToEnd(1)');

        const submitBtnFallback = await driver.$('//android.widget.Button[@resource-id="org.piramalswasthya.sakhi.mitanin.uat:id/btnSubmitPreview"]');
        await submitBtnFallback.click();
        console.log("✅ Final 'SUBMIT' button clicked successfully after scrolling!");
    }
}

async function fillNewWomenMemberFormWithExamples(driver){
    await handleConsentForm(driver);
    await fillNames(driver, "Sunita", "Sharma");
    await fillAge(driver, "41"); // Matches your screenshot
    await selectMaritalStatus(driver, "Married");
    await fillParents(driver, "RAJESH SHARMA", "SUNITA SHARMA");
    await selectCommunity(driver, "OBC");
    await fillAgeAtMarriage(driver, "15"); // Changed to 15 to avoid the error in your image
    await selectStatusOfWomen(driver, "Eligible Couple"); //
    await submitPreview(driver);
    await confirmSubmit(driver);
}

module.exports = { fillNewWomenMemberFormWithExamples };