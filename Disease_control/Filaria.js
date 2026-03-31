const { remote } = require('webdriverio');

const capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'ZD222X4TDK',
    'appium:appPackage': 'org.piramalswasthya.sakhi.saksham.uat',
    'appium:appActivity': 'org.piramalswasthya.sakhi.ui.login_activity.LoginActivity',
    'appium:noReset': true,
    'appium:enforceXPath1': true,
    'appium:unicodeKeyboard': true,
    'appium:resetKeyboard': true
};

const wdioOptions = {
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities: capabilities
};

// ─────────────────────────────────────────────
// Helper: Click any element by its visible text
// ─────────────────────────────────────────────
async function clickElementByText(driver, text) {
    console.log(`Looking for element with text: '${text}'...`);
    const element = await driver.$(`//*[@text='${text}']`);
    await element.waitForDisplayed({ timeout: 10000 });
    await element.click();
    console.log(`✔ Clicked element with text: '${text}'`);
}

// ─────────────────────────────────────────────
// Helper: Search household by name
// ─────────────────────────────────────────────
async function searchForTextWithKeyboard(driver, searchText) {
    console.log(`Typing '${searchText}' into search bar...`);

    const searchBox = await driver.$(
        "//android.widget.EditText[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/searchView']"
    );
    await searchBox.waitForDisplayed({ timeout: 10000 });
    await searchBox.click();
    await driver.pause(500);

    await searchBox.clearValue();
    await driver.pause(300);

    await searchBox.addValue(searchText);
    await driver.pause(500);

    // Press Enter to trigger search (avoids mic button issue)
    await driver.pressKeyCode(66);
    await driver.pause(800);

    try {
        await driver.hideKeyboard();
    } catch (e) {
        console.log('Keyboard already hidden:', e.message);
    }
    await driver.pause(500);

    console.log(`✔ Search triggered for '${searchText}'`);
}

// ─────────────────────────────────────────────
// Helper: Click Add MDA button for a household
// ─────────────────────────────────────────────
async function clickAddMdaByHouseholdName(driver, householdName) {
    console.log(`Locating Add MDA button for: ${householdName}`);
    const mdaBtnXPath =
        `//*[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/tv_hh_id' and @text='${householdName}']` +
        `/ancestor::android.widget.FrameLayout[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/parentCard']` +
        `//android.widget.Button[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/btnMda']`;

    const mdaBtn = await driver.$(mdaBtnXPath);
    await mdaBtn.waitForDisplayed({ timeout: 10000 });
    await mdaBtn.click();
    console.log(`✔ Clicked Add MDA button for '${householdName}'`);
}

// ─────────────────────────────────────────────
// Helper: Navigate calendar to target month/year
// ─────────────────────────────────────────────
async function navigateToMonthYear(driver, targetMonth, targetYear) {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    for (let attempts = 0; attempts < 48; attempts++) {
        const firstDay = await driver.$(
            "//android.view.View[@resource-id='android:id/month_view']/android.view.View[1]"
        );
        const contentDesc = await firstDay.getAttribute('content-desc');
        const parts = contentDesc.split(' '); // ["01", "March", "2026"]

        const currentMonth = monthNames.indexOf(parts[1]) + 1; // 1-based
        const currentYear = parseInt(parts[2]);

        console.log(
            `  Calendar: ${parts[1]} ${currentYear} | Target: ${monthNames[targetMonth - 1]} ${targetYear}`
        );

        if (currentMonth === targetMonth && currentYear === targetYear) {
            console.log(`✔ Reached target: ${monthNames[targetMonth - 1]} ${targetYear}`);
            break;
        }

        const targetTotal = targetYear * 12 + targetMonth;
        const currentTotal = currentYear * 12 + currentMonth;

        if (targetTotal < currentTotal) {
            // Go backwards
            const prevBtn = await driver.$(
                "//android.widget.ImageButton[@resource-id='android:id/prev']"
            );
            await prevBtn.waitForDisplayed({ timeout: 3000 });
            await prevBtn.click();
        } else {
            // Go forwards
            const nextBtn = await driver.$(
                "//android.widget.ImageButton[@content-desc='Next month']"
            );
            await nextBtn.waitForDisplayed({ timeout: 3000 });
            await nextBtn.click();
        }

        await driver.pause(400);
    }
}

// ─────────────────────────────────────────────
// Helper: Fill MDA Distribution Date via calendar
// ─────────────────────────────────────────────
async function fillMdaDistributionDate(driver, day, month, year) {
    console.log(`\nSetting MDA Distribution Date → ${day}/${month}/${year}`);

    const dateField = await driver.$(
        "//android.widget.EditText[@hint='Select distribution date']"
    );
    await dateField.waitForDisplayed({ timeout: 10000 });
    await dateField.click();
    await driver.pause(1000);
    console.log('✔ Date picker opened');

    await navigateToMonthYear(driver, month, year);
    await driver.pause(300);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const dayPadded = String(day).padStart(2, '0');
    const monthName = monthNames[month - 1];
    const contentDesc = `${dayPadded} ${monthName} ${year}`;

    console.log(`Clicking day with content-desc: '${contentDesc}'`);
    const dayElement = await driver.$(
        `//android.view.View[@content-desc='${contentDesc}']`
    );
    await dayElement.waitForDisplayed({ timeout: 5000 });
    await dayElement.click();
    console.log(`✔ Selected date: ${contentDesc}`);
    await driver.pause(500);

    const okButton = await driver.$(
        "//android.widget.Button[@resource-id='android:id/button1']"
    );
    await okButton.waitForDisplayed({ timeout: 5000 });
    await okButton.click();
    console.log(`✔ Date confirmed with OK`);
    await driver.pause(500);
}

// ─────────────────────────────────────────────
// NEW Helper: Select Is Medicine Distributed
// ─────────────────────────────────────────────
async function selectMedicineDistributed(driver, option) {
    console.log(`\nSelecting '${option}' for Is Medicine Distributed...`);

    // 1. Click the dropdown field
    const dropdown = await driver.$("//android.widget.EditText[@hint='Select option']");
    await dropdown.waitForDisplayed({ timeout: 5000 });
    await dropdown.click();
    await driver.pause(1000); // Wait for popup list
    console.log('✔ Dropdown opened');

    // 2. Select the specific option from the popup dialog
    const optionElement = await driver.$(`//android.widget.TextView[@text='${option}' and @resource-id='android:id/text1']`);
    await optionElement.waitForDisplayed({ timeout: 5000 });
    await optionElement.click();

    console.log(`✔ Option '${option}' selected successfully`);
    await driver.pause(500);
}

// ─────────────────────────────────────────────
// NEW Helper: Submit the Form
// ─────────────────────────────────────────────
async function submitMdaForm(driver) {
    console.log(`\nClicking Submit button...`);
    const submitBtn = await driver.$("//android.widget.Button[@resource-id='org.piramalswasthya.sakhi.saksham.uat:id/btnSave']");
    await submitBtn.waitForDisplayed({ timeout: 5000 });
    await submitBtn.click();
    console.log(`✔ Submit button clicked!`);
    await driver.pause(2000);
}

// ─────────────────────────────────────────────
// Main flow
// ─────────────────────────────────────────────
async function main() {
    console.log('═══════════════════════════════════════════');
    console.log(' Initializing Appium — Filaria Add MDA Flow');
    console.log('═══════════════════════════════════════════');

    let driver;

    try {
        driver = await remote(wdioOptions);
        console.log('✔ Appium session started\n');

        // 1. Navigate to Disease Control
        await clickElementByText(driver, 'Disease Control');
        await driver.pause(1000);

        // 2. Select Filaria
        await clickElementByText(driver, 'Filaria');
        await driver.pause(2000);

        // 3. Search for the household
        await searchForTextWithKeyboard(driver, 'ptest hhhh');
        await driver.pause(2000);

        // 4. Click Add MDA for the household
        await clickAddMdaByHouseholdName(driver, 'PTEST HHHH');
        await driver.pause(2000);

        // 5. Fill MDA Distribution Date
        await fillMdaDistributionDate(driver, 27, 3, 2026);
        console.log('\n✔ MDA Distribution Date filled successfully.');
        await driver.pause(1000);

        // 6. Select "Is Medicine Distributed" (Pass 'Yes' or 'No')
        await selectMedicineDistributed(driver, 'Yes');

        // 7. Click Submit
        await submitMdaForm(driver);

    } catch (error) {
        console.error('\n✖ Error during Filaria flow:', error.message);
    } finally {
        if (driver) {
            await driver.pause(2000);
            await driver.deleteSession();
            console.log('✔ Session closed.');
        }
    }
}

main();