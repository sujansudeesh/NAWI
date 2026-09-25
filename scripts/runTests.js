import { runMPEEngineUnitTests } from '../src/rules/oimlR76/2006/__tests__/mpeRules.test.js';
import { runMetrologyAuditUnitTests } from '../src/rules/oimlR76/2006/__tests__/metrologyAudit.test.js';

console.log('================================================================');
console.log(' RUNNING OIML R 76-1:2006 RULE ENGINE AUTOMATED UNIT TESTS');
console.log('================================================================\n');

try {
  const resMPE = runMPEEngineUnitTests();
  const resAudit = runMetrologyAuditUnitTests();

  const totalTests = resMPE.testCount + resAudit.testCount;
  const totalFailures = [...resMPE.failures, ...resAudit.failures];

  if (totalFailures.length === 0) {
    console.log(`✅ SUCCESS: All ${totalTests} OIML R 76-1:2006 unit tests passed cleanly!`);
    console.log(`   - MPE Engine Tests: ${resMPE.testCount} passed`);
    console.log(`   - Metrology Audit Tests: ${resAudit.testCount} passed`);
    console.log('================================================================');
    process.exit(0);
  } else {
    console.error(`❌ FAILURE: ${totalFailures.length} of ${totalTests} tests failed:`);
    totalFailures.forEach((f) => console.error(` - ${f}`));
    console.log('================================================================');
    process.exit(1);
  }
} catch (err) {
  console.error('Test execution error:', err);
  process.exit(1);
}
