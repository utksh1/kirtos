







const assert = require('assert');
const { PolicyEngine } = require('../../src/policy/engine');
const TrustManager = require('../../src/policy/trust');
const IntentRegistry = require('../../src/policy/registry');


IntentRegistry.get = (name) => {
  if (name === 'test.safe') {
    return {
      name: 'test.safe',
      risk: 'low',
      runtime: 'system',
      permissions: [],
      schema: { safeParse: (p) => ({ success: true, data: { ...p, validated: true } }) }
    };
  }
  if (name === 'test.dangerous') {
    return {
      name: 'test.dangerous',
      risk: 'high',
      runtime: 'shell',
      permissions: ['shell.exec'],
      schema: { safeParse: (p) => ({ success: true, data: { ...p, validated: true } }) }
    };
  }
  return null;
};


require('../../src/policy/permissions').Permissions['shell.exec'] = {
  risk: 'critical',
  confirmation: true
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('\n═══════════════════════════════════════════');
console.log('  Plan Execution Security Tests');
console.log('═══════════════════════════════════════════\n');

test('evaluatePlan returns validated/canonicalized params', () => {
  const plan = [
  { intent: 'test.safe', params: { input: 'raw' } }];

  const decision = PolicyEngine.evaluatePlan(plan, 'session-123');

  assert.strictEqual(decision.allowed, true);
  assert.strictEqual(decision.decisions[0].params.validated, true, 'Params should be the ones from Zod validation');
});

test('TrustManager scopes trust to specific plan hash', () => {
  const sessionId = 'session-scope-test';
  const clientId = 'client-1';
  const originalPlan = [
  { intent: 'test.dangerous', params: { cmd: 'ls' } }];



  TrustManager.grant(sessionId, clientId, ['shell.exec'], {
    isExplicit: true,
    grantedBy: 'plan_confirm',
    plan: originalPlan
  });


  const isTrustedSame = TrustManager.isTrusted(sessionId, clientId, 'shell.exec', { plan: originalPlan });
  assert.strictEqual(isTrustedSame, true, 'Should be trusted for the identical plan');


  const modifiedPlan = [
  { intent: 'test.dangerous', params: { cmd: 'rm -rf /' } }];

  const isTrustedModified = TrustManager.isTrusted(sessionId, clientId, 'shell.exec', { plan: modifiedPlan });
  assert.strictEqual(isTrustedModified, false, 'Should REJECT trust if params were tweaked');
});

test('PolicyEngine.evaluate honors plan-scoped trust', () => {
  const sessionId = 'session-policy-test';
  const clientId = 'client-1';
  const plan = [
  { intent: 'test.dangerous', params: { cmd: 'whoami' } }];



  const d1 = PolicyEngine.evaluate(plan[0], sessionId, clientId, { plan });
  assert.strictEqual(d1.requires_confirmation, true);


  TrustManager.grant(sessionId, clientId, ['shell.exec'], {
    isExplicit: true,
    grantedBy: 'plan_confirm',
    plan: plan
  });


  const d2 = PolicyEngine.evaluate(plan[0], sessionId, clientId, { plan });
  assert.strictEqual(d2.requires_confirmation, false, 'Should bypass confirmation with valid plan trust');


  const differentPlan = [
  { intent: 'test.dangerous', params: { cmd: 'id' } }];

  const d3 = PolicyEngine.evaluate(differentPlan[0], sessionId, clientId, { plan: differentPlan });
  assert.strictEqual(d3.requires_confirmation, true, 'Should still require confirmation for a different plan');
});

console.log('\n═══════════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════\n');

if (failed > 0) process.exit(1);