const FULL_MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

async function getCurrentCalendarMonthYear(driver) {
    try {
        const firstDayCell = await driver.$('//android.view.View[@resource-id="android:id/month_view"]/android.view.View[1]');
        const contentDesc = await firstDayCell.getAttribute('content-desc');

        const parts = contentDesc.split(' ');
        const month = FULL_MONTH_NAMES.indexOf(parts[1]) + 1;
        const year  = parseInt(parts[2], 10);

        console.log(`  Calendar grid shows: ${parts[1]} ${year} (month=${month})`);
        return { month, year };
    } catch (error) {
        console.error(`Failed to read current calendar month/year: ${error.message}`);
        throw error;
    }
}

async function fillVisitDateFromCalendar(driver, targetDay, targetMonth, targetYear, fieldHint, timeout = 15000) {
    try {
        const dateField = await driver.$(`//android.widget.EditText[@hint="${fieldHint}"]`);
        await dateField.waitForDisplayed({ timeout });
        await dateField.click();
        console.log(`Opened calendar picker for: ${fieldHint}`);
        await driver.pause(1500);

        const yearHeader = await driver.$('//android.widget.TextView[@resource-id="android:id/date_picker_header_year"]');
        await yearHeader.waitForDisplayed({ timeout });
        const currentYear = parseInt(await yearHeader.getText(), 10);

        await yearHeader.click();
        console.log('Tapped year header — year list opened.');
        await driver.pause(1000);

        const yearListView = await driver.$('//android.widget.ListView[@resource-id="android:id/date_picker_year_picker"]');
        await yearListView.waitForDisplayed({ timeout });

        let yearSelected = false;
        let scrollAttempts = 0;
        const maxScrollAttempts = 15;
        const scrollDir = targetYear < currentYear ? 'up' : 'down';

        while (!yearSelected && scrollAttempts < maxScrollAttempts) {
            try {
                const yearItem = await driver.$(
                    `//android.widget.ListView[@resource-id="android:id/date_picker_year_picker"]` +
                    `//android.widget.TextView[@text="${targetYear}"]`
                );

                if (await yearItem.isExisting() && await yearItem.isDisplayed()) {
                    await yearItem.click();
                    console.log(`✅ Selected year: ${targetYear}`);
                    yearSelected = true;
                } else {
                    throw new Error('Not visible');
                }
            } catch {
                console.log(`Year ${targetYear} not visible, scrolling ${scrollDir}...`);
                await driver.execute('mobile: scrollGesture', {
                    left: 234, top: 900, width: 612, height: 600,
                    direction: scrollDir, percent: 0.5
                });
                await driver.pause(500);
                scrollAttempts++;
            }
        }

        if (!yearSelected) {
            throw new Error(`Year ${targetYear} not found after scrolling.`);
        }

        await driver.pause(1500);

        let navigated = 0;
        const maxNavigations = 24;

        while (navigated < maxNavigations) {
            const { month: displayedMonth, year: displayedYear } = await getCurrentCalendarMonthYear(driver);

            if (displayedYear === targetYear && displayedMonth === targetMonth) {
                console.log(`✅ Correct month reached: month=${targetMonth}, year=${targetYear}`);
                break;
            }

            const currentIndex = (displayedYear * 12) + displayedMonth;
            const targetIndex  = (targetYear  * 12) + targetMonth;

            if (targetIndex < currentIndex) {
                try {
                    const prevBtn = await driver.$('//android.widget.ImageButton[@resource-id="android:id/prev"]');
                    await prevBtn.waitForDisplayed({ timeout: 2000 });
                    await prevBtn.click();
                    console.log('⬅ Clicked Previous month.');
                } catch (e) {
                    await driver.execute('mobile: swipeGesture', { left: 234, top: 1000, width: 600, height: 400, direction: 'right', percent: 0.8 });
                }
            } else {
                try {
                    const nextBtn = await driver.$('//android.widget.ImageButton[@content-desc="Next month"]');
                    await nextBtn.waitForDisplayed({ timeout: 2000 });
                    await nextBtn.click();
                    console.log('➡ Clicked Next month.');
                } catch (e) {
                    await driver.execute('mobile: swipeGesture', { left: 234, top: 1000, width: 600, height: 400, direction: 'left', percent: 0.8 });
                }
            }

            await driver.pause(1000);

            // Safeguard against infinite loops if date is blocked
            const { month: checkMonth, year: checkYear } = await getCurrentCalendarMonthYear(driver);
            if (checkMonth === displayedMonth && checkYear === displayedYear) {
                throw new Error(`Calendar is STUCK on ${FULL_MONTH_NAMES[displayedMonth-1]} ${displayedYear}. Target date is likely blocked by the app.`);
            }

            navigated++;
        }

        const dayString   = String(targetDay).padStart(2, '0');
        const monthString = FULL_MONTH_NAMES[targetMonth - 1];
        const contentDesc = `${dayString} ${monthString} ${targetYear}`;

        console.log(`Tapping day cell: "${contentDesc}"`);
        const dayCell = await driver.$(`//android.view.View[@content-desc="${contentDesc}"]`);
        await dayCell.waitForDisplayed({ timeout });
        await dayCell.click();
        console.log(`✅ Selected date: ${contentDesc}`);

        await driver.pause(500);

        const okButton = await driver.$('//android.widget.Button[@resource-id="android:id/button1"]');
        await okButton.waitForDisplayed({ timeout });
        await okButton.click();
        console.log('✅ Confirmed date with OK.');
        await driver.pause(1000);

    } catch (error) {
        console.error(`Failed to fill Date for "${fieldHint}": ${error.message}`);
        try {
            const cancelBtn = await driver.$('//android.widget.Button[@resource-id="android:id/button2"]');
            if (await cancelBtn.isDisplayed()) await cancelBtn.click();
        } catch (_) {}
        throw error;
    }
}

// Safely fills fields even if they lack a hint, by using the text label above them
async function fillNumericFieldByLabel(driver, labelText, value, timeout = 15000) {
    try {
        const field = await driver.$(`//android.widget.TextView[@text="${labelText}"]/following-sibling::android.widget.FrameLayout//android.widget.EditText`);
        await field.waitForDisplayed({ timeout });

        // Safety check: The XML shows this field might be disabled/auto-filled
        const isEnabled = await field.getAttribute('enabled');
        if (isEnabled === 'false') {
            console.log(`⚠️ Field "${labelText}" is disabled by the app (likely auto-filled). Skipping input.`);
            return;
        }

        await field.click();
        await field.clearValue();
        await field.setValue(String(value));
        await driver.pressKeyCode(66);
        console.log(`✅ Filled field "${labelText}" with value: ${value}`);
    } catch (error) {
        console.error(`Failed to fill field "${labelText}": ${error.message}`);
        throw error;
    }
}

async function clickElementByText(driver, text, timeout = 15000) {
    try {
        const element = await driver.$(`//*[@text="${text}"]`);
        await element.waitForDisplayed({ timeout });
        await element.click();
        console.log(`✅ Clicked element with text: "${text}"`);
    } catch (error) {
         console.error(`Failed to click "${text}": ${error.message}`);
         throw error;
    }
}

async function fillIfaForm(driver) {
    try {
        console.log('--- Filling IFA Form ---');

        // Step 1: Fill Date of provision of IFA Bottle
        console.log('Filling Date of provision...');
        await fillVisitDateFromCalendar(driver, 23, 3, 2026, 'Select date (dd-mm-yyyy)');

        // Step 3: Handle MCP Card Upload
        // console.log('Clicking PICK IMAGE for MCP Card...');
        // await clickElementByText(driver, 'PICK IMAGE');

        // // Wait for the "Select Image" dialog to pop up
        // await driver.pause(1500);

        // console.log('Selecting "Choose from Gallery"...');
        // try {
        //     // Target the specific TextView within the ListView popup
        //     const galleryOption = await driver.$('//android.widget.ListView[@resource-id="android:id/select_dialog_listview"]//android.widget.TextView[@text="Choose from Gallery"]');
        //     await galleryOption.waitForDisplayed({ timeout: 5000 });
        //     await galleryOption.click();
        // } catch (error) {
        //     console.log('  ⚠️ Primary locator failed, trying fallback...');
        //     await clickElementByText(driver, 'Choose from Gallery');
        // }

        // // Wait for 20 seconds while you manually pick the image
        // console.log('⏳ Waiting for 20 seconds for manual image selection...');
        // await driver.pause(20000);
        // console.log('⏳ 20 seconds elapsed. Resuming...');

        // IMPORTANT: Force Appium to refresh its screen layout after returning from the Gallery
        await driver.execute('mobile: scrollGesture', {
            left: 0, top: 400, width: 1080, height: 1800,
            direction: 'down', percent: 0.3,
        });
        await driver.pause(1000); // Give the UI a second to settle

        console.log('✅ IFA Form image step completed. Returning to runner to click SUBMIT.');

    } catch (error) {
        console.error(`Failed to fill IFA form: ${error.message}`);
        throw error;
    }
}

module.exports = { fillIfaForm };