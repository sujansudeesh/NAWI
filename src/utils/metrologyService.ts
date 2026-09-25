import { MassUnit, AccuracyClass, TestSession } from '../types';
import { calculateSessionProgress } from '../services/evaluationResultService';

/**
 * ============================================================================
 * LEGAL METROLOGY SERVICE BOUNDARY & UNIT CONVERSION UTILITY
 * ============================================================================
 * Handles mass unit conversions (mg, g, kg, t), auto-calculates verification
 * scale intervals n = Max / e, and validates frontend input specifications.
 * ============================================================================
 */

// Mass unit conversion factors relative to milligrams (mg)
const MASS_UNIT_TO_MG: Record<MassUnit, number> = {
  mg: 1,
  g: 1000,
  kg: 1000000,
  t: 1000000000,
};

/**
 * Converts a mass value from one unit to another cleanly.
 * Example: convertMassUnit(30, 'kg', 'g') => 30000
 */
export function convertMassUnit(value: number, fromUnit: MassUnit, toUnit: MassUnit): number {
  if (isNaN(value) || value === 0) return 0;
  if (fromUnit === toUnit) return value;

  const valueInMg = value * MASS_UNIT_TO_MG[fromUnit];
  const converted = valueInMg / MASS_UNIT_TO_MG[toUnit];
  return Number(converted.toFixed(6));
}

/**
 * Auto-calculates number of verification scale intervals n = Max ÷ e.
 * Converts Max and e to milligrams before division.
 * 
 * Example A: Max = 30 kg, e = 5 g => n = 30000 / 5 = 6000
 * Example B: Max = 600 g, e = 0.1 g => n = 600 / 0.1 = 6000
 * Example C: Max = 220 g, e = 0.001 g => n = 220 / 0.001 = 220000
 */
export function calculateVerificationIntervals(
  maxCapacity: number,
  maxUnit: MassUnit,
  verificationIntervalE: number,
  eUnit: MassUnit
): number {
  if (
    isNaN(maxCapacity) ||
    maxCapacity <= 0 ||
    isNaN(verificationIntervalE) ||
    verificationIntervalE <= 0
  ) {
    return 0;
  }

  const maxInMg = maxCapacity * MASS_UNIT_TO_MG[maxUnit];
  const eInMg = verificationIntervalE * MASS_UNIT_TO_MG[eUnit];

  if (eInMg <= 0) return 0;

  const n = maxInMg / eInMg;
  return Math.round(n);
}

/**
 * Validates frontend metrological inputs before registration or save.
 */
export function validateMetrologyInputs(params: {
  accuracyClass: AccuracyClass | string;
  maxCapacity: number;
  maxUnit: MassUnit;
  minCapacity: number;
  minUnit: MassUnit;
  scaleIntervalD: number;
  dUnit: MassUnit;
  verificationIntervalE: number;
  eUnit: MassUnit;
}): string | null {
  if (!params.accuracyClass) {
    return 'Accuracy class is required.';
  }

  if (isNaN(params.maxCapacity) || params.maxCapacity <= 0) {
    return 'Maximum capacity must be greater than zero.';
  }

  if (isNaN(params.minCapacity) || params.minCapacity < 0) {
    return 'Minimum capacity cannot be negative.';
  }

  const maxInMg = params.maxCapacity * MASS_UNIT_TO_MG[params.maxUnit];
  const minInMg = params.minCapacity * MASS_UNIT_TO_MG[params.minUnit];

  if (minInMg >= maxInMg) {
    return 'Maximum capacity must be greater than minimum capacity.';
  }

  if (isNaN(params.scaleIntervalD) || params.scaleIntervalD <= 0) {
    return 'Scale interval (d) must be greater than zero.';
  }

  if (isNaN(params.verificationIntervalE) || params.verificationIntervalE <= 0) {
    return 'Verification scale interval (e) must be greater than zero.';
  }

  return null;
}

/**
 * ============================================================================
 * REUSABLE TEST PROGRESS CALCULATION UTILITY
 * ============================================================================
 * Dynamically computes progress percentage as:
 * progressPercent = Math.round((completedTests / totalTests) * 100)
 * 
 * Total test modules = 9:
 * 1. Visual / General Inspection (Base preliminary)
 * 2. Zero Setting & Zero Tracking (Base preliminary)
 * 3. Tare Balancing & Tare Weighing (Base preliminary)
 * 4. Discrimination Test (Base preliminary)
 * 5. Eccentricity Test (completed if 5 position readings exist)
 * 6. Weighing Accuracy / Performance Test (completed if 1+ observations exist)
 * 7. Repeatability Test (completed if 1+ runs exist)
 * 8. Technical Review (Awaiting Review / Compliant / Finalized)
 * 9. Director Sign-off / Certificate (Compliant / Finalized)
 * ============================================================================
 */
export interface ProgressResult {
  completedCount: number;
  totalCount: number; // 9
  percentage: number;
}

export function calculateTestProgress(session: any): ProgressResult {
  if (!session) {
    return { completedCount: 0, totalCount: 6, percentage: 0 };
  }
  const { completedCount, totalCount, progressPercentage } = calculateSessionProgress(session as TestSession);
  return {
    completedCount,
    totalCount,
    percentage: progressPercentage,
  };
}

