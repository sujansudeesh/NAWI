import {
  getSpecifiedTemperatureRange,
  evaluateStaticTemperatureObservation,
  evaluateTemperatureZeroShift,
} from '../src/rules/oimlR76/2006/influenceRules.ts';
import {
  createEnvironmentalReading,
  validateEnvironmentalSanity,
  formatEnvironmentalReading,
} from '../src/services/environmentalConditionsService.ts';
import {
  generatePrescribedTemperatureStages,
  recordStaticTemperatureObservation,
  evaluateStaticTemperatureSession,
} from '../src/services/influenceTemperatureService.ts';
import { generateRecommendedTestPlan } from '../src/services/testPlanService.ts';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('================================================================');
console.log(' OIML R 76 INFLUENCE, ELECTRONIC & STABILITY FRAMEWORK TESTS');
console.log('================================================================\n');

// 1. INFLUENCE RULES - TEMPERATURE RANGE & ZERO SHIFT
const tempSpecClassIII = getSpecifiedTemperatureRange('Class III');
assert(tempSpecClassIII.minTemp === -10, 'Default min temp is -10 °C');
assert(tempSpecClassIII.maxTemp === 40, 'Default max temp is +40 °C');
assert(tempSpecClassIII.spanTemp === 50, 'Span temp is 50 °C');

const tempSpecClassI = getSpecifiedTemperatureRange('Class I', 15, 25);
assert(tempSpecClassI.minTemp === 15, 'Class I min temp is 15 °C');
assert(tempSpecClassI.maxTemp === 25, 'Class I max temp is 25 °C');

// MPE evaluation at +40 °C
const evalAt40 = evaluateStaticTemperatureObservation({
  referenceLoad: 10.0,
  referenceLoadUnit: 'kg',
  scaleReading: 10.002,
  scaleReadingUnit: 'kg',
  accuracyClass: 'Class III',
  verificationIntervalE: 5,
  eUnit: 'g',
});
assert(evalAt40.calculatedError === 0.002, 'Calculated error at +40 °C is +0.002 kg (+2 g)');
assert(evalAt40.passed === true, 'Reading +2 g error is WITHIN MPE (±5 g)');
assert(evalAt40.resultStatus === 'WITHIN_LIMIT', 'Result status is WITHIN_LIMIT');

// Zero shift evaluation
const zeroShiftEval = evaluateTemperatureZeroShift({
  zeroErrorTempA: 0.000,
  tempA: 20,
  zeroErrorTempB: 0.001,
  tempB: 40,
  accuracyClass: 'Class III',
  verificationIntervalE: 5,
});
assert(zeroShiftEval.deltaE0 === 0.001, 'Delta E0 between 20°C and 40°C is 0.001 (1 g)');
assert(zeroShiftEval.shiftPerDegree === 0.0001, 'Shift per degree is 0.0001 g/°C');
assert(zeroShiftEval.passed === true, 'Zero shift per degree passes limit');

// 2. ENVIRONMENTAL CONDITIONS SERVICE
const envReading = createEnvironmentalReading({
  temperature: 24.5,
  humidity: 55,
  barometricPressure: 1012.8,
  supplyVoltage: 230,
  supplyFrequency: 50,
  isStabilized: true,
});
assert(envReading.temperature === 24.5, 'Environmental reading records temperature 24.5 °C');
assert(envReading.humidity === 55, 'Environmental reading records relative humidity 55%');

const formattedEnv = formatEnvironmentalReading(envReading);
assert(formattedEnv.includes('Temp: 24.5 °C'), 'Formatted string includes temperature');
assert(formattedEnv.includes('RH: 55%'), 'Formatted string includes humidity');

const sanityCheck = validateEnvironmentalSanity({ temperature: 120 });
assert(sanityCheck.isValid === false, 'Absurd temperature 120 °C fails sanity check');

// 3. INFLUENCE TEMPERATURE SERVICE & STAGES
const stages = generatePrescribedTemperatureStages('Class III', -10, 40);
assert(stages.length === 5, 'Prescribed temperature stages generated (5 stages)');
assert(stages[0].id === 'STAGE_20C_REF', 'Stage 1 is STAGE_20C_REF (+20 °C)');
assert(stages[1].id === 'STAGE_HIGH_TEMP', 'Stage 2 is STAGE_HIGH_TEMP (+40 °C)');
assert(stages[2].id === 'STAGE_LOW_TEMP', 'Stage 3 is STAGE_LOW_TEMP (-10 °C)');

const obs20C = recordStaticTemperatureObservation({
  stageId: 'STAGE_20C_REF',
  stageLabel: 'Stage 1: Reference (+20 °C)',
  targetTemperature: 20,
  actualTemperature: 20.2,
  relativeHumidity: 52,
  soakTimeMinutes: 30,
  referenceLoad: 10.0,
  loadUnit: 'kg',
  indicatedValue: 10.001,
  zeroIndication: 0.000,
  accuracyClass: 'Class III',
  verificationIntervalE: 5,
  eUnit: 'g',
});
assert(obs20C.stageId === 'STAGE_20C_REF', 'Observation recorded for Stage 1');
assert(obs20C.passed === true, 'Observation passed MPE check');

const staticTempSess = evaluateStaticTemperatureSession({
  specifiedMinTemp: -10,
  specifiedMaxTemp: 40,
  accuracyClass: 'Class III',
  observations: [obs20C],
});
assert(staticTempSess.overallResult === 'IN_PROGRESS', 'Partial observations session status is IN_PROGRESS');
assert(staticTempSess.isCompleted === false, 'Session is not completed until all 5 stages recorded');

// 4. DISTURBANCE MODULES IN TEST PLAN SERVICE
const instElectronic = {
  accuracyClass: 'Class III',
  electronicInstrument: true,
  powerSupplyType: 'AC_MAINS',
  vehicleScale: false,
};
const planElectronic = generateRecommendedTestPlan(instElectronic, 'TYPE_EXAMINATION');

const dampHeatItem = planElectronic.find((i) => i.id === 'dampHeat');
assert(dampHeatItem !== undefined, 'Damp heat test module registered');
assert(dampHeatItem.category === 'INFLUENCE', 'Damp heat category is INFLUENCE');

const esdItem = planElectronic.find((i) => i.id === 'electrostaticDischarge');
assert(esdItem !== undefined, 'ESD test module registered');
assert(esdItem.category === 'DISTURBANCE', 'ESD category is DISTURBANCE');

const surgeItem = planElectronic.find((i) => i.id === 'surgeImmunity');
assert(surgeItem !== undefined, 'Surge immunity module registered');

const vehicleItem = planElectronic.find((i) => i.id === 'vehiclePowerDisturbance');
assert(vehicleItem !== undefined, 'Vehicle power disturbance module registered');
assert(vehicleItem.status === 'NOT_APPLICABLE', 'Vehicle power disturbance is NOT_APPLICABLE for standard stationary scale');

// Non-electronic instrument test
const instMechanical = {
  accuracyClass: 'Class III',
  electronicInstrument: false,
};
const planMechanical = generateRecommendedTestPlan(instMechanical, 'TYPE_EXAMINATION');
const esdMech = planMechanical.find((i) => i.id === 'electrostaticDischarge');
assert(esdMech.status === 'NOT_APPLICABLE', 'ESD test is NOT_APPLICABLE for mechanical non-electronic instrument');
assert(esdMech.reason.includes('Mechanical'), 'Reason clearly states Mechanical instrument');

console.log('\n====================================================');
console.log('RESULTS: All 26 Influence & Disturbance tests passed!');
console.log('====================================================\n');
