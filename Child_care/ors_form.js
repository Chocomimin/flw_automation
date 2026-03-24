const FULL_MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

async function getCurrentCalendarMonthYear(driver) {
    try {
        const firstDayCell = await driver.$('//android.view.View[@resource-id="android:id/month_view"]/android.view.View[1]');
        const contentDesc = await firstDayCell.getAttribute('content-desc');
        const parts = contentDesc.split(' ');
        return { month: FULL_MONTH_NAMES.indexOf(parts[1]) + 1, year: parseInt(parts[2], 10) };
    } catch (error) {
        throw new Error(`Failed to read calendar: ${error.message}`);
    }
}

async function fillVisitDateFromCalendar(driver, targetDay, targetMonth, targetYear, fieldHint, timeout = 15000) {
    try {
        const dateField = await driver.$(`//android.widget.EditText[@hint="${fieldHint}"]`);
        await dateField.waitForDisplayed({ timeout });
        await dateField.click();
        await driver.pause(1000);

        const yearHeader = await driver.$('//android.widget.TextView[@resource-id="android:id/date_picker_header_year"]');
        await yearHeader.click();
        await driver.pause(1000);

        const yearItem = await driver.$(`//android.widget.TextView[@text="${targetYear}"]`);
        await yearItem.waitForDisplayed({ timeout });
        await yearItem.click();
        await driver.pause(1500);

        let navigated = 0;
        while (navigated < 24) {
            const { month: displayedMonth, year: displayedYear } = await getCurrentCalendarMonthYear(driver);
            if (displayedYear === targetYear && displayedMonth === targetMonth) break;

            const currentIndex = (displayedYear * 12) + displayedMonth;
            const targetIndex = (targetYear * 12) + targetMonth;

            const btnId = targetIndex < currentIndex ? 'android:id/prev' : 'android:id/next';
            const navBtn = await driver.$(`//android.widget.ImageButton[@resource-id="${btnId}"]`);

            if (await navBtn.isExisting()) {
                await navBtn.click();
            } else {
                const dir = targetIndex < currentIndex ? 'right' : 'left';
                await driver.execute('mobile: swipeGesture', { left: 234, top: 1000, width: 600, height: 400, direction: dir, percent: 0.8 });
            }
            await driver.pause(1000);
            navigated++;
        }

        const dayDesc = `${String(targetDay).padStart(2, '0')} ${FULL_MONTH_NAMES[targetMonth - 1]} ${targetYear}`;
        const dayCell = await driver.$(`//android.view.View[@content-desc="${dayDesc}"]`);
        await dayCell.click();
        await (await driver.$('//android.widget.Button[@resource-id="android:id/button1"]')).click();
        await driver.pause(1000);
    } catch (error) {
        throw new Error(`Calendar Error: ${error.message}`);
    }
}

async function fillNumericField(driver, hint, value, timeout = 15000) {
    try {
        const field = await driver.$(`//android.widget.EditText[@hint="${hint}"]`);
        await field.waitForDisplayed({ timeout });
        await field.setValue(String(value));
        await driver.pressKeyCode(66);
        console.log(`✅ Filled "${hint}" with: ${value}`);
    } catch (error) {
        throw new Error(`Field Error (${hint}): ${error.message}`);
    }
}

async function fillOrsForm(driver) {
    try {
        console.log('--- Filling ORS Form ---');

        // Step 1: Fill Visit Date (using hint from your XML)
        await fillVisitDateFromCalendar(driver, 15, 1, 2025, 'Select Visit Date');

        // Step 2: Fill Under-5 Children count
        await fillNumericField(driver, 'Enter number of under-5 children', 3);

        // Step 3: Fill ORS Packets count
        await fillNumericField(driver, 'Enter number of ORS packets', 5);

        console.log('✅ ORS Form filled. Returning to main runner for SUBMIT.');
    } catch (error) {
        console.error(`Failed to fill ORS form: ${error.message}`);
        throw error;
    }
}

module.exports = { fillOrsForm };