import {
  calculateEccentricityTestLoad,
  getEccentricityPositions,
  validateEccentricityScaleReading,
  evaluateEccentricityPosition,
  evaluateOverallEccentricity,
} from '../src/services/eccentricityService.ts';

function runTests() {
  console.log('====================================================');
  console.log('OIML R 76 ECCENTRICITY ENGINE UNIT TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✕ FAIL: ${testName}`);
      process.exitCode = 1;
    }
  }

  // 1. Test Load Calculation for Standard Instrument <= 4 supports
  const testLoad30kg = calculateEccentricityTestLoad({
    maxCapacity: 30,
    maxUnit: 'kg',
    profile: 'STANDARD_UP_TO_4_SUPPORTS',
  });
  assert(testLoad30kg === 10, `30 kg Max standard instrument test load is 10 kg (got ${testLoad30kg})`);

  // 2. Test Load Calculation for > 4 supports (e.g. 6 supports)
  const testLoad6Supports = calculateEccentricityTestLoad({
    maxCapacity: 50,
    maxUnit: 'kg',
    profile: 'MORE_THAN_4_SUPPORTS',
    numSupports: 6,
  });
  assert(testLoad6Supports === 10, `50 kg Max 6-support instrument test load is 10 kg (got ${testLoad6Supports})`);

  // 3. Test Positions Mapping for Standard Instrument
  const positions = getEccentricityPositions('STANDARD_UP_TO_4_SUPPORTS');
  assert(positions.length === 4, `Standard instrument has 4 positions (got ${positions.length})`);
  assert(positions[0].label === 'Front Left', `Pos 1 label is Front Left (got ${positions[0].label})`);
  assert(positions[1].label === 'Front Right', `Pos 2 label is Front Right (got ${positions[1].label})`);
  assert(positions[2].label === 'Rear Left', `Pos 3 label is Rear Left (got ${positions[2].label})`);
  assert(positions[3].label === 'Rear Right', `Pos 4 label is Rear Right (got ${positions[3].label})`);

  // 4. Input Sanity Validation
  const validCheck = validateEccentricityScaleReading(10.002, 10);
  assert(validCheck.isValid === true, `10.002 kg reading for 10 kg load passes sanity check`);

  const invalidHighCheck = validateEccentricityScaleReading(20060, 10);
  assert(invalidHighCheck.isValid === false, `20060 kg reading for 10 kg load fails sanity check`);
  assert(invalidHighCheck.errorMessage === 'Scale reading appears invalid. Please check the value and unit.', `Correct error message returned for absurd input`);

  const invalidNegativeCheck = validateEccentricityScaleReading(-10, 10);
  assert(invalidNegativeCheck.isValid === false, `-10 kg reading fails sanity check`);

  // 5. Position MPE Evaluation for MetriScale Pro 500 (Class III, e = 5 g, test load = 10 kg)
  // At 10 kg (10,000 g / 5 g = 2000e), MPE is ±1.0e = ±5 g (±0.005 kg).
  const pos1Eval = evaluateEccentricityPosition({
    position: 1,
    locationLabel: 'Front Left',
    testLoad: 10,
    testLoadUnit: 'kg',
    scaleReading: 10.002,
    scaleReadingUnit: 'kg',
    accuracyClass: 'Class III',
    verificationScaleIntervalE: 5,
    eUnit: 'g',
  });
  assert(pos1Eval.passed === true, `10.002 kg reading (+2 g error) is WITHIN MPE (±5 g)`);
  assert(pos1Eval.mpeValue === 5, `MPE value is 5 g`);

  const posFailEval = evaluateEccentricityPosition({
    position: 4,
    locationLabel: 'Rear Right',
    testLoad: 10,
    testLoadUnit: 'kg',
    scaleReading: 10.008,
    scaleReadingUnit: 'kg',
    accuracyClass: 'Class III',
    verificationScaleIntervalE: 5,
    eUnit: 'g',
  });
  assert(posFailEval.passed === false, `10.008 kg reading (+8 g error) EXCEEDS MPE (±5 g)`);

  // 6. Overall Session Evaluation
  const passObs = [
    { position: 1, locationLabel: 'Front Left', load: 10, indicatedValue: 10.002, error: 0.002, passed: true },
    { position: 2, locationLabel: 'Front Right', load: 10, indicatedValue: 10.003, error: 0.003, passed: true },
    { position: 3, locationLabel: 'Rear Left', load: 10, indicatedValue: 9.999, error: -0.001, passed: true },
    { position: 4, locationLabel: 'Rear Right', load: 10, indicatedValue: 10.001, error: 0.001, passed: true },
  ];
  const overallPass = evaluateOverallEccentricity(passObs, 'STANDARD_UP_TO_4_SUPPORTS');
  assert(overallPass.isComplete === true, `4 of 4 positions is complete`);
  assert(overallPass.isPassed === true, `All 4 positions passing gives overall pass`);
  assert(overallPass.summaryText === '✓ All Required Positions Within MPE', `Summary text formatted cleanly`);

  const failObs = [
    ...passObs.slice(0, 3),
    { position: 4, locationLabel: 'Rear Right', load: 10, indicatedValue: 10.008, error: 0.008, passed: false },
  ];
  const overallFail = evaluateOverallEccentricity(failObs, 'STANDARD_UP_TO_4_SUPPORTS');
  assert(overallFail.isComplete === true, `Session with 4 positions is complete`);
  assert(overallFail.isPassed === false, `Session with failing position gives overall fail`);
  assert(overallFail.summaryText === '✕ 1 Position(s) Exceed MPE', `Failure summary text formatted cleanly`);

  console.log(`\n====================================================`);
  console.log(`RESULTS: ${passed} / ${total} tests passed.`);
  console.log(`====================================================\n`);
}

runTests();
