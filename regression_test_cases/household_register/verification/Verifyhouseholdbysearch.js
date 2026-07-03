// verifyHouseholdBySearch.js
// ✅ Verifies a household was registered successfully by going back to the
//    "All Household" list (reusing your existing, already-working
//    clickAllHousehold() navigation) and searching for the household head's
//    name to confirm a matching row now exists.
//
// ⚠️ ASSUMPTION NOTE:
// I don't have the page-source XML for the "All Household" list/search
// screen — only the two registration form screens. The selectors below
// follow the same resource-id conventions already used across your
// household/head-of-family scripts (EditText search box, RecyclerView list
// rows) with several fallback strategies, mirroring the multi-strategy
// pattern already used in clickSpinnerAndSelectOption().
// If verification fails on a real device run, capture
// `await driver.getPageSource()` on the "All Household" list screen right
// after clickAllHousehold(driver) and share it — the selectors here can
// then be tightened to your exact resource-ids.

async function openSearchBox(driver) {
    console.log('🔍 Looking for a search field on the household list...');

    // STRATEGY 1: dedicated search icon (content-desc based) — tap to reveal search box
    try {
        const searchIcon = await driver.$('android=new UiSelector().descriptionContains("Search")');
        if (await searchIcon.isExisting()) {
            await searchIcon.click();
            await driver.pause(1000);
            console.log('✅ Tapped search icon.');
        }
    } catch (e) {}

    // STRATEGY 2: EditText with a search-related hint/content-desc/resource-id
    let box = await driver.$(
        'android=new UiSelector().className("android.widget.EditText").descriptionContains("Search")'
    );
    if (await box.isExisting()) return box;

    box = await driver.$(
        'android=new UiSelector().className("android.widget.EditText").textContains("Search")'
    );
    if (await box.isExisting()) return box;

    box = await driver.$(
        'android=new UiSelector().resourceIdMatches(".*(search|query).*").className("android.widget.EditText")'
    );
    if (await box.isExisting()) return box;

    // STRATEGY 3: fall back to the first visible EditText on the screen
    box = await driver.$('android=new UiSelector().className("android.widget.EditText")');
    return box;
}

/**
 * Navigates to the "All Household" list (via your existing clickAllHousehold
 * helper) and searches for `searchName`, confirming a matching result exists.
 *
 * @param {object} driver - Appium/WebdriverIO driver
 * @param {function} clickAllHousehold - your existing exported helper from
 *        ./verification/householdSteps.js (pass it in so this module has no
 *        hard dependency on that file's export shape)
 * @param {string} searchName - name to search for (e.g. "Priya Sharma")
 * @param {object} [opts]
 * @param {number} [opts.timeout=10000]
 * @returns {Promise<boolean>} true if a matching result row was found
 */


async function verifyHouseholdBySearch(driver, clickAllHousehold, searchName, opts = {}) {
    const timeout = opts.timeout || 10000;
    console.log(`\n🔎 VERIFYING REGISTRATION — searching for "${searchName}" in the household list...`);

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(500);
    }

    // Reuse the existing, already-working navigation back to the list screen.
    await driver.pause(1500);
    await clickAllHousehold(driver);
    await driver.pause(2000);

    const box = await openSearchBox(driver);
    try {
        await box.waitForDisplayed({ timeout });
    } catch (e) {
        console.log('❌ VERIFICATION FAILED: Could not locate a search input field on the household list.');
        return false;
    }

    await box.click();
    await box.setValue(searchName);
    console.log(`⌨️  Typed "${searchName}" into search field.`);
    await driver.pause(2000); // allow list to filter/debounce

    // Look for a result row containing the searched name — try the full
    // name first, then fall back to just the first name in case the list
    // truncates or formats "First Last" differently.
    let found = false;
    try {
        const exactMatch = await driver.$(`android=new UiSelector().textContains("${searchName}")`);
        found = await exactMatch.isExisting();
    } catch (e) {}

    if (!found) {
        const firstToken = searchName.split(' ')[0];
        try {
            const looseMatch = await driver.$(`android=new UiSelector().textContains("${firstToken}")`);
            found = await looseMatch.isExisting();
        } catch (e) {}
    }

    if (found) {
        console.log(`✅ VERIFICATION PASSED: "${searchName}" found in the household list — registration confirmed.`);
    } else {
        console.log(`❌ VERIFICATION FAILED: "${searchName}" NOT found in the household list.`);
        try {
            const source = await driver.getPageSource();
            const texts = [...source.matchAll(/text="([^"]{2,40})"/g)].map(m => m[1]).slice(0, 25);
            console.log('🧾 Visible text snippets on screen for debugging:', texts);
        } catch (e) {}
    }

    if (await driver.isKeyboardShown()) {
        await driver.hideKeyboard();
        await driver.pause(500);
    }

    return found;
}

module.exports = { verifyHouseholdBySearch, openSearchBox };