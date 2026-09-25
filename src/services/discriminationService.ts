import { MassUnit, TestContext, DiscriminationTestObservation } from '../types';
import { convertMassUnit } from '../utils/metrologyService';

/**
 * ============================================================================
 * OIML R 76-1:2006 DIGITAL DISCRIMINATION TEST SERVICE (§3.8 & Procedure A.4.8.2)
 * ============================================================================
 * 
 * Rules:
 * 1. Applicability:
 *    - Applies to TYPE EXAMINATION (testContext === 'TYPE_EXAMINATION')
 *    - Applies to instruments with d >= 5 mg
 *    - Applies to Digital Indication instruments
 * 2. Automatic Small Weight Calculations from d:
 *    - 0.1d = 0.1 * d (e.g. 5 g -> 0.5 g)
 *    - 1.4d = 1.4 * d (e.g. 5 g -> 7.0 g)
 * 3. 4-Step Digital Discrimination Procedure:
 *    Step 1: Apply Base Load L, record initial indication I.
 *    Step 2: Add 10 x 0.1d weights, then remove successively until indication decreases to I - d.
 *    Step 3: Replace one 0.1d weight, then apply 1.4d.
 *    Step 4: Record final indication I_final. Expected: I + d.
 * 4. Result Logic:
 *    - If I_final === I + d -> DISCRIMINATION RESPONSE CONFIRMED
 *    - Otherwise -> EXPECTED INDICATION CHANGE NOT OBSERVED
 * ============================================================================
 */

export interface ApplicabilityResult {
  isApplicable: boolean;
  reason?: 'NOT_TYPE_EXAMINATION' | 'D_BELOW_5MG' | 'NOT_DIGITAL';
  message?: string;
}

export interface DiscriminationTestPointConfig {
  id: 'MIN' | 'HALF_MAX' | 'MAX';
  label: string;
  shortLabel: string;
  baseLoad: number;
  unit: MassUnit;
}

export interface DiscriminationEvaluationResult {
  passed: boolean;
  resultStatus: 'CONFIRMED' | 'NOT_OBSERVED';
  resultText: string;
  expectedLowerIndication: number;
  expectedFinalIndication: number;
  observedFinalIndication: number;
}

/**
 * Checks if Digital Discrimination testing under OIML R 76 A.4.8.2 applies.
 */
export function isDigitalDiscriminationApplicable(params: {
  testContext?: TestContext;
  dVal: number;
  dUnit: MassUnit;
  isDigital?: boolean;
}): ApplicabilityResult {
  const isDigital = params.isDigital !== false;
  if (!isDigital) {
    return {
      isApplicable: false,
      reason: 'NOT_DIGITAL',
      message: 'Digital discrimination testing under A.4.8.2 applies to digital indication instruments only.',
    };
  }

  const context = params.testContext || 'TYPE_EXAMINATION';
  if (context !== 'TYPE_EXAMINATION') {
    return {
      isApplicable: false,
      reason: 'NOT_TYPE_EXAMINATION',
      message: 'Digital discrimination testing under A.4.8.2 applies to type examination.',
    };
  }

  // Convert d to mg to check d >= 5 mg threshold
  const dInMg = convertMassUnit(params.dVal, params.dUnit, 'mg');
  if (dInMg < 5) {
    return {
      isApplicable: false,
      reason: 'D_BELOW_5MG',
      message: 'This digital discrimination procedure is not applicable because d is below 5 mg.',
    };
  }

  return { isApplicable: true };
}

/**
 * Calculates 0.1d small increment weight.
 */
export function calculateOneTenthD(dVal: number, dUnit: MassUnit): { value: number; unit: MassUnit; text: string } {
  const val = Number((dVal * 0.1).toFixed(4));
  return { value: val, unit: dUnit, text: `${val} ${dUnit}` };
}

/**
 * Calculates 1.4d test weight.
 */
export function calculateOnePointFourD(dVal: number, dUnit: MassUnit): { value: number; unit: MassUnit; text: string } {
  const val = Number((dVal * 1.4).toFixed(4));
  return { value: val, unit: dUnit, text: `${val} ${dUnit}` };
}

/**
 * Calculates expected lower indication (I - d) at transition point.
 */
export function calculateExpectedLowerIndication(
  initialIndication: number,
  dVal: number,
  dUnit: MassUnit,
  loadUnit: MassUnit = 'kg'
): number {
  const dInLoadUnit = convertMassUnit(dVal, dUnit, loadUnit);
  return Number((initialIndication - dInLoadUnit).toFixed(6));
}

/**
 * Calculates expected final indication (I + d) after applying 1.4d.
 */
export function calculateExpectedFinalIndication(
  initialIndication: number,
  dVal: number,
  dUnit: MassUnit,
  loadUnit: MassUnit = 'kg'
): number {
  const dInLoadUnit = convertMassUnit(dVal, dUnit, loadUnit);
  return Number((initialIndication + dInLoadUnit).toFixed(6));
}

/**
 * Evaluates observed final indication against expected (I + d).
 */
export function evaluateDiscriminationResponse(params: {
  initialIndication: number;
  observedFinalIndication: number;
  dVal: number;
  dUnit: MassUnit;
  loadUnit?: MassUnit;
}): DiscriminationEvaluationResult {
  const loadUnit = params.loadUnit || 'kg';
  const expectedLower = calculateExpectedLowerIndication(params.initialIndication, params.dVal, params.dUnit, loadUnit);
  const expectedFinal = calculateExpectedFinalIndication(params.initialIndication, params.dVal, params.dUnit, loadUnit);

  const diff = Math.abs(params.observedFinalIndication - expectedFinal);
  const passed = diff <= 1e-4;

  return {
    passed,
    resultStatus: passed ? 'CONFIRMED' : 'NOT_OBSERVED',
    resultText: passed
      ? '✓ DISCRIMINATION RESPONSE CONFIRMED'
      : '✕ EXPECTED INDICATION CHANGE NOT OBSERVED',
    expectedLowerIndication: expectedLower,
    expectedFinalIndication: expectedFinal,
    observedFinalIndication: params.observedFinalIndication,
  };
}

/**
 * Returns prescribed test load points (Min, 1/2 Max, Max) for digital discrimination.
 */
export function getDiscriminationTestPoints(
  maxCapacity: number,
  minCapacity: number,
  unit: MassUnit = 'kg'
): DiscriminationTestPointConfig[] {
  const halfMax = Number((maxCapacity / 2).toFixed(3));
  return [
    { id: 'MIN', label: 'Test Point 1 — Minimum Load', shortLabel: 'Min Load', baseLoad: minCapacity, unit },
    { id: 'HALF_MAX', label: 'Test Point 2 — Half Maximum Load', shortLabel: 'Half Max', baseLoad: halfMax, unit },
    { id: 'MAX', label: 'Test Point 3 — Maximum Load', shortLabel: 'Max Load', baseLoad: maxCapacity, unit },
  ];
}

/**
 * Evaluates overall discrimination test status across all 3 load points.
 */
export function evaluateOverallDiscrimination(
  observations: DiscriminationTestObservation[],
  requiredPointsCount: number = 3
): { isComplete: boolean; isPassed: boolean; completedCount: number; summaryText: string } {
  const completedObs = observations.filter((o) => o.isCompleted || o.resultStatus);
  const completedCount = completedObs.length;
  const isComplete = completedCount >= requiredPointsCount;
  const allPassed = isComplete && completedObs.every((o) => o.passed);

  let summaryText = 'Pending completion of all 3 discrimination load points.';
  if (isComplete) {
    if (allPassed) {
      summaryText = '✓ Discrimination Response Confirmed Across All Points';
    } else {
      summaryText = '✕ One or More Test Points Failed Discrimination Check';
    }
  } else if (completedCount > 0) {
    summaryText = `In Progress (${completedCount} of ${requiredPointsCount} test points completed)`;
  }

  return {
    isComplete,
    isPassed: isComplete && allPassed,
    completedCount,
    summaryText,
  };
}
