import { AccuracyClass, MassUnit } from '../types';
import {
  evaluateStaticTemperatureObservation,
  getSpecifiedTemperatureRange,
  evaluateTemperatureZeroShift,
  StaticTempEvalResult,
} from '../rules/oimlR76/2006/influenceRules';
import { StructuredEnvironmentalReading, createEnvironmentalReading } from './environmentalConditionsService';

export interface TemperatureStageConfig {
  id: string;
  label: string;
  targetTemp: number; // °C
  description: string;
  defaultSoakTimeMinutes: number;
}

export interface StaticTemperatureObservation {
  id: string;
  stageId: string; // e.g. 'STAGE_20C_REF', 'STAGE_40C_HIGH', 'STAGE_MIN10C_LOW', 'STAGE_5C_MID', 'STAGE_20C_RETURN'
  stageLabel: string;
  targetTemperature: number;
  actualTemperature: number;
  relativeHumidity: number;
  stabilizationStatus: 'STABILIZED' | 'SOAKING' | 'PENDING';
  soakTimeMinutes: number;
  referenceLoad: number;
  loadUnit: MassUnit;
  indicatedValue: number;
  zeroIndication: number;
  calculatedError: number;
  mpeLimit: number;
  mpeUnit: MassUnit;
  passed: boolean;
  resultStatus: 'WITHIN_LIMIT' | 'EXCEEDS_LIMIT';
  environmentalReading?: StructuredEnvironmentalReading;
  timestamp: string;
  notes?: string;
}

export interface StaticTemperatureTestSession {
  specifiedMinTemp: number; // e.g. -10 °C
  specifiedMaxTemp: number; // e.g. +40 °C
  accuracyClass: AccuracyClass;
  observations: StaticTemperatureObservation[];
  zeroShiftPerDegree?: number;
  maxPermissibleShiftPerDegree?: number;
  isZeroShiftPassed?: boolean;
  isCompleted: boolean;
  overallResult: 'COMPLETED_WITHIN_LIMITS' | 'NEEDS_ATTENTION' | 'NOT_STARTED' | 'IN_PROGRESS';
}

/**
 * Generates official prescribed OIML R 76-1:2006 Procedure A.5.3 temperature test stages.
 */
export function generatePrescribedTemperatureStages(
  accuracyClass: AccuracyClass,
  minTemp = -10,
  maxTemp = 40
): TemperatureStageConfig[] {
  const spec = getSpecifiedTemperatureRange(accuracyClass, minTemp, maxTemp);

  return [
    {
      id: 'STAGE_20C_REF',
      label: 'Stage 1: Reference Temperature (+20 °C)',
      targetTemp: 20,
      description: 'Initial reference measurement at +20 °C ambient room temperature.',
      defaultSoakTimeMinutes: 30,
    },
    {
      id: 'STAGE_HIGH_TEMP',
      label: `Stage 2: Specified Upper Limit (+${spec.maxTemp} °C)`,
      targetTemp: spec.maxTemp,
      description: `Chamber heated to maximum specified operating temperature (+${spec.maxTemp} °C). Minimum 2 hours thermal soak required.`,
      defaultSoakTimeMinutes: 120,
    },
    {
      id: 'STAGE_LOW_TEMP',
      label: `Stage 3: Specified Lower Limit (${spec.minTemp} °C)`,
      targetTemp: spec.minTemp,
      description: `Chamber cooled to minimum specified operating temperature (${spec.minTemp} °C). Minimum 2 hours thermal soak required.`,
      defaultSoakTimeMinutes: 120,
    },
    {
      id: 'STAGE_MID_TEMP',
      label: 'Stage 4: Intermediate Temperature (+5 °C)',
      targetTemp: 5,
      description: 'Intermediate temperature stage at +5 °C.',
      defaultSoakTimeMinutes: 60,
    },
    {
      id: 'STAGE_RETURN_REF',
      label: 'Stage 5: Return to Reference Temperature (+20 °C)',
      targetTemp: 20,
      description: 'Chamber returned to +20 °C reference temperature to confirm zero/span recovery.',
      defaultSoakTimeMinutes: 60,
    },
  ];
}

/**
 * Evaluates and records a single Static Temperature observation point.
 */
export function recordStaticTemperatureObservation(params: {
  stageId: string;
  stageLabel: string;
  targetTemperature: number;
  actualTemperature: number;
  relativeHumidity: number;
  soakTimeMinutes: number;
  referenceLoad: number;
  loadUnit: MassUnit;
  indicatedValue: number;
  zeroIndication?: number;
  accuracyClass: AccuracyClass;
  verificationIntervalE: number;
  eUnit: MassUnit;
  notes?: string;
}): StaticTemperatureObservation {
  const zeroInd = params.zeroIndication ?? 0;
  const netIndication = params.indicatedValue - zeroInd;

  const evalResult = evaluateStaticTemperatureObservation({
    referenceLoad: params.referenceLoad,
    referenceLoadUnit: params.loadUnit,
    scaleReading: netIndication,
    scaleReadingUnit: params.loadUnit,
    accuracyClass: params.accuracyClass,
    verificationIntervalE: params.verificationIntervalE,
    eUnit: params.eUnit,
  });

  const envReading = createEnvironmentalReading({
    temperature: params.actualTemperature,
    humidity: params.relativeHumidity,
    isStabilized: params.soakTimeMinutes >= 30,
    notes: `Chamber soak: ${params.soakTimeMinutes} mins`,
  });

  return {
    id: `STO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    stageId: params.stageId,
    stageLabel: params.stageLabel,
    targetTemperature: params.targetTemperature,
    actualTemperature: params.actualTemperature,
    relativeHumidity: params.relativeHumidity,
    stabilizationStatus: params.soakTimeMinutes >= 30 ? 'STABILIZED' : 'SOAKING',
    soakTimeMinutes: params.soakTimeMinutes,
    referenceLoad: params.referenceLoad,
    loadUnit: params.loadUnit,
    indicatedValue: params.indicatedValue,
    zeroIndication: zeroInd,
    calculatedError: evalResult.calculatedError,
    mpeLimit: evalResult.mpeValue,
    mpeUnit: evalResult.mpeUnit,
    passed: evalResult.passed,
    resultStatus: evalResult.resultStatus,
    environmentalReading: envReading,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    notes: params.notes || '',
  };
}

/**
 * Evaluates overall Static Temperature session status across all recorded stages.
 */
export function evaluateStaticTemperatureSession(
  session: Partial<StaticTemperatureTestSession>
): StaticTemperatureTestSession {
  const obs = session.observations || [];
  const minTemp = session.specifiedMinTemp ?? -10;
  const maxTemp = session.specifiedMaxTemp ?? 40;
  const accuracyClass = session.accuracyClass || 'Class III';

  const stages = generatePrescribedTemperatureStages(accuracyClass, minTemp, maxTemp);
  const isCompleted = obs.length >= stages.length;

  let overallResult: 'COMPLETED_WITHIN_LIMITS' | 'NEEDS_ATTENTION' | 'NOT_STARTED' | 'IN_PROGRESS' = 'NOT_STARTED';

  if (obs.length > 0) {
    const hasFailingObs = obs.some((o) => !o.passed);
    if (isCompleted) {
      overallResult = hasFailingObs ? 'NEEDS_ATTENTION' : 'COMPLETED_WITHIN_LIMITS';
    } else {
      overallResult = 'IN_PROGRESS';
    }
  }

  // Calculate zero shift if reference (+20C) and high temp (+40C) observations exist
  let zeroShiftPerDegree: number | undefined;
  let maxPermissibleShiftPerDegree: number | undefined;
  let isZeroShiftPassed: boolean | undefined;

  const refObs = obs.find((o) => o.stageId === 'STAGE_20C_REF');
  const highObs = obs.find((o) => o.stageId === 'STAGE_HIGH_TEMP');

  if (refObs && highObs) {
    const shiftEval = evaluateTemperatureZeroShift({
      zeroErrorTempA: refObs.zeroIndication,
      tempA: refObs.actualTemperature,
      zeroErrorTempB: highObs.zeroIndication,
      tempB: highObs.actualTemperature,
      accuracyClass,
      verificationIntervalE: 5,
    });
    zeroShiftPerDegree = shiftEval.shiftPerDegree;
    maxPermissibleShiftPerDegree = shiftEval.maxPermissibleShiftPerDegree;
    isZeroShiftPassed = shiftEval.passed;
  }

  return {
    specifiedMinTemp: minTemp,
    specifiedMaxTemp: maxTemp,
    accuracyClass,
    observations: obs,
    zeroShiftPerDegree,
    maxPermissibleShiftPerDegree,
    isZeroShiftPassed,
    isCompleted,
    overallResult,
  };
}
