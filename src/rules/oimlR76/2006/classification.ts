import { AccuracyClass, MassUnit } from '../../../types';
import { calculateNormalizedN, toMicrograms, fromMicrograms } from './units';
import { OIML_CLAUSES, OIMLRuleMetadata } from './references';

export interface ClassificationValidationResult {
  accuracyClass: AccuracyClass;
  verificationIntervalE: number;
  eUnit: MassUnit;
  maxCapacity: number;
  maxUnit: MassUnit;
  minCapacity: number;
  minUnit: MassUnit;
  nCalculated: number;
  nMinAllowed: number;
  nMaxAllowed: number;
  minCapacityAllowedE: number; // e.g. 100e, 20e, 10e
  minCapacityAllowedValue: number; // Min in eUnit
  isValidN: boolean;
  isValidMin: boolean;
  isValid: boolean;
  validationErrors: string[];
  metadata: OIMLRuleMetadata;
}

/**
 * Validates instrument classification parameters against OIML R 76-1:2006 §3.9 Table 3.
 */
export function validateInstrumentClassification(
  accuracyClass: AccuracyClass,
  maxCapacity: number,
  maxUnit: MassUnit,
  eVal: number,
  eUnit: MassUnit,
  minCapacity: number,
  minUnit: MassUnit
): ClassificationValidationResult {
  const n = calculateNormalizedN(maxCapacity, maxUnit, eVal, eUnit);
  const errors: string[] = [];

  let nMinAllowed = 100;
  let nMaxAllowed = 100000;
  let minAllowedE = 20;

  const eInGrams = fromMicrograms(toMicrograms(eVal, eUnit), 'g');

  switch (accuracyClass) {
    case 'Class I':
      nMinAllowed = 50000;
      nMaxAllowed = 1000000000; // Unlimited in practice
      minAllowedE = 100;
      break;

    case 'Class II':
      if (eInGrams < 0.1) {
        nMinAllowed = 100;
        nMaxAllowed = 100000;
        minAllowedE = 20; // 50e for liquid/gas balances
      } else {
        nMinAllowed = 5000;
        nMaxAllowed = 100000;
        minAllowedE = 20;
      }
      break;

    case 'Class III':
      if (eInGrams < 5) {
        nMinAllowed = 100;
        nMaxAllowed = 10000;
        minAllowedE = 20;
      } else {
        nMinAllowed = 500;
        nMaxAllowed = 10000;
        minAllowedE = 20;
      }
      break;

    case 'Class IIII':
      nMinAllowed = 100;
      nMaxAllowed = 1000;
      minAllowedE = 10;
      break;

    default:
      errors.push(`Unknown accuracy class '${accuracyClass}'. Allowed: Class I, Class II, Class III, Class IIII`);
      break;
  }

  const isValidN = n >= nMinAllowed && n <= nMaxAllowed;
  if (!isValidN) {
    errors.push(
      `Number of verification scale intervals n=${n} is outside allowed range [${nMinAllowed}, ${nMaxAllowed}] for ${accuracyClass} (OIML R 76-1 Table 3).`
    );
  }

  const minUg = toMicrograms(minCapacity, minUnit);
  const minAllowedUg = toMicrograms(minAllowedE * eVal, eUnit);
  const isValidMin = minUg >= minAllowedUg;
  if (!isValidMin) {
    const minAllowedVal = fromMicrograms(minAllowedUg, minUnit);
    errors.push(
      `Minimum capacity Min=${minCapacity} ${minUnit} is less than required minimum ${minAllowedE}e (${minAllowedVal} ${minUnit}) for ${accuracyClass}.`
    );
  }

  const minCapacityAllowedValue = fromMicrograms(minAllowedUg, eUnit);

  return {
    accuracyClass,
    verificationIntervalE: eVal,
    eUnit,
    maxCapacity,
    maxUnit,
    minCapacity,
    minUnit,
    nCalculated: n,
    nMinAllowed,
    nMaxAllowed,
    minCapacityAllowedE: minAllowedE,
    minCapacityAllowedValue,
    isValidN,
    isValidMin,
    isValid: errors.length === 0,
    validationErrors: errors,
    metadata: OIML_CLAUSES.CLASSIFICATION,
  };
}
