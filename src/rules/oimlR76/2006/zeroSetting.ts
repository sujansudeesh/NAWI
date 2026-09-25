import { MassUnit, ZeroSettingType } from '../../../types';
import { OIML_CLAUSES, OIMLRuleMetadata } from './references';

export interface ZeroSettingAccuracyInput {
  zeroSettingType: ZeroSettingType;
  eVal: number;
  eUnit: MassUnit;
  changeoverAdditionalLoadDeltaL: number; // ΔL in eUnit (e.g. 2.0 g for e = 5 g)
  deltaLUnit?: MassUnit;
}

export interface ZeroSettingAccuracyResult {
  zeroSettingType: ZeroSettingType;
  eVal: number;
  eUnit: MassUnit;
  changeoverAdditionalLoadDeltaL: number;
  calculatedZeroErrorE0: number; // E0 = 0.5e - ΔL
  permissibleLimit: number;      // 0.25e (absolute value bound)
  permissibleLimitAbs: number;   // 0.25e
  allowableIntervalText: string; // -0.25e <= E0 <= +0.25e
  inequalityText: string;        // |E0| <= 0.25e
  passed: boolean;
  resultStatus: 'WITHIN_LIMIT' | 'EXCEEDS_LIMIT';
  isApplicable: boolean;
  notes: string;
  metadata: OIMLRuleMetadata;
}

/**
 * Evaluates zero-setting accuracy according to OIML R 76-1:2006 §4.5.2 and Procedure A.4.2.3.
 *
 * Notation: |E0| <= 0.25e (Allowable interval: -0.25e <= E0 <= +0.25e).
 */
export function evaluateZeroSettingAccuracy(
  input: ZeroSettingAccuracyInput
): ZeroSettingAccuracyResult {
  const {
    zeroSettingType,
    eVal,
    eUnit,
    changeoverAdditionalLoadDeltaL: deltaL,
  } = input;

  // E0 = 0.5e - ΔL
  const E0 = Number((0.5 * eVal - deltaL).toFixed(6));
  const permissibleLimitAbs = Number((0.25 * eVal).toFixed(6));

  const passed = Math.abs(E0) <= permissibleLimitAbs + 1e-9;
  const resultStatus: 'WITHIN_LIMIT' | 'EXCEEDS_LIMIT' = passed ? 'WITHIN_LIMIT' : 'EXCEEDS_LIMIT';

  const allowableIntervalText = `-0.25e <= E0 <= +0.25e (-${permissibleLimitAbs.toFixed(3)} ${eUnit} to +${permissibleLimitAbs.toFixed(3)} ${eUnit})`;
  const inequalityText = `|E0| <= 0.25e (${Math.abs(E0).toFixed(3)} ${eUnit} <= ${permissibleLimitAbs.toFixed(3)} ${eUnit})`;

  let notes = `Zero-setting accuracy tested per OIML R 76-1 A.4.2.3. E0 = 0.5e - ΔL = ${(0.5 * eVal).toFixed(2)} - ${deltaL.toFixed(2)} = ${E0 > 0 ? '+' : ''}${E0.toFixed(2)} ${eUnit}. Requirement: |E0| <= 0.25e (Interval: ${allowableIntervalText}).`;

  if (zeroSettingType === 'AUTOMATIC') {
    notes += ' (Procedure A.4.2.3.2: Instrument requires off-zero load to disable automatic zero-tracking).';
  }

  return {
    zeroSettingType,
    eVal,
    eUnit,
    changeoverAdditionalLoadDeltaL: deltaL,
    calculatedZeroErrorE0: E0,
    permissibleLimit: permissibleLimitAbs,
    permissibleLimitAbs,
    allowableIntervalText,
    inequalityText,
    passed,
    resultStatus,
    isApplicable: true,
    notes,
    metadata: OIML_CLAUSES.ZERO_SETTING_ACCURACY,
  };
}

/**
 * Status indicator for Zero-Setting Range test (OIML R 76-1 §4.5.1).
 */
export const ZERO_SETTING_RANGE_STATUS = {
  status: 'NOT_INCLUDED_IN_CURRENT_DEMO',
  clause: OIML_CLAUSES.ZERO_SETTING_RANGE,
  description: 'Zero-setting range test (initial ≤ 20% Max, semi-automatic ≤ 4% Max) is defined in OIML R 76-1 §4.5.1 and requires separate overload/underload test apparatus. Marked NOT INCLUDED IN CURRENT DEMO.',
};
