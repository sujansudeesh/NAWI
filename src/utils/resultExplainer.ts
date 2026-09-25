/**
 * Dynamic OIML Result Explanation Generator (Section 11)
 *
 * Generates human-readable, rule-derived explanations for every test observation
 * directly from actual calculated values.
 */

export interface ExplanationInput {
  testType: 'ACCURACY' | 'ZERO_SETTING' | 'TARE_SETTING' | 'TARE_NET' | 'ECCENTRICITY' | 'DISCRIMINATION' | 'REPEATABILITY';
  observedValue: number;
  observedUnit: string;
  permissibleLimit: number;
  permissibleUnit: string;
  passed: boolean;
  extraContext?: string;
}

export function generateWhyThisResultText(input: ExplanationInput): string {
  const { testType, observedValue, observedUnit, permissibleLimit, permissibleUnit, passed, extraContext } = input;
  const absVal = Math.abs(observedValue);
  const sign = observedValue > 0 ? '+' : '';

  switch (testType) {
    case 'ACCURACY':
      return `The observed corrected error is ${sign}${observedValue} ${observedUnit}. The applicable maximum permissible error (MPE) is ±${permissibleLimit} ${permissibleUnit}. Because |${sign}${observedValue} ${observedUnit}| ≤ ${permissibleLimit} ${permissibleUnit}, the observation is ${passed ? 'within the applicable limit (PASS)' : 'exceeds the applicable limit (FAIL)'}.${extraContext ? ' ' + extraContext : ''}`;

    case 'ZERO_SETTING':
      return `The calculated zero error E0 is ${sign}${observedValue} ${observedUnit}. The allowable zero-setting deviation is ±${permissibleLimit} ${permissibleUnit} (±0.25e). Because |${sign}${observedValue} ${observedUnit}| ≤ ${permissibleLimit} ${permissibleUnit}, the zero-setting accuracy is ${passed ? 'within the permissible limit (PASS)' : 'exceeds the limit (FAIL)'}.`;

    case 'TARE_SETTING':
      return `The calculated tare zero error ET is ${sign}${observedValue} ${observedUnit}. The allowable tare zero deviation is ±${permissibleLimit} ${permissibleUnit} (±0.25e). Because |${sign}${observedValue} ${observedUnit}| ≤ ${permissibleLimit} ${permissibleUnit}, the tare setting is ${passed ? 'within the permissible limit (PASS)' : 'exceeds the limit (FAIL)'}.`;

    case 'TARE_NET':
      return `The observed net error under tare is ${sign}${observedValue} ${observedUnit}. The MPE evaluated for this net load per OIML R 76-1 §3.5.3.4 is ±${permissibleLimit} ${permissibleUnit}. Because |${sign}${observedValue} ${observedUnit}| ≤ ${permissibleLimit} ${permissibleUnit}, the net weighing performance is ${passed ? 'within the limit (PASS)' : 'exceeds the limit (FAIL)'}.`;

    case 'ECCENTRICITY':
      return `The observed error at this receptor position is ${sign}${observedValue} ${observedUnit}. The applicable MPE at 1/3 Max load is ±${permissibleLimit} ${permissibleUnit}. Because |${sign}${observedValue} ${observedUnit}| ≤ ${permissibleLimit} ${permissibleUnit}, the position error is ${passed ? 'within the allowed limit (PASS)' : 'exceeds the allowed limit (FAIL)'}.`;

    case 'DISCRIMINATION':
      return `Adding an extra load of 1.4d (${permissibleLimit} ${permissibleUnit}) to the receptor ${passed ? 'successfully caused the display indication to change to I + d (CONFIRMED)' : 'failed to cause the required indication change to I + d (NOT OBSERVED)'}.`;

    case 'REPEATABILITY':
      return `The maximum spread between repeated weighings is ${observedValue} ${observedUnit}. The allowable maximum spread (equal to MPE for that load) is ${permissibleLimit} ${permissibleUnit}. Because ${observedValue} ${observedUnit} ≤ ${permissibleLimit} ${permissibleUnit}, the repeatability is ${passed ? 'within the allowed limit (PASS)' : 'exceeds the allowed limit (FAIL)'}.`;

    default:
      return `The calculated error is ${sign}${observedValue} ${observedUnit} vs allowed limit ±${permissibleLimit} ${permissibleUnit} (${passed ? 'PASS' : 'FAIL'}).`;
  }
}
