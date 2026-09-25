// Unit test runner for OIML R 76-1:2006 MPE engine

import { getTable6MPEBand } from '../src/rules/oimlR76/2006/mpeRules.ts';
import { calculateMPE, evaluateMPEScaleReading } from '../src/services/oimlComplianceService.ts';

console.log('================================================================');
console.log(' RUNNING OIML R 76-1:2006 MPE ENGINE AUTOMATED UNIT TESTS');
console.log('================================================================\n');

let testCount = 0;
const failures = [];

function assert(condition, testName, detail) {
  testCount++;
  if (!condition) {
    failures.push(`FAILED: [${testName}] - ${detail || 'Assertion failed'}`);
  }
}

// --------------------------------------------------------------------------
// TEST GROUP 1: PROMPT EXAMPLE TEST CASES
// --------------------------------------------------------------------------

// Example 1: Class III, e=10g, Load=10kg, Reading=10.008kg -> WITHIN_MPE (+8g vs ±10g)
const ex1 = evaluateMPEScaleReading({
  referenceLoad: 10,
  referenceLoadUnit: 'kg',
  scaleReading: 10.008,
  scaleReadingUnit: 'kg',
  accuracyClass: 'Class III',
  verificationScaleIntervalE: 10,
  eUnit: 'g',
  verificationMode: 'INITIAL_VERIFICATION',
});
assert(ex1.mpeResult.loadInE === 1000, 'Example 1 - loadInE calculation', `Expected 1000, got ${ex1.mpeResult.loadInE}`);
assert(ex1.mpeResult.mpeMultiplier === 1.0, 'Example 1 - MPE multiplier', `Expected 1.0, got ${ex1.mpeResult.mpeMultiplier}`);
assert(ex1.mpeResult.mpeValue === 10, 'Example 1 - MPE value in g', `Expected 10, got ${ex1.mpeResult.mpeValue}`);
assert(ex1.indicatedDifferenceInEUnit === 8, 'Example 1 - difference in g', `Expected +8, got ${ex1.indicatedDifferenceInEUnit}`);
assert(ex1.status === 'WITHIN_MPE', 'Example 1 - WITHIN_MPE status', `Expected WITHIN_MPE, got ${ex1.status}`);

// Example 2: Class III, e=10g, Load=10kg, Reading=10.012kg -> EXCEEDS_MPE (+12g vs ±10g)
const ex2 = evaluateMPEScaleReading({
  referenceLoad: 10,
  referenceLoadUnit: 'kg',
  scaleReading: 10.012,
  scaleReadingUnit: 'kg',
  accuracyClass: 'Class III',
  verificationScaleIntervalE: 10,
  eUnit: 'g',
  verificationMode: 'INITIAL_VERIFICATION',
});
assert(ex2.indicatedDifferenceInEUnit === 12, 'Example 2 - difference in g', `Expected +12, got ${ex2.indicatedDifferenceInEUnit}`);
assert(ex2.status === 'EXCEEDS_MPE', 'Example 2 - EXCEEDS_MPE status', `Expected EXCEEDS_MPE, got ${ex2.status}`);

// Example 3: Class III, e=10g, Load=10kg, Reading=9.994kg -> WITHIN_MPE (-6g vs ±10g)
const ex3 = evaluateMPEScaleReading({
  referenceLoad: 10,
  referenceLoadUnit: 'kg',
  scaleReading: 9.994,
  scaleReadingUnit: 'kg',
  accuracyClass: 'Class III',
  verificationScaleIntervalE: 10,
  eUnit: 'g',
  verificationMode: 'INITIAL_VERIFICATION',
});
assert(ex3.indicatedDifferenceInEUnit === -6, 'Example 3 - difference in g', `Expected -6, got ${ex3.indicatedDifferenceInEUnit}`);
assert(ex3.absoluteDifferenceInEUnit === 6, 'Example 3 - absolute difference in g', `Expected 6, got ${ex3.absoluteDifferenceInEUnit}`);
assert(ex3.status === 'WITHIN_MPE', 'Example 3 - WITHIN_MPE status', `Expected WITHIN_MPE, got ${ex3.status}`);

// --------------------------------------------------------------------------
// TEST GROUP 2: CLASS III EXACT BOUNDARIES
// --------------------------------------------------------------------------
assert(getTable6MPEBand('Class III', 500).multiplierInE === 0.5, 'Class III boundary 500e', 'Upper boundary 500e must be ±0.5e');
assert(getTable6MPEBand('Class III', 500.001).multiplierInE === 1.0, 'Class III boundary 500.001e', 'Just above 500e must be ±1.0e');
assert(getTable6MPEBand('Class III', 2000).multiplierInE === 1.0, 'Class III boundary 2000e', 'Upper boundary 2000e must be ±1.0e');
assert(getTable6MPEBand('Class III', 2000.001).multiplierInE === 1.5, 'Class III boundary 2000.001e', 'Just above 2000e must be ±1.5e');

// --------------------------------------------------------------------------
// TEST GROUP 3: CLASS II EXACT BOUNDARIES
// --------------------------------------------------------------------------
assert(getTable6MPEBand('Class II', 5000).multiplierInE === 0.5, 'Class II boundary 5000e', 'Upper boundary 5000e must be ±0.5e');
assert(getTable6MPEBand('Class II', 5000.001).multiplierInE === 1.0, 'Class II boundary 5000.001e', 'Just above 5000e must be ±1.0e');
assert(getTable6MPEBand('Class II', 20000).multiplierInE === 1.0, 'Class II boundary 20000e', 'Upper boundary 20000e must be ±1.0e');
assert(getTable6MPEBand('Class II', 20000.001).multiplierInE === 1.5, 'Class II boundary 20000.001e', 'Just above 20000e must be ±1.5e');

// --------------------------------------------------------------------------
// TEST GROUP 4: CLASS IIII EXACT BOUNDARIES
// --------------------------------------------------------------------------
assert(getTable6MPEBand('Class IIII', 50).multiplierInE === 0.5, 'Class IIII boundary 50e', 'Upper boundary 50e must be ±0.5e');
assert(getTable6MPEBand('Class IIII', 50.001).multiplierInE === 1.0, 'Class IIII boundary 50.001e', 'Just above 50e must be ±1.0e');
assert(getTable6MPEBand('Class IIII', 200).multiplierInE === 1.0, 'Class IIII boundary 200e', 'Upper boundary 200e must be ±1.0e');
assert(getTable6MPEBand('Class IIII', 200.001).multiplierInE === 1.5, 'Class IIII boundary 200.001e', 'Just above 200e must be ±1.5e');

// --------------------------------------------------------------------------
// TEST GROUP 5: CLASS I EXACT BOUNDARIES
// --------------------------------------------------------------------------
assert(getTable6MPEBand('Class I', 50000).multiplierInE === 0.5, 'Class I boundary 50000e', 'Upper boundary 50000e must be ±0.5e');
assert(getTable6MPEBand('Class I', 50000.001).multiplierInE === 1.0, 'Class I boundary 50000.001e', 'Just above 50000e must be ±1.0e');
assert(getTable6MPEBand('Class I', 200000).multiplierInE === 1.0, 'Class I boundary 200000e', 'Upper boundary 200000e must be ±1.0e');
assert(getTable6MPEBand('Class I', 200000.001).multiplierInE === 1.5, 'Class I boundary 200000.001e', 'Just above 200000e must be ±1.5e');

// --------------------------------------------------------------------------
// TEST GROUP 6: IN-SERVICE MODE (DOUBLED MPE)
// --------------------------------------------------------------------------
assert(getTable6MPEBand('Class III', 1000, 'IN_SERVICE').multiplierInE === 2.0, 'In-Service multiplier doubling', 'Band 1.0e initial must double to 2.0e in-service');
const inServiceCheck = calculateMPE({
  accuracyClass: 'Class III',
  verificationScaleIntervalE: 10,
  eUnit: 'g',
  testLoad: 10,
  testLoadUnit: 'kg',
  verificationMode: 'IN_SERVICE',
});
assert(inServiceCheck.mpeValue === 20, 'In-Service absolute MPE value', `Expected 20g, got ${inServiceCheck.mpeValue}g`);

// --------------------------------------------------------------------------
// TEST GROUP 7: MIXED MASS UNITS & NEGATIVE ERRORS
// --------------------------------------------------------------------------
const mixedUnitsCheck = evaluateMPEScaleReading({
  referenceLoad: 1, // 1 metric ton
  referenceLoadUnit: 't',
  scaleReading: 999.5, // 999.5 kg
  scaleReadingUnit: 'kg',
  accuracyClass: 'Class IIII',
  verificationScaleIntervalE: 500, // 500 g
  eUnit: 'g',
  verificationMode: 'INITIAL_VERIFICATION',
});
assert(mixedUnitsCheck.mpeResult.loadInE === 2000, 'Mixed units loadInE', `Expected 2000, got ${mixedUnitsCheck.mpeResult.loadInE}`);
assert(mixedUnitsCheck.indicatedDifferenceInEUnit === -500, 'Negative error in eUnit', `Expected -500, got ${mixedUnitsCheck.indicatedDifferenceInEUnit}`);
assert(mixedUnitsCheck.status === 'WITHIN_MPE', 'Negative error within MPE status', `Expected WITHIN_MPE, got ${mixedUnitsCheck.status}`);

if (failures.length === 0) {
  console.log(`✅ SUCCESS: All ${testCount} unit tests passed cleanly!`);
  console.log('================================================================');
  process.exit(0);
} else {
  console.error(`❌ FAILURE: ${failures.length} of ${testCount} tests failed:`);
  failures.forEach((f) => console.error(` - ${f}`));
  console.log('================================================================');
  process.exit(1);
}
