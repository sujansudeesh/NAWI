import { AccuracyClass, MassUnit, TareType } from '../../../types';
import { getOIMLTable6MPE, VerificationMode, MPESpecification } from './mpe';
import { convertMass } from './units';
import { OIML_CLAUSES, OIMLRuleMetadata } from './references';

export interface TareSettingAccuracyInput {
  appliedTareLoad: number;
  tareLoadUnit: MassUnit;
  eVal: number;
  eUnit: MassUnit;
  changeoverAdditionalLoadDeltaL: number;
}

export interface TareSettingAccuracyResult {
  appliedTareLoad: number;
  tareLoadUnit: MassUnit;
  eVal: number;
  eUnit: MassUnit;
  changeoverAdditionalLoadDeltaL: number;
  calculatedTareZeroErrorET: number; // ET = 0.5e - ΔL
  permissibleTareZeroLimit: number;   // 0.25e (absolute value bound)
  permissibleLimitAbs: number;       // 0.25e
  allowableIntervalText: string;     // -0.25e <= ET <= +0.25e
  inequalityText: string;            // |ET| <= 0.25e
  passed: boolean;
  resultStatus: 'WITHIN_LIMIT' | 'EXCEEDS_LIMIT';
  metadata: OIMLRuleMetadata;
}

export interface TareNetWeighingInput {
  tareType: TareType;
  appliedTareLoad: number;
  tareLoadUnit: MassUnit;
  referenceNetLoad: number;
  netLoadUnit: MassUnit;
  displayedNetReading: number;
  displayedNetUnit: MassUnit;
  maxCapacity: number;
  maxUnit: MassUnit;
  eVal: number;
  eUnit: MassUnit;
  accuracyClass: AccuracyClass;
  mode?: VerificationMode;
}

export interface TareNetWeighingResult {
  tareType: TareType;
  appliedTareLoad: number;
  tareLoadUnit: MassUnit;
  referenceNetLoad: number;
  netLoadUnit: MassUnit;
  displayedNetReading: number;
  displayedNetUnit: MassUnit;
  calculatedGrossLoad: number;
  grossLoadUnit: MassUnit;
  availableNetCapacity: number; // Max - T (Subtractive) or Max (Additive)
  netCapacityUnit: MassUnit;
  netError: number; // in eUnit
  netErrorFormatted: string;
  mpeSpec: MPESpecification; // MPE based on Net Load (OIML R 76-1 §3.5.3.4)
  mpeLimitValue: number;     // in eUnit
  passed: boolean;
  mpeStatus: 'WITHIN_MPE' | 'EXCEEDS_MPE';
  metadata: OIMLRuleMetadata;
  calculationExplanation: string[];
}

/**
 * Evaluates Tare Setting Accuracy per OIML R 76-1:2006 §4.6.3 and Procedure A.4.6.1.
 * Notation: |ET| <= 0.25e (Allowable interval: -0.25e <= ET <= +0.25e).
 */
export function evaluateTareSettingAccuracy(
  input: TareSettingAccuracyInput
): TareSettingAccuracyResult {
  const { appliedTareLoad, tareLoadUnit, eVal, eUnit, changeoverAdditionalLoadDeltaL: deltaL } = input;

  const ET = Number((0.5 * eVal - deltaL).toFixed(6));
  const permissibleLimitAbs = Number((0.25 * eVal).toFixed(6));
  const passed = Math.abs(ET) <= permissibleLimitAbs + 1e-9;

  const allowableIntervalText = `-0.25e <= ET <= +0.25e (-${permissibleLimitAbs.toFixed(3)} ${eUnit} to +${permissibleLimitAbs.toFixed(3)} ${eUnit})`;
  const inequalityText = `|ET| <= 0.25e (${Math.abs(ET).toFixed(3)} ${eUnit} <= ${permissibleLimitAbs.toFixed(3)} ${eUnit})`;

  return {
    appliedTareLoad,
    tareLoadUnit,
    eVal,
    eUnit,
    changeoverAdditionalLoadDeltaL: deltaL,
    calculatedTareZeroErrorET: ET,
    permissibleTareZeroLimit: permissibleLimitAbs,
    permissibleLimitAbs,
    allowableIntervalText,
    inequalityText,
    passed,
    resultStatus: passed ? 'WITHIN_LIMIT' : 'EXCEEDS_LIMIT',
    metadata: OIML_CLAUSES.TARE_SETTING_ACCURACY,
  };
}

/**
 * Evaluates Net Weighing Performance under Tare per OIML R 76-1:2006 §3.5.3.4 & A.4.6.2.
 * Crucial Rule: MPE for tare weighing is based on the NET LOAD (L_net), NOT gross load.
 */
export function evaluateTareNetWeighing(
  input: TareNetWeighingInput
): TareNetWeighingResult {
  const {
    tareType,
    appliedTareLoad: T_val,
    tareLoadUnit: T_unit,
    referenceNetLoad: L_net,
    netLoadUnit: netUnit,
    displayedNetReading: I_net,
    displayedNetUnit: dispUnit,
    maxCapacity: Max,
    maxUnit: MaxUnit,
    eVal,
    eUnit,
    accuracyClass,
    mode = 'INITIAL_VERIFICATION',
  } = input;

  const T = convertMass(T_val, T_unit, eUnit);
  const L = convertMass(L_net, netUnit, eUnit);
  const I = convertMass(I_net, dispUnit, eUnit);
  const MaxE = convertMass(Max, MaxUnit, eUnit);

  // Subtractive vs Additive Tare Net Capacity derivation
  const availableNetCapacityInE = tareType === 'SUBTRACTIVE' ? Math.max(0, MaxE - T) : MaxE;
  const availableNetCapacity = convertMass(availableNetCapacityInE, eUnit, netUnit);

  const grossLoadInE = T + L;
  const grossLoad = convertMass(grossLoadInE, eUnit, netUnit);

  const netErrorInE = I - L;

  // MPE determination based on Net Load L_net per OIML R 76-1 §3.5.3.4
  const mpeSpec = getOIMLTable6MPE(accuracyClass, L_net, netUnit, eVal, eUnit, mode);
  const mpeLimitValue = mpeSpec.mpeValue;

  const passed = Math.abs(netErrorInE) <= mpeLimitValue + 1e-9;

  const explanation = [
    `Tare Device Type: ${tareType}`,
    `Applied Tare Load (T): ${T_val} ${T_unit}`,
    `Available Net Capacity (${tareType}): ${availableNetCapacity.toFixed(3)} ${netUnit}`,
    `Reference Net Load (L_net): ${L_net} ${netUnit}`,
    `Displayed Net Reading (I_net): ${I_net} ${dispUnit}`,
    `Calculated Gross Load (G = T + L_net): ${grossLoad.toFixed(3)} ${netUnit}`,
    `Net Error (I_net - L_net): ${netErrorInE > 0 ? '+' : ''}${netErrorInE.toFixed(3)} ${eUnit}`,
    `MPE Basis (OIML R 76-1 §3.5.3.4): Evaluated against Net Load ${L_net} ${netUnit} => MPE = ±${mpeLimitValue} ${eUnit}`,
    `Compliance Verdict: ${passed ? 'PASS (Within MPE)' : 'FAIL (Exceeds MPE)'}`,
  ];

  return {
    tareType,
    appliedTareLoad: T_val,
    tareLoadUnit: T_unit,
    referenceNetLoad: L_net,
    netLoadUnit: netUnit,
    displayedNetReading: I_net,
    displayedNetUnit: dispUnit,
    calculatedGrossLoad: grossLoad,
    grossLoadUnit: netUnit,
    availableNetCapacity,
    netCapacityUnit: netUnit,
    netError: netErrorInE,
    netErrorFormatted: `${netErrorInE > 0 ? '+' : ''}${netErrorInE.toFixed(3)} ${eUnit}`,
    mpeSpec,
    mpeLimitValue,
    passed,
    mpeStatus: passed ? 'WITHIN_MPE' : 'EXCEEDS_MPE',
    metadata: OIML_CLAUSES.TARE_NET_WEIGHING,
    calculationExplanation: explanation,
  };
}
