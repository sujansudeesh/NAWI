import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};

envContent.split('\n').forEach((line) => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length > 0) {
    env[key.trim()] = vals.join('=').trim();
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'] || '';
const supabaseKey = env['VITE_SUPABASE_PUBLISHABLE_KEY'] || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('FAIL: Missing Supabase credentials in .env.local');
  process.exit(1);
}

async function signInViaRest(email: string, password?: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  return { status: response.status, ok: response.ok, data };
}

async function runAuthTests() {
  console.log('====================================================');
  console.log(' RUNNING REAL SUPABASE AUTHENTICATION TEST SUITE');
  console.log('====================================================\n');

  // TEST C: Nonexistent random email + random password
  const randomEmail = `nonexistent_${Date.now()}@domain-test-xyz.com`;
  const randomPassword = `WrongPass_${Date.now()}`;
  console.log(`[TEST C] Signing in with nonexistent user (${randomEmail})...`);
  const testC = await signInViaRest(randomEmail, randomPassword);

  if (!testC.ok && testC.status === 400 && testC.data.error_code === 'invalid_credentials') {
    console.log(`  ✅ TEST C PASSED: Nonexistent email rejected as expected (HTTP 400: ${testC.data.msg || testC.data.error_description})`);
  } else {
    console.log('  ❌ TEST C FAILED:', testC);
  }

  // TEST B: Existing format email + wrong password
  const fakeUserEmail = 'officer@nawiverify.demo';
  const wrongPassword = 'WrongPassword999!';
  console.log(`\n[TEST B] Signing in with email (${fakeUserEmail}) and wrong password...`);
  const testB = await signInViaRest(fakeUserEmail, wrongPassword);

  if (!testB.ok && testB.status === 400 && testB.data.error_code === 'invalid_credentials') {
    console.log(`  ✅ TEST B PASSED: Wrong password rejected as expected (HTTP 400: ${testB.data.msg || testB.data.error_description})`);
  } else {
    console.log('  ❌ TEST B FAILED:', testB);
  }

  console.log('\n====================================================');
  console.log(' AUTHENTICATION SECURITY SUITE COMPLETE');
  console.log('====================================================');
}

runAuthTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
