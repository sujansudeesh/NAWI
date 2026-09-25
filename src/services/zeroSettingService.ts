import { MassUnit, ZeroSettingType, ZeroSettingTestObservation } from '../types';

/**
 * ============================================================================
 * OIML R 76-1:2006 ZERO-SETTING ACCURACY SERVICE (§4.5.2 & Procedure A.4.2.3)
 * ============================================================================
 * 
 * Rules:
 * 1. OIML Accuracy Limit:
 *    After zero setting, the effect of deviation from zero on the weighing result
 *    must not exceed ±0.25e.
 * 
 * 2. Pre-Rounding Zero Error Formula (Digital Indication):
 *    P0 = I + 0.5e - ΔL
 *    Since I = 0 at zero indication:
 *    P0 = 0.5e - ΔL
 *    Zero Error E0 = P0 = 0.5e - ΔL
 * 
 * 3. Validation:
 *    |E0| <= 0.25e
 * ============================================================================
 */

export interface ZeroSettingValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export interface ZeroSettingApplicabilityResult {
  isApplicable: boolean;
  isAutomatic: boolean;
  message?: string;
}

export interface ZeroSettingEvaluationResult {
  passed: boolean;
  resultStatus: 'WITHIN_LIMIT' | 'EXCEEDS_LIMIT';
  resultText: string;
  zeroError: number;
  zeroErrorFormatted: string;
  halfE: number;
  permissibleZeroDeviation: number;
  permissibleZeroDeviationFormatted: string;
}

/**
 * Calculates 0.1e suggested increment weight.
 */
export function calculateOneTenthE(eVal: number, eUnit: MassUnit): { value: number; unit: MassUnit; text: string } {
  const val = Number((eVal * 0.1).toFixed(4));
  return { value: val, unit: eUnit, text: `${val} ${eUnit}` };
}

/**
 * Calculates 0.25e permissible zero deviation limit.
 */
export function calculateQuarterE(eVal: number, eUnit: MassUnit): { value: number; unit: MassUnit; text: string } {
  const val = Number((eVal * 0.25).toFixed(4));
  return { value: val, unit: eUnit, text: `±${val} ${eUnit}` };
}

/**
 * Calculates 0.5e half verification scale interval.
 */
export function calculateHalfE(eVal: number, eUnit: MassUnit): { value: number; unit: MassUnit; text: string } {
  const val = Number((eVal * 0.5).toFixed(4));
  return { value: val, unit: eUnit, text: `${val} ${eUnit}` };
}

/**
 * Validates officer changeover input for sanity before calculation.
 * Rejects negative values or values absurdly larger than 5 * e.
 */
export function validateZeroSettingInput(
  deltaL: number,
  eVal: number
): ZeroSettingValidationResult {
  if (isNaN(deltaL) || deltaL < 0) {
    return {
      isValid: false,
      errorMessage: 'Changeover load must be a non-negative numeric value.',
    };
  }

  // Sensible sanity check: ΔL should not exceed 5 * e (e.g. 25 g for e = 5 g)
  if (eVal > 0 && deltaL > eVal * 5) {
    return {
      isValid: false,
      errorMessage: "Changeover load appears inconsistent with the instrument's verification interval. Please check the value.",
    };
  }

  return { isValid: true };
}

/**
 * Checks procedure applicability based on zero setting type.
 */
export function isZeroSettingProcedureApplicable(
  zeroSettingType: ZeroSettingType = 'SEMI_AUTOMATIC'
): ZeroSettingApplicabilityResult {
  if (zeroSettingType === 'AUTOMATIC' || zeroSettingType === 'ZERO_TRACKING') {
    return {
      isApplicable: false,
      isAutomatic: true,
      message: 'Automatic zero-setting / zero-tracking requires off-zero load procedure (approx. 10e) under OIML A.4.2.3.2.',
    };
  }

  return {
    isApplicable: true,
    isAutomatic: false,
  };
}

/**
 * Calculates zero error E0 = 0.5e - ΔL.
 */
export function calculateZeroError(
  deltaL: number,
  eVal: number,
  eUnit: MassUnit = 'g'
): { zeroError: number; formatted: string } {
  const halfEVal = eVal * 0.5;
  const zeroError = Number((halfEVal - deltaL).toFixed(4));
  const sign = zeroError > 0 ? '+' : '';
  const formatted = `${sign}${zeroError} ${eUnit}`;
  return { zeroError, formatted };
}

/**
 * Evaluates zero-setting accuracy against OIML R 76 §4.5.2 limit (±0.25e).
 */
export function evaluateZeroSettingAccuracy(params: {
  zeroSettingType?: ZeroSettingType;
  eVal: number;
  eUnit: MassUnit;
  changeoverAdditionalLoad: number; // ΔL in eUnit
}): ZeroSettingEvaluationResult {
  const eVal = params.eVal || 5;
  const eUnit = params.eUnit || 'g';
  const deltaL = params.changeoverAdditionalLoad;

  const halfEVal = eVal * 0.5;
  const quarterEVal = Number((eVal * 0.25).toFixed(4));

  const { zeroError, formatted: zeroErrorFormatted } = calculateZeroError(deltaL, eVal, eUnit);
  const absError = Math.abs(zeroError);

  const passed = absError <= quarterEVal + 1e-9;
  const resultStatus: 'WITHIN_LIMIT' | 'EXCEEDS_LIMIT' = passed ? 'WITHIN_LIMIT' : 'EXCEEDS_LIMIT';

  return {
    passed,
    resultStatus,
    resultText: passed ? '✓ ZERO SETTING WITHIN LIMIT' : '✕ ZERO SETTING EXCEEDS LIMIT',
    zeroError,
    zeroErrorFormatted,
    halfE: halfEVal,
    permissibleZeroDeviation: quarterEVal,
    permissibleZeroDeviationFormatted: `±${quarterEVal} ${eUnit}`,
  };
}
