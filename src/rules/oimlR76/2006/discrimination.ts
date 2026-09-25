import { MassUnit } from '../../../types';
import { convertMass } from './units';
import { OIML_CLAUSES, OIMLRuleMetadata } from './references';

export interface DiscriminationTestPointInput {
  testPointId: 'MIN' | 'HALF_MAX' | 'MAX';
  testPointLabel: string;
  baseLoad: number;
  baseLoadUnit: MassUnit;
  scaleIntervalD: number;
  dUnit: MassUnit;
  initialIndication: number;
  additionalDeltaLoad: number; // 1.4d in dUnit
  observedFinalIndication: number;
}

export interface DiscriminationTestPointResult {
  testPointId: 'MIN' | 'HALF_MAX' | 'MAX';
  testPointLabel: string;
  baseLoad: number;
  baseLoadUnit: MassUnit;
  scaleIntervalD: number;
  dUnit: MassUnit;
  oneTenthD: number; // 0.1d
  onePointFourD: number; // 1.4d
  initialIndication: number;
  expectedLowerIndication: number; // I - d
  expectedFinalIndication: number; // I + d
  observedFinalIndication: number;
  passed: boolean;
  resultStatus: 'CONFIRMED' | 'NOT_OBSERVED';
  resultText: string;
  metadata: OIMLRuleMetadata;
}

/**
 * Evaluates digital discrimination test point response per OIML R 76-1:2006 §3.8 & Procedure A.4.8.
 * NOTE: Discrimination specifically uses scale interval d (actual scale interval), NOT e.
 */
export function evaluateDigitalDiscriminationTestPoint(
  input: DiscriminationTestPointInput
): DiscriminationTestPointResult {
  const {
    testPointId,
    testPointLabel,
    baseLoad,
    baseLoadUnit,
    scaleIntervalD: dVal,
    dUnit,
    initialIndication: I_val,
    observedFinalIndication: I_final,
  } = input;

  const dInBaseUnit = convertMass(dVal, dUnit, baseLoadUnit);
  const oneTenthD = Number((0.1 * dVal).toFixed(6));
  const onePointFourD = Number((1.4 * dVal).toFixed(6));

  const expectedLowerIndication = Number((I_val - dInBaseUnit).toFixed(6));
  const expectedFinalIndication = Number((I_val + dInBaseUnit).toFixed(6));

  // OIML R 76-1 A.4.8.2: Display must change from I to I + d upon adding 1.4d
  const passed = Math.abs(I_final - expectedFinalIndication) < 1e-6;
  const resultStatus: 'CONFIRMED' | 'NOT_OBSERVED' = passed ? 'CONFIRMED' : 'NOT_OBSERVED';
  const resultText = passed ? '✓ DISCRIMINATION RESPONSE CONFIRMED' : '✕ DISCRIMINATION RESPONSE NOT OBSERVED';

  return {
    testPointId,
    testPointLabel,
    baseLoad,
    baseLoadUnit,
    scaleIntervalD: dVal,
    dUnit,
    oneTenthD,
    onePointFourD,
    initialIndication: I_val,
    expectedLowerIndication,
    expectedFinalIndication,
    observedFinalIndication: I_final,
    passed,
    resultStatus,
    resultText,
    metadata: OIML_CLAUSES.DISCRIMINATION,
  };
}
