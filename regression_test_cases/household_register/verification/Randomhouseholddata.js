// randomHouseholdData.js
// ✅ Generates a random, internally-consistent household identity: head's
//    first/last name, father's name, mother's name, spouse's name, and a
//    valid-format mobile number.

const FIRST_NAMES_FEMALE = [
    'Priya', 'Anjali', 'Sunita', 'Kavita', 'Meena',
    'Pooja', 'Divya', 'Rekha', 'Neha', 'Shweta',
    'Kiran', 'Lata', 'Geeta', 'Radha', 'Suman'
];

const FIRST_NAMES_MALE = [
    'Ramesh', 'Suresh', 'Vikram', 'Anil', 'Rajesh',
    'Sanjay', 'Deepak', 'Manoj', 'Arun', 'Ashok',
    'Vijay', 'Ravi', 'Sunil', 'Prakash', 'Mahesh'
];

const LAST_NAMES = [
    'Sharma', 'Verma', 'Yadav', 'Singh', 'Patel',
    'Kumar', 'Gupta', 'Rathod', 'Mehta', 'Chauhan',
    'Rana', 'Jain', 'Bhosale', 'Nair', 'Reddy'
];

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomMobileNumber() {
    // Indian mobile numbers: starts 6-9, 10 digits total
    const firstDigit = randomFrom(['6', '7', '8', '9']);
    let rest = '';
    for (let i = 0; i < 9; i++) rest += Math.floor(Math.random() * 10);
    return firstDigit + rest;
}

/**
 * Builds a random, internally-consistent identity set for a household.
 * @param {"Male"|"Female"} gender - gender of the head of family / beneficiary
 * @returns {object} random data fields
 */
function randomHouseholdIdentity(gender = 'Female') {
    const headFirstNames = gender === 'Male' ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE;
    const spouseFirstNames = gender === 'Male' ? FIRST_NAMES_FEMALE : FIRST_NAMES_MALE;

    const firstName = randomFrom(headFirstNames);
    const lastName = randomFrom(LAST_NAMES);

    const fatherName = `${randomFrom(FIRST_NAMES_MALE)} ${randomFrom(LAST_NAMES)}`;
    const motherName = `${randomFrom(FIRST_NAMES_FEMALE)} ${randomFrom(LAST_NAMES)}`;
    const spouseName = `${randomFrom(spouseFirstNames)} ${randomFrom(LAST_NAMES)}`;

    return {
        firstName,
        lastName,
        householdName: `${firstName} ${lastName}`,   // full name used to search/verify later
        fatherName,
        motherName,
        spouseName,
        mobileNumber: randomMobileNumber(),
        ageAtMarriage: String(18 + Math.floor(Math.random() * 15)), // 18-32
        gender
    };
}

module.exports = { randomHouseholdIdentity, randomFrom, randomMobileNumber };