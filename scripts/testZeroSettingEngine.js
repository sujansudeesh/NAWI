import {
  calculateOneTenthE,
  calculateQuarterE,
  calculateHalfE,
  validateZeroSettingInput,
  isZeroSettingProcedureApplicable,
  calculateZeroError,
  evaluateZeroSettingAccuracy,
} from '../src/services/zeroSettingService.ts';

function runZeroSettingUnitTests() {
  console.log('================================================================');
  console.log(' OIML R 76-1:2006 ZERO-SETTING ACCURACY ENGINE UNIT TESTS');
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

  // 1. Small Weight Fractions (e = 5 g)
  const tenth = calculateOneTenthE(5, 'g');
  assert(tenth.value === 0.5, '0.1e for e = 5 g is 0.5 g');
  assert(tenth.text === '0.5 g', '0.1e text formatted correctly');

  const quarter = calculateQuarterE(5, 'g');
  assert(quarter.value === 1.25, '0.25e for e = 5 g is 1.25 g');
  assert(quarter.text === '±1.25 g', '0.25e text formatted correctly');

  const half = calculateHalfE(5, 'g');
  assert(half.value === 2.5, '0.5e for e = 5 g is 2.5 g');
  assert(half.text === '2.5 g', '0.5e text formatted correctly');

  // 2. Input Validation Tests
  const validCheck = validateZeroSettingInput(2.0, 5);
  assert(validCheck.isValid === true, 'ΔL = 2.0 g is valid for e = 5 g');

  const negCheck = validateZeroSettingInput(-1.0, 5);
  assert(negCheck.isValid === false, 'Negative ΔL is rejected');
  assert(negCheck.errorMessage === 'Changeover load must be a non-negative numeric value.', 'Correct negative error message');

  const absurdCheck = validateZeroSettingInput(30, 5); // 30 > 5 * 5 = 25
  assert(absurdCheck.isValid === false, 'ΔL > 5e is rejected by sanity check');
  assert(
    absurdCheck.errorMessage === "Changeover load appears inconsistent with the instrument's verification interval. Please check the value.",
    'Correct absurd load error message'
  );

  // 3. Procedure Applicability Tests
  const semiApp = isZeroSettingProcedureApplicable('SEMI_AUTOMATIC');
  assert(semiApp.isApplicable === true, 'Semi-automatic zero-setting is applicable under procedure A.4.2.3.1');

  const nonAutoApp = isZeroSettingProcedureApplicable('NON_AUTOMATIC');
  assert(nonAutoApp.isApplicable === true, 'Non-automatic zero-setting is applicable under procedure A.4.2.3.1');

  const autoApp = isZeroSettingProcedureApplicable('AUTOMATIC');
  assert(autoApp.isApplicable === false, 'Automatic zero-setting requires off-zero load procedure');
  assert(autoApp.isAutomatic === true, 'Automatic flag is set to true');

  // 4. Zero Error Formula Tests: E0 = 0.5e - ΔL
  // For e = 5 g (0.5e = 2.5 g):
  // ΔL = 2.0 g => E0 = 2.5 - 2.0 = +0.5 g
  const calc1 = calculateZeroError(2.0, 5, 'g');
  assert(calc1.zeroError === 0.5, 'Zero error for ΔL = 2.0 g is +0.5 g');
  assert(calc1.formatted === '+0.5 g', 'Zero error formatted as +0.5 g');

  // ΔL = 3.0 g => E0 = 2.5 - 3.0 = -0.5 g
  const calc2 = calculateZeroError(3.0, 5, 'g');
  assert(calc2.zeroError === -0.5, 'Zero error for ΔL = 3.0 g is -0.5 g');
  assert(calc2.formatted === '-0.5 g', 'Zero error formatted as -0.5 g');

  // 5. Evaluation Tests against ±0.25e Limit (±1.25 g for e = 5 g)
  // Scenario A: ΔL = 2.0 g => E0 = +0.5 g <= 1.25 g (PASS)
  const evalPass = evaluateZeroSettingAccuracy({
    zeroSettingType: 'SEMI_AUTOMATIC',
    eVal: 5,
    eUnit: 'g',
    changeoverAdditionalLoad: 2.0,
  });
  assert(evalPass.passed === true, 'E0 = +0.5 g passes tolerance check');
  assert(evalPass.resultStatus === 'WITHIN_LIMIT', 'Result status is WITHIN_LIMIT');
  assert(evalPass.permissibleZeroDeviation === 1.25, 'Permissible deviation is 1.25 g');

  // Scenario B: ΔL = 0.5 g => E0 = 2.5 - 0.5 = +2.0 g > 1.25 g (FAIL)
  const evalFail = evaluateZeroSettingAccuracy({
    zeroSettingType: 'SEMI_AUTOMATIC',
    eVal: 5,
    eUnit: 'g',
    changeoverAdditionalLoad: 0.5,
  });
  assert(evalFail.passed === false, 'E0 = +2.0 g fails tolerance check');
  assert(evalFail.resultStatus === 'EXCEEDS_LIMIT', 'Result status is EXCEEDS_LIMIT');
  assert(evalFail.resultText === '✕ ZERO SETTING EXCEEDS LIMIT', 'Correct fail message');

  // Scenario C: Boundary case ΔL = 1.25 g => E0 = 2.5 - 1.25 = +1.25 g == 1.25 g (PASS)
  const evalBoundary = evaluateZeroSettingAccuracy({
    zeroSettingType: 'SEMI_AUTOMATIC',
    eVal: 5,
    eUnit: 'g',
    changeoverAdditionalLoad: 1.25,
  });
  assert(evalBoundary.passed === true, 'Boundary E0 = +1.25 g passes exact limit');

  console.log(`\n====================================================`);
  console.log(`RESULTS: ${passed} / ${total} tests passed.`);
  console.log(`====================================================\n`);
}

runZeroSettingUnitTests();
