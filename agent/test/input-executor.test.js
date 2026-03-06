/**
 * Unit tests for InputExecutor internals.
 * Tests protocol parsing, error codes, stop/restart, and executor behavior.
 * Run: node test/input-executor.test.js
 *
 * NOTE: These tests do NOT require the Swift helper binary.
 *       They test the Node executor logic in isolation.
 */
const { InputErrorCodes, InputExecutor, ACTION_TIMEOUTS } = require('../src/executor/input');

let passed = 0;
let failed = 0;

function assert(condition, label) {
    if (condition) {
        passed++;
        console.log(`  ✓ ${label}`);
    } else {
        failed++;
        console.error(`  ✗ FAIL: ${label}`);
    }
}

async function assertAsync(fn, label) {
    try {
        const result = await fn();
        if (result) {
            passed++;
            console.log(`  ✓ ${label}`);
        } else {
            failed++;
            console.error(`  ✗ FAIL: ${label}`);
        }
    } catch (err) {
        failed++;
        console.error(`  ✗ FAIL: ${label} — threw: ${err.message}`);
    }
}

async function runTests() {
    // ─── Error Codes ───────────────────────────────────────────────────────
    console.log('\n── Error Codes ──');

    assert(InputErrorCodes.INPUT_INVALID_PAYLOAD === 'INPUT_INVALID_PAYLOAD', 'INPUT_INVALID_PAYLOAD defined');
    assert(InputErrorCodes.INPUT_OUT_OF_BOUNDS === 'INPUT_OUT_OF_BOUNDS', 'INPUT_OUT_OF_BOUNDS defined');
    assert(InputErrorCodes.INPUT_RATE_LIMITED === 'INPUT_RATE_LIMITED', 'INPUT_RATE_LIMITED defined');
    assert(InputErrorCodes.INPUT_EXEC_FAILED === 'INPUT_EXEC_FAILED', 'INPUT_EXEC_FAILED defined');
    assert(InputErrorCodes.INPUT_HELPER_CRASHED === 'INPUT_HELPER_CRASHED', 'INPUT_HELPER_CRASHED defined');
    assert(InputErrorCodes.INPUT_HELPER_TIMEOUT === 'INPUT_HELPER_TIMEOUT', 'INPUT_HELPER_TIMEOUT defined');
    assert(InputErrorCodes.INPUT_HELPER_NOT_READY === 'INPUT_HELPER_NOT_READY', 'INPUT_HELPER_NOT_READY defined');
    assert(InputErrorCodes.INPUT_STOPPED === 'INPUT_STOPPED', 'INPUT_STOPPED defined');

    // ─── Action Timeouts ──────────────────────────────────────────────────
    console.log('\n── Action Timeouts ──');

    assert(ACTION_TIMEOUTS.move === 2000, 'move timeout is 2000ms');
    assert(ACTION_TIMEOUTS.click === 2000, 'click timeout is 2000ms');
    assert(ACTION_TIMEOUTS.scroll === 2000, 'scroll timeout is 2000ms');
    assert(ACTION_TIMEOUTS.drag === 5000, 'drag timeout is 5000ms (longer for animation)');

    // ─── Executor State Machine ───────────────────────────────────────────
    console.log('\n── Executor State Machine ──');

    const exec1 = new InputExecutor();

    assert(exec1.isReady === false, 'executor starts not-ready');
    assert(exec1._stopped === false, 'executor starts not-stopped');

    exec1.stop();
    assert(exec1._stopped === true, 'stop() sets stopped flag');
    assert(exec1.isReady === false, 'stopped executor is not ready');

    exec1.restart();
    assert(exec1._stopped === false, 'restart() clears stopped flag');
    assert(exec1._restartCount === 0, 'restart() resets restart counter');

    // ─── Execute While Stopped ────────────────────────────────────────────
    console.log('\n── Execute While Stopped ──');

    const exec2 = new InputExecutor();
    exec2.stop();

    await assertAsync(async () => {
        const result = await exec2.execute('input.mouse.click', { x: 100, y: 100 });
        return result.status === 'error' && result.errorCode === InputErrorCodes.INPUT_STOPPED;
    }, 'execute while stopped returns INPUT_STOPPED');

    await assertAsync(async () => {
        const result = await exec2.execute('input.mouse.move', { x: 50, y: 50 });
        return result.status === 'error' && result.errorCode === InputErrorCodes.INPUT_STOPPED;
    }, 'move while stopped returns INPUT_STOPPED');

    await assertAsync(async () => {
        const result = await exec2.execute('input.mouse.scroll', { delta_y: 100 });
        return result.status === 'error' && result.errorCode === InputErrorCodes.INPUT_STOPPED;
    }, 'scroll while stopped returns INPUT_STOPPED');

    await assertAsync(async () => {
        const result = await exec2.execute('input.mouse.drag', { from_x: 0, from_y: 0, to_x: 100, to_y: 100 });
        return result.status === 'error' && result.errorCode === InputErrorCodes.INPUT_STOPPED;
    }, 'drag while stopped returns INPUT_STOPPED');

    exec2.restart();

    // ─── Unknown Intent ───────────────────────────────────────────────────
    console.log('\n── Unknown Intent ──');

    const exec3 = new InputExecutor();

    await assertAsync(async () => {
        const result = await exec3.execute('input.mouse.fly', { x: 0, y: 0 });
        return result.status === 'error' && result.errorCode === InputErrorCodes.INPUT_INVALID_PAYLOAD;
    }, 'unknown intent returns INPUT_INVALID_PAYLOAD');

    await assertAsync(async () => {
        const result = await exec3.execute('other.thing', {});
        return result.status === 'error' && result.errorCode === InputErrorCodes.INPUT_INVALID_PAYLOAD;
    }, 'non-input intent returns INPUT_INVALID_PAYLOAD');

    // ─── Helper Not Found (graceful failure) ──────────────────────────────
    console.log('\n── Helper Not Found ──');

    const exec4 = new InputExecutor();

    await assertAsync(async () => {
        const result = await exec4.execute('input.mouse.click', { x: 100, y: 200 });
        // Some environments have the helper available; others do not. We only
        // require that the call does not throw and returns a structured result.
        if (result.status === 'success') return true;
        return result.status === 'error' && (
            result.errorCode === InputErrorCodes.INPUT_HELPER_NOT_READY ||
            result.errorCode === InputErrorCodes.INPUT_HELPER_CRASHED ||
            result.errorCode === InputErrorCodes.INPUT_EXEC_FAILED
        );
    }, 'execute without helper binary returns structured result (no crash)');

    // ─── Stop Emits Event ─────────────────────────────────────────────────
    console.log('\n── Events ──');

    const exec5 = new InputExecutor();
    let stoppedEmitted = false;
    let restartedEmitted = false;
    exec5.on('stopped', () => { stoppedEmitted = true; });
    exec5.on('restarted', () => { restartedEmitted = true; });

    exec5.stop();
    assert(stoppedEmitted, 'stop() emits "stopped" event');

    exec5.restart();
    assert(restartedEmitted, 'restart() emits "restarted" event');

    // ─── Max Restart Count ────────────────────────────────────────────────
    console.log('\n── Max Restart Exhaustion ──');

    const exec6 = new InputExecutor();
    exec6._restartCount = 3;

    await assertAsync(async () => {
        const result = await exec6.execute('input.mouse.move', { x: 0, y: 0 });
        return result.status === 'error' && result.errorCode === InputErrorCodes.INPUT_HELPER_CRASHED;
    }, 'execute after 3 crashes returns INPUT_HELPER_CRASHED');

    // ─── Domain Schema Validation ─────────────────────────────────────────
    console.log('\n── Domain Schema Validation ──');

    const inputDomain = require('../src/policy/registry/domains/input');

    assert(inputDomain.name === 'input', 'domain name is "input"');
    assert(inputDomain.version === '0.1.0', 'domain version is 0.1.0');
    assert(inputDomain.domainPolicy.defaultRiskFloor === 'high', 'risk floor is HIGH');

    // Validate move schema
    const moveSchema = inputDomain.intents['mouse.move'].schema;
    const moveValid = moveSchema.safeParse({ x: 100, y: 200 });
    assert(moveValid.success === true, 'move schema accepts { x: 100, y: 200 }');

    const moveNeg = moveSchema.safeParse({ x: -10, y: 200 });
    assert(moveNeg.success === false, 'move schema rejects negative x');

    const moveDuration = moveSchema.safeParse({ x: 100, y: 200, duration_ms: 500 });
    assert(moveDuration.success === true, 'move schema accepts duration_ms=500');

    const moveDurationMax = moveSchema.safeParse({ x: 100, y: 200, duration_ms: 1500 });
    assert(moveDurationMax.success === false, 'move schema rejects duration_ms > 1000');

    // Validate click schema
    const clickSchema = inputDomain.intents['mouse.click'].schema;
    const clickValid = clickSchema.safeParse({ x: 50, y: 50, button: 'right', clicks: 2 });
    assert(clickValid.success === true, 'click schema accepts right double-click');

    const clickBadBtn = clickSchema.safeParse({ x: 50, y: 50, button: 'middle' });
    assert(clickBadBtn.success === false, 'click schema rejects "middle" button');

    const clickTooMany = clickSchema.safeParse({ x: 50, y: 50, clicks: 5 });
    assert(clickTooMany.success === false, 'click schema rejects clicks > 3');

    // Validate scroll schema
    const scrollSchema = inputDomain.intents['mouse.scroll'].schema;
    const scrollValid = scrollSchema.safeParse({ delta_x: 100, delta_y: -500 });
    assert(scrollValid.success === true, 'scroll schema accepts valid deltas');

    const scrollTooBig = scrollSchema.safeParse({ delta_y: 3000 });
    assert(scrollTooBig.success === false, 'scroll schema rejects delta > 2000');

    // Validate drag schema
    const dragSchema = inputDomain.intents['mouse.drag'].schema;
    const dragValid = dragSchema.safeParse({ from_x: 10, from_y: 20, to_x: 300, to_y: 400 });
    assert(dragValid.success === true, 'drag schema accepts valid points');

    const dragDuration = dragSchema.safeParse({ from_x: 10, from_y: 20, to_x: 300, to_y: 400, duration_ms: 3000 });
    assert(dragDuration.success === false, 'drag schema rejects duration_ms > 2000');

    const dragDurationMin = dragSchema.safeParse({ from_x: 10, from_y: 20, to_x: 300, to_y: 400, duration_ms: 10 });
    assert(dragDurationMin.success === false, 'drag schema rejects duration_ms < 50');

    // ─── Permission Check ─────────────────────────────────────────────────
    console.log('\n── Permission Integration ──');

    const { Permissions } = require('../src/policy/permissions');
    assert(Permissions['ui.pointer.control'] !== undefined, 'ui.pointer.control permission exists');
    assert(Permissions['ui.pointer.control'].risk === 'high', 'ui.pointer.control is HIGH risk');
    assert(Permissions['ui.pointer.control'].confirmation === true, 'ui.pointer.control requires confirmation');

    // ─── Summary ──────────────────────────────────────────────────────────
    console.log(`\n════════════════════════════════════════`);
    console.log(`  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`════════════════════════════════════════\n`);

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('Test runner crashed:', err);
    process.exit(1);
});
