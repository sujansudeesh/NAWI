import { AccuracyClass } from '../../../types';

/**
 * ============================================================================
 * OIML R 76-1:2006 SECTION 3.5 TABLE 6 - MAXIMUM PERMISSIBLE ERRORS (MPE)
 * ============================================================================
 * 
 * Rule Standard: OIML R 76-1
 * Rule Version: 2006
 * 
 * Defines the Maximum Permissible Errors (MPE) in terms of verification scale
 * interval (e) for initial verification and in-service inspection across all
 * four accuracy classes (Class I, Class II, Class III, Class IIII).
 * ============================================================================
 */

export type VerificationMode = 'INITIAL_VERIFICATION' | 'IN_SERVICE';

export interface MPEBandResult {
  multiplierInE: number; // Multiplier applied to e (e.g. 0.5, 1.0, 1.5 or 1.0, 2.0, 3.0)
  initialMultiplierInE: number; // Un-doubled initial verification multiplier (0.5, 1.0, 1.5)
  bandText: string; // Range string, e.g. "500 < m ≤ 2,000 e"
  bandLabel: string; // Multiplier label, e.g. "±1.0e"
  ruleStandard: string; // "OIML R 76-1"
  ruleVersion: string; // "2006"
}

/**
 * Evaluates OIML R 76-1:2006 Table 6 MPE band multiplier for a given load in e intervals.
 * Boundary conditions enforce exact upper-inclusive brackets:
 * 
 * Class I:
 *   0 <= m <= 50,000 e     => ±0.5e
 *   50,000 < m <= 200,000 e => ±1.0e
 *   m > 200,000 e          => ±1.5e
 * 
 * Class II:
 *   0 <= m <= 5,000 e      => ±0.5e
 *   5,000 < m <= 20,000 e   => ±1.0e
 *   20,000 < m <= 100,000 e => ±1.5e
 * 
 * Class III:
 *   0 <= m <= 500 e        => ±0.5e
 *   500 < m <= 2,000 e     => ±1.0e
 *   2,000 < m <= 10,000 e  => ±1.5e
 * 
 * Class IIII:
 *   0 <= m <= 50 e         => ±0.5e
 *   50 < m <= 200 e        => ±1.0e
 *   200 < m <= 1,000 e     => ±1.5e
 */
export function getTable6MPEBand(
  accuracyClass: AccuracyClass,
  loadInE: number,
  mode: VerificationMode = 'INITIAL_VERIFICATION'
): MPEBandResult {
  const m = Math.abs(loadInE);
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

  // In-Service MPEs are twice initial verification MPEs (Section 3.5.2)
  const multiplierInE = mode === 'IN_SERVICE' ? initialMultiplier * 2 : initialMultiplier;

  return {
    multiplierInE,
    initialMultiplierInE: initialMultiplier,
    bandText,
    bandLabel: `±${multiplierInE}e`,
    ruleStandard: 'OIML R 76-1',
    ruleVersion: '2006',
  };
}
