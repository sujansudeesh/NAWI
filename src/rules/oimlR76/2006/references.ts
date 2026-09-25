/**
 * OIML R 76-1:2006 Official Standard References & Clause Registry
 */

export const OIML_R76_STANDARD = 'OIML R 76-1';
export const OIML_R76_EDITION = '2006';

export interface OIMLRuleMetadata {
  standard: string; // "OIML R 76-1"
  edition: string;  // "2006"
  clause: string;   // e.g. "3.5.1", "A.4.4.3"
  ruleId: string;   // e.g. "R76-2006-TBL6", "R76-2006-A443"
  description: string;
}

export const OIML_CLAUSES = {
  CLASSIFICATION: {
    standard: OIML_R76_STANDARD,
    edition: OIML_R76_EDITION,
    clause: '3.9 Table 3',
    ruleId: 'R76-2006-CLA-TBL3',
    description: 'Accuracy classes, verification scale intervals (e), number of verification scale intervals (n), and minimum capacity (Min).',
  },
  MPE_TABLE_6: {
    standard: OIML_R76_STANDARD,
    edition: OIML_R76_EDITION,
    clause: '3.5.1 Table 6',
    ruleId: 'R76-2006-MPE-TBL6',
    description: 'Maximum Permissible Errors (MPE) for initial verification across Class I, II, III, IIII.',
  },
  IN_SERVICE_MPE: {
    standard: OIML_R76_STANDARD,
    edition: OIML_R76_EDITION,
    clause: '3.5.2',
    ruleId: 'R76-2006-MPE-INSERVICE',
    description: 'Maximum permissible errors in service shall be twice the maximum permissible errors on initial verification.',
  },
  CHANGEOVER_ERROR: {
    standard: OIML_R76_STANDARD,
    edition: OIML_R76_EDITION,
    clause: 'A.4.4.3',
    ruleId: 'R76-2006-ERR-A443',
    description: 'Determination of indication before rounding P = I + 0.5e - ΔL and raw error E = P - L.',
  },
  CORRECTED_ERROR: {
    standard: OIML_R76_STANDARD,
    edition: OIML_R76_EDITION,
    clause: 'A.4.4.3',
    ruleId: 'R76-2006-ERR-CORRECTED',
    description: 'Calculation of corrected error Ec = E - E0 where E0 is the zero error.',
  },
  ZERO_SETTING_ACCURACY: {
    standard: OIML_R76_STANDARD,
    edition: OIML_R76_EDITION,
    clause: '4.5.2 & A.4.2.3',
    ruleId: 'R76-2006-ZERO-ACC',
    description: 'Accuracy of zero-setting: after zero setting, the effect of zero deviation on the weighing result shall be not more than 0.25e (|E0| <= 0.25e).',
  },
  ZERO_SETTING_RANGE: {
    standard: OIML_R76_STANDARD,
    edition: OIML_R76_EDITION,
    clause: '4.5.1',
    ruleId: 'R76-2006-ZERO-RNG',
    description: 'Range of zero-setting device (initial zero setting ≤ 20%, semi-automatic ≤ 4%).',
  },
  TARE_SETTING_ACCURACY: {
    standard: OIML_R76_STANDARD,
    edition: OIML_R76_EDITION,
    clause: '4.6.3 & A.4.6.1',
    ruleId: 'R76-2006-TARE-ACC',
    description: 'A tare setting device shall allow setting of the indication to zero within 0.25e (|ET| <= 0.25e).',
  },
  TARE_NET_WEIGHING: {
    standard: OIML_R76_STANDARD,
    edition: OIML_R76_EDITION,
    clause: '3.5.3.4 & A.4.6.2',
    ruleId: 'R76-2006-TARE-NET',
    description: 'Weighing performance with tare: MPE applies to net load for any tare value between zero and maximum tare.',
  },
  ECCENTRICITY: {
    standard: OIML_R76_STANDARD,
    edition: OIML_R76_EDITION,
    clause: '3.6.2 & A.4.7',
    ruleId: 'R76-2006-ECC-A47',
    description: 'Eccentric loading test: indications for different positions of a load shall not exceed MPE at 1/3 Max for standard receptors.',
  },
  DISCRIMINATION: {
    standard: OIML_R76_STANDARD,
    edition: OIML_R76_EDITION,
    clause: '3.8 & A.4.8',
    ruleId: 'R76-2006-DISC-A48',
    description: 'Discrimination test: an additional load of 1.4d placed gently on the receptor shall cause display to change from I to I + d.',
  },
  REPEATABILITY: {
    standard: OIML_R76_STANDARD,
    edition: OIML_R76_EDITION,
    clause: '3.6.1 & A.4.10',
    ruleId: 'R76-2006-REP-A410',
    description: 'Difference between results of several weighings of the same load shall not exceed maximum permissible error for that load.',
  },
  TEMPERATURE_STATIC: {
    standard: OIML_R76_STANDARD,
    edition: OIML_R76_EDITION,
    clause: '3.9.2 & A.5.3.1',
    ruleId: 'R76-2006-INF-TEMP',
    description: 'Static temperature test: instrument shall comply with MPEs over specified temperature range (-10°C to +40°C default).',
  },
} as const;
