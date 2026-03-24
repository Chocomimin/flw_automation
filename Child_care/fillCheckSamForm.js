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

            // ---> NEW SAFEGUARD: Prevent Infinite Loop Crashes <---
            const { month: checkMonth, year: checkYear } = await getCurrentCalendarMonthYear(driver);
            if (checkMonth === displayedMonth && checkYear === displayedYear) {
                throw new Error(`Calendar is STUCK on ${FULL_MONTH_NAMES[displayedMonth-1]} ${displayedYear}. Target date ${targetMonth}/${targetYear} is likely blocked/disabled by the app.`);
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

async function fillNumericField(driver, hint, value, timeout = 15000) {
    try {
        const field = await driver.$(`//android.widget.EditText[@hint="${hint}"]`);
        await field.waitForDisplayed({ timeout });
        await field.click();
        await field.clearValue();
        await field.setValue(String(value));
        await driver.pressKeyCode(66);
        console.log(`✅ Filled field "${hint}" with value: ${value}`);
    } catch (error) {
        console.error(`Failed to fill field "${hint}": ${error.message}`);
        throw error;
    }
}

async function selectDropdownOption(driver, fieldHint, optionText, timeout = 15000) {
    try {
        const field = await driver.$(`//android.widget.EditText[@hint="${fieldHint}"]`);
        await field.waitForDisplayed({ timeout });
        await field.click();
        await driver.pause(800);

        const option = await driver.$(
            `//android.widget.ListView[@resource-id="android:id/select_dialog_listview"]` +
            `//android.widget.TextView[@text="${optionText}"]`
        );
        await option.waitForDisplayed({ timeout });
        await option.click();
        await driver.pause(500);
        console.log(`✅ Selected dropdown option: "${optionText}"`);
    } catch (error) {
        console.error(`selectDropdownOption failed for "${fieldHint}": ${error.message}`);
        throw error;
    }
}

async function selectRadioOption(driver, labelText, option, timeout = 15000) {
    await driver.execute('mobile: scrollGesture', {
        left: 0, top: 400, width: 1080, height: 1800,
        direction: 'down', percent: 0.3,
    });
    await driver.pause(500);

    try {
        const radioBtn = await driver.$(
            `//android.widget.TextView[@text="${labelText}"]` +
            `/following-sibling::android.widget.FrameLayout` +
            `//android.widget.RadioButton[@text="${option}"]`
        );
        await radioBtn.waitForDisplayed({ timeout });
        await radioBtn.click();
        console.log(`✅ Selected radio "${option}" for: "${labelText}"`);
    } catch (error) {
        console.error(`Failed to select radio option "${option}" under "${labelText}": ${error.message}`);
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

async function handleSamAlertIfPresent(driver, timeout = 3000) {
    try {
        const okButton = await driver.$('//android.widget.Button[@text="OK" and @resource-id="android:id/button1"]');
        await okButton.waitForDisplayed({ timeout });
        console.log('⚠️ "SAM Case Detected" alert popped up. Dismissing...');
        await okButton.click();
        await driver.pause(1000);
        console.log('✅ Alert dismissed.');
    } catch (error) {
        console.log('  (No SAM alert popup detected. Continuing...)');
    }
}

async function fillCheckSamForm(driver) {
    try {
        console.log('--- Filling Check SAM Form ---');

        // Step 1: Fill Visit Date
        await fillVisitDateFromCalendar(driver, 23, 3, 2026, 'Choose visit date');

        // Step 2: Fill MUAC
        await fillNumericField(driver, 'Enter MUAC in cm', 11.5);

        // ---> Handle the SAM Alert Popup <---
        await handleSamAlertIfPresent(driver);

        // Step 3: Select Weight-for-Height Status
        await selectDropdownOption(driver, 'Select status', 'SAM');

        // Step 4: Is Child referred to NRC?
        await selectRadioOption(driver, 'Is Child referred to NRC? *', 'Yes');

        // Step 5: Is Child Admitted in NRC?
        const isAdmitted = 'Yes';
        await selectRadioOption(driver, 'Is Child Admitted in NRC?', isAdmitted);

        // Step 6: Fill NRC Admission Date
        if (isAdmitted === 'Yes') {
            try {
                if (await driver.isKeyboardShown()) {
                    await driver.hideKeyboard();
                    await driver.pause(500);
                }
            } catch (e) {}

            await fillVisitDateFromCalendar(driver, 23, 3, 2026, 'Select NRC Admission Date');
        }

        // Step 7: Is Child discharged from NRC?
        const isDischarged = 'Yes';
        await selectRadioOption(driver, 'Is Child discharged from NRC?', isDischarged);

        // Step 8: Fill Discharge, Follow-up, Outcome, and Pick Image
        if (isDischarged === 'Yes') {
            try {
                if (await driver.isKeyboardShown()) {
                    await driver.hideKeyboard();
                    await driver.pause(500);
                }
            } catch (e) {}

            // Fill NRC Discharge Date
            console.log('Filling NRC Discharge Date...');
            await fillVisitDateFromCalendar(driver, 23, 3, 2026, 'Select discharge date');

            // Scroll down a bit to ensure Follow-up date is visible
            await driver.execute('mobile: scrollGesture', {
                left: 0, top: 400, width: 1080, height: 1800,
                direction: 'down', percent: 0.5,
            });
            await driver.pause(500);

            // ---> FIX: Changed from April 5 to March 31 to prevent blocked-date crash
            console.log('Filling Follow-up Visit Date...');
            await fillVisitDateFromCalendar(driver, 23, 3, 2026, 'Select follow-up visit date');

            // Fill Follow-up Visit Outcome (SAM Status)
            console.log('Selecting Follow-up Visit Outcome...');
            await selectDropdownOption(driver, 'Select outcome', 'Improved');

            // Handle Image Picking
            // console.log('Clicking PICK IMAGE...');
            // await clickElementByText(driver, 'PICK IMAGE');
            // await driver.pause(1000);

            // console.log('Selecting "Choose from gallery"...');
            // try {
            //     const galleryOpt = await driver.$('//*[@text="Choose from gallery" or @text="Choose from Gallery"]');
            //     await galleryOpt.waitForDisplayed({ timeout: 5000 });
            //     await galleryOpt.click();
            // } catch (error) {
            //     await clickElementByText(driver, 'Choose from gallery');
            // }

            // console.log('⏳ Waiting for 20 seconds for manual image selection...');
            // await driver.pause(20000); // 20 seconds wait
            // console.log('⏳ 20 seconds elapsed. Resuming...');
        }

        // Step 9: Submit
        console.log('Clicking SUBMIT...');
        // Let's use a highly specific locator just for safety
        const submitBtn = await driver.$('//android.widget.Button[@text="SUBMIT" or @resource-id="org.piramalswasthya.sakhi.saksham.uat:id/btnSave"]');
        await submitBtn.waitForDisplayed({ timeout: 10000 });
        await submitBtn.click();

        console.log('✅ Check SAM Form filled successfully.');

    } catch (error) {
        console.error(`Failed to fill Check SAM form: ${error.message}`);
        throw error;
    }
}

module.exports = { fillCheckSamForm };