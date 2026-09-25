import { AccuracyClass, MassUnit } from '../../../types';
import { getTable6MPEBand, VerificationMode } from './mpeRules';

/**
 * ============================================================================
 * OIML R 76-1:2006 INFLUENCE FACTOR RULES (STATIC TEMPERATURE & ENVIRONMENT)
 * ============================================================================
 * Official OIML R 76-1:2006 Clause 3.9.2, Clause 5.3.1 & Procedure A.5.3.
 * ============================================================================
 */

export interface TemperatureRangeSpec {
  minTemp: number; // °C (default -10 °C)
  maxTemp: number; // °C (default +40 °C)
  spanTemp: number; // °C
  minRequiredSpan: number; // °C (5 °C for Class I, 15 °C for Class II, 30 °C for Class III/IIII)
  isRangeCompliant: boolean;
}

export interface StaticTempEvalResult {
  referenceLoad: number;
  scaleReading: number;
  calculatedError: number;
  mpeValue: number;
  mpeUnit: MassUnit;
  passed: boolean;
  resultStatus: 'WITHIN_LIMIT' | 'EXCEEDS_LIMIT';
  mpeBandText: string;
}

/**
 * Determines specified OIML temperature limits based on instrument Accuracy Class.
 * Per Clause 3.9.2.2: Default range is -10 °C to +40 °C if unstated.
 */
export function getSpecifiedTemperatureRange(
  accuracyClass: AccuracyClass,
  statedMin?: number,
  statedMax?: number
): TemperatureRangeSpec {
  const minTemp = statedMin !== undefined && !isNaN(statedMin) ? statedMin : -10;
  const maxTemp = statedMax !== undefined && !isNaN(statedMax) ? statedMax : 40;
  const spanTemp = maxTemp - minTemp;

  let minRequiredSpan = 30; // Default for Class III and IIII
  if (accuracyClass === 'Class I') {
    minRequiredSpan = 5;
  } else if (accuracyClass === 'Class II') {
    minRequiredSpan = 15;
  }

  return {
    minTemp,
    maxTemp,
    spanTemp,
    minRequiredSpan,
    isRangeCompliant: spanTemp >= minRequiredSpan,
  };
}

/**
 * Evaluates a static temperature test point observation against OIML Table 6 MPE limits.
 */
export function evaluateStaticTemperatureObservation(params: {
  referenceLoad: number;
  referenceLoadUnit: MassUnit;
  scaleReading: number;
  scaleReadingUnit: MassUnit;
  accuracyClass: AccuracyClass;
  verificationIntervalE: number;
  eUnit: MassUnit;
  verificationMode?: VerificationMode;
}): StaticTempEvalResult {
  const {
    referenceLoad,
    scaleReading,
    accuracyClass,
    verificationIntervalE,
    eUnit,
    verificationMode = 'INITIAL_VERIFICATION',
  } = params;

  const calculatedError = Number((scaleReading - referenceLoad).toFixed(6));

  // Calculate load in e intervals
  const loadInE = referenceLoad / (verificationIntervalE > 0 ? verificationIntervalE : 1);
  const mpeBand = getTable6MPEBand(accuracyClass, loadInE, verificationMode);
  const mpeValue = Number((mpeBand.multiplierInE * verificationIntervalE).toFixed(6));

  const passed = Math.abs(calculatedError) <= mpeValue + 1e-6;

  return {
    referenceLoad,
    scaleReading,
    calculatedError,
    mpeValue,
    mpeUnit: eUnit,
    passed,
    resultStatus: passed ? 'WITHIN_LIMIT' : 'EXCEEDS_LIMIT',
    mpeBandText: mpeBand.bandLabel,
  };
}

/**
 * Evaluates zero-shift variation across temperature stages (Clause 5.3.1).
 * Limit: Change in zero indication per 1 °C (or 5 °C for Class I) <= 0.5e.
 */
export function evaluateTemperatureZeroShift(params: {
  zeroErrorTempA: number; // E0 at Temp A
  tempA: number; // °C
  zeroErrorTempB: number; // E0 at Temp B
  tempB: number; // °C
  accuracyClass: AccuracyClass;
  verificationIntervalE: number;
}): {
  deltaE0: number;
  deltaTemp: number;
  shiftPerDegree: number;
  maxPermissibleShiftPerDegree: number;
  passed: boolean;
} {
  const { zeroErrorTempA, tempA, zeroErrorTempB, tempB, accuracyClass, verificationIntervalE } = params;

  const deltaE0 = Math.abs(zeroErrorTempB - zeroErrorTempA);
  const deltaTemp = Math.abs(tempB - tempA);

  const shiftPerDegree = deltaTemp > 0 ? deltaE0 / deltaTemp : 0;
  // Limit per 1°C is 0.5e / (5°C for Class I, 1°C for others)
  const maxPermissibleShiftPerDegree = accuracyClass === 'Class I'
    ? (0.5 * verificationIntervalE) / 5
    : 0.5 * verificationIntervalE;

  const passed = shiftPerDegree <= maxPermissibleShiftPerDegree + 1e-6;

  return {
    deltaE0,
    deltaTemp,
    shiftPerDegree: Number(shiftPerDegree.toFixed(4)),
    maxPermissibleShiftPerDegree: Number(maxPermissibleShiftPerDegree.toFixed(4)),
    passed,
  };
}
