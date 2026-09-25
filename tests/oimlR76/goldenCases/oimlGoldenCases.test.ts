import {
  toMicrograms,
  isMassEqual,
  validateInstrumentClassification,
  getOIMLTable6MPE,
  evaluateDigitalIndicationError,
  evaluateZeroSettingAccuracy,
  evaluateTareSettingAccuracy,
  evaluateTareNetWeighing,
  deriveOIMLEccentricityTestLoad,
  evaluateEccentricityPositionReading,
  evaluateDigitalDiscriminationTestPoint,
  evaluateRepeatabilitySeries,
} from '../../../src/rules/oimlR76/2006';

console.log('================================================================');
console.log(' RUNNING OIML R 76-1:2006 GOLDEN TEST CASES (INDEPENDENT AUDIT)');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;
const failures: string[] = [];

function assert(condition: boolean, description: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✓ PASS: ${description}`);
  } else {
    failures.push(description);
    console.error(`❌ FAIL: ${description}`);
  }
}

// 1. UNIT NORMALIZATION & EQUALITY
assert(isMassEqual(5, 'g', 0.005, 'kg'), '5 g and 0.005 kg are canonically equal in microgram representation');
assert(isMassEqual(1000, 'mg', 1, 'g'), '1000 mg and 1 g are canonically equal');
assert(isMassEqual(1, 't', 1000, 'kg'), '1 t and 1000 kg are canonically equal');

// 2. CLASS I GOLDEN CASE
// Max 220 g, e = 0.001 g, Min = 0.1 g (100e), n = 220,000
const class1 = validateInstrumentClassification('Class I', 220, 'g', 0.001, 'g', 0.1, 'g');
assert(class1.isValid, 'Class I balance (220 g, e=1 mg) classification is valid');
assert(class1.nCalculated === 220000, 'Class I n = 220,000');
assert(class1.minCapacityAllowedE === 100, 'Class I Min capacity is 100e');

// 3. CLASS II GOLDEN CASE
// Max 600 g, e = 0.1 g, Min = 5 g (50e), n = 6,000
const class2 = validateInstrumentClassification('Class II', 600, 'g', 0.1, 'g', 5, 'g');
assert(class2.isValid, 'Class II scale (600 g, e=0.1 g) classification is valid');
assert(class2.nCalculated === 6000, 'Class II n = 6,000');

// 4. CLASS III GOLDEN CASE (MetriScale Pro 500)
// Max 30 kg, e = 5 g, Min = 0.1 kg (20e), n = 6,000
const class3 = validateInstrumentClassification('Class III', 30, 'kg', 5, 'g', 0.1, 'kg');
assert(class3.isValid, 'Class III scale (30 kg, e=5 g) classification is valid');
assert(class3.nCalculated === 6000, 'Class III n = 6,000');

// 5. CLASS IIII GOLDEN CASE (Weighbridge / Heavy Scale)
// Max 60 t, e = 100 kg, Min = 1000 kg (10e), n = 600 (within 100 to 1000)
const class4 = validateInstrumentClassification('Class IIII', 60, 't', 100, 'kg', 1000, 'kg');
assert(class4.isValid, 'Class IIII weighbridge (60 t, e=100 kg) classification is valid');
assert(class4.nCalculated === 600, 'Class IIII n = 600');

// 6. MPE BOUNDARY TRANSITIONS FOR CLASS III (INITIAL VERIFICATION)
// 0 <= m <= 500e (2.5 kg) => ±0.5e (±2.5 g)
// 500e < m <= 2000e (10 kg) => ±1.0e (±5.0 g)
// 2000e < m <= 10000e (50 kg) => ±1.5e (±7.5 g)
const mpe499e = getOIMLTable6MPE('Class III', 2.495, 'kg', 5, 'g', 'INITIAL_VERIFICATION');
assert(mpe499e.mpeMultiplier === 0.5 && mpe499e.mpeValue === 2.5, 'Class III 499e (2.495 kg) MPE is ±0.5e (±2.5 g)');

const mpe500e = getOIMLTable6MPE('Class III', 2.5, 'kg', 5, 'g', 'INITIAL_VERIFICATION');
assert(mpe500e.mpeMultiplier === 0.5 && mpe500e.mpeValue === 2.5, 'Class III exact 500e boundary (2.5 kg) MPE is ±0.5e (±2.5 g)');

const mpe500_001e = getOIMLTable6MPE('Class III', 2.505, 'kg', 5, 'g', 'INITIAL_VERIFICATION');
assert(mpe500_001e.mpeMultiplier === 1.0 && mpe500_001e.mpeValue === 5.0, 'Class III 501e (2.505 kg) MPE is ±1.0e (±5.0 g)');

const mpe2000e = getOIMLTable6MPE('Class III', 10.0, 'kg', 5, 'g', 'INITIAL_VERIFICATION');
assert(mpe2000e.mpeMultiplier === 1.0 && mpe2000e.mpeValue === 5.0, 'Class III exact 2000e boundary (10.0 kg) MPE is ±1.0e (±5.0 g)');

const mpe2001e = getOIMLTable6MPE('Class III', 10.005, 'kg', 5, 'g', 'INITIAL_VERIFICATION');
assert(mpe2001e.mpeMultiplier === 1.5 && mpe2001e.mpeValue === 7.5, 'Class III 2001e (10.005 kg) MPE is ±1.5e (±7.5 g)');

// 7. IN-SERVICE MPE DOUBLING
const mpeInService500e = getOIMLTable6MPE('Class III', 2.5, 'kg', 5, 'g', 'IN_SERVICE');
assert(mpeInService500e.mpeMultiplier === 1.0 && mpeInService500e.mpeValue === 5.0, 'Class III In-Service 500e MPE is doubled to ±1.0e (±5.0 g)');

// 8. OIML A.4.4.3 DIGITAL ERROR EVALUATION WITH CHANGEOVER POINT
// L = 10.000 kg, I = 10.000 kg, e = 5 g, ΔL = 2.0 g
// P = I + 0.5e - ΔL = 10.000 + 0.0025 - 0.002 = 10.0005 kg
// Raw E = P - L = +0.0005 kg = +0.5 g
// E0 = +0.5 g
// Ec = E - E0 = +0.5 g - 0.5 g = 0.0 g
const errEval = evaluateDigitalIndicationError({
  referenceLoad: 10.0,
  referenceLoadUnit: 'kg',
  displayedIndication: 10.0,
  displayedIndicationUnit: 'kg',
  additionalChangeoverLoadDeltaL: 2.0,
  deltaLUnit: 'g',
  zeroErrorE0: 0.5,
  eVal: 5,
  eUnit: 'g',
  accuracyClass: 'Class III',
});
assert(errEval.hasChangeoverData, 'Changeover point data detected');
assert(errEval.correctedErrorEc === 0, 'OIML Corrected Error Ec = E - E0 = 0.0 g');
assert(errEval.passed, 'Corrected Error Ec (0.0 g) passes MPE limit (±5.0 g)');

// 9. ZERO-SETTING ACCURACY (A.4.2.3)
// e = 5 g, ΔL = 2.0 g -> E0 = 0.5e - ΔL = 2.5 - 2.0 = +0.5 g <= ±1.25 g limit
const zeroRes = evaluateZeroSettingAccuracy({
  zeroSettingType: 'SEMI_AUTOMATIC',
  eVal: 5,
  eUnit: 'g',
  changeoverAdditionalLoadDeltaL: 2.0,
});
assert(zeroRes.calculatedZeroErrorE0 === 0.5, 'Calculated Zero Error E0 = +0.5 g');
assert(zeroRes.passed, 'Zero Error E0 (+0.5 g) passes ±0.25e (±1.25 g) limit');

// 10. TARE SETTING & NET WEIGHING (A.4.6)
// Tare = 5 kg Subtractive on 30 kg scale => Net capacity = 25 kg
// Net Load = 10 kg, Indication = 10.003 kg => Net Error = +3 g
// MPE evaluated on Net Load (10 kg) => ±5 g
const tareRes = evaluateTareNetWeighing({
  tareType: 'SUBTRACTIVE',
  appliedTareLoad: 5,
  tareLoadUnit: 'kg',
  referenceNetLoad: 10,
  netLoadUnit: 'kg',
  displayedNetReading: 10.003,
  displayedNetUnit: 'kg',
  maxCapacity: 30,
  maxUnit: 'kg',
  eVal: 5,
  eUnit: 'g',
  accuracyClass: 'Class III',
});
assert(tareRes.availableNetCapacity === 25, 'Subtractive tare 5 kg reduces available net capacity to 25 kg');
assert(tareRes.netError === 3, 'Net Error is +3 g');
assert(tareRes.passed, 'Net Error +3 g passes MPE ±5 g (evaluated on 10 kg Net Load)');

// 11. ECCENTRICITY LOAD DERIVATION & POSITION EVALUATION (A.4.7)
const eccLoad = deriveOIMLEccentricityTestLoad(30, 'kg', 'STANDARD_UP_TO_4_SUPPORTS', 4);
assert(eccLoad.recommendedTestLoad === 10, 'Eccentricity test load for 30 kg 4-support platform is 1/3 Max = 10 kg');

const eccPos = evaluateEccentricityPositionReading({
  position: 4,
  locationLabel: 'Rear-Right',
  testLoad: 10,
  testLoadUnit: 'kg',
  scaleReading: 10.002,
  scaleReadingUnit: 'kg',
  accuracyClass: 'Class III',
  eVal: 5,
  eUnit: 'g',
});
assert(eccPos.calculatedError === 2, 'Eccentricity Corner 4 error is +2 g');
assert(eccPos.passed, 'Corner 4 error (+2 g) passes MPE (±5 g)');

// 12. DISCRIMINATION TEST (A.4.8)
// d = 5 g, base load = 15 kg, initial = 15.000 kg, +1.4d (7 g) added -> final = 15.005 kg
const discRes = evaluateDigitalDiscriminationTestPoint({
  testPointId: 'HALF_MAX',
  testPointLabel: '50% Max Capacity (15 kg)',
  baseLoad: 15,
  baseLoadUnit: 'kg',
  scaleIntervalD: 5,
  dUnit: 'g',
  initialIndication: 15.0,
  additionalDeltaLoad: 7,
  observedFinalIndication: 15.005,
});
assert(discRes.passed, 'Discrimination response confirmed (display changed to I + d = 15.005 kg)');

// 13. REPEATABILITY TEST (A.4.10)
// 3 readings at 15 kg: 15.000 kg, 15.002 kg, 15.001 kg -> Spread = 2 g <= MPE (±5 g)
const repRes = evaluateRepeatabilitySeries({
  load: 15,
  loadUnit: 'kg',
  readings: [15.0, 15.002, 15.001],
  readingsUnit: 'kg',
  eVal: 5,
  eUnit: 'g',
  accuracyClass: 'Class III',
});
assert(repRes.maxSpread === 2, 'Repeatability maximum spread is 2 g');
assert(repRes.passed, 'Repeatability spread (2 g) passes MPE limit (5 g)');

console.log('\n================================================================');
if (failures.length === 0) {
  console.log(`✅ SUCCESS: All ${passedTests} / ${totalTests} Golden Test Cases PASSED CLEANLY!`);
  console.log('================================================================');
  process.exit(0);
} else {
  console.error(`❌ FAILURE: ${failures.length} / ${totalTests} Golden Test Cases FAILED:`);
  failures.forEach((f) => console.error(` - ${f}`));
  console.log('================================================================');
  process.exit(1);
}
