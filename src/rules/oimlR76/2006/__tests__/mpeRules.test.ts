import { getTable6MPEBand } from '../mpeRules';
import { calculateMPE, evaluateMPEScaleReading } from '../../../../services/oimlComplianceService';

/**
 * ============================================================================
 * AUTOMATED UNIT TEST SUITE FOR OIML R 76-1:2006 MPE ENGINE
 * ============================================================================
 * 
 * Verifies exact Table 6 boundary conditions, unit conversions, in-service mode,
 * and scale reading evaluation across Class I, II, III, and IIII.
 * ============================================================================
 */

export function runMPEEngineUnitTests(): { passed: boolean; testCount: number; failures: string[] } {
  const failures: string[] = [];
  let testCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
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
  // 1 t = 1000 kg = 1000000 g. e = 500 g. loadInE = 1000000 / 500 = 2000e. Class IIII > 200e => ±1.5e = ±750 g.
  // Difference = 999.5 kg - 1000 kg = -0.5 kg = -500 g. Abs diff = 500 g <= 750 g => WITHIN_MPE.
  assert(mixedUnitsCheck.mpeResult.loadInE === 2000, 'Mixed units loadInE', `Expected 2000, got ${mixedUnitsCheck.mpeResult.loadInE}`);
  assert(mixedUnitsCheck.indicatedDifferenceInEUnit === -500, 'Negative error in eUnit', `Expected -500, got ${mixedUnitsCheck.indicatedDifferenceInEUnit}`);
  assert(mixedUnitsCheck.status === 'WITHIN_MPE', 'Negative error within MPE status', `Expected WITHIN_MPE, got ${mixedUnitsCheck.status}`);

  return {
    passed: failures.length === 0,
    testCount,
    failures,
  };
}

// Auto-run if executed directly via Node / TS runner
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('mpeRules.test')) {
  console.log('Running OIML R 76-1:2006 MPE Engine Unit Tests...');
  const res = runMPEEngineUnitTests();
  if (res.passed) {
    console.log(`✅ ALL ${res.testCount} UNIT TESTS PASSED CLEANLY!`);
  } else {
    console.error(`❌ ${res.failures.length} / ${res.testCount} TESTS FAILED:`);
    res.failures.forEach((f) => console.error(f));
    process.exit(1);
  }
}
