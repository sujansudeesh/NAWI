import { AccuracyClass, MassUnit } from '../../../types';
import { getOIMLTable6MPE, VerificationMode, MPESpecification } from './mpe';
import { convertMass } from './units';
import { OIML_CLAUSES, OIMLRuleMetadata } from './references';

export type ErrorEvaluationMethod = 'DISPLAYED_DIFFERENCE' | 'OIML_CORRECTED_ERROR';

export interface DigitalErrorEvaluationInput {
  referenceLoad: number;
  referenceLoadUnit: MassUnit;
  displayedIndication: number;
  displayedIndicationUnit: MassUnit;
  additionalChangeoverLoadDeltaL?: number; // ΔL in eUnit or reference unit
  deltaLUnit?: MassUnit;
  zeroErrorE0?: number; // E0 in eUnit
  eVal: number;
  eUnit: MassUnit;
  accuracyClass: AccuracyClass;
  mode?: VerificationMode;
}

export interface DigitalErrorEvaluationResult {
  referenceLoad: number;
  referenceLoadUnit: MassUnit;
  displayedIndication: number;
  displayedIndicationUnit: MassUnit;
  eVal: number;
  eUnit: MassUnit;
  
  // Method 1: Simple Displayed Difference (I - L)
  displayedDifference: number; // in eUnit
  displayedDifferenceFormatted: string;

  // Method 2: OIML R 76-1 A.4.4.3 Changeover & Rounding
  hasChangeoverData: boolean;
  additionalChangeoverLoadDeltaL: number; // ΔL in eUnit
  indicationBeforeRoundingP: number; // P = I + 0.5e - ΔL
  rawErrorE: number; // E = P - L in eUnit
  zeroErrorE0: number; // E0 in eUnit
  correctedErrorEc: number; // Ec = E - E0 in eUnit
  correctedErrorFormatted: string;

  // Selected Primary Error for Compliance Check
  evaluationMethod: ErrorEvaluationMethod;
  evaluatedError: number; // The error value checked against MPE (in eUnit)

  // MPE Limit & Verdict
  mpeSpec: MPESpecification;
  mpeLimitValue: number; // MPE in eUnit
  passed: boolean;
  mpeStatus: 'WITHIN_MPE' | 'EXCEEDS_MPE';
  
  metadata: OIMLRuleMetadata;
  calculationExplanation: string[];
}

/**
 * Evaluates digital scale indication error per OIML R 76-1:2006 A.4.4.3.
 */
export function evaluateDigitalIndicationError(
  input: DigitalErrorEvaluationInput
): DigitalErrorEvaluationResult {
  const {
    referenceLoad: L_ref,
    referenceLoadUnit: refUnit,
    displayedIndication: I_disp,
    displayedIndicationUnit: dispUnit,
    additionalChangeoverLoadDeltaL: deltaLInput = 0,
    deltaLUnit = input.eUnit,
    zeroErrorE0: E0 = 0,
    eVal,
    eUnit,
    accuracyClass,
    mode = 'INITIAL_VERIFICATION',
  } = input;

  // Convert reference load and indication into eUnit scale
  const L = convertMass(L_ref, refUnit, eUnit);
  const I = convertMass(I_disp, dispUnit, eUnit);
  const deltaL = convertMass(deltaLInput, deltaLUnit, eUnit);

  // 1. Simple Displayed Difference (I - L)
  const displayedDifference = I - L;

  // 2. Changeover Point & Indication Before Rounding P = I + 0.5e - ΔL
  const hasChangeoverData = deltaLInput > 0;
  const P = hasChangeoverData ? I + 0.5 * eVal - deltaL : I;
  const E = P - L; // Raw Error
  const Ec = E - E0; // Corrected Error Ec = E - E0

  // Select primary error for MPE comparison
  const evaluationMethod: ErrorEvaluationMethod = hasChangeoverData ? 'OIML_CORRECTED_ERROR' : 'DISPLAYED_DIFFERENCE';
  const evaluatedError = evaluationMethod === 'OIML_CORRECTED_ERROR' ? Ec : displayedDifference;

  // MPE Evaluation
  const mpeSpec = getOIMLTable6MPE(accuracyClass, L_ref, refUnit, eVal, eUnit, mode);
  const mpeLimitValue = mpeSpec.mpeValue;

  const passed = Math.abs(evaluatedError) <= mpeLimitValue + 1e-9;
  const mpeStatus: 'WITHIN_MPE' | 'EXCEEDS_MPE' = passed ? 'WITHIN_MPE' : 'EXCEEDS_MPE';

  const explanation: string[] = [
    `Reference Load (L) = ${L_ref} ${refUnit} (${L.toFixed(3)} ${eUnit})`,
    `Displayed Indication (I) = ${I_disp} ${dispUnit} (${I.toFixed(3)} ${eUnit})`,
    `Displayed Difference (I - L) = ${displayedDifference > 0 ? '+' : ''}${displayedDifference.toFixed(3)} ${eUnit}`,
  ];

  if (hasChangeoverData) {
    explanation.push(
      `Changeover Load (ΔL) = ${deltaL.toFixed(3)} ${eUnit}`,
      `Indication Before Rounding P = I + 0.5e - ΔL = ${I.toFixed(3)} + ${(0.5 * eVal).toFixed(3)} - ${deltaL.toFixed(3)} = ${P.toFixed(3)} ${eUnit}`,
      `Raw Error E = P - L = ${P.toFixed(3)} - ${L.toFixed(3)} = ${E > 0 ? '+' : ''}${E.toFixed(3)} ${eUnit}`,
      `Zero Error (E0) = ${E0 > 0 ? '+' : ''}${E0.toFixed(3)} ${eUnit}`,
      `OIML Corrected Error Ec = E - E0 = ${E.toFixed(3)} - ${E0.toFixed(3)} = ${Ec > 0 ? '+' : ''}${Ec.toFixed(3)} ${eUnit}`,
      `Evaluating |Ec| = ${Math.abs(Ec).toFixed(3)} ${eUnit} against MPE ±${mpeLimitValue} ${eUnit} => ${passed ? 'PASS (Within MPE)' : 'FAIL (Exceeds MPE)'}`
    );
  } else {
    explanation.push(
      `Evaluating |I - L| = ${Math.abs(displayedDifference).toFixed(3)} ${eUnit} against MPE ±${mpeLimitValue} ${eUnit} => ${passed ? 'PASS (Within MPE)' : 'FAIL (Exceeds MPE)'}`
    );
  }

  const formatErrorStr = (val: number) => {
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(3)} ${eUnit}`;
  };

  return {
    referenceLoad: L_ref,
    referenceLoadUnit: refUnit,
    displayedIndication: I_disp,
    displayedIndicationUnit: dispUnit,
    eVal,
    eUnit,
    displayedDifference,
    displayedDifferenceFormatted: formatErrorStr(displayedDifference),
    hasChangeoverData,
    additionalChangeoverLoadDeltaL: deltaL,
    indicationBeforeRoundingP: P,
    rawErrorE: E,
    zeroErrorE0: E0,
    correctedErrorEc: Ec,
    correctedErrorFormatted: formatErrorStr(Ec),
    evaluationMethod,
    evaluatedError,
    mpeSpec,
    mpeLimitValue,
    passed,
    mpeStatus,
    metadata: hasChangeoverData ? OIML_CLAUSES.CORRECTED_ERROR : OIML_CLAUSES.MPE_TABLE_6,
    calculationExplanation: explanation,
  };
}
