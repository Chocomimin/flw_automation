📱 Mitanin App – Appium Automation Project

This project automates the Household Registration flow of the
org.piramalswasthya.sakhi.mitanin.uat Android application using:

🚀 Appium

🧪 WebdriverIO

📱 UiAutomator2

🟢 Node.js

📌 Project Overview

This automation script performs the complete flow:

Select Language (English)

Login with valid credentials

Select Village

Navigate to All Household

Start New Household Registration

Accept Consent

Fill Household Registration Form

Submit Form

🗂 Project Structure
project-folder/
│
├── mainTest.js
│
└── steps/
    ├── loginSteps.js
    ├── villageSteps.js
    ├── householdSteps.js
    └── householdFormSteps.js

📄 File Description
1️⃣ mainTest.js

Entry point of automation

Creates Appium driver session

Calls all step functions

Handles errors & screenshots

2️⃣ loginSteps.js

Handles:

Language selection

Username & Password entry

Login button click

Functions:

selectEnglish(driver)

login(driver, username, password)

3️⃣ villageSteps.js

Handles:

Village dropdown selection

Continue button click

Function:

selectVillage(driver, villageName)

4️⃣ householdSteps.js

Handles:

Click All Household

Click New Household Registration

Accept Consent

Functions:

clickAllHousehold(driver)

clickNewHouseholdRegistration(driver)

acceptConsent(driver)

5️⃣ householdFormSteps.js

Handles complete form filling:

Fields automated:

First Name

Last Name

Mobile Number

House No

Ward No

Ward Name

Mohalla Name

Economic Status (APL/BPL/Don’t Know)

Residential Area (Rural/Urban)

Submit Form

Main Function:

fillHouseholdFormWithExamples(driver)

⚙️ Prerequisites

Make sure the following are installed:

Node.js (v16+ recommended)

Appium Server

Android SDK

Real Android Device / Emulator

Java JDK

📦 Installation
npm install webdriverio
npm install appium


Start Appium server:

appium

▶️ How to Run
node mainTest.js

🔧 Desired Capabilities Used
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

🧪 Test Flow Summary
Launch App
   ↓
Select English
   ↓
Login
   ↓
Select Village
   ↓
All Household
   ↓
New Registration
   ↓
Accept Consent
   ↓
Fill Form
   ↓
Submit

📸 Failure Handling

Screenshot automatically captured on failure

Saved as:

error-<timestamp>.png

🛠 Features

✅ Modular Step Design
✅ Reusable Functions
✅ Explicit Waits
✅ Error Handling
✅ Screenshot Capture
✅ Dropdown Validation
✅ Form Validation Check
