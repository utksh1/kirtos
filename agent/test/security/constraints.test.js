const test = require('node:test');
const assert = require('node:assert');

// Skip network dependency so tests are deterministic in CI
process.env.KIRTOS_TEST_SKIP_NETWORK = 'true';

const constraints = require('../../src/policy/constraints');

test('network.online passes when test skip flag is set', async () => {
    const result = await constraints.validate(['network.online']);
    assert.equal(result.satisfied, true);
    assert.deepEqual(result.failures, []);
});

test('unknown conditions are ignored and treated as satisfied', async () => {
    const result = await constraints.validate(['nonexistent.condition']);
    assert.equal(result.satisfied, true);
});
