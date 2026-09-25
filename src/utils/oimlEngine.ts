import { AccuracyClass, WeighingTestObservation } from '../types';
import { getTable6MPEBand } from '../rules/oimlR76/2006/mpeRules';

/**
 * ============================================================================
 * METROLOGY OIML R 76 COMPLIANCE ENGINE DELEGATE
 * ============================================================================
 */

export const OIML_ENGINE_NOTICE =
  'Calculated via official OIML R 76-1:2006 Table 6 MPE compliance engine.';

/**
 * Validates whether a scale reading is within a realistic sanity window relative to the test load.
 * Prevents absurd inputs (e.g., entering 20060 kg when test load is 10 kg).
 */
export function validateScaleReadingSanity(scaleReading: number, referenceLoad: number): boolean {
  if (isNaN(scaleReading) || scaleReading < 0) return false;
  if (referenceLoad <= 0) return true;

  // Sanity rule: Scale reading must be within 50% of the reference load (or at least within 5 kg)
  const maxDiff = Math.max(5, referenceLoad * 0.5);
  const absDiff = Math.abs(scaleReading - referenceLoad);

  return absDiff <= maxDiff;
}

/**
 * Calculates simple eccentricity difference: scaleReading - referenceLoad
 */
export function calculateEccentricityError(scaleReading: number, referenceLoad: number): number {
  const diff = scaleReading - referenceLoad;
  return Number(diff.toFixed(4));
}

/**
 * Calculates Maximum Permissible Error (MPE) in e units based on accuracy class and load in e units.
 * Table 6 of OIML R-76-1:2006
 */
export function getOIMLMPELimitInE(accuracyClass: AccuracyClass, loadInE: number): number {
  return getTable6MPEBand(accuracyClass, loadInE).multiplierInE;
}

/**
 * Calculates official OIML R-76 error: E = I + 0.5*e - deltaL - L
 */
export function calculateOIMLError(
  indicatedValue: number, // I
  verificationInterval: number, // e
  deltaL: number, // Small weight added until next step
  appliedLoad: number // L
): number {
  const error = indicatedValue + 0.5 * verificationInterval - deltaL - appliedLoad;
  return Number(error.toFixed(4));
}

/**
 * Evaluates a set of weighing performance test observations.
 */
export function evaluateWeighingPerformance(
  observations: WeighingTestObservation[]
): { isPassed: boolean; maxAbsoluteError: number; failCount: number } {
  let maxAbsoluteError = 0;
  let failCount = 0;

  observations.forEach((obs) => {
    const absErr = Math.abs(obs.calculatedError);
    if (absErr > maxAbsoluteError) maxAbsoluteError = absErr;
    if (!obs.passed) failCount++;
  });

  return {
    isPassed: failCount === 0,
    maxAbsoluteError: Number(maxAbsoluteError.toFixed(4)),
    failCount,
  };
}
