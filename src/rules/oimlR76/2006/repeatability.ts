import { AccuracyClass, MassUnit, TestContext } from '../../../types';
import { getOIMLTable6MPE, VerificationMode, MPESpecification } from './mpe';
import { convertMass } from './units';
import { OIML_CLAUSES, OIMLRuleMetadata } from './references';

export interface RepeatabilitySeriesRequirement {
  seriesName: string;
  targetLoadFactor: number; // e.g. 0.5 (50%), 1.0 (100%), 0.8 (80%)
  targetLoadValue: number;
  targetLoadUnit: MassUnit;
  requiredWeighingsCount: number;
  description: string;
}

export interface OIMLRepeatabilityRequirements {
  testContext: TestContext;
  accuracyClass: AccuracyClass;
  maxCapacity: number;
  maxUnit: MassUnit;
  series: RepeatabilitySeriesRequirement[];
  clauseReference: string;
  ruleSummary: string;
}

export interface RepeatabilitySeriesInput {
  load: number;
  loadUnit: MassUnit;
  readings: number[];
  readingsUnit: MassUnit;
  eVal: number;
  eUnit: MassUnit;
  accuracyClass: AccuracyClass;
  mode?: VerificationMode;
}

export interface RepeatabilitySeriesResult {
  load: number;
  loadUnit: MassUnit;
  readingsCount: number;
  minReading: number;
  maxReading: number;
  maxSpread: number; // maxReading - minReading in eUnit
  maxSpreadFormatted: string;
  meanReading: number;
  standardDeviation: number;
  mpeSpec: MPESpecification;
  mpeLimitValue: number; // MPE in eUnit
  passed: boolean;
  mpeStatus: 'WITHIN_MPE' | 'EXCEEDS_MPE';
  metadata: OIMLRuleMetadata;
  notes: string;
}

/**
 * Computes exact OIML R 76-1:2006 A.4.10 repeatability testing requirements based on evaluation context:
 * 
 * TYPE EXAMINATION:
 * - Two series of weighings:
 *   1. About 50% Max (0.5 Max)
 *   2. Close to 100% Max (1.0 Max)
 * - Weighings per series:
 *   - Max < 1000 kg: 10 weighings per series
 *   - Max >= 1000 kg: at least 3 weighings per series
 * 
 * VERIFICATION (INITIAL_VERIFICATION or IN_SERVICE_INSPECTION):
 * - One series of weighings at about 0.8 Max (0.8 Max)
 * - Weighings per series:
 *   - Classes III and IIII: 3 weighings
 *   - Classes I and II: 6 weighings
 */
export function getOIMLRepeatabilityRequirements(
  testContext: TestContext = 'TYPE_EXAMINATION',
  accuracyClass: AccuracyClass = 'Class III',
  maxCapacity: number,
  maxUnit: MassUnit
): OIMLRepeatabilityRequirements {
  const maxInKg = convertMass(maxCapacity, maxUnit, 'kg');

  if (testContext === 'TYPE_EXAMINATION') {
    const weighingsCount = maxInKg < 1000 ? 10 : 3;
    const series1Load = Number((0.5 * maxCapacity).toFixed(4));
    const series2Load = Number((1.0 * maxCapacity).toFixed(4));

    return {
      testContext,
      accuracyClass,
      maxCapacity,
      maxUnit,
      clauseReference: 'OIML R 76-1:2006 A.4.10',
      ruleSummary: `Type Examination requires 2 series (approx 0.5 Max and 1.0 Max) with ${weighingsCount} weighings per series (Max ${maxInKg < 1000 ? '< 1000 kg => 10 weighings' : '>= 1000 kg => 3 weighings'}).`,
      series: [
        {
          seriesName: 'Series 1 (50% Max)',
          targetLoadFactor: 0.5,
          targetLoadValue: series1Load,
          targetLoadUnit: maxUnit,
          requiredWeighingsCount: weighingsCount,
          description: `50% Max (${series1Load} ${maxUnit}) series with ${weighingsCount} consecutive weighings.`,
        },
        {
          seriesName: 'Series 2 (100% Max)',
          targetLoadFactor: 1.0,
          targetLoadValue: series2Load,
          targetLoadUnit: maxUnit,
          requiredWeighingsCount: weighingsCount,
          description: `100% Max (${series2Load} ${maxUnit}) series with ${weighingsCount} consecutive weighings.`,
        },
      ],
    };
  } else {
    // Initial Verification / In-Service Inspection
    const weighingsCount = (accuracyClass === 'Class I' || accuracyClass === 'Class II') ? 6 : 3;
    const targetLoad = Number((0.8 * maxCapacity).toFixed(4));

    return {
      testContext,
      accuracyClass,
      maxCapacity,
      maxUnit,
      clauseReference: 'OIML R 76-1:2006 A.4.10',
      ruleSummary: `Verification requires 1 series at approx 0.8 Max with ${weighingsCount} weighings (${accuracyClass} => ${weighingsCount} weighings).`,
      series: [
        {
          seriesName: 'Series 1 (80% Max)',
          targetLoadFactor: 0.8,
          targetLoadValue: targetLoad,
          targetLoadUnit: maxUnit,
          requiredWeighingsCount: weighingsCount,
          description: `0.8 Max (${targetLoad} ${maxUnit}) series with ${weighingsCount} consecutive weighings.`,
        },
      ],
    };
  }
}

/**
 * Evaluates OIML R 76-1:2006 §3.6.1 & A.4.10 Repeatability Test Series.
 * OIML Acceptance Criterion: (Max Reading - Min Reading) <= |MPE| for that load.
 */
export function evaluateRepeatabilitySeries(
  input: RepeatabilitySeriesInput
): RepeatabilitySeriesResult {
  const {
    load: L_val,
    loadUnit: L_unit,
    readings: rawReadings,
    readingsUnit,
    eVal,
    eUnit,
    accuracyClass,
    mode = 'INITIAL_VERIFICATION',
  } = input;

  if (rawReadings.length === 0) {
    throw new Error('Repeatability test requires at least 1 recorded reading.');
  }

  // Convert all readings to eUnit
  const readings = rawReadings.map((r) => convertMass(r, readingsUnit, eUnit));
  const minReading = Math.min(...readings);
  const maxReading = Math.max(...readings);
  const maxSpread = Number((maxReading - minReading).toFixed(6));

  const sum = readings.reduce((a, b) => a + b, 0);
  const meanReading = Number((sum / readings.length).toFixed(6));

  const variance = readings.reduce((acc, r) => acc + Math.pow(r - meanReading, 2), 0) / Math.max(1, readings.length - 1);
  const standardDeviation = Number(Math.sqrt(variance).toFixed(6));

  const mpeSpec = getOIMLTable6MPE(accuracyClass, L_val, L_unit, eVal, eUnit, mode);
  const mpeLimitValue = mpeSpec.mpeValue;

  const passed = maxSpread <= mpeLimitValue + 1e-9;

  const notes = `Repeatability series evaluated per OIML R 76-1 A.4.10. Load: ${L_val} ${L_unit}. Repeatability Spread = ${maxSpread.toFixed(3)} ${eUnit} (Allowed MPE: ±${mpeLimitValue} ${eUnit}). Mean: ${meanReading.toFixed(3)} ${eUnit}, StdDev: ${standardDeviation.toFixed(4)} ${eUnit} (Informational).`;

  return {
    load: L_val,
    loadUnit: L_unit,
    readingsCount: readings.length,
    minReading,
    maxReading,
    maxSpread,
    maxSpreadFormatted: `${maxSpread.toFixed(3)} ${eUnit}`,
    meanReading,
    standardDeviation,
    mpeSpec,
    mpeLimitValue,
    passed,
    mpeStatus: passed ? 'WITHIN_MPE' : 'EXCEEDS_MPE',
    metadata: OIML_CLAUSES.REPEATABILITY,
    notes,
  };
}
