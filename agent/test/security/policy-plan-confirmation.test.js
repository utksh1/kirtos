const test = require('node:test');
const assert = require('node:assert');

const { PolicyEngine } = require('../../src/policy/engine');

test('plan-execute requires confirmation for critical intents', () => {
  const plan = [
  {
    intent: 'browser.open',
    params: { url: 'https://example.com' },
    confidence: 0.9
  }];


  const decision = PolicyEngine.evaluatePlan(plan, 'session-test', 'client-test');

  assert.equal(decision.allowed, true, 'plan should be allowed by allowlist');
  assert.equal(decision.requires_confirmation, true, 'medium+ intents with confirmation permissions must request confirmation');
  assert.ok(decision.decisions[0].requires_confirmation, 'individual step also requires confirmation');
});