/**
 * Unit Test for CSV Helper and Formula Injection Sanitizer
 * Runs purely in sandbox (no network/DB needed)
 */

const { sanitizeCsvCell, generateCsv } = require('../utils/csvHelper');

console.log('====================================================');
console.log('   Testing CSV Formula Injection & Formatting       ');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

const assert = (condition, desc) => {
  if (condition) {
    console.log(`  [PASS] ${desc}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${desc}`);
    failed++;
  }
};

// Test 1: Standard string
const cell1 = sanitizeCsvCell('Rikta Maity');
assert(cell1 === '"Rikta Maity"', 'Normal text properly wrapped in quotes');

// Test 2: Text with comma
const cell2 = sanitizeCsvCell('Kolkata, West Bengal');
assert(cell2 === '"Kolkata, West Bengal"', 'Text with commas preserved inside quotes');

// Test 3: Text with quotes
const cell3 = sanitizeCsvCell('The "Best" Portal');
assert(cell3 === '"The ""Best"" Portal"', 'Internal double quotes escaped by doubling');

// Test 4: Formula Injection with '='
const cell4 = sanitizeCsvCell('=cmd|"/c calc"!A0');
assert(cell4 === '"\'=cmd|""/c calc""!A0"', 'Leading "=" escaped with single quote');

// Test 5: Formula Injection with '+'
const cell5 = sanitizeCsvCell('+123456');
assert(cell5 === '"\'+123456"', 'Leading "+" escaped with single quote');

// Test 6: Formula Injection with '-'
const cell6 = sanitizeCsvCell('-SUM(A1:A10)');
assert(cell6 === '"\'-SUM(A1:A10)"', 'Leading "-" escaped with single quote');

// Test 7: Formula Injection with '@'
const cell7 = sanitizeCsvCell('@SUM(1,2)');
assert(cell7 === '"\'@SUM(1,2)"', 'Leading "@" escaped with single quote');

// Test 8: Null and undefined
assert(sanitizeCsvCell(null) === '""', 'Null value becomes empty string');
assert(sanitizeCsvCell(undefined) === '""', 'Undefined value becomes empty string');

// Test 9: Complete CSV generation
const headers = ['ID', 'Name', 'Score'];
const rows = [
  ['1', 'Ananya Sen', 95.5],
  ['2', '=CMD Hacker', 98.0]
];
const csvOutput = generateCsv(headers, rows);
assert(csvOutput.includes('"ID","Name","Score"'), 'Headers generated correctly');
assert(csvOutput.includes('"2","\'=CMD Hacker","98"'), 'Rows generated with sanitized formula cells');

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

