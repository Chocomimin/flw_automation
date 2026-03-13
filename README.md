<div align="center">

# 📱 FLW Application – Appium Automation Framework

### Enterprise-Grade Mobile Test Automation for Android Field Worker Applications

[![Appium](https://img.shields.io/badge/Appium-2.x-663399?style=for-the-badge&logo=appium&logoColor=white)](https://appium.io/)
[![WebdriverIO](https://img.shields.io/badge/WebdriverIO-8.x-EA5906?style=for-the-badge&logo=webdriverio&logoColor=white)](https://webdriver.io/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![UiAutomator2](https://img.shields.io/badge/UiAutomator2-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://developer.android.com/training/testing/other-components/ui-automator)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<br/>

> **A production-ready, modular Appium automation framework** built to test the complete end-to-end workflows of the FLW (Field Level Worker) Android application — covering health worker journeys from login to maternal health management.

<br/>

[🚀 Quick Start](#-quick-start) · [📐 Architecture](#-project-architecture) · [🔧 Installation](#-installation--setup) · [▶️ Running Tests](#%EF%B8%8F-running-tests) · [📋 Workflows](#-automated-workflows) · [🐛 Troubleshooting](#-troubleshooting--debugging)

</div>

---

## 📖 Table of Contents

- [About the Project](#-about-the-project)
- [Technology Stack](#-technology-stack)
- [Project Architecture](#-project-architecture)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Quick Start](#-quick-start)
- [Running Tests](#%EF%B8%8F-running-tests)
- [Automated Workflows](#-automated-workflows)
- [Module Reference](#-module-reference)
- [Screenshot Handling](#-screenshot-handling)
- [Configuration](#%EF%B8%8F-configuration)
- [Troubleshooting & Debugging](#-troubleshooting--debugging)
- [Contributing](#-contributing)
- [Future Improvements](#-future-improvements)
- [License](#-license)

---

## 🎯 About the Project

The **FLW Application Automation Framework** is a scalable, maintainable end-to-end mobile test automation solution built for the **FLW (Field Level Worker) Android Application** — a healthcare management tool used by frontline health workers in the field.

This framework automates critical workflows including patient registration, household management, maternal health tracking, and ANC/PNC visit management, ensuring the reliability of the application used by thousands of health workers.

### ✨ Key Highlights

| Feature | Description |
|---|---|
| 🏗️ **Modular Architecture** | Clean separation of test flows into domain-specific modules |
| 🔄 **End-to-End Coverage** | Full workflow automation from login to maternal health management |
| 📸 **Screenshot Capture** | Automatic screenshot capture on failures and key steps |
| ⚡ **Fast Execution** | Optimized wait strategies using UiAutomator2 driver |
| 🧩 **Reusable Steps** | Step modules designed for composition and reuse |
| 📱 **Real Device & Emulator** | Compatible with both physical Android devices and emulators |

---

## 🛠 Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| [Appium](https://appium.io/) | 2.x | Mobile automation server |
| [WebdriverIO](https://webdriver.io/) | 8.x | Test runner & WebDriver client |
| [UiAutomator2](https://github.com/appium/appium-uiautomator2-driver) | Latest | Android UI automation driver |
| [Node.js](https://nodejs.org/) | 18+ | Runtime environment |
| [Java JDK](https://www.oracle.com/java/technologies/downloads/) | 11+ | Android toolchain dependency |
| [Android SDK](https://developer.android.com/studio) | Latest | ADB, emulator tools |

---

## 📐 Project Architecture

```
┌───────────────────────────────┐
│       TEST EXECUTION          │
│   mainTest.js / Spec Files    │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│         LOGIN MODULE          │
│        (loginSteps.js)        │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│      VILLAGE SELECTION        │
│       (villageSteps.js)       │
└───────────────┬───────────────┘
                │
                ▼
┌──────────────────────────────────────────────┐
│               HOME DASHBOARD                 │
│                 12 MODULES                   │
│                                              │
│ 1. All Households                            │
│ 2. All Beneficiaries                         │
│ 3. Eligible Couple                           │
│ 4. Maternal Health                           │
│ 5. Child Care                                │
│ 6. Disease Control                           │
│ 7. Communicable Disease                      │
│ 8. Routine Immunization                      │
│ 9. High Risk Assessments                     │
│ 10. General OPD Care List                    │
│ 11. Death Report                             │
│ 12. ASHA / Village Mapping                   │
└───────────────┬──────────────────────────────┘
                │
                ▼
┌───────────────────────────────┐
│        APPIUM SERVER          │
│       + WebdriverIO           │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│      ANDROID DEVICE /         │
│          EMULATOR             │
│      (FLW Android App)        │
└───────────────────────────────┘
```
### 🔄 Data Flow

```
Test Entry Point
    │
    ├─► Login
    │         │
    │         └─► Select Vilage
    │                   │
    │                   └─► Home (Dashboard)
    │                             │
    │                             ├─► All Beneficiaries (Search, Filter)
    │                             ├─► Eligible Couple List (Registration, Tracking)
    │                             ├─► Maternal Health (PW Registration, ANC, PNC, etc.)
    │                             ├─► Child Care (Newborn, Child, Adolescent, Under 5)
    │                             ├─► Disease Control (NCD, Malaria, Kala Azar, etc.)
    │                             ├─► Communicable Diseases (TB Screening, etc.)
    │                             ├─► Routine Immunization
    │                             └─► High Risk Assessment (PW & Non-PW)
```

---

## 📁 Project Structure

```
MithaaniAppium/
│
├── 📄 mainTest.js                    # Main entry point – orchestrates full E2E flow
├── 📄 memberAdding.js                # Member addition workflow runner
├── 📄 familyMemberWomenSteps.js      # Women-specific family member steps
├── 📄 searchRahul.js                 # Search and lookup utility script
│
├── 📂 all_beneficiaries/
│   └── 📄 beneficiaries.js           # Beneficiary listing and management automation
│
├── 📂 eligible_couple_list/
│   ├── 📄 couple_list.js             # Eligible couple listing automation
│   └── 📄 couple_tracking.js         # Couple follow-up tracking workflows
│
├── 📂 maternal_health/
│   ├── 📄 maternalHealthSteps.js     # Maternal health dashboard navigation
│   ├── 📄 pregnancyRegistrationForm.js # Pregnancy registration form automation
│   ├── 📄 Anc_visits.js              # Antenatal care visit automation
│   └── 📄 Pnc_list.js                # Postnatal care mother list automation
│
├── 📂 steps/
│   ├── 📄 loginSteps.js              # Login & language selection steps
│   ├── 📄 villageSteps.js            # Village selection and navigation steps
│   ├── 📄 householdSteps.js          # Household search and selection steps
│   ├── 📄 householdFormSteps.js      # Household registration form steps
│   └── 📄 headOfFamilySteps.js       # Head of family data entry steps
│
├── 📄 package.json                   # Node.js dependencies & scripts
├── 📄 wdio.conf.js                   # WebdriverIO configuration
└── 📄 README.md                      # Project documentation
```

---

## ✅ Prerequisites

Before setting up the framework, ensure the following are installed and configured on your machine:

| Requirement | Version | Verify Command |
|---|---|---|
| Node.js | ≥ 18.x | `node --version` |
| npm | ≥ 9.x | `npm --version` |
| Java JDK | ≥ 11 | `java -version` |
| Android SDK / ADB | Latest | `adb --version` |
| Appium | 2.x | `appium --version` |
| Appium UiAutomator2 Driver | Latest | `appium driver list --installed` |

### 🔐 Required Environment Variables

Add the following to your `.bashrc`, `.zshrc`, or System Environment Variables:

```bash
export JAVA_HOME=/path/to/your/jdk
export ANDROID_HOME=/path/to/android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/emulator
```

---

## 🔧 Installation & Setup

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-username/MithaaniAppium.git
cd MithaaniAppium
```

### Step 2 — Install Node.js Dependencies

```bash
npm install
```

### Step 3 — Install Appium Globally

```bash
npm install -g appium
```

### Step 4 — Install UiAutomator2 Driver

```bash
appium driver install uiautomator2
```

Verify the driver is installed:

```bash
appium driver list --installed
```

Expected output:
```
✓ uiautomator2  [installed (npm)]
```

### Step 5 — Verify Android Device / Emulator Connection

**For a physical Android device:**
1. Enable **Developer Options** on your device
2. Enable **USB Debugging**
3. Connect via USB
4. Run:

```bash
adb devices
```

**For an Android emulator:**
1. Open Android Studio → AVD Manager
2. Launch your desired emulator
3. Run:

```bash
adb devices
```

Expected output:
```
List of devices attached
emulator-5554    device      # Emulator
R3CN304XXXX      device      # Physical device
```

### Step 6 — Configure `wdio.conf.js`

Update the capabilities in `wdio.conf.js` to match your device:

```javascript
capabilities: [{
    platformName: 'Android',
    'appium:deviceName': 'emulator-5554',       // Your device/emulator name
    'appium:platformVersion': '12',              // Your Android version
    'appium:automationName': 'UiAutomator2',
    'appium:appPackage': 'com.flw.application',  // FLW app package name
    'appium:appActivity': 'com.flw.MainActivity',// FLW main activity
    'appium:noReset': false,
    'appium:fullReset': false,
}]
```

---

## 🚀 Quick Start

```bash
# 1. Start the Appium Server
appium

# 2. In a new terminal — run the full test suite
npm test

# 3. Or run a specific workflow
node mainTest.js
```

---

## ▶️ Running Tests

### 🖥️ Starting the Appium Server

Open a **dedicated terminal window** and start Appium:

```bash
# Start Appium on default port (4723)
appium

# Start on a custom port
appium --port 4724

# Start with verbose logging for debugging
appium --log-level debug

# Start and write logs to a file
appium --log appium.log
```

Expected console output:
```
[Appium] Welcome to Appium v2.x.x
[Appium] Appium REST http interface listener started on 0.0.0.0:4723
```

---

### 🧪 Run Commands

#### Run Full End-to-End Suite

```bash
npm test
```

#### Run Main Workflow (Login → Household → Members)

```bash
node mainTest.js
```

#### Run Member Addition Workflow

```bash
node memberAdding.js
```

#### Run Women Family Member Steps

```bash
node familyMemberWomenSteps.js
```

#### Run Search Workflow

```bash
node searchRahul.js
```

#### Run Beneficiary Management

```bash
node all_beneficiaries/beneficiaries.js
```

#### Run Eligible Couple List

```bash
node eligible_couple_list/couple_list.js
```

#### Run Couple Tracking

```bash
node eligible_couple_list/couple_tracking.js
```

#### Run Maternal Health Steps

```bash
node maternal_health/maternalHealthSteps.js
```

#### Run Pregnancy Registration Form

```bash
node maternal_health/pregnancyRegistrationForm.js
```

#### Run ANC Visits

```bash
node maternal_health/Anc_visits.js
```

#### Run PNC Mother List

```bash
node maternal_health/Pnc_list.js
```

#### Run via WebdriverIO Test Runner

```bash
# Run all specs
npx wdio run wdio.conf.js

# Run a specific spec file
npx wdio run wdio.conf.js --spec ./steps/loginSteps.js
```

---

## 📋 Automated Workflows

### 1. 🔐 Login & Language Selection
**File:** `steps/loginSteps.js`

Automates the initial application entry point:
- Launches the FLW application
- Handles splash screen and loading states
- Selects preferred language from the language picker
- Enters valid credentials (username & password)
- Verifies successful login and dashboard load

---

### 2. 🏘️ Village Selection
**File:** `steps/villageSteps.js`

Automates the geographic scope configuration:
- Navigates to the village selection screen
- Searches for a specific village by name
- Selects the target village from the list
- Confirms selection and proceeds to the dashboard

---

### 3. 🏠 Household Registration
**Files:** `steps/householdSteps.js`, `steps/householdFormSteps.js`

Automates the creation of new household records:
- Navigates to the household management section
- Fills in household address and location details
- Submits the household registration form
- Verifies successful record creation

---

### 4. 👨‍👩‍👧‍👦 Add Family Members
**Files:** `memberAdding.js`, `familyMemberWomenSteps.js`

Automates adding members to an existing household:
- Opens a registered household
- Initiates the add member flow
- Fills demographic details (name, age, gender, relationship)
- Handles women-specific additional fields
- Saves and verifies member records

---

### 5. 👤 Head of Family Registration
**File:** `steps/headOfFamilySteps.js`

Automates head of household designation:
- Fills head of family personal information
- Captures identification details
- Links to the household record

---

### 6. 📊 Beneficiary Management
**File:** `all_beneficiaries/beneficiaries.js`

Automates the beneficiary listing module:
- Navigates to the All Beneficiaries section
- Searches and filters beneficiaries by category
- Verifies beneficiary records and status indicators

---

### 7. 💑 Eligible Couple List
**File:** `eligible_couple_list/couple_list.js`

Automates the eligible couple management:
- Navigates to the Eligible Couple List
- Lists and filters eligible couples
- Validates couple data fields and status

---

### 8. 🔍 Couple Tracking
**File:** `eligible_couple_list/couple_tracking.js`

Automates follow-up and tracking workflows:
- Opens a specific couple's record
- Records tracking and follow-up actions
- Updates couple health status

---

### 9. 🤱 Maternal Health Registration
**File:** `maternal_health/maternalHealthSteps.js`

Automates the maternal health module entry:
- Navigates to the Maternal Health section
- Lists registered maternal health beneficiaries
- Initiates new maternal health registrations

---

### 10. 🩺 Pregnancy Registration Form
**File:** `maternal_health/pregnancyRegistrationForm.js`

Automates the complete pregnancy registration:
- Fills Last Menstrual Period (LMP) date
- Enters Expected Delivery Date (EDD)
- Records gravida/para history
- Submits and verifies pregnancy registration

---

### 11. 💉 ANC Visits
**File:** `maternal_health/Anc_visits.js`

Automates Antenatal Care visit recording:
- Opens a registered pregnant woman's profile
- Records ANC visit details (blood pressure, weight, supplements)
- Logs visit date and provider information
- Submits ANC visit form

---

### 12. 👶 PNC Mother List
**File:** `maternal_health/Pnc_list.js`

Automates the Postnatal Care list:
- Navigates to PNC Mother List
- Views postnatal care beneficiaries
- Records PNC check-up details and outcomes

---

## 📦 Module Reference

### `steps/` — Reusable Step Definitions

| Module | Responsibility |
|---|---|
| `loginSteps.js` | Application launch, authentication, and language selection |
| `villageSteps.js` | Village search, selection, and geographic scope setting |
| `householdSteps.js` | Household search, navigation, and selection |
| `householdFormSteps.js` | Household registration form field interactions |
| `headOfFamilySteps.js` | Head of family form entry and submission |

### `maternal_health/` — Maternal Health Module

| Module | Responsibility |
|---|---|
| `maternalHealthSteps.js` | Maternal health section navigation and listing |
| `pregnancyRegistrationForm.js` | Full pregnancy registration form automation |
| `Anc_visits.js` | Antenatal Care visit recording |
| `Pnc_list.js` | Postnatal Care mother list and updates |

### `eligible_couple_list/` — Couple Management Module

| Module | Responsibility |
|---|---|
| `couple_list.js` | Eligible couple listing and filtering |
| `couple_tracking.js` | Couple follow-up and health tracking |

### `all_beneficiaries/` — Beneficiary Module

| Module | Responsibility |
|---|---|
| `beneficiaries.js` | Beneficiary search, listing, and management |

---

## 📸 Screenshot Handling

The framework captures screenshots at critical checkpoints and on test failures to aid debugging and provide visual evidence of test execution.

### Automatic Failure Screenshots

WebdriverIO automatically captures screenshots on test failure. Configure this in `wdio.conf.js`:

```javascript
afterTest: async function(test, context, { error }) {
    if (error) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = `./screenshots/failure_${test.title}_${timestamp}.png`;
        await browser.saveScreenshot(screenshotPath);
        console.log(`Screenshot saved: ${screenshotPath}`);
    }
}
```

### Manual Screenshot Capture

Use this snippet anywhere in your step files to capture a screenshot:

```javascript
// Capture a named screenshot
await browser.saveScreenshot('./screenshots/village_selected.png');

// Capture with dynamic timestamp
const timestamp = Date.now();
await browser.saveScreenshot(`./screenshots/step_${timestamp}.png`);
```

### Screenshots Directory Structure

```
screenshots/
├── login_success_2024-01-15.png
├── village_selected_2024-01-15.png
├── household_created_2024-01-15.png
├── failure_anc_visit_form_2024-01-15.png
└── ...
```

> 💡 **Tip:** Add `screenshots/` to your `.gitignore` to avoid committing test artifacts.

---

## ⚙️ Configuration

### `wdio.conf.js` — Key Settings

```javascript
exports.config = {
    runner: 'local',
    port: 4723,                        // Appium server port
    path: '/',
    
    capabilities: [{
        platformName: 'Android',
        'appium:deviceName': 'emulator-5554',
        'appium:platformVersion': '12',
        'appium:automationName': 'UiAutomator2',
        'appium:appPackage': 'com.flw.application',
        'appium:appActivity': '.MainActivity',
        'appium:noReset': false,
        'appium:newCommandTimeout': 120,
        'appium:autoGrantPermissions': true,    // Auto-grant app permissions
    }],

    // Test timeouts
    waitforTimeout: 10000,             // Default element wait (ms)
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    
    // Test framework
    framework: 'mocha',
    mochaOpts: {
        timeout: 120000                // Test case timeout (ms)
    },

    // Reporters
    reporters: ['spec'],
}
```

---

## 🐛 Troubleshooting & Debugging

### ❌ Appium Server Won't Start

**Symptom:** `Error: listen EADDRINUSE :::4723`

```bash
# Kill the process using port 4723
lsof -ti :4723 | xargs kill -9

# Then restart Appium
appium
```

---

### ❌ No Devices Found

**Symptom:** `adb: no devices/emulators found`

```bash
# Restart ADB server
adb kill-server
adb start-server
adb devices

# For emulator — ensure it's fully booted before running tests
# Check emulator status
adb -e shell getprop sys.boot_completed  # Should return "1"
```

---

### ❌ UiAutomator2 Driver Not Found

**Symptom:** `Error: No driver found for automationName 'UiAutomator2'`

```bash
# Reinstall the driver
appium driver uninstall uiautomator2
appium driver install uiautomator2

# Verify installation
appium driver list --installed
```

---

### ❌ Element Not Found / Stale Element

**Symptom:** `ElementNotFound` or `StaleElementReferenceError`

```javascript
// Use explicit waits instead of implicit sleeps
await $('~element-id').waitForDisplayed({ timeout: 10000 });

// Or wait for clickable
await $('//android.widget.Button').waitForClickable({ timeout: 8000 });
```

---

### ❌ App Package / Activity Not Found

**Symptom:** `Cannot start the '...' application`

```bash
# Find the correct package name and activity
adb shell pm list packages | grep flw

# Get the launcher activity
adb shell monkey -p com.flw.application -v 1 2>&1 | grep "Launching activity"
```

---

### ❌ Session Creation Failed

**Symptom:** `Failed to create session. An unknown server-side error occurred`

Checklist:
- [ ] Is the Appium server running? (`appium`)
- [ ] Is the device connected and authorized? (`adb devices`)
- [ ] Is the app installed on the device? (`adb shell pm list packages | grep flw`)
- [ ] Are `appPackage` and `appActivity` correct in `wdio.conf.js`?
- [ ] Is `JAVA_HOME` and `ANDROID_HOME` set correctly?

---

### 🔍 Enable Debug Logging

```bash
# Run Appium with full debug output
appium --log-level debug

# Add to wdio.conf.js for verbose WebdriverIO logs
logLevel: 'debug',
```

---

### 📋 Useful ADB Commands

```bash
# Screenshot from device to local machine
adb exec-out screencap -p > debug_screen.png

# Stream device logs
adb logcat | grep -i "flw\|appium\|error"

# Clear app data (reset state)
adb shell pm clear com.flw.application

# Force stop app
adb shell am force-stop com.flw.application

# Check device info
adb shell getprop ro.product.model
adb shell getprop ro.build.version.release
```

---

## 🤝 Contributing

Contributions are warmly welcome! Whether it's fixing a bug, improving documentation, or adding new workflow automation — all PRs are appreciated.

### How to Contribute

1. **Fork** the repository
2. **Create** your feature branch
   ```bash
   git checkout -b feature/add-pnc-workflow
   ```
3. **Write** your automation code following the existing module patterns
4. **Commit** your changes with a descriptive message
   ```bash
   git commit -m "feat: add PNC follow-up visit automation steps"
   ```
5. **Push** to your branch
   ```bash
   git push origin feature/add-pnc-workflow
   ```
6. **Open** a Pull Request with a clear description of changes

### 📏 Code Style Guidelines

- Follow the existing **step-module separation** pattern
- Use descriptive variable names for element selectors
- Add `console.log()` statements at key automation steps for traceability
- Use `waitForDisplayed` / `waitForClickable` instead of `browser.pause()`
- Group related selectors at the top of each file
- Document complex locator strategies with inline comments

### 🐞 Reporting Issues

When reporting a bug, please include:
- Node.js version (`node --version`)
- Appium version (`appium --version`)
- Android version and device model
- Full error message and stack trace
- Steps to reproduce

---

## 🔮 Future Improvements

| Feature | Priority | Status |
|---|---|---|
| 🧪 Integration with Allure Reports for rich HTML reports | High | 🔲 Planned |
| ♻️ Data-driven testing with JSON/Excel test data files | High | 🔲 Planned |
| 🔁 GitHub Actions CI/CD pipeline integration | High | 🔲 Planned |
| 📱 iOS version support using XCUITest driver | Medium | 🔲 Planned |
| 📊 Custom test execution dashboard | Medium | 🔲 Planned |
| 🎯 Page Object Model (POM) refactoring | Medium | 🔲 Planned |
| 🔄 Parallel test execution support | Medium | 🔲 Planned |
| 📧 Email notification on test failures | Low | 🔲 Planned |
| 🎥 Video recording of test runs | Low | 🔲 Planned |
| ☁️ Integration with BrowserStack / Sauce Labs | Low | 🔲 Planned |

---

## 👨‍💻 Author

<div align="center">

**Built with ❤️ by the FLW QA Automation Team**

*Ensuring reliable healthcare software for frontline health workers*

</div>

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**⭐ If this framework helped you, consider giving it a star on GitHub!**

[![GitHub Stars](https://img.shields.io/github/stars/your-username/MithaaniAppium?style=social)](https://github.com/your-username/MithaaniAppium)

</div>
