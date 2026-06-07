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

// ─────────────────────────────────────────────────────────────
//  CORE HELPERS (Robust Dropdown & Coordinate Logic)
// ─────────────────────────────────────────────────────────────

async function scrollSpinnerToMiddle(driver, spinnerSelector) {
    try {
        const spinner = await driver.$(spinnerSelector);
        const loc = await spinner.getLocation();
        const screen = await driver.getWindowRect();
        const midY = screen.height / 2;

        if (loc.y > midY + 100) {
            console.log(`⬆️  Spinner at y=${loc.y}, scrolling toward middle...`);
            const startY = Math.floor(screen.height * 0.7);
            const endY = Math.floor(screen.height * 0.3);
            const swipeX = Math.floor(screen.width / 2);

            await driver.performActions([{
                type: 'pointer', id: 'finger1',
                parameters: { pointerType: 'touch' },
                actions: [
                    { type: 'pointerMove', duration: 0, x: swipeX, y: startY },
                    { type: 'pointerDown', button: 0 },
                    { type: 'pause', duration: 200 },
                    { type: 'pointerMove', duration: 1000, x: swipeX, y: endY },
                    { type: 'pointerUp', button: 0 }
                ]
            }]);
            await driver.releaseActions();
            await driver.pause(1500);
        }
    } catch (e) {
        console.log('⚠️  scrollSpinnerToMiddle skipped:', e.message);
    }
}

async function tapByCoords(driver, tapX, tapY) {
    await driver.performActions([{
        type: 'pointer', id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
            { type: 'pointerMove', duration: 0, x: tapX, y: tapY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause',       duration: 150 },
            { type: 'pointerUp',   button: 0 }
        ]
    }]);
    await driver.releaseActions();
    await driver.pause(500);
}

async function clickSpinnerAndSelectOption(driver, spinnerSelector, value, optionsList) {
    await scrollSpinnerToMiddle(driver, spinnerSelector);

    const spinner = await driver.$(spinnerSelector);
    await spinner.waitForDisplayed({ timeout: 10000 });

    const loc  = await spinner.getLocation();
    const size = await spinner.getSize();
    console.log(`📍 Spinner @ (${loc.x}, ${loc.y}), size (${size.width}x${size.height})`);

    const tapX = Math.floor(loc.x + size.width - 40);
    const tapY = Math.floor(loc.y + size.height / 2);

    console.log(`📍 Tapping dropdown arrow at (${tapX}, ${tapY})`);
    await tapByCoords(driver, tapX, tapY);
    await driver.pause(2000);

    try {
        const item = await driver.$(`//*[@text="${value}"]`);
        await item.waitForDisplayed({ timeout: 4000 });
        await item.click();
        console.log(`✅ Selected "${value}" via XPath`);
        return;
    } catch (e) { console.log(`⚠️  XPath strategy failed: ${e.message}`); }

    try {
        const item = await driver.$(`android=new UiSelector().text("${value}")`);
        await item.waitForDisplayed({ timeout: 3000 });
        await item.click();
        console.log(`✅ Selected "${value}" via UiSelector`);
        return;
    } catch (e) { console.log(`⚠️  UiSelector strategy failed: ${e.message}`); }

    try {
        const source = await driver.getPageSource();
        const nodes = source.match(/<[^>]+>/g) || [];
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const textRegex = new RegExp(`(?:text|content-desc)="\\s*${escapedValue}\\s*"`);
        let foundNode = null;

        for (const node of nodes) {
            if (textRegex.test(node) && node.includes('bounds=')) {
                foundNode = node;
                break;
            }
        }

        if (foundNode) {
            const boundsMatch = foundNode.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
            if (boundsMatch) {
                const tapX = Math.floor((parseInt(boundsMatch[1]) + parseInt(boundsMatch[3])) / 2);
                const tapY = Math.floor((parseInt(boundsMatch[2]) + parseInt(boundsMatch[4])) / 2);
                console.log(`📍 Found "${value}" in XML (tag parse) → tap(${tapX},${tapY})`);
                await tapByCoords(driver, tapX, tapY);
                console.log(`✅ Selected "${value}" via tag parse`);
                return;
            }
        }
    } catch (e) { console.log(`⚠️  Tag parse failed: ${e.message}`); }

    try {
        const source = await driver.getPageSource();
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`text="${escapedValue}"[^/]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
        const match = source.match(regex);

        if (match) {
            const tapX = Math.floor((parseInt(match[1]) + parseInt(match[3])) / 2);
            const tapY = Math.floor((parseInt(match[2]) + parseInt(match[4])) / 2);
            console.log(`📍 Found "${value}" via regex → tap(${tapX},${tapY})`);
            await tapByCoords(driver, tapX, tapY);
            console.log(`✅ Selected "${value}" via regex`);
            return;
        }
    } catch (e) { console.log(`⚠️  Regex strategy failed: ${e.message}`); }

    const screen = await driver.getWindowRect();
    const idx = optionsList.indexOf(value);
    if (idx === -1) throw new Error(`"${value}" not in list: [${optionsList.join(', ')}]`);

    const rowHeight     = size.height;
    const spinnerBottom = loc.y + size.height;
    const opensUpward   = (screen.height - spinnerBottom) < (optionsList.length * rowHeight);
    const finalTapX     = Math.floor(loc.x + size.width / 2);
    let   finalTapY;

    if (opensUpward) {
        const reversedIdx = (optionsList.length - 1) - idx;
        finalTapY = Math.floor(loc.y - (reversedIdx * rowHeight) - (rowHeight / 2));
    } else {
        finalTapY = Math.floor(spinnerBottom + (idx * rowHeight) + (rowHeight / 2));
    }
    finalTapY = Math.max(5, Math.min(finalTapY, screen.height - 5));

    console.log(`📍 Coordinate fallback → tap(${finalTapX}, ${finalTapY})`);
    await tapByCoords(driver, finalTapX, finalTapY);
    console.log(`✅ Selected "${value}" via coordinates`);
}

// ─────────────────────────────────────────────────────────────
//  FORM FIELD HELPERS
// ─────────────────────────────────────────────────────────────

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

        await searchInput.setValue(childName);
        await driver.pause(3000);

        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
        }

        // 🟢 CHANGED: Use textContains instead of exact text match
        const nameElement = await driver.$(`android=new UiSelector().textContains("${childName}")`);
        await nameElement.waitForDisplayed({ timeout: 10000 });
        console.log(`✅ Found a match containing '${childName}' in the filtered list!`);

        console.log(`⏳ Locating the REGISTER button for the card containing '${childName}'...`);

        // 🟢 CHANGED: Use contains(@text, ...) in the XPath so partial names work
        const specificRegisterButtonXPath = `//android.view.ViewGroup[.//android.widget.TextView[contains(@text, "${childName}")]]//android.widget.Button[@text="REGISTER"]`;
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

async function selectPlaceOfBirth(driver, placeName) {
    try {
        console.log(`\n🏥 Selecting Place of Birth: '${placeName}'...`);

        // Scroll specifically to the dropdown element
        const scrollable = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown"))`;
        await driver.$(`android=${scrollable}`).catch(() => {});
        await driver.pause(1000);

        const optionsList = [
            'District Hospital',
            'Community Health Centre',
            'Primary Health Centre',
            'Sub Centre',
            'Other Public Facility',
            'Accredited Private Hospital',
            'Other Private Hospital',
            'Home',
            'Sub District Hospital',
            'Medical College Hospital',
            'In Transit'
        ];

        // Calling the master helper using the dropdown's specific resource ID
        await clickSpinnerAndSelectOption(
            driver,
            'android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/actv_rv_dropdown")',
            placeName,
            optionsList
        );
        console.log(`✅ Place of Birth selected as '${placeName}'!`);
    } catch (error) {
        console.error(`❌ Failed to select Place of Birth:`, error.message);
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

async function clickSubmitButton(driver) {
    try {
        console.log(`\n✅ Attempting to click Submit button...`);

        // Hide keyboard just in case it is covering the fixed bottom button
        if (await driver.isKeyboardShown()) {
            await driver.hideKeyboard();
            await driver.pause(1000);
        }

        // The Submit button is pinned to the bottom, so we can find it directly by ID
        const submitBtn = await driver.$('android=new UiSelector().resourceId("org.piramalswasthya.sakhi.saksham.uat:id/btn_submit")');
        await submitBtn.waitForDisplayed({ timeout: 5000 });
        await submitBtn.click();

        console.log(`✅ Successfully clicked the 'Submit' button!`);
        await driver.pause(3000); // Pause to allow the next screen or success popup to load

    } catch (error) {
        console.error(`❌ Failed to click the 'Submit' button:`, error.message);
        throw error;
    }
}
async function runTest() {
    let driver;
    try {
        console.log("🚀 Starting Test Flow...");
        driver = await remote(wdOpts);

        await clickChildRegistration(driver);
        await searchAndClickRegister(driver, "SWEETY");

        await fillChildRchId(driver, "987654321098");
        await fillBirthCertificateNumber(driver, "B-2026-9876543");

        // Call the newly added robust dropdown logic for Place of Birth
        await selectPlaceOfBirth(driver, "Primary Health Centre");

        await uploadFrontAndBackImages(driver);
        await clickSubmitButton(driver);

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