import { ApplicabilityStatus, TestContext } from '../../../types';
import { OIML_CLAUSES, OIMLRuleMetadata } from './references';

export interface InstrumentApplicabilityInput {
  accuracyClass: string;
  maxCapacity: number;
  maxUnit: string;
  digitalIndication: boolean;
  zeroSettingType?: string;
  tareDeviceAvailable: boolean;
  tareType?: string;
  isBatteryPoweredOnly?: boolean;
}

export interface RuleApplicabilityDecision {
  testId: string;
  testName: string;
  status: ApplicabilityStatus;
  reason: string;
  clause: string;
  metadata: OIMLRuleMetadata;
}

/**
 * Derives rule-justified test applicability matrix per OIML R 76-1:2006.
 */
export function evaluateTestApplicability(
  testId: string,
  input: InstrumentApplicabilityInput,
  context: TestContext
): RuleApplicabilityDecision {
  const { tareDeviceAvailable, digitalIndication, isBatteryPoweredOnly } = input;

  switch (testId) {
    case 'accuracy':
      return {
        testId: 'accuracy',
        testName: 'Weighing Accuracy Performance Test',
        status: 'APPLICABLE',
        reason: 'OIML R 76-1 §A.4.4: Weighing performance test is mandatory across all evaluation contexts.',
        clause: OIML_CLAUSES.MPE_TABLE_6.clause,
        metadata: OIML_CLAUSES.MPE_TABLE_6,
      };

    case 'zeroSetting':
      return {
        testId: 'zeroSetting',
        testName: 'Zero-Setting Accuracy Test',
        status: 'APPLICABLE',
        reason: 'OIML R 76-1 §4.5.2 & §A.4.2.3: Zero-setting accuracy check is required when a zero-setting device is present.',
        clause: OIML_CLAUSES.ZERO_SETTING_ACCURACY.clause,
        metadata: OIML_CLAUSES.ZERO_SETTING_ACCURACY,
      };

    case 'tare':
      if (tareDeviceAvailable) {
        return {
          testId: 'tare',
          testName: 'Tare Device Test (Setting & Net Weighing)',
          status: 'APPLICABLE',
          reason: 'OIML R 76-1 §4.6 & §A.4.6: Tare test is APPLICABLE because a tare device is configured on the instrument.',
          clause: OIML_CLAUSES.TARE_NET_WEIGHING.clause,
          metadata: OIML_CLAUSES.TARE_NET_WEIGHING,
        };
      }
      return {
        testId: 'tare',
        testName: 'Tare Device Test',
        status: 'NOT_APPLICABLE',
        reason: 'OIML R 76-1 §4.6: Instrument is not equipped with a tare device (tareDeviceAvailable = false).',
        clause: OIML_CLAUSES.TARE_NET_WEIGHING.clause,
        metadata: OIML_CLAUSES.TARE_NET_WEIGHING,
      };

    case 'eccentricity':
      return {
        testId: 'eccentricity',
        testName: 'Eccentricity Test',
        status: 'APPLICABLE',
        reason: 'OIML R 76-1 §3.6.2 & §A.4.7: Eccentricity test is mandatory across all evaluation contexts.',
        clause: OIML_CLAUSES.ECCENTRICITY.clause,
        metadata: OIML_CLAUSES.ECCENTRICITY,
      };

    case 'repeatability':
      return {
        testId: 'repeatability',
        testName: 'Repeatability Test',
        status: 'APPLICABLE',
        reason: 'OIML R 76-1 §3.6.1 & §A.4.10: Repeatability test is mandatory across all evaluation contexts.',
        clause: OIML_CLAUSES.REPEATABILITY.clause,
        metadata: OIML_CLAUSES.REPEATABILITY,
      };

    case 'discrimination':
      if (context === 'TYPE_EXAMINATION') {
        return {
          testId: 'discrimination',
          testName: 'Discrimination Test',
          status: 'APPLICABLE',
          reason: 'OIML R 76-1 §3.8 & §A.4.8: Discrimination test is mandatory during Type Examination.',
          clause: OIML_CLAUSES.DISCRIMINATION.clause,
          metadata: OIML_CLAUSES.DISCRIMINATION,
        };
      }
      return {
        testId: 'discrimination',
        testName: 'Discrimination Test',
        status: 'REQUIRES_LAB_CONFIRMATION',
        reason: 'OIML R 76-1 §A.4.8: Discrimination test is optional for Initial Verification unless requested by the verification authority.',
        clause: OIML_CLAUSES.DISCRIMINATION.clause,
        metadata: OIML_CLAUSES.DISCRIMINATION,
      };

    case 'statictemp':
      if (context === 'TYPE_EXAMINATION') {
        return {
          testId: 'statictemp',
          testName: 'Static Temperature Test',
          status: 'APPLICABLE',
          reason: 'OIML R 76-1 §3.9.2 & §A.5.3.1: Temperature influence test is mandatory for Type Examination in climate chamber.',
          clause: OIML_CLAUSES.TEMPERATURE_STATIC.clause,
          metadata: OIML_CLAUSES.TEMPERATURE_STATIC,
        };
      }
      return {
        testId: 'statictemp',
        testName: 'Static Temperature Test',
        status: 'NOT_APPLICABLE',
        reason: 'OIML R 76-1 §A.5.3: Environmental temperature chamber tests are restricted to Type Examination.',
        clause: OIML_CLAUSES.TEMPERATURE_STATIC.clause,
        metadata: OIML_CLAUSES.TEMPERATURE_STATIC,
      };

    default:
      return {
        testId,
        testName: testId,
        status: 'REQUIRES_LAB_CONFIRMATION',
        reason: 'OIML R 76-1: Test applicability requires manual laboratory officer confirmation.',
        clause: OIML_CLAUSES.CLASSIFICATION.clause,
        metadata: OIML_CLAUSES.CLASSIFICATION,
      };
  }
}
