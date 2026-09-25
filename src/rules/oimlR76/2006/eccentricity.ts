import { AccuracyClass, EccentricityProfile, MassUnit } from '../../../types';
import { getOIMLTable6MPE, VerificationMode, MPESpecification } from './mpe';
import { convertMass } from './units';
import { OIML_CLAUSES, OIMLRuleMetadata } from './references';

export interface EccentricityLoadDerivation {
  profile: EccentricityProfile;
  maxCapacity: number;
  maxUnit: MassUnit;
  additiveTareEffect: number;
  effectiveCapacity: number; // Max + TareAdd
  numSupports: number;
  usualRollingLoad?: number;
  recommendedTestLoad: number;
  testLoadUnit: MassUnit;
  derivationFormula: string;
  ruleExplanation: string;
  metadata: OIMLRuleMetadata;
}

export interface EccentricityPositionInput {
  position: number;
  locationLabel: string;
  testLoad: number;
  testLoadUnit: MassUnit;
  scaleReading: number;
  scaleReadingUnit: MassUnit;
  accuracyClass: AccuracyClass;
  eVal: number;
  eUnit: MassUnit;
  mode?: VerificationMode;
}

export interface EccentricityPositionResult {
  position: number;
  locationLabel: string;
  testLoad: number;
  testLoadUnit: MassUnit;
  scaleReading: number;
  scaleReadingUnit: MassUnit;
  calculatedError: number; // in eUnit
  errorFormatted: string;
  mpeSpec: MPESpecification;
  mpeLimitValue: number;   // in eUnit
  passed: boolean;
  mpeStatus: 'WITHIN_MPE' | 'EXCEEDS_MPE';
  metadata: OIMLRuleMetadata;
}

/**
 * Calculates recommended OIML R 76-1:2006 §3.6.2 & A.4.7 eccentricity test load.
 * 
 * Formulas:
 * 1. Standard receptor with <= 4 supports:
 *    L = 1/3 * (Max + maximum additive tare effect)
 * 2. Receptor with > 4 supports (N):
 *    L = 1/(N - 1) * (Max + maximum additive tare effect)
 * 3. Minimal off-centre receptors (tank, hopper):
 *    L = 1/10 * (Max + maximum additive tare effect)
 * 4. Rolling-load instruments:
 *    The usual rolling load (heaviest concentrated load weighed), subject to upper cap:
 *    L <= 0.8 * (Max + maximum additive tare effect)
 */
export function deriveOIMLEccentricityTestLoad(
  maxCapacity: number,
  maxUnit: MassUnit,
  profile: EccentricityProfile = 'STANDARD_UP_TO_4_SUPPORTS',
  numSupports: number = 4,
  additiveTareEffect: number = 0,
  usualRollingLoad?: number
): EccentricityLoadDerivation {
  const effectiveCapacity = maxCapacity + additiveTareEffect;
  let recommendedTestLoad = effectiveCapacity / 3;
  let derivationFormula = '1/3 × (Max + TareAdd)';
  let ruleExplanation = 'OIML R 76-1 §3.6.2.1: For standard load receptors with 4 or fewer supports, the test load shall be equal to 1/3 of (Max + maximum additive tare effect).';

  switch (profile) {
    case 'MORE_THAN_4_SUPPORTS': {
      const denominator = Math.max(1, numSupports - 1);
      recommendedTestLoad = effectiveCapacity / denominator;
      derivationFormula = `1/(${numSupports} - 1) × (Max + TareAdd)`;
      ruleExplanation = `OIML R 76-1 §3.6.2.1: For receptors with more than 4 supports (${numSupports}), the test load shall be equal to 1/(N-1) of (Max + maximum additive tare effect).`;
      break;
    }

    case 'MINIMAL_OFF_CENTRE': {
      recommendedTestLoad = effectiveCapacity / 10;
      derivationFormula = '1/10 × (Max + TareAdd)';
      ruleExplanation = 'OIML R 76-1 §3.6.2.3: For minimal off-centre loading receptors (tanks, hoppers), the test load shall be equal to 1/10 of (Max + maximum additive tare effect).';
      break;
    }

    case 'ROLLING_LOAD': {
      const upperCap = 0.8 * effectiveCapacity;
      if (usualRollingLoad && usualRollingLoad > 0) {
        recommendedTestLoad = Math.min(usualRollingLoad, upperCap);
        derivationFormula = `min(UsualRollingLoad, 0.8 × (Max + TareAdd)) = min(${usualRollingLoad}, ${upperCap})`;
        ruleExplanation = `OIML R 76-1 §3.6.2.2: For rolling load instruments, test load is the usual heaviest concentrated rolling load, capped at 0.8 × (Max + TareAdd) (${upperCap} ${maxUnit}).`;
      } else {
        recommendedTestLoad = upperCap;
        derivationFormula = '0.8 × (Max + TareAdd) (Upper Limit Cap)';
        ruleExplanation = `OIML R 76-1 §3.6.2.2: For rolling load instruments, test load is the usual rolling load, subject to an upper limit cap of 0.8 × (Max + TareAdd) (${upperCap} ${maxUnit}).`;
      }
      break;
    }
  }

  recommendedTestLoad = Number(recommendedTestLoad.toFixed(4));

  return {
    profile,
    maxCapacity,
    maxUnit,
    additiveTareEffect,
    effectiveCapacity,
    numSupports,
    usualRollingLoad,
    recommendedTestLoad,
    testLoadUnit: maxUnit,
    derivationFormula,
    ruleExplanation,
    metadata: OIML_CLAUSES.ECCENTRICITY,
  };
}

/**
 * Evaluates individual eccentricity position reading per OIML R 76-1 A.4.7.
 */
export function evaluateEccentricityPositionReading(
  input: EccentricityPositionInput
): EccentricityPositionResult {
  const {
    position,
    locationLabel,
    testLoad: L_val,
    testLoadUnit: L_unit,
    scaleReading: I_val,
    scaleReadingUnit: I_unit,
    accuracyClass,
    eVal,
    eUnit,
    mode = 'INITIAL_VERIFICATION',
  } = input;

  const L = convertMass(L_val, L_unit, eUnit);
  const I = convertMass(I_val, I_unit, eUnit);
  const errorInE = I - L;

  const mpeSpec = getOIMLTable6MPE(accuracyClass, L_val, L_unit, eVal, eUnit, mode);
  const mpeLimitValue = mpeSpec.mpeValue;

  const passed = Math.abs(errorInE) <= mpeLimitValue + 1e-9;

  return {
    position,
    locationLabel,
    testLoad: L_val,
    testLoadUnit: L_unit,
    scaleReading: I_val,
    scaleReadingUnit: I_unit,
    calculatedError: errorInE,
    errorFormatted: `${errorInE > 0 ? '+' : ''}${errorInE.toFixed(3)} ${eUnit}`,
    mpeSpec,
    mpeLimitValue,
    passed,
    mpeStatus: passed ? 'WITHIN_MPE' : 'EXCEEDS_MPE',
    metadata: OIML_CLAUSES.ECCENTRICITY,
  };
}
