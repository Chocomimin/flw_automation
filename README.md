📱 FLW Application – Appium Automation Project
This project automates the workflow of the org.piramalswasthya.sakhi.mitanin.uat Android application using:

🚀 Appium 🧪 WebdriverIO 📱 UiAutomator2 🟢 Node.js ## 📌 Project Overview
This automation script has been expanded to perform multiple complete flows within the app, including:

Login and Village Selection

New Household Registration

Adding Family Members

Beneficiaries Management

Eligible Couple Listing & Tracking

Maternal Health & Pregnancy Registration

🗂 Project Structure
Plaintext
MithaaniAppium/
│
├── mainTest.js                        # Runs Household Registration flow
├── memberAdding.js                    # Runs Family Member addition flow
├── familyMemberWomenSteps.js          # Steps for female family members
├── searchRahul.js                     # Search functionality test
│
├── all_beneficiaries/
│   └── beneficiaries.js               # Beneficiaries testing module
│
├── eligible_couple_list/
│   ├── couple_list.js                 # Eligible couple list test
│   └── couple_tracking.js             # Eligible couple tracking test
│
├── maternal_health/
│   ├── maternalHealthSteps.js         # Maternal health execution flow
│   └── pregnancyRegistrationForm.js   # Pregnancy form field handlers
│
└── steps/                             # Reusable Step Definitions
    ├── loginSteps.js
    ├── villageSteps.js
    ├── householdSteps.js
    ├── householdFormSteps.js
    └── headOfFamilySteps.js
▶️ How to Run
Depending on the specific flow you want to test, use the following commands in your terminal:

1. Login to Household Registration

Bash
node mainTest.js
2. Add a Family Member

Bash
node memberAdding.js
3. Test Beneficiaries

Bash
node all_beneficiaries/beneficiaries.js
4. Test Eligible Couples
(Run both files as needed for listing and tracking)

Bash
node eligible_couple_list/couple_list.js
node eligible_couple_list/couple_tracking.js
5. Test Pregnancy Registration (Maternal Health)

Bash
node maternal_health/maternalHealthSteps.js
📄 Core Modules Description
mainTest.js & steps/: The entry point for the base automation. It handles Language selection (English), Login, Village selection, navigating to All Household, accepting consent, and filling/submitting the Household Registration Form.

memberAdding.js: Extends the household flow by adding individual family members and defining the Head of Family.

beneficiaries.js: Automates the verification and processing of the All Beneficiaries list.

couple_list.js & couple_tracking.js: Handles the Eligible Couple module, verifying list generation and tracking existing couples.

maternalHealthSteps.js & pregnancyRegistrationForm.js: Automates the Maternal Health module, specifically focusing on handling dynamic elements and complex scrolling for the Pregnancy Registration form.

⚙️ Prerequisites
Make sure the following are installed:

Node.js (v16+ recommended)

Appium Server

Android SDK

Real Android Device / Emulator

Java JDK

📦 Installation
Bash
npm install webdriverio
npm install appium
Start Appium server before running any tests:

Bash
appium
🔧 Desired Capabilities Used
JavaScript
{
  platformName: "Android",
  automationName: "UiAutomator2",
  appPackage: "org.piramalswasthya.sakhi.mitanin.uat",
  appActivity: "org.piramalswasthya.sakhi.ui.login_activity.LoginActivity",
  noReset: false,
  autoGrantPermissions: true,
  language: "en",
  locale: "US"
}
📸 Failure Handling
Screenshots are automatically captured on failure.

Saved in the root directory as: error-<timestamp>.png

🛠 Features
✅ Modular Step Design

✅ Reusable W3C Pointer Action Functions

✅ Explicit Waits & Dynamic Scrolling

✅ Error Handling & Screenshot Capture

✅ Complex Dropdown & Calendar Validation

✅ Form Validation Check
