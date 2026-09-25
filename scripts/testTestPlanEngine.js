import {
  generateRecommendedTestPlan,
  overrideTestApplicability,
  getDefaultAdministrativeChecklist,
} from '../src/services/testPlanService.ts';
import {
  calculateSessionProgress,
  isSessionReadyForReview,
} from '../src/services/evaluationResultService.ts';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('================================================================');
console.log(' OIML R 76-1:2006 TEST PLAN & APPLICABILITY ENGINE UNIT TESTS');
console.log('================================================================\n');

// 1. INSTRUMENT WITH TARE DEVICE (TYPE EXAMINATION)
const instWithTare = {
  accuracyClass: 'Class III',
  maxCapacity: 30,
  minCapacity: 0.1,
  scaleIntervalD: 5,
  verificationIntervalE: 5,
  digitalIndication: true,
  zeroSettingType: 'SEMI_AUTOMATIC',
  tareDeviceAvailable: true,
  tareType: 'SUBTRACTIVE',
  powerSupplyType: 'AC_MAINS',
  electronicInstrument: true,
};

const plan1 = generateRecommendedTestPlan(instWithTare, 'TYPE_EXAMINATION');

const tareItem1 = plan1.find((i) => i.id === 'tare');
assert(tareItem1 !== undefined, 'Tare test item exists in plan');
assert(tareItem1.status === 'APPLICABLE', 'Tare test is APPLICABLE when tareDeviceAvailable = true');
assert(
  tareItem1.reason.includes('tareDeviceAvailable = true'),
  'Tare reason clearly explains why included (tareDeviceAvailable = true)'
);

const discItem1 = plan1.find((i) => i.id === 'discrimination');
assert(discItem1.status === 'APPLICABLE', 'Discrimination test is APPLICABLE for Type Examination');

const tempItem1 = plan1.find((i) => i.id === 'tempEffectZero');
assert(tempItem1.status === 'APPLICABLE', 'Temperature effect is APPLICABLE for Type Examination');

// 2. INSTRUMENT WITHOUT TARE DEVICE (NO TARE)
const instNoTare = {
  accuracyClass: 'Class III',
  maxCapacity: 15,
  minCapacity: 0.05,
  scaleIntervalD: 2,
  verificationIntervalE: 2,
  digitalIndication: true,
  zeroSettingType: 'SEMI_AUTOMATIC',
  tareDeviceAvailable: false,
  tareType: 'NONE',
  powerSupplyType: 'AC_MAINS',
  electronicInstrument: true,
};

const plan2 = generateRecommendedTestPlan(instNoTare, 'TYPE_EXAMINATION');

const tareItem2 = plan2.find((i) => i.id === 'tare');
assert(tareItem2.status === 'NOT_APPLICABLE', 'Tare test is NOT_APPLICABLE when tareDeviceAvailable = false');
assert(
  tareItem2.reason.includes('tareDeviceAvailable = false'),
  'Tare reason clearly explains why NOT APPLICABLE (tareDeviceAvailable = false)'
);

// 3. INITIAL VERIFICATION CONTEXT (DISCRIMINATION & INFLUENCE NOT APPLICABLE)
const planInitialVerif = generateRecommendedTestPlan(instWithTare, 'INITIAL_VERIFICATION');

const discInitial = planInitialVerif.find((i) => i.id === 'discrimination');
assert(
  discInitial.status === 'NOT_APPLICABLE',
  'Discrimination test is NOT_APPLICABLE for Initial Verification'
);
assert(
  discInitial.reason.includes('Initial Verification'),
  'Discrimination reason explains context restriction'
);

const tempInitial = planInitialVerif.find((i) => i.id === 'tempEffectZero');
assert(
  tempInitial.status === 'NOT_APPLICABLE',
  'Temperature effect test is NOT_APPLICABLE for Initial Verification'
);

// 4. BATTERY ONLY INSTRUMENT (MAINS VOLTAGE NOT APPLICABLE)
const instBattery = {
  ...instWithTare,
  powerSupplyType: 'BATTERY_ONLY',
};
const planBattery = generateRecommendedTestPlan(instBattery, 'TYPE_EXAMINATION');
const mainsItem = planBattery.find((i) => i.id === 'voltageVariation');
assert(mainsItem !== undefined && mainsItem.status === 'NOT_APPLICABLE', 'AC Mains Voltage test is NOT_APPLICABLE for battery-only instrument');

// 5. STABILITY REQUIRES LAB CONFIRMATION
const spanStabItem = plan1.find((i) => i.id === 'spanStability');
assert(
  spanStabItem.status === 'REQUIRES_LAB_CONFIRMATION',
  'Span stability test is marked REQUIRES_LAB_CONFIRMATION'
);

// 6. MANUAL OVERRIDE PROTOCOL
const overriddenPlan = overrideTestApplicability(
  plan1,
  'spanStability',
  'APPLICABLE',
  true,
  'Lab Director approved 28-day chamber protocol.',
  'Dr. K. S. Murthy'
);
const overriddenItem = overriddenPlan.find((i) => i.id === 'spanStability');
assert(overriddenItem.status === 'APPLICABLE', 'Overridden test status updated to APPLICABLE');
assert(overriddenItem.decisionSource === 'MANUAL_OVERRIDE', 'Decision source set to MANUAL_OVERRIDE');
assert(overriddenItem.overriddenBy === 'Dr. K. S. Murthy', 'Overriding user recorded');
assert(overriddenItem.overrideReason.includes('28-day chamber protocol'), 'Override reason recorded');

// 7. PROGRESS & READY FOR REVIEW WITH NOT_APPLICABLE TARE
const sessionNoTare = {
  id: 'TS-TEST-NO-TARE',
  instrumentId: 'INS-NO-TARE',
  instrumentModel: 'DirectWeigh NT-15',
  serialNumber: 'NT-001',
  manufacturer: 'MetriScale',
  accuracyClass: 'Class III',
  maxCapacity: '15 kg',
  verificationInterval: '2 g',
  startedOn: '2026-03-24',
  progress: 0,
  status: 'In Progress',
  workflowStatus: 'IN_PROGRESS',
  testContext: 'TYPE_EXAMINATION',
  assignedOfficer: 'Dr. Ananya Rao',
  ambientTemp: 22,
  relativeHumidity: 50,
  barometricPressure: 1013,
  weighingObservations: [{ id: 'w1', load: 10, indicatedValue: 10.0, deltaL: 0, calculatedError: 0, adjustedError: 0, mpeLimit: 5, passed: true, direction: 'Increasing' }],
  repeatabilityObservations: [{ runNumber: 1, load: 7.5, indicatedValue: 7.5, zeroIndication: 0, error: 0 }],
  eccentricityObservations: [
    { position: 1, locationLabel: 'FL', load: 5, indicatedValue: 5.0, error: 0, passed: true },
    { position: 2, locationLabel: 'FR', load: 5, indicatedValue: 5.0, error: 0, passed: true },
    { position: 3, locationLabel: 'RL', load: 5, indicatedValue: 5.0, error: 0, passed: true },
    { position: 4, locationLabel: 'RR', load: 5, indicatedValue: 5.0, error: 0, passed: true },
  ],
  discriminationObservations: [
    { testPointId: 'MIN', testPointLabel: 'Min Load', isCompleted: true, passed: true, resultStatus: 'CONFIRMED' },
    { testPointId: 'HALF_MAX', testPointLabel: 'Half Max', isCompleted: true, passed: true, resultStatus: 'CONFIRMED' },
    { testPointId: 'MAX', testPointLabel: 'Max Load', isCompleted: true, passed: true, resultStatus: 'CONFIRMED' },
  ],
  zeroSettingObservations: [{ zeroSettingType: 'SEMI_AUTOMATIC', verificationIntervalE: 2, eUnit: 'g', suggestedIncrement: 0.2, changeoverAdditionalLoad: 0.8, calculatedZeroError: 0.2, permissibleZeroDeviation: 0.5, passed: true, resultStatus: 'WITHIN_LIMIT', isCompleted: true }],
  tareObservations: [],
  testPlan: plan2, // Tare is NOT_APPLICABLE
};

const progressResult = calculateSessionProgress(sessionNoTare);
assert(progressResult.totalCount === 5, 'Total applicable tests count is 5 (Tare excluded from denominator)');
assert(progressResult.completedCount === 5, 'All 5 applicable tests completed');
assert(progressResult.progressPercentage === 100, 'Progress percentage is 100% when all applicable tests complete');

const readyResult = isSessionReadyForReview(sessionNoTare);
assert(readyResult.isReady === true, 'Session with NOT_APPLICABLE tare is READY for review (not blocked)');

// 8. ADMINISTRATIVE CHECKLIST DEFAULT
const adminChecklist = getDefaultAdministrativeChecklist();
assert(adminChecklist.length === 7, 'Administrative checklist contains 7 Annex A items');
assert(adminChecklist[0].clause.includes('Annex A'), 'Item contains official Annex A clause reference');

console.log('\n====================================================');
console.log('RESULTS: All 22 Test Plan Engine tests passed cleanly!');
console.log('====================================================\n');
