import { AccuracyClass, MassUnit } from '../types';
import { convertMassUnit } from '../utils/metrologyService';
import { getTable6MPEBand, VerificationMode, MPEBandResult } from '../rules/oimlR76/2006/mpeRules';

/**
 * ============================================================================
 * OIML COMPLIANCE SERVICE (OIML R 76-1:2006)
 * ============================================================================
 * 
 * Provides official Maximum Permissible Error (MPE) calculations and scale
 * reading compliance evaluation for Legal Metrology officers.
 * 
 * ============================================================================
 */

export interface MPECalculationParams {
  accuracyClass: AccuracyClass;
  verificationScaleIntervalE: number;
  eUnit: MassUnit;
  testLoad: number;
  testLoadUnit: MassUnit;
  verificationMode?: VerificationMode;
}

export interface MPEResult {
  accuracyClass: AccuracyClass;
  testLoad: number;
  testLoadUnit: MassUnit;
  e: number;
  eUnit: MassUnit;
  loadInE: number;
  mpeMultiplier: number;
  mpeValue: number; // MPE in eUnit
  mpeUnit: MassUnit; // Always eUnit
  mpeValueInTestLoadUnit: number; // MPE converted to testLoadUnit
  mode: VerificationMode;
  ruleVersion: string; // "OIML R 76-1:2006"
  bandText: string;
  bandLabel: string;
}

export interface MPEScaleReadingParams {
  referenceLoad: number;
  referenceLoadUnit?: MassUnit;
  scaleReading: number;
  scaleReadingUnit?: MassUnit;
  accuracyClass: AccuracyClass;
  verificationScaleIntervalE: number;
  eUnit: MassUnit;
  verificationMode?: VerificationMode;
}

export interface MPECheckResult {
  referenceLoad: number;
  referenceLoadUnit: MassUnit;
  scaleReading: number;
  scaleReadingUnit: MassUnit;
  indicatedDifference: number; // Difference in referenceLoadUnit (e.g. +0.008 kg)
  indicatedDifferenceInEUnit: number; // Difference in eUnit (e.g. +8 g)
  indicatedDifferenceFormatted: string; // e.g. "+8 g"
  absoluteDifference: number; // Absolute difference in referenceLoadUnit
  absoluteDifferenceInEUnit: number; // Absolute difference in eUnit
  mpeResult: MPEResult;
  status: 'WITHIN_MPE' | 'EXCEEDS_MPE';
  isPassed: boolean;
}

/**
 * Calculates Maximum Permissible Error (MPE) according to OIML R 76-1:2006 Table 6.
 * Converts test load and e to the same unit before calculating loadInE.
 */
export function calculateMPE(params: MPECalculationParams): MPEResult {
  const mode: VerificationMode = params.verificationMode || 'INITIAL_VERIFICATION';

  // Convert test load to eUnit to ensure single-unit arithmetic
  const testLoadInEUnit = convertMassUnit(params.testLoad, params.testLoadUnit, params.eUnit);
  
  // Calculate load in e intervals: loadInE = testLoad / e
  const loadInE = params.verificationScaleIntervalE > 0
    ? Number((testLoadInEUnit / params.verificationScaleIntervalE).toFixed(4))
    : 0;

  // Retrieve Table 6 MPE band multiplier
  const band: MPEBandResult = getTable6MPEBand(params.accuracyClass, loadInE, mode);

  // Absolute MPE value in eUnit = multiplier * e
  const mpeValue = Number((band.multiplierInE * params.verificationScaleIntervalE).toFixed(6));

  // Convert MPE value to testLoadUnit
  const mpeValueInTestLoadUnit = convertMassUnit(mpeValue, params.eUnit, params.testLoadUnit);

  return {
    accuracyClass: params.accuracyClass,
    testLoad: params.testLoad,
    testLoadUnit: params.testLoadUnit,
    e: params.verificationScaleIntervalE,
    eUnit: params.eUnit,
    loadInE,
    mpeMultiplier: band.multiplierInE,
    mpeValue,
    mpeUnit: params.eUnit,
    mpeValueInTestLoadUnit,
    mode,
    ruleVersion: `${band.ruleStandard}:${band.ruleVersion}`,
    bandText: band.bandText,
    bandLabel: band.bandLabel,
  };
}

/**
 * Evaluates a scale reading against the reference load and applicable OIML MPE.
 * 
 * indicatedDifference = scaleReading - referenceLoad
 * absoluteDifference = abs(indicatedDifference)
 * MPE Check: absoluteDifference <= MPE
 */
export function evaluateMPEScaleReading(params: MPEScaleReadingParams): MPECheckResult {
  const refUnit: MassUnit = params.referenceLoadUnit || 'kg';
  const readingUnit: MassUnit = params.scaleReadingUnit || refUnit;
  const mode: VerificationMode = params.verificationMode || 'INITIAL_VERIFICATION';

  // Convert scale reading to reference load unit
  const scaleReadingInRefUnit = convertMassUnit(params.scaleReading, readingUnit, refUnit);

  // Indicated difference in reference unit
  const indicatedDifference = Number((scaleReadingInRefUnit - params.referenceLoad).toFixed(6));
  const absoluteDifference = Number(Math.abs(indicatedDifference).toFixed(6));

  // Indicated difference converted to eUnit for clean display
  const indicatedDifferenceInEUnit = convertMassUnit(indicatedDifference, refUnit, params.eUnit);
  const absoluteDifferenceInEUnit = Number(Math.abs(indicatedDifferenceInEUnit).toFixed(6));

  // Formatted difference string (e.g. "+8 g" or "-2 g")
  const sign = indicatedDifference > 0 ? '+' : '';
  const diffDisplayVal = Number(indicatedDifferenceInEUnit.toFixed(4));
  const indicatedDifferenceFormatted = `${sign}${diffDisplayVal} ${params.eUnit}`;

  // Calculate MPE for the reference load
  const mpeResult = calculateMPE({
    accuracyClass: params.accuracyClass,
    verificationScaleIntervalE: params.verificationScaleIntervalE,
    eUnit: params.eUnit,
    testLoad: params.referenceLoad,
    testLoadUnit: refUnit,
    verificationMode: mode,
  });

  // MPE Status evaluation: absoluteDifferenceInEUnit <= mpeValue
  // Add small epsilon for floating point comparison tolerance
  const isWithinMPE = absoluteDifferenceInEUnit <= (mpeResult.mpeValue + 1e-9);
  const status: 'WITHIN_MPE' | 'EXCEEDS_MPE' = isWithinMPE ? 'WITHIN_MPE' : 'EXCEEDS_MPE';

  return {
    referenceLoad: params.referenceLoad,
    referenceLoadUnit: refUnit,
    scaleReading: params.scaleReading,
    scaleReadingUnit: readingUnit,
    indicatedDifference,
    indicatedDifferenceInEUnit,
    indicatedDifferenceFormatted,
    absoluteDifference,
    absoluteDifferenceInEUnit,
    mpeResult,
    status,
    isPassed: isWithinMPE,
  };
}
