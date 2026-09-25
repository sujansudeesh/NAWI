import { toMicrograms, convertMass, calculateNormalizedNResult } from '../units';
import { getOIMLRepeatabilityRequirements } from '../repeatability';
import { deriveOIMLEccentricityTestLoad } from '../eccentricity';
import { evaluateZeroSettingAccuracy } from '../zeroSetting';
import { evaluateTareSettingAccuracy, evaluateTareNetWeighing } from '../tare';

/**
 * ============================================================================
 * COMPREHENSIVE OIML R 76-1:2006 METROLOGY AUDIT & RULE ENGINE TESTS
 * ============================================================================
 * 
 * Tests:
 * 1. Repeatability Type Examination (2 series: 50% & 100% Max; 10 weighings if Max < 1000 kg, 3 if >= 1000 kg)
 * 2. Repeatability Verification (1 series at 80% Max; 3 weighings for Class III/IIII, 6 for Class I/II)
 * 3. 4-Support Eccentricity (L = 1/3 * (Max + TareAdd))
 * 4. >4-Support Eccentricity (L = 1/(N-1) * (Max + TareAdd))
 * 5. Tank / Hopper Eccentricity (L = 1/10 * (Max + TareAdd))
 * 6. Rolling-load upper cap (0.8 * (Max + TareAdd)) & usual rolling load
 * 7. Additive Tare Effect inclusion in eccentricity
 * 8. Exact Decimal Unit Conversion ("0.005" kg -> 5,000,000 µg)
 * 9. Invalid Non-Integral n Ratio validation error
 * 10. Zero-setting |E0| <= 0.25e boundary evaluation
 * 11. Tare-setting |ET| <= 0.25e boundary evaluation
 * ============================================================================
 */

export function runMetrologyAuditUnitTests(): { passed: boolean; testCount: number; failures: string[] } {
  const failures: string[] = [];
  let testCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    testCount++;
    if (!condition) {
      failures.push(`FAILED: [${testName}] - ${detail || 'Assertion failed'}`);
    }
  }

  // 1. EXACT DECIMAL UNIT CONVERSION
  const ug1 = toMicrograms("0.005", "kg");
  assert(ug1 === 5000000n, 'Exact Decimal Conversion - 0.005 kg', `Expected 5000000n, got ${ug1}n`);

  const ug2 = toMicrograms("5", "g");
  assert(ug2 === 5000000n, 'Exact Decimal Conversion - 5 g', `Expected 5000000n, got ${ug2}n`);

  const ug3 = toMicrograms(30, "kg");
  assert(ug3 === 30000000000n, 'Exact Decimal Conversion - 30 kg', `Expected 30000000000n, got ${ug3}n`);

  const ugCt = toMicrograms("1", "ct");
  assert(ugCt === 200000n, 'Exact Decimal Conversion - 1 ct = 200,000 µg', `Expected 200000n, got ${ugCt}n`);

  const gFromCt = convertMass(5, "ct", "g");
  assert(gFromCt === 1, 'Exact Conversion - 5 ct = 1 g', `Expected 1 g, got ${gFromCt} g`);

  // 2. INVALID NON-INTEGRAL n CALCULATION
  const validNRes = calculateNormalizedNResult(30, 'kg', 5, 'g');
  assert(validNRes.isValidIntegralRatio === true, 'Valid n ratio 30kg/5g', 'Expected valid integral ratio');
  assert(validNRes.n === 6000, 'Calculated n for 30kg/5g', `Expected 6000, got ${validNRes.n}`);

  // Max = 10.001 kg, e = 5 g => 10,001,000,000 µg / 5,000,000 µg = 2000.2 => Remainder 1,000,000 µg
  const invalidNRes = calculateNormalizedNResult("10.001", 'kg', 5, 'g');
  assert(invalidNRes.isValidIntegralRatio === false, 'Invalid non-integral n ratio detection', 'Expected invalid integral ratio flag');
  assert(invalidNRes.remainderMicrograms === 1000000n, 'Non-integral remainder calculation', `Expected 1000000n µg remainder, got ${invalidNRes.remainderMicrograms}n`);

  // 3. REPEATABILITY - TYPE EXAMINATION
  const repTypeSmall = getOIMLRepeatabilityRequirements('TYPE_EXAMINATION', 'Class III', 500, 'kg');
  assert(repTypeSmall.series.length === 2, 'Repeatability Type Exam series count', `Expected 2 series, got ${repTypeSmall.series.length}`);
  assert(repTypeSmall.series[0].requiredWeighingsCount === 10, 'Repeatability Type Exam (<1000kg weighings)', `Expected 10 weighings, got ${repTypeSmall.series[0].requiredWeighingsCount}`);
  assert(repTypeSmall.series[0].targetLoadValue === 250, 'Repeatability Type Exam 50% load', `Expected 250kg, got ${repTypeSmall.series[0].targetLoadValue}`);
  assert(repTypeSmall.series[1].targetLoadValue === 500, 'Repeatability Type Exam 100% load', `Expected 500kg, got ${repTypeSmall.series[1].targetLoadValue}`);

  const repTypeLarge = getOIMLRepeatabilityRequirements('TYPE_EXAMINATION', 'Class III', 2000, 'kg');
  assert(repTypeLarge.series[0].requiredWeighingsCount === 3, 'Repeatability Type Exam (>=1000kg weighings)', `Expected 3 weighings, got ${repTypeLarge.series[0].requiredWeighingsCount}`);

  // 4. REPEATABILITY - VERIFICATION
  const repVerifClass3 = getOIMLRepeatabilityRequirements('INITIAL_VERIFICATION', 'Class III', 500, 'kg');
  assert(repVerifClass3.series.length === 1, 'Repeatability Verif series count', `Expected 1 series, got ${repVerifClass3.series.length}`);
  assert(repVerifClass3.series[0].targetLoadValue === 400, 'Repeatability Verif 80% load', `Expected 400kg, got ${repVerifClass3.series[0].targetLoadValue}`);
  assert(repVerifClass3.series[0].requiredWeighingsCount === 3, 'Repeatability Verif Class III weighings', `Expected 3 weighings, got ${repVerifClass3.series[0].requiredWeighingsCount}`);

  const repVerifClass2 = getOIMLRepeatabilityRequirements('INITIAL_VERIFICATION', 'Class II', 500, 'g');
  assert(repVerifClass2.series[0].requiredWeighingsCount === 6, 'Repeatability Verif Class II weighings', `Expected 6 weighings, got ${repVerifClass2.series[0].requiredWeighingsCount}`);

  // 5. ECCENTRICITY - 4 SUPPORTS
  const ecc4 = deriveOIMLEccentricityTestLoad(30, 'kg', 'STANDARD_UP_TO_4_SUPPORTS', 4, 0);
  assert(ecc4.recommendedTestLoad === 10, '4-Support Eccentricity (1/3 Max)', `Expected 10 kg, got ${ecc4.recommendedTestLoad}`);

  // 6. ECCENTRICITY - ADDITIVE TARE EFFECT
  const ecc4AddTare = deriveOIMLEccentricityTestLoad(30, 'kg', 'STANDARD_UP_TO_4_SUPPORTS', 4, 15);
  // Total Cap = 30 + 15 = 45 kg. 1/3 * 45 = 15 kg
  assert(ecc4AddTare.recommendedTestLoad === 15, '4-Support Eccentricity with Additive Tare', `Expected 15 kg, got ${ecc4AddTare.recommendedTestLoad}`);

  // 7. ECCENTRICITY - >4 SUPPORTS (N=6)
  const ecc6 = deriveOIMLEccentricityTestLoad(50, 't', 'MORE_THAN_4_SUPPORTS', 6, 0);
  // L = 1/(6-1) * 50 = 1/5 * 50 = 10 t
  assert(ecc6.recommendedTestLoad === 10, '6-Support Eccentricity (1/(N-1) Max)', `Expected 10 t, got ${ecc6.recommendedTestLoad}`);

  // 8. ECCENTRICITY - TANK / HOPPER (MINIMAL OFF-CENTRE)
  const eccTank = deriveOIMLEccentricityTestLoad(100, 't', 'MINIMAL_OFF_CENTRE', 4, 0);
  // L = 1/10 * 100 = 10 t
  assert(eccTank.recommendedTestLoad === 10, 'Tank / Hopper Eccentricity (1/10 Max)', `Expected 10 t, got ${eccTank.recommendedTestLoad}`);

  // 9. ECCENTRICITY - ROLLING LOAD UPPER CAP
  const eccRollingCap = deriveOIMLEccentricityTestLoad(60, 't', 'ROLLING_LOAD', 4, 0, 55); // Usual rolling load 55t > 48t cap
  // Upper limit cap = 0.8 * 60 = 48 t
  assert(eccRollingCap.recommendedTestLoad === 48, 'Rolling Load Upper Cap (0.8 Max)', `Expected 48 t, got ${eccRollingCap.recommendedTestLoad}`);

  const eccRollingUsual = deriveOIMLEccentricityTestLoad(60, 't', 'ROLLING_LOAD', 4, 0, 40); // Usual rolling load 40t < 48t cap
  assert(eccRollingUsual.recommendedTestLoad === 40, 'Rolling Load Usual Load', `Expected 40 t, got ${eccRollingUsual.recommendedTestLoad}`);

  // 10. ZERO-SETTING ACCURACY (|E0| <= 0.25e)
  // e = 5 g => 0.25e = 1.25 g. ΔL = 2.0 g => E0 = 0.5e - ΔL = 2.5 - 2.0 = +0.5 g <= 1.25 g => PASS
  const zeroPass = evaluateZeroSettingAccuracy({
    zeroSettingType: 'SEMI_AUTOMATIC',
    eVal: 5,
    eUnit: 'g',
    changeoverAdditionalLoadDeltaL: 2.0,
  });
  assert(zeroPass.calculatedZeroErrorE0 === 0.5, 'Zero-setting E0 calculation', `Expected +0.5 g, got ${zeroPass.calculatedZeroErrorE0}`);
  assert(zeroPass.permissibleLimitAbs === 1.25, 'Zero-setting |E0| <= 0.25e bound', `Expected 1.25 g, got ${zeroPass.permissibleLimitAbs}`);
  assert(zeroPass.passed === true, 'Zero-setting pass status', `Expected PASS, got ${zeroPass.passed}`);
  assert(zeroPass.inequalityText.includes('|E0| <= 0.25e'), 'Zero-setting inequality notation', `Expected |E0| <= 0.25e in ${zeroPass.inequalityText}`);

  // E0 Fail case: ΔL = 0.5 g => E0 = 2.5 - 0.5 = 2.0 g > 1.25 g => FAIL
  const zeroFail = evaluateZeroSettingAccuracy({
    zeroSettingType: 'SEMI_AUTOMATIC',
    eVal: 5,
    eUnit: 'g',
    changeoverAdditionalLoadDeltaL: 0.5,
  });
  assert(zeroFail.passed === false, 'Zero-setting exceed bound fail status', `Expected FAIL, got ${zeroFail.passed}`);

  // 11. TARE-SETTING ACCURACY (|ET| <= 0.25e)
  // e = 5 g => 0.25e = 1.25 g. ΔL = 2.0 g => ET = 0.5e - ΔL = +0.5 g <= 1.25 g => PASS
  const tarePass = evaluateTareSettingAccuracy({
    appliedTareLoad: 5,
    tareLoadUnit: 'kg',
    eVal: 5,
    eUnit: 'g',
    changeoverAdditionalLoadDeltaL: 2.0,
  });
  assert(tarePass.calculatedTareZeroErrorET === 0.5, 'Tare-setting ET calculation', `Expected +0.5 g, got ${tarePass.calculatedTareZeroErrorET}`);
  assert(tarePass.permissibleLimitAbs === 1.25, 'Tare-setting |ET| <= 0.25e bound', `Expected 1.25 g, got ${tarePass.permissibleLimitAbs}`);
  assert(tarePass.passed === true, 'Tare-setting pass status', `Expected PASS, got ${tarePass.passed}`);
  assert(tarePass.inequalityText.includes('|ET| <= 0.25e'), 'Tare-setting inequality notation', `Expected |ET| <= 0.25e in ${tarePass.inequalityText}`);

  // 12. TARE NET WEIGHING MPE EVALUATED ON NET LOAD
  const tareNetCheck = evaluateTareNetWeighing({
    tareType: 'SUBTRACTIVE',
    appliedTareLoad: 5,
    tareLoadUnit: 'kg',
    referenceNetLoad: 10,
    netLoadUnit: 'kg',
    displayedNetReading: 10.003,
    displayedNetUnit: 'kg',
    maxCapacity: 30,
    maxUnit: 'kg',
    eVal: 5,
    eUnit: 'g',
    accuracyClass: 'Class III',
  });
  // Net load = 10 kg = 2000e => MPE for Class III at 2000e is ±1.0e = ±5g. Error = +3g <= 5g => PASS
  assert(tareNetCheck.netError === 3, 'Net weighing error in eUnit (g)', `Expected +3 g, got ${tareNetCheck.netError}`);
  assert(tareNetCheck.mpeLimitValue === 5, 'Net weighing MPE basis on Net load', `Expected 5 g MPE, got ${tareNetCheck.mpeLimitValue} g`);
  assert(tareNetCheck.passed === true, 'Net weighing PASS status', `Expected PASS, got ${tareNetCheck.passed}`);

  return {
    passed: failures.length === 0,
    testCount,
    failures,
  };
}

// Auto-run if executed directly via Node / TS runner
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('metrologyAudit.test')) {
  console.log('Running Comprehensive OIML R 76-1:2006 Metrology Audit Unit Tests...');
  const res = runMetrologyAuditUnitTests();
  if (res.passed) {
    console.log(`✅ ALL ${res.testCount} METROLOGY AUDIT TESTS PASSED CLEANLY!`);
  } else {
    console.error(`❌ ${res.failures.length} / ${res.testCount} TESTS FAILED:`);
    res.failures.forEach((f) => console.error(f));
    process.exit(1);
  }
}
