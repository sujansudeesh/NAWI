import { AccuracyClass, MassUnit } from '../../../types';
import { toMicrograms, fromMicrograms } from './units';
import { OIML_CLAUSES, OIMLRuleMetadata } from './references';

export type VerificationMode = 'INITIAL_VERIFICATION' | 'IN_SERVICE';

export interface MPESpecification {
  accuracyClass: AccuracyClass;
  load: number;
  loadUnit: MassUnit;
  eVal: number;
  eUnit: MassUnit;
  loadInE: number;
  mode: VerificationMode;
  initialMpeMultiplier: number; // 0.5, 1.0, 1.5
  mpeMultiplier: number;        // 0.5, 1.0, 1.5 (initial) or 1.0, 2.0, 3.0 (in-service)
  mpeValue: number;             // absolute MPE value in eUnit
  mpeUnit: MassUnit;
  bandText: string;             // e.g. "500 < m ≤ 2,000 e"
  bandLabel: string;            // e.g. "±1.0e"
  metadata: OIMLRuleMetadata;
}

/**
 * Returns OIML R 76-1:2006 Table 6 MPE specification for a given load and verification mode.
 */
export function getOIMLTable6MPE(
  accuracyClass: AccuracyClass,
  load: number,
  loadUnit: MassUnit,
  eVal: number,
  eUnit: MassUnit,
  mode: VerificationMode = 'INITIAL_VERIFICATION'
): MPESpecification {
  const loadUg = toMicrograms(Math.abs(load), loadUnit);
  const eUg = toMicrograms(eVal, eUnit);
  
  // Calculate load in e units
  const m = Number(loadUg) / Number(eUg);

  let initialMultiplier = 1.0;
  let bandText = '';

  switch (accuracyClass) {
    case 'Class I':
      if (m <= 50000) {
        initialMultiplier = 0.5;
        bandText = '0 ≤ m ≤ 50,000 e';
      } else if (m <= 200000) {
        initialMultiplier = 1.0;
        bandText = '50,000 < m ≤ 200,000 e';
      } else {
        initialMultiplier = 1.5;
        bandText = 'm > 200,000 e';
      }
      break;

    case 'Class II':
      if (m <= 5000) {
        initialMultiplier = 0.5;
        bandText = '0 ≤ m ≤ 5,000 e';
      } else if (m <= 20000) {
        initialMultiplier = 1.0;
        bandText = '5,000 < m ≤ 20,000 e';
      } else {
        initialMultiplier = 1.5;
        bandText = 'm > 20,000 e';
      }
      break;

    case 'Class III':
      if (m <= 500) {
        initialMultiplier = 0.5;
        bandText = '0 ≤ m ≤ 500 e';
      } else if (m <= 2000) {
        initialMultiplier = 1.0;
        bandText = '500 < m ≤ 2,000 e';
      } else {
        initialMultiplier = 1.5;
        bandText = 'm > 2,000 e';
      }
      break;

    case 'Class IIII':
      if (m <= 50) {
        initialMultiplier = 0.5;
        bandText = '0 ≤ m ≤ 50 e';
      } else if (m <= 200) {
        initialMultiplier = 1.0;
        bandText = '50 < m ≤ 200 e';
      } else {
        initialMultiplier = 1.5;
        bandText = 'm > 200 e';
      }
      break;

    default:
      initialMultiplier = 1.0;
      bandText = 'Standard Band';
      break;
  }

  // OIML R 76-1 §3.5.2: In-service MPE is twice initial verification MPE
  const mpeMultiplier = mode === 'IN_SERVICE' ? initialMultiplier * 2 : initialMultiplier;
  const mpeValue = Number((mpeMultiplier * eVal).toFixed(6));
  const metadata = mode === 'IN_SERVICE' ? OIML_CLAUSES.IN_SERVICE_MPE : OIML_CLAUSES.MPE_TABLE_6;

  return {
    accuracyClass,
    load,
    loadUnit,
    eVal,
    eUnit,
    loadInE: m,
    mode,
    initialMpeMultiplier: initialMultiplier,
    mpeMultiplier,
    mpeValue,
    mpeUnit: eUnit,
    bandText,
    bandLabel: `±${mpeMultiplier}e`,
    metadata,
  };
}
