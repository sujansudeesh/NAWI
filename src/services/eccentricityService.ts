import { AccuracyClass, MassUnit, EccentricityProfile, EccentricityPositionConfig, EccentricityTestObservation } from '../types';
import { evaluateMPEScaleReading, MPECheckResult } from './oimlComplianceService';
import { VerificationMode } from '../rules/oimlR76/2006/mpeRules';
import { deriveOIMLEccentricityTestLoad } from '../rules/oimlR76/2006/eccentricity';

/**
 * ============================================================================
 * OIML R 76-1:2006 ECCENTRICITY TEST SERVICE (§3.6.2 & Procedure A.4.7)
 * ============================================================================
 * 
 * Rules:
 * 1. Standard instrument with <= 4 supports:
 *    Test Load = 1/3 * (Max + TareAdd)
 *    Positions: 4 quadrants (Front Left, Front Right, Rear Left, Rear Right)
 * 2. Instrument with > 4 supports:
 *    Test Load = 1/(N - 1) * (Max + TareAdd)
 * 3. Minimal off-centre loading (tanks, hoppers):
 *    Test Load = 1/10 * (Max + TareAdd)
 * 4. Rolling load (vehicle scale / weighbridge):
 *    Test Load = heaviest usual rolling load, capped at 0.8 * (Max + TareAdd)
 *    Positions: Beginning, Middle, End of load receptor track
 * ============================================================================
 */

export interface EccentricityTestLoadParams {
  maxCapacity: number;
  maxUnit: MassUnit;
  additiveTare?: number;
  profile?: EccentricityProfile;
  numSupports?: number;
  usualRollingLoad?: number;
}

export interface EccentricityValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export interface EccentricityPositionEvaluationParams {
  position: number;
  locationLabel: string;
  testLoad: number;
  testLoadUnit: MassUnit;
  scaleReading: number;
  scaleReadingUnit: MassUnit;
  accuracyClass: AccuracyClass;
  verificationScaleIntervalE: number;
  eUnit: MassUnit;
  verificationMode?: VerificationMode;
}

export interface OverallEccentricityEvaluationResult {
  isComplete: boolean;
  isPassed: boolean;
  totalPositions: number;
  completedPositions: number;
  failedPositions: number[];
  summaryText: string;
}

/**
 * Calculates the required test load for eccentricity testing according to OIML R 76-1:2006 §3.6.2.
 */
export function calculateEccentricityTestLoad(params: EccentricityTestLoadParams): number {
  const derivation = deriveOIMLEccentricityTestLoad(
    params.maxCapacity || 0,
    params.maxUnit || 'kg',
    params.profile || 'STANDARD_UP_TO_4_SUPPORTS',
    params.numSupports || 4,
    params.additiveTare || 0,
    params.usualRollingLoad
  );
  return derivation.recommendedTestLoad;
}

/**
 * Gets prescribed positions for eccentricity testing based on profile.
 */
export function getEccentricityPositions(
  profile: EccentricityProfile = 'STANDARD_UP_TO_4_SUPPORTS',
  numSupports: number = 4
): EccentricityPositionConfig[] {
  switch (profile) {
    case 'STANDARD_UP_TO_4_SUPPORTS':
      return [
        { id: 1, label: 'Front Left', shortLabel: 'FL', quadrant: 'FL', description: 'Front-left quadrant of receptor' },
        { id: 2, label: 'Front Right', shortLabel: 'FR', quadrant: 'FR', description: 'Front-right quadrant of receptor' },
        { id: 3, label: 'Rear Left', shortLabel: 'RL', quadrant: 'RL', description: 'Rear-left quadrant of receptor' },
        { id: 4, label: 'Rear Right', shortLabel: 'RR', quadrant: 'RR', description: 'Rear-right quadrant of receptor' },
      ];

    case 'MORE_THAN_4_SUPPORTS': {
      const positions: EccentricityPositionConfig[] = [];
      const total = Math.max(5, numSupports);
      for (let i = 1; i <= total; i++) {
        positions.push({
          id: i,
          label: `Support ${i}`,
          shortLabel: `S${i}`,
          description: `Directly above support point #${i}`,
        });
      }
      return positions;
    }

    case 'MINIMAL_OFF_CENTRE':
      return [
        { id: 1, label: 'Center', shortLabel: 'CTR', description: 'Central receptor point' },
        { id: 2, label: 'Front', shortLabel: 'FRONT', description: 'Front off-center position' },
        { id: 3, label: 'Rear', shortLabel: 'REAR', description: 'Rear off-center position' },
        { id: 4, label: 'Left', shortLabel: 'LEFT', description: 'Left off-center position' },
        { id: 5, label: 'Right', shortLabel: 'RIGHT', description: 'Right off-center position' },
      ];

    case 'ROLLING_LOAD':
      return [
        { id: 1, label: 'Beginning Position', shortLabel: 'BEG', description: 'Beginning position on rolling load receptor track' },
        { id: 2, label: 'Middle Position', shortLabel: 'MID', description: 'Middle position on rolling load receptor track' },
        { id: 3, label: 'End Position', shortLabel: 'END', description: 'End position on rolling load receptor track' },
      ];

    default:
      return getEccentricityPositions('STANDARD_UP_TO_4_SUPPORTS');
  }
}

/**
 * Validates scale reading for sanity before evaluation.
 */
export function validateEccentricityScaleReading(
  scaleReading: number,
  testLoad: number
): EccentricityValidationResult {
  if (isNaN(scaleReading) || scaleReading < 0) {
    return {
      isValid: false,
      errorMessage: 'Scale reading must be a positive numeric value.',
    };
  }

  if (testLoad > 0) {
    const minSanity = testLoad * 0.5;
    const maxSanity = testLoad * 1.5;

    if (scaleReading < minSanity || scaleReading > maxSanity) {
      return {
        isValid: false,
        errorMessage: 'Scale reading appears invalid. Please check the value and unit.',
      };
    }
  }

  return { isValid: true };
}

/**
 * Evaluates a single eccentricity position reading using the central OIML MPE engine.
 */
export function evaluateEccentricityPosition(
  params: EccentricityPositionEvaluationParams
): EccentricityTestObservation {
  const mpeCheck: MPECheckResult = evaluateMPEScaleReading({
    referenceLoad: params.testLoad,
    referenceLoadUnit: params.testLoadUnit,
    scaleReading: params.scaleReading,
    scaleReadingUnit: params.scaleReadingUnit,
    accuracyClass: params.accuracyClass,
    verificationScaleIntervalE: params.verificationScaleIntervalE,
    eUnit: params.eUnit,
    verificationMode: params.verificationMode || 'INITIAL_VERIFICATION',
  });

  return {
    position: params.position,
    locationLabel: params.locationLabel,
    load: params.testLoad,
    indicatedValue: params.scaleReading,
    error: mpeCheck.indicatedDifference,
    passed: mpeCheck.isPassed,
    mpeValue: mpeCheck.mpeResult.mpeValue,
    mpeUnit: mpeCheck.mpeResult.mpeUnit,
    mpeStatus: mpeCheck.status,
    indicatedDifferenceFormatted: mpeCheck.indicatedDifferenceFormatted,
  };
}

/**
 * Evaluates the overall eccentricity test session state across all observations.
 */
export function evaluateOverallEccentricity(
  observations: EccentricityTestObservation[],
  profile: EccentricityProfile = 'STANDARD_UP_TO_4_SUPPORTS',
  numSupports: number = 4
): OverallEccentricityEvaluationResult {
  const positions = getEccentricityPositions(profile, numSupports);
  const totalPositions = positions.length;
  const completedPositions = observations.length;
  const failedPositions = observations.filter((o) => !o.passed).map((o) => o.position);

  const isComplete = completedPositions >= totalPositions;
  const isPassed = isComplete && failedPositions.length === 0;

  let summaryText = 'Pending completion of all required positions.';
  if (isComplete) {
    if (isPassed) {
      summaryText = '✓ All Required Positions Within MPE';
    } else {
      summaryText = `✕ ${failedPositions.length} Position(s) Exceed MPE`;
    }
  } else if (completedPositions > 0) {
    summaryText = `In Progress (${completedPositions} of ${totalPositions} positions recorded)`;
  }

  return {
    isComplete,
    isPassed,
    totalPositions,
    completedPositions,
    failedPositions,
    summaryText,
  };
}
