📱 FLW Application – Appium Automation Project

Automation Framework for the FLW Android Application

This project automates the workflow of the FLW Application Android application using modern mobile automation tools.

The automation scripts simulate real user interactions to validate multiple operational workflows such as Household Registration, Beneficiaries Management, Eligible Couple Tracking, and Maternal Health Registration.

🚀 Technology Stack

This automation framework is built using:

📱 Appium

🧪 WebdriverIO

🤖 UiAutomator2

🟢 Node.js

These tools allow reliable automation of Android applications with scalable test architecture.

Table of contents

Overview

Configuration

Usage

Project Modules

Failure Handling

Bug Tracker

Credits

Author

Maintainers

Overview

This project automates multiple functional modules of the FLW mobile application used by Field Level Workers (FLWs).

Automated Workflows

✔ Login and language selection
✔ Village selection
✔ New household registration
✔ Adding family members
✔ Beneficiary management
✔ Eligible couple listing & tracking
✔ Maternal health registration
✔ Pregnancy form automation
✔ ANC visit management
✔ PNC mother tracking

Configuration

Before running the automation framework, ensure the following software is installed:

Node.js (v16 or later)

Appium

Android SDK

Java JDK

Android Emulator or Physical Device

Install Dependencies
npm install

Install required automation libraries:

npm install webdriverio
npm install appium

Start the Appium server:

appium
Usage

Navigate to the project directory and run the required automation script.

Login & Household Registration
node mainTest.js

Automates:

Language selection

Login

Village selection

Household registration

Add Family Members
node memberAdding.js

Automates:

Adding new family members

Assigning Head of Family

Beneficiaries Module
node all_beneficiaries/beneficiaries.js

Automates:

Beneficiary list verification

Searching and validating beneficiary records

Eligible Couple Module

Run both scripts:

node eligible_couple_list/couple_list.js
node eligible_couple_list/couple_tracking.js

Automates:

Eligible couple listing

Tracking registered couples

Maternal Health – Pregnancy Registration
node maternal_health/maternalHealthSteps.js

Automates:

Maternal health navigation

Pregnancy registration form

Dynamic form field handling

ANC Visits Automation
node maternal_health/Anc_visits.js

Automates:

Navigating to ANC (Antenatal Care) Visits

Selecting registered pregnant women

Filling ANC visit details

Validating form submission

PNC Mother List Automation
node maternal_health/Pnc_list.js

Automates:

Navigating to PNC (Postnatal Care) Mother List

Searching registered mothers

Verifying PNC records

Validating post-delivery tracking

Project Modules
mainTest.js

Entry point of the automation framework.

Handles:

Login

Village selection

Household registration

memberAdding.js

Extends the automation to:

Add new family members

Assign Head of Family

beneficiaries.js

Automates All Beneficiaries module including:

Searching beneficiaries

Listing records

Validation checks

couple_list.js & couple_tracking.js

Handles the Eligible Couple module:

Listing eligible couples

Tracking couple records

maternalHealthSteps.js & pregnancyRegistrationForm.js

Automates complex maternal health workflows including:

Pregnancy registration

Dynamic scrolling

Dropdown and calendar handling

Anc_visits.js

Automates ANC Visit registration and verification.

Pnc_list.js

Automates Postnatal Care (PNC) mother tracking and validation.

Failure Handling

If automation fails:

A screenshot is automatically captured

Saved in the root directory

Example:

error-1718452992.png

This helps in debugging failed automation steps.
