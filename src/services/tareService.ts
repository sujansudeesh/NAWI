import { AccuracyClass, MassUnit, TareType, TareSettingObservation, TareNetWeighingObservation } from '../types';
import { evaluateMPEScaleReading } from './oimlComplianceService';
import { convertMassUnit } from '../utils/metrologyService';

/**
 * ============================================================================
 * OIML R 76-1:2006 TARE TEST SERVICE (§4.6, §4.6.3, A.4.6.1, A.4.6.2, 3.5.3.3)
 * ============================================================================
 * 
 * Rules:
 * 1. Tare-Device Accuracy (§4.6.3 / A.4.6.2):
 *    For electronic instruments, tare-setting zero accuracy must not exceed ±0.25e.
 *    Using the changeover method at zero indication after tare activation:
 *    P0 = I + 0.5e - ΔL = 0.5e - ΔL (since I = 0 NET)
 *    Tare Zero Error ET = 0.5e - ΔL
 * 
 * 2. Net Weighing Performance (§3.5.3.3 / A.4.6.1):
 *    Maximum permissible errors apply to the NET value for any tare load,
 *    except preset tare.
 *    Subtractive Tare reduces remaining available net capacity:
 *    Net Capacity = Max Capacity - Applied Tare
 * 
 * 3. Gross physical load visual:
 *    GROSS = TARE + NET
 * ============================================================================
 */

export interface TareValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export interface TareSettingEvaluationResult {
  passed: boolean;
  resultStatus: 'WITHIN_LIMIT' | 'EXCEEDS_LIMIT';
  resultText: string;
  tareZeroError: number;
  tareZeroErrorFormatted: string;
  halfE: number;
  permissibleTareZeroError: number;
  permissibleTareZeroErrorFormatted: string;
}

export interface SuggestedTareLoadInfo {
  minSuggested: number;
  maxSuggested: number;
  recommended: number;
  unit: MassUnit;
  description: string;
}

export interface SuggestedNetLoadPoint {
  stepIndex: number;
  stepLabel: string;
  referenceNetLoad: number;
  loadUnit: MassUnit;
}

/**
 * Proposes a tare test load between 1/3 and 2/3 of maximum tare effect (A.4.6.1).
 */
export function calculateSuggestedTareTestLoad(
  maximumTareEffect: number,
  unit: MassUnit = 'kg'
): SuggestedTareLoadInfo {
  const minSuggested = Number((maximumTareEffect / 3).toFixed(3));
  const maxSuggested = Number(((maximumTareEffect * 2) / 3).toFixed(3));
  const recommended = Number(((minSuggested + maxSuggested) / 2).toFixed(3));

  return {
    minSuggested,
    maxSuggested,
    recommended,
    unit,
    description: `Suggested test tare load for ${maximumTareEffect} ${unit} Max Tare is between ${minSuggested} ${unit} (1/3 Max Tare) and ${maxSuggested} ${unit} (2/3 Max Tare).`,
  };
}

/**
 * Calculates remaining available net capacity.
 * For SUBTRACTIVE tare: Net Capacity = Max Capacity - Applied Tare.
 * For ADDITIVE tare: Net Capacity = Max Capacity.
 */
export function calculateAvailableNetCapacity(
  maxCapacity: number,
  appliedTare: number,
  tareType: TareType = 'SUBTRACTIVE'
): number {
  if (tareType === 'SUBTRACTIVE') {
    return Math.max(0, Number((maxCapacity - appliedTare).toFixed(4)));
  }
  return maxCapacity;
}

/**
 * Validates officer input for applied tare load.
 */
export function validateTareLoadInput(
  appliedTare: number,
  maximumTareEffect: number,
  maxCapacity: number
): TareValidationResult {
  if (isNaN(appliedTare) || appliedTare <= 0) {
    return {
      isValid: false,
      errorMessage: 'Applied tare load must be a positive numeric value.',
    };
  }

  if (appliedTare > maximumTareEffect) {
    return {
      isValid: false,
      errorMessage: `Applied tare load (${appliedTare}) exceeds the maximum allowable tare effect (${maximumTareEffect}) for this instrument.`,
    };
  }

  if (appliedTare >= maxCapacity) {
    return {
      isValid: false,
      errorMessage: `Applied tare load (${appliedTare}) cannot meet or exceed total maximum instrument capacity (${maxCapacity}).`,
    };
  }

  return { isValid: true };
}

/**
 * Validates reference net load input against available net capacity.
 */
export function validateNetLoadInput(
  netLoad: number,
  minCapacity: number,
  netCapacity: number,
  unit: MassUnit = 'kg'
): TareValidationResult {
  if (isNaN(netLoad) || netLoad <= 0) {
    return {
      isValid: false,
      errorMessage: 'Reference net load must be a positive numeric value.',
    };
  }

  if (netLoad > netCapacity + 1e-9) {
    return {
      isValid: false,
      errorMessage: 'Net load exceeds the remaining weighing capacity with the current tare.',
    };
  }

  if (netLoad < minCapacity - 1e-9) {
    return {
      isValid: false,
      errorMessage: `Net load (${netLoad} ${unit}) is below the minimum capacity (Min: ${minCapacity} ${unit}) of the instrument.`,
    };
  }

  return { isValid: true };
}

/**
 * Calculates tare-setting zero error ET = 0.5e - ΔL and evaluates against ±0.25e (OIML §4.6.3 / A.4.6.2).
 */
export function calculateTareSettingError(
  deltaL: number,
  eVal: number,
  eUnit: MassUnit = 'g'
): TareSettingEvaluationResult {
  const halfEVal = eVal * 0.5;
  const quarterEVal = Number((eVal * 0.25).toFixed(4));
  const tareZeroError = Number((halfEVal - deltaL).toFixed(4));
  const absError = Math.abs(tareZeroError);

  const passed = absError <= quarterEVal + 1e-9;
  const sign = tareZeroError >= 0 ? '+' : '';
  const tareZeroErrorFormatted = `${sign}${tareZeroError} ${eUnit}`;
  const permissibleTareZeroErrorFormatted = `±${quarterEVal} ${eUnit}`;

  return {
    passed,
    resultStatus: passed ? 'WITHIN_LIMIT' : 'EXCEEDS_LIMIT',
    resultText: passed ? '✓ TARE SETTING WITHIN LIMIT' : '✕ TARE SETTING EXCEEDS LIMIT',
    tareZeroError,
    tareZeroErrorFormatted,
    halfE: halfEVal,
    permissibleTareZeroError: quarterEVal,
    permissibleTareZeroErrorFormatted,
  };
}

/**
 * Generates 5 practical proposed NET load test points within net capacity.
 */
export function generateSuggestedNetLoadPoints(params: {
  accuracyClass: AccuracyClass;
  eVal: number;
  eUnit: MassUnit;
  minCapacity: number;
  maxCapacity: number;
  appliedTare: number;
  tareType?: TareType;
  loadUnit?: MassUnit;
}): SuggestedNetLoadPoint[] {
  const loadUnit = params.loadUnit || 'kg';
  const netCap = calculateAvailableNetCapacity(params.maxCapacity, params.appliedTare, params.tareType || 'SUBTRACTIVE');

  // Convert e to loadUnit
  const eInLoadUnit = convertMassUnit(params.eVal, params.eUnit, loadUnit);

  // Key MPE transition points: 500e and 2000e (Class III)
  const transition1 = Number(Math.min(500 * eInLoadUnit, netCap * 0.2).toFixed(3));
  const transition2 = Number(Math.min(2000 * eInLoadUnit, netCap * 0.5).toFixed(3));
  const midPoint = Number((netCap * 0.72).toFixed(3));
  const maxNetPoint = Number((netCap * 0.999).toFixed(3));

  return [
    { stepIndex: 1, stepLabel: 'Near Minimum Capacity (Min)', referenceNetLoad: params.minCapacity, loadUnit },
    { stepIndex: 2, stepLabel: 'MPE Step Transition (~500e)', referenceNetLoad: transition1, loadUnit },
    { stepIndex: 3, stepLabel: 'MPE Step Transition (~2000e)', referenceNetLoad: transition2, loadUnit },
    { stepIndex: 4, stepLabel: 'Mid-Range Net Capacity', referenceNetLoad: midPoint, loadUnit },
    { stepIndex: 5, stepLabel: 'Near Maximum Net Capacity', referenceNetLoad: maxNetPoint, loadUnit },
  ];
}

/**
 * Evaluates a single Net Weighing observation against OIML R 76 MPE rules (§3.5.3.3 / A.4.6.1).
 */
export function evaluateTareNetObservation(params: {
  appliedTare: number; // in loadUnit
  referenceNet: number; // in loadUnit
  displayedNet: number; // in loadUnit
  accuracyClass: AccuracyClass;
  eVal: number;
  eUnit: MassUnit;
  loadUnit?: MassUnit;
  stepIndex?: number;
  stepLabel?: string;
}): TareNetWeighingObservation {
  const loadUnit = params.loadUnit || 'kg';
  const calculatedGrossLoad = Number((params.appliedTare + params.referenceNet).toFixed(4));
  const netError = Number((params.displayedNet - params.referenceNet).toFixed(4));

  // Call official OIML MPE engine on reference NET load
  const mpeCheck = evaluateMPEScaleReading({
    referenceLoad: params.referenceNet,
    referenceLoadUnit: loadUnit,
    scaleReading: params.displayedNet,
    scaleReadingUnit: loadUnit,
    accuracyClass: params.accuracyClass,
    verificationScaleIntervalE: params.eVal,
    eUnit: params.eUnit,
    verificationMode: 'INITIAL_VERIFICATION',
  });

  return {
    id: `tare-obs-${params.stepIndex || Date.now()}`,
    stepIndex: params.stepIndex || 1,
    stepLabel: params.stepLabel || 'Net Load Test',
    appliedTareLoad: params.appliedTare,
    referenceNetLoad: params.referenceNet,
    displayedNetReading: params.displayedNet,
    calculatedGrossLoad,
    netError,
    netErrorFormatted: mpeCheck.indicatedDifferenceFormatted,
    mpeLimit: mpeCheck.mpeResult.mpeValueInTestLoadUnit,
    mpeUnit: loadUnit,
    mpeStatus: mpeCheck.status,
    passed: mpeCheck.isPassed,
  };
}

/**
 * Evaluates overall Tare Test status.
 */
export function evaluateOverallTareTest(
  tareSettingObs?: TareSettingObservation,
  netObsArray: TareNetWeighingObservation[] = [],
  requiredNetCount: number = 5
): {
  overallResult: 'COMPLETED_WITHIN_LIMITS' | 'NEEDS_ATTENTION' | 'NOT_STARTED';
  isCompleted: boolean;
  summaryText: string;
} {
  if (!tareSettingObs) {
    return {
      overallResult: 'NOT_STARTED',
      isCompleted: false,
      summaryText: 'Tare-setting accuracy check not yet recorded.',
    };
  }

  if (!tareSettingObs.passed) {
    return {
      overallResult: 'NEEDS_ATTENTION',
      isCompleted: true,
      summaryText: '✕ Tare-setting accuracy exceeds OIML R 76 limit (±0.25e).',
    };
  }

  const completedNetCount = netObsArray.filter((o) => o.passed !== undefined).length;
  if (completedNetCount < requiredNetCount) {
    return {
      overallResult: 'NOT_STARTED',
      isCompleted: false,
      summaryText: `Recorded ${completedNetCount} of ${requiredNetCount} required net load observations.`,
    };
  }

  const hasFailingNetObs = netObsArray.some((o) => !o.passed);
  if (hasFailingNetObs) {
    return {
      overallResult: 'NEEDS_ATTENTION',
      isCompleted: true,
      summaryText: '✕ One or more net weighing observations exceed maximum permissible error (MPE).',
    };
  }

  return {
    overallResult: 'COMPLETED_WITHIN_LIMITS',
    isCompleted: true,
    summaryText: '✓ Tare-setting accuracy and all net weighing observations meet OIML R 76 tolerances.',
  };
}
