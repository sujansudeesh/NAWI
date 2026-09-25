import {
  isDigitalDiscriminationApplicable,
  calculateOneTenthD,
  calculateOnePointFourD,
  calculateExpectedLowerIndication,
  calculateExpectedFinalIndication,
  evaluateDiscriminationResponse,
  getDiscriminationTestPoints,
  evaluateOverallDiscrimination,
} from '../src/services/discriminationService.ts';

function runTests() {
  console.log('====================================================');
  console.log('OIML R 76 DIGITAL DISCRIMINATION ENGINE UNIT TESTS');
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

  // 1. Applicability Tests
  const appCheck1 = isDigitalDiscriminationApplicable({
    testContext: 'TYPE_EXAMINATION',
    dVal: 5,
    dUnit: 'g',
    isDigital: true,
  });
  assert(appCheck1.isApplicable === true, 'Digital discrimination applies for Type Examination with d = 5 g');

  const appCheckNonType = isDigitalDiscriminationApplicable({
    testContext: 'INITIAL_VERIFICATION',
    dVal: 5,
    dUnit: 'g',
    isDigital: true,
  });
  assert(appCheckNonType.isApplicable === false, 'Non-type examination fails applicability check');
  assert(
    appCheckNonType.message === 'Digital discrimination testing under A.4.8.2 applies to type examination.',
    'Correct applicability message for non-type examination'
  );

  const appCheckSmallD = isDigitalDiscriminationApplicable({
    testContext: 'TYPE_EXAMINATION',
    dVal: 0.001,
    dUnit: 'g', // 1 mg < 5 mg
    isDigital: true,
  });
  assert(appCheckSmallD.isApplicable === false, 'd < 5 mg fails applicability check');
  assert(
    appCheckSmallD.message === 'This digital discrimination procedure is not applicable because d is below 5 mg.',
    'Correct applicability message for d < 5 mg'
  );

  // 2. Automatic Small Weight Calculations for MetriScale Pro 500 (d = 5 g)
  const oneTenth = calculateOneTenthD(5, 'g');
  assert(oneTenth.value === 0.5, '0.1d for d = 5 g is 0.5 g');
  assert(oneTenth.text === '0.5 g', 'Formatted 0.1d string is "0.5 g"');

  const onePointFour = calculateOnePointFourD(5, 'g');
  assert(onePointFour.value === 7, '1.4d for d = 5 g is 7 g');
  assert(onePointFour.text === '7 g', 'Formatted 1.4d string is "7 g"');

  // 3. Expected Indication Calculations
  // Initial I = 15.000 kg, d = 5 g (0.005 kg)
  const lowerIndication = calculateExpectedLowerIndication(15.000, 5, 'g', 'kg');
  assert(lowerIndication === 14.995, 'Expected lower indication I - d for 15.000 kg with d = 5 g is 14.995 kg');

  const finalIndication = calculateExpectedFinalIndication(15.000, 5, 'g', 'kg');
  assert(finalIndication === 15.005, 'Expected final indication I + d for 15.000 kg with d = 5 g is 15.005 kg');

  // 4. Response Evaluation
  const evalPass = evaluateDiscriminationResponse({
    initialIndication: 15.000,
    observedFinalIndication: 15.005,
    dVal: 5,
    dUnit: 'g',
    loadUnit: 'kg',
  });
  assert(evalPass.passed === true, 'Observed final indication 15.005 kg gives passed = true');
  assert(evalPass.resultStatus === 'CONFIRMED', 'Result status is CONFIRMED');
  assert(evalPass.resultText === '✓ DISCRIMINATION RESPONSE CONFIRMED', 'Result text is ✓ DISCRIMINATION RESPONSE CONFIRMED');

  const evalFail = evaluateDiscriminationResponse({
    initialIndication: 15.000,
    observedFinalIndication: 15.000, // No increase observed
    dVal: 5,
    dUnit: 'g',
    loadUnit: 'kg',
  });
  assert(evalFail.passed === false, 'Observed final indication 15.000 kg gives passed = false');
  assert(evalFail.resultStatus === 'NOT_OBSERVED', 'Result status is NOT_OBSERVED');
  assert(evalFail.resultText === '✕ EXPECTED INDICATION CHANGE NOT OBSERVED', 'Result text matches expected error string');

  // 5. Test Load Points (Min = 0.1 kg, Max = 30 kg)
  const testPoints = getDiscriminationTestPoints(30, 0.1, 'kg');
  assert(testPoints.length === 3, '3 required test points generated');
  assert(testPoints[0].baseLoad === 0.1, 'Point 1 base load is Min Load (0.1 kg)');
  assert(testPoints[1].baseLoad === 15.0, 'Point 2 base load is Half Max (15 kg)');
  assert(testPoints[2].baseLoad === 30.0, 'Point 3 base load is Max Load (30 kg)');

  // 6. Overall Discrimination Evaluation
  const mockObservations = [
    { testPointId: 'MIN', testPointLabel: 'Min Load', load: 0.1, loadUnit: 'kg', scaleIntervalD: 5, dUnit: 'g', oneTenthD: 0.5, onePointFourD: 7, initialIndication: 0.100, transitionIndication: 0.095, expectedLowerIndication: 0.095, finalIndication: 0.105, expectedFinalIndication: 0.105, passed: true, resultStatus: 'CONFIRMED', isCompleted: true },
    { testPointId: 'HALF_MAX', testPointLabel: 'Half Max', load: 15.0, loadUnit: 'kg', scaleIntervalD: 5, dUnit: 'g', oneTenthD: 0.5, onePointFourD: 7, initialIndication: 15.000, transitionIndication: 14.995, expectedLowerIndication: 14.995, finalIndication: 15.005, expectedFinalIndication: 15.005, passed: true, resultStatus: 'CONFIRMED', isCompleted: true },
    { testPointId: 'MAX', testPointLabel: 'Max Load', load: 30.0, loadUnit: 'kg', scaleIntervalD: 5, dUnit: 'g', oneTenthD: 0.5, onePointFourD: 7, initialIndication: 30.000, transitionIndication: 29.995, expectedLowerIndication: 29.995, finalIndication: 30.005, expectedFinalIndication: 30.005, passed: true, resultStatus: 'CONFIRMED', isCompleted: true },
  ];
  const overallEvalPass = evaluateOverallDiscrimination(mockObservations, 3);
  assert(overallEvalPass.isComplete === true, 'All 3 test points recorded is complete');
  assert(overallEvalPass.isPassed === true, 'All 3 test points confirmed gives overall pass');
  assert(overallEvalPass.summaryText === '✓ Discrimination Response Confirmed Across All Points', 'Summary text formatted cleanly');

  console.log(`\n====================================================`);
  console.log(`RESULTS: ${passed} / ${total} tests passed.`);
  console.log(`====================================================\n`);
}

runTests();
