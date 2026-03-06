const executor = require('../src/executor');
const IntentRegistry = require('../src/policy/registry');
const { PolicyEngine } = require('../src/policy/engine');

async function verify() {
  console.log("--- Starting New Executor Verification ---");

  const tests = [
  { intent: 'finance.track_expense', params: { amount: 50, category: 'coffee' } },
  { intent: 'health.track_steps', params: { count: 10000 } },
  { intent: 'home.control_device', params: { device_id: 'living_room_light', action: 'on' } },
  { intent: 'learning.lesson_start', params: { subject: 'Spanish' } },
  { intent: 'entertainment.find_content', params: { query: 'Inception' } },
  { intent: 'travel.flight_status', params: { flight_number: 'AI 123' } },
  { intent: 'wellness.track_mood', params: { mood: 'happy' } }];


  let passed = 0;
  for (const test of tests) {
    console.log(`\nTesting: ${test.intent}`);
    try {

      if (!IntentRegistry.get(test.intent)) {
        throw new Error(`Intent ${test.intent} not found in registry`);
      }
      console.log(`[OK] Intent registered.`);


      const decision = PolicyEngine.evaluate({ intent: test.intent, params: test.params }, 'test-session');
      if (!decision.allowed) {
        throw new Error(`PolicyEngine denied ${test.intent}: ${decision.reason}`);
      }
      console.log(`[OK] PolicyEngine allowed (Profile: ${decision.execution_profile}).`);


      const result = await executor.execute(decision.runtime, test.intent, decision.params, { session_id: 'test-session', role: 'admin' });
      if (result.status !== 'success') {
        throw new Error(`Execution failed: ${JSON.stringify(result.error)}`);
      }
      console.log(`[OK] Execution success: ${result.result.message || 'Complete'}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${test.intent}: ${err.message}`);
    }
  }

  console.log(`\n--- Verification Complete ---`);
  console.log(`Passed: ${passed}/${tests.length}`);

  if (passed === tests.length) {
    console.log("ALL VERIFICATIONS PASSED!");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

verify();