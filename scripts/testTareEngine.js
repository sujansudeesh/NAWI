import {
  calculateSuggestedTareTestLoad,
  calculateAvailableNetCapacity,
  validateTareLoadInput,
  validateNetLoadInput,
  calculateTareSettingError,
  generateSuggestedNetLoadPoints,
  evaluateTareNetObservation,
  evaluateOverallTareTest,
} from '../src/services/tareService.ts';

function runTareUnitTests() {
  console.log('================================================================');
  console.log(' OIML R 76-1:2006 TARE TEST ENGINE AUTOMATED UNIT TESTS');
  console.log('================================================================\n');

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

  // 1. Suggested Tare Load Calculations (1/3 to 2/3 Max Tare)
  const sugTare = calculateSuggestedTareTestLoad(10, 'kg');
  assert(sugTare.minSuggested === 3.333, '1/3 of 10 kg Max Tare is 3.333 kg');
  assert(sugTare.maxSuggested === 6.667, '2/3 of 10 kg Max Tare is 6.667 kg');
  assert(sugTare.recommended === 5, 'Recommended test tare load is 5 kg');

  // 2. Net Capacity Calculations (Subtractive vs Additive)
  const subNetCap = calculateAvailableNetCapacity(30, 5, 'SUBTRACTIVE');
  assert(subNetCap === 25, 'Subtractive tare 5 kg on 30 kg Max reduces net capacity to 25 kg');

  const addNetCap = calculateAvailableNetCapacity(30, 5, 'ADDITIVE');
  assert(addNetCap === 30, 'Additive tare preserves full 30 kg net capacity');

  // 3. Tare Load Input Validation
  const validTareVal = validateTareLoadInput(5, 10, 30);
  assert(validTareVal.isValid === true, '5 kg tare load on 10 kg Max Tare is valid');

  const negTareVal = validateTareLoadInput(-1, 10, 30);
  assert(negTareVal.isValid === false, 'Negative tare load is rejected');

  const exceedMaxTare = validateTareLoadInput(12, 10, 30);
  assert(exceedMaxTare.isValid === false, 'Tare load > 10 kg Max Tare is rejected');

  const exceedMaxCap = validateTareLoadInput(35, 10, 30);
  assert(exceedMaxCap.isValid === false, 'Tare load >= 30 kg Max Capacity is rejected');

  // 4. Net Load Input Validation
  const validNet = validateNetLoadInput(10, 0.1, 25, 'kg');
  assert(validNet.isValid === true, '10 kg net load is valid within 0.1 kg to 25 kg');

  const exceedNetCap = validateNetLoadInput(26, 0.1, 25, 'kg');
  assert(exceedNetCap.isValid === false, 'Net load 26 kg > 25 kg Net Capacity is rejected');
  assert(
    exceedNetCap.errorMessage === 'Net load exceeds the remaining weighing capacity with the current tare.',
    'Correct error message when net load exceeds available capacity'
  );

  const belowMinNet = validateNetLoadInput(0.05, 0.1, 25, 'kg');
  assert(belowMinNet.isValid === false, 'Net load 0.05 kg < Min (0.1 kg) is rejected');

  // 5. Tare Setting Zero Error ET = 0.5e - ΔL (OIML §4.6.3 / A.4.6.2)
  // For e = 5 g: 0.5e = 2.5 g, 0.25e limit = ±1.25 g
  // ΔL = 2.0 g => ET = 2.5 - 2.0 = +0.5 g <= 1.25 g (PASS)
  const evalTarePass = calculateTareSettingError(2.0, 5, 'g');
  assert(evalTarePass.passed === true, 'ET = +0.5 g passes ±1.25 g limit');
  assert(evalTarePass.resultStatus === 'WITHIN_LIMIT', 'Result status is WITHIN_LIMIT');
  assert(evalTarePass.tareZeroErrorFormatted === '+0.5 g', 'Formatted zero error is +0.5 g');

  // ΔL = 0.5 g => ET = 2.5 - 0.5 = +2.0 g > 1.25 g (FAIL)
  const evalTareFail = calculateTareSettingError(0.5, 5, 'g');
  assert(evalTareFail.passed === false, 'ET = +2.0 g fails ±1.25 g limit');
  assert(evalTareFail.resultStatus === 'EXCEEDS_LIMIT', 'Result status is EXCEEDS_LIMIT');

  // 6. Generate Suggested Net Load Points
  const netPoints = generateSuggestedNetLoadPoints({
    accuracyClass: 'Class III',
    eVal: 5,
    eUnit: 'g',
    minCapacity: 0.1,
    maxCapacity: 30,
    appliedTare: 5,
    tareType: 'SUBTRACTIVE',
    loadUnit: 'kg',
  });
  assert(netPoints.length === 5, '5 suggested net load points generated');
  assert(netPoints[0].referenceNetLoad === 0.1, 'Point 1 is Min (0.1 kg)');
  assert(netPoints[4].referenceNetLoad === 24.975, 'Point 5 is near Max Net (24.975 kg)');

  // 7. Net Load Observation MPE Evaluation (DEMO PASS SCENARIO)
  // Tare = 5 kg, Reference Net = 10 kg, Displayed Net = 10.003 kg
  // Net Error = +3 g, Gross Load = 15 kg, MPE for 10 kg (2000e) = ±5 g
  const obsPass = evaluateTareNetObservation({
    appliedTare: 5,
    referenceNet: 10,
    displayedNet: 10.003,
    accuracyClass: 'Class III',
    eVal: 5,
    eUnit: 'g',
    loadUnit: 'kg',
    stepIndex: 3,
    stepLabel: 'Point 3',
  });
  assert(obsPass.calculatedGrossLoad === 15, 'Calculated Gross Load is 15 kg (5 kg Tare + 10 kg Net)');
  assert(obsPass.netError === 0.003, 'Net Error is +0.003 kg (+3 g)');
  assert(obsPass.passed === true, 'Net Error +3 g is WITHIN MPE (±5 g)');
  assert(obsPass.mpeStatus === 'WITHIN_MPE', 'mpeStatus is WITHIN_MPE');

  // DEMO FAIL SCENARIO: Displayed Net = 10.008 kg => Net Error = +8 g > ±5 g MPE
  const obsFail = evaluateTareNetObservation({
    appliedTare: 5,
    referenceNet: 10,
    displayedNet: 10.008,
    accuracyClass: 'Class III',
    eVal: 5,
    eUnit: 'g',
    loadUnit: 'kg',
    stepIndex: 3,
    stepLabel: 'Point 3',
  });
  assert(obsFail.netError === 0.008, 'Net Error is +0.008 kg (+8 g)');
  assert(obsFail.passed === false, 'Net Error +8 g EXCEEDS MPE (±5 g)');
  assert(obsFail.mpeStatus === 'EXCEEDS_MPE', 'mpeStatus is EXCEEDS_MPE');

  // 8. Overall Tare Test Evaluation
  const mockSettingObs = {
    appliedTareLoad: 5,
    tareLoadUnit: 'kg',
    displayedIndicationAfterTare: 0,
    suggestedIncrement: 0.5,
    changeoverAdditionalLoad: 2.0,
    calculatedTareZeroError: 0.5,
    permissibleTareZeroError: 1.25,
    passed: true,
    resultStatus: 'WITHIN_LIMIT',
  };

  const mockNetObsPassArray = [
    { ...obsPass, stepIndex: 1 },
    { ...obsPass, stepIndex: 2 },
    { ...obsPass, stepIndex: 3 },
    { ...obsPass, stepIndex: 4 },
    { ...obsPass, stepIndex: 5 },
  ];

  const overallPass = evaluateOverallTareTest(mockSettingObs, mockNetObsPassArray, 5);
  assert(overallPass.overallResult === 'COMPLETED_WITHIN_LIMITS', 'Passing setting & 5 passing net obs gives COMPLETED_WITHIN_LIMITS');
  assert(overallPass.isCompleted === true, 'isCompleted is true');

  const mockNetObsFailArray = [
    { ...obsPass, stepIndex: 1 },
    { ...obsPass, stepIndex: 2 },
    { ...obsFail, stepIndex: 3 }, // Failing point
    { ...obsPass, stepIndex: 4 },
    { ...obsPass, stepIndex: 5 },
  ];

  const overallFail = evaluateOverallTareTest(mockSettingObs, mockNetObsFailArray, 5);
  assert(overallFail.overallResult === 'NEEDS_ATTENTION', 'One failing net obs gives NEEDS_ATTENTION');

  console.log(`\n====================================================`);
  console.log(`RESULTS: ${passed} / ${total} tests passed.`);
  console.log(`====================================================\n`);
}

runTareUnitTests();
