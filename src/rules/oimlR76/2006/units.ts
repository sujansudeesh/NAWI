import { MassUnit } from '../../../types';

/**
 * Canonical Mass Unit Normalization Engine (OIML R 76-1:2006 §3.2)
 *
 * To avoid floating-point binary representation glitches (e.g. 0.005 kg != 5 g in IEEE 754),
 * all internal comparisons normalize mass values to integer Micrograms (µg) using exact
 * decimal string parsing without binary floating-point multiplication.
 * 
 * 1 mg = 1,000 µg (scale: 3 decimal places)
 * 1 g  = 1,000,000 µg (scale: 6 decimal places)
 * 1 kg = 1,000,000,000 µg (scale: 9 decimal places)
 * 1 t  = 1,000,000,000,000 µg (scale: 12 decimal places)
 */

const MICROGRAM_MULTIPLIERS: Record<MassUnit, bigint> = {
  mg: 1000n,
  ct: 200000n, // 1 ct = 0.2 g = 200,000 µg
  g: 1000000n,
  kg: 1000000000n,
  t: 1000000000000n,
};

const UNIT_DECIMAL_SCALES: Record<MassUnit, number> = {
  mg: 3,
  ct: 5,
  g: 6,
  kg: 9,
  t: 12,
};

/**
 * Converts a mass value (number or numeric string) in a given unit to exact integer Micrograms (bigint)
 * using string-based decimal parsing to eliminate IEEE 754 binary floating-point artifacts.
 */
export function toMicrograms(value: number | string, unit: MassUnit): bigint {
  const str = String(value).trim();
  if (!str || str === 'NaN') return 0n;

  const negative = str.startsWith('-');
  const cleanStr = negative ? str.slice(1) : str;

  // Handle exponential scientific notation (e.g., 1e-3)
  if (cleanStr.includes('e') || cleanStr.includes('E')) {
    const num = Number(cleanStr);
    const multiplier = MICROGRAM_MULTIPLIERS[unit] || 1000000n;
    const res = BigInt(Math.round(num * Number(multiplier)));
    return negative ? -res : res;
  }

  const parts = cleanStr.split('.');
  const intPart = parts[0] || '0';
  const fracPart = parts[1] || '';

  const scale = UNIT_DECIMAL_SCALES[unit] ?? 6;

  let paddedFrac = fracPart.padEnd(scale, '0');
  let roundAdd = 0n;

  if (paddedFrac.length > scale) {
    const extra = paddedFrac.slice(scale);
    paddedFrac = paddedFrac.slice(0, scale);
    if (extra[0] >= '5') {
      roundAdd = 1n;
    }
  }

  let microStr = (intPart + paddedFrac).replace(/^0+/, '');
  if (microStr === '') microStr = '0';

  let micrograms = BigInt(microStr) + roundAdd;
  return negative ? -micrograms : micrograms;
}

/**
 * Converts microgram integer representation back to specified target mass unit.
 */
export function fromMicrograms(micrograms: bigint, targetUnit: MassUnit): number {
  const multiplier = MICROGRAM_MULTIPLIERS[targetUnit] || 1000000n;
  return Number(micrograms) / Number(multiplier);
}

/**
 * Canonical equality check between two mass quantities across different units.
 * Returns true if 5 g and 0.005 kg are mathematically identical.
 */
export function isMassEqual(val1: number | string, unit1: MassUnit, val2: number | string, unit2: MassUnit): boolean {
  return toMicrograms(val1, unit1) === toMicrograms(val2, unit2);
}

/**
 * Converts a mass value from source unit to target unit using canonical microgram intermediate.
 */
export function convertMass(value: number | string, fromUnit: MassUnit, toUnit: MassUnit): number {
  if (fromUnit === toUnit) return typeof value === 'number' ? value : Number(value);
  const ug = toMicrograms(value, fromUnit);
  return fromMicrograms(ug, toUnit);
}

export interface ScaleIntervalsNResult {
  n: number;
  isValidIntegralRatio: boolean;
  maxMicrograms: bigint;
  eMicrograms: bigint;
  remainderMicrograms: bigint;
  errorMessage?: string;
}

/**
 * Calculates verification scale intervals n = Max / e using exact integer normalized units.
 * Validates that MaxMicrograms % eMicrograms === 0n to prevent silent truncation.
 */
export function calculateNormalizedNResult(
  maxCapacity: number | string,
  maxUnit: MassUnit,
  eVal: number | string,
  eUnit: MassUnit
): ScaleIntervalsNResult {
  const maxUg = toMicrograms(maxCapacity, maxUnit);
  const eUg = toMicrograms(eVal, eUnit);

  if (eUg === 0n) {
    return {
      n: 0,
      isValidIntegralRatio: false,
      maxMicrograms: maxUg,
      eMicrograms: eUg,
      remainderMicrograms: 0n,
      errorMessage: 'Verification scale interval e cannot be zero.',
    };
  }

  const remainder = maxUg % eUg;
  const isValidIntegralRatio = remainder === 0n;
  const n = Number(maxUg / eUg);

  return {
    n,
    isValidIntegralRatio,
    maxMicrograms: maxUg,
    eMicrograms: eUg,
    remainderMicrograms: remainder,
    errorMessage: isValidIntegralRatio
      ? undefined
      : `Invalid non-integral scale ratio for n = Max/e: Max (${maxCapacity} ${maxUnit} = ${maxUg} µg) is not an exact integer multiple of e (${eVal} ${eUnit} = ${eUg} µg). Remainder: ${remainder} µg.`,
  };
}

/**
 * Calculates verification scale intervals n = Max / e after canonical unit normalization.
 * Throws a descriptive validation error if Max / e has a non-zero microgram remainder.
 */
export function calculateNormalizedN(
  maxCapacity: number | string,
  maxUnit: MassUnit,
  eVal: number | string,
  eUnit: MassUnit
): number {
  const res = calculateNormalizedNResult(maxCapacity, maxUnit, eVal, eUnit);
  if (!res.isValidIntegralRatio) {
    throw new Error(res.errorMessage);
  }
  return res.n;
}
