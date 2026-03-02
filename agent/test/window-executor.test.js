/**
 * Unit tests for WindowExecutor internals.
 * Tests protocol parsing, error codes, stop/restart, executor behavior,
 * bounds validation, and domain schema contracts.
 * Run: node test/window-executor.test.js
 *
 * NOTE: These tests do NOT require the Swift helper binary.
 *       They test the Node executor logic and schema validation in isolation.
 */
const { WindowErrorCodes, WindowExecutor, ACTION_TIMEOUTS } = require('../src/executor/window');

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
    console.log('\n── Window Error Codes ──');

    assert(WindowErrorCodes.WINDOW_AX_DENIED === 'WINDOW_AX_DENIED', 'WINDOW_AX_DENIED defined');
    assert(WindowErrorCodes.WINDOW_NO_FRONTMOST === 'WINDOW_NO_FRONTMOST', 'WINDOW_NO_FRONTMOST defined');
    assert(WindowErrorCodes.WINDOW_ACTION_FAILED === 'WINDOW_ACTION_FAILED', 'WINDOW_ACTION_FAILED defined');
    assert(WindowErrorCodes.WINDOW_OUT_OF_BOUNDS === 'WINDOW_OUT_OF_BOUNDS', 'WINDOW_OUT_OF_BOUNDS defined');
    assert(WindowErrorCodes.WINDOW_INVALID_PAYLOAD === 'WINDOW_INVALID_PAYLOAD', 'WINDOW_INVALID_PAYLOAD defined');
    assert(WindowErrorCodes.WINDOW_HELPER_CRASHED === 'WINDOW_HELPER_CRASHED', 'WINDOW_HELPER_CRASHED defined');
    assert(WindowErrorCodes.WINDOW_HELPER_TIMEOUT === 'WINDOW_HELPER_TIMEOUT', 'WINDOW_HELPER_TIMEOUT defined');
    assert(WindowErrorCodes.WINDOW_HELPER_NOT_READY === 'WINDOW_HELPER_NOT_READY', 'WINDOW_HELPER_NOT_READY defined');
    assert(WindowErrorCodes.WINDOW_STOPPED === 'WINDOW_STOPPED', 'WINDOW_STOPPED defined');

    // ─── Action Timeouts ──────────────────────────────────────────────────
    console.log('\n── Action Timeouts ──');

    assert(ACTION_TIMEOUTS.focus === 3000, 'focus timeout is 3000ms');
    assert(ACTION_TIMEOUTS.minimize === 2000, 'minimize timeout is 2000ms');
    assert(ACTION_TIMEOUTS.maximize === 3000, 'maximize timeout is 3000ms');
    assert(ACTION_TIMEOUTS.close === 2000, 'close timeout is 2000ms');
    assert(ACTION_TIMEOUTS.move === 2000, 'move timeout is 2000ms');
    assert(ACTION_TIMEOUTS.resize === 2000, 'resize timeout is 2000ms');

    // ─── Executor State Machine ───────────────────────────────────────────
    console.log('\n── Executor State Machine ──');

    const exec1 = new WindowExecutor();

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

    const exec2 = new WindowExecutor();
    exec2.stop();

    await assertAsync(async () => {
        const result = await exec2.execute('window.minimize', {});
        return result.status === 'error' && result.errorCode === WindowErrorCodes.WINDOW_STOPPED;
    }, 'minimize while stopped returns WINDOW_STOPPED');

    await assertAsync(async () => {
        const result = await exec2.execute('window.maximize', {});
        return result.status === 'error' && result.errorCode === WindowErrorCodes.WINDOW_STOPPED;
    }, 'maximize while stopped returns WINDOW_STOPPED');

    await assertAsync(async () => {
        const result = await exec2.execute('window.close', {});
        return result.status === 'error' && result.errorCode === WindowErrorCodes.WINDOW_STOPPED;
    }, 'close while stopped returns WINDOW_STOPPED');

    await assertAsync(async () => {
        const result = await exec2.execute('window.move', { x: 0, y: 0 });
        return result.status === 'error' && result.errorCode === WindowErrorCodes.WINDOW_STOPPED;
    }, 'move while stopped returns WINDOW_STOPPED');

    await assertAsync(async () => {
        const result = await exec2.execute('window.resize', { width: 800, height: 600 });
        return result.status === 'error' && result.errorCode === WindowErrorCodes.WINDOW_STOPPED;
    }, 'resize while stopped returns WINDOW_STOPPED');

    await assertAsync(async () => {
        const result = await exec2.execute('window.focus.app', { app: 'Safari' });
        return result.status === 'error' && result.errorCode === WindowErrorCodes.WINDOW_STOPPED;
    }, 'focus while stopped returns WINDOW_STOPPED');

    exec2.restart();

    // ─── Unknown Intent ───────────────────────────────────────────────────
    console.log('\n── Unknown Intent ──');

    const exec3 = new WindowExecutor();

    await assertAsync(async () => {
        const result = await exec3.execute('window.teleport', { x: 0, y: 0 });
        return result.status === 'error' && result.errorCode === WindowErrorCodes.WINDOW_INVALID_PAYLOAD;
    }, 'unknown window intent returns WINDOW_INVALID_PAYLOAD');

    await assertAsync(async () => {
        const result = await exec3.execute('input.mouse.click', { x: 0, y: 0 });
        return result.status === 'error' && result.errorCode === WindowErrorCodes.WINDOW_INVALID_PAYLOAD;
    }, 'non-window intent returns WINDOW_INVALID_PAYLOAD');

    // ─── Helper Not Found (graceful failure) ──────────────────────────────
    console.log('\n── Helper Not Found ──');

    const exec4 = new WindowExecutor();

    await assertAsync(async () => {
        const result = await exec4.execute('window.minimize', {});
        // Whether binary is missing, AX denied, or no frontmost window,
        // we always get a structured error — never a crash.
        return result.status === 'error' && typeof result.errorCode === 'string' &&
            result.errorCode.startsWith('WINDOW_');
    }, 'execute gracefully returns structured WINDOW_* error (not crash)');

    // ─── Stop Emits Event ─────────────────────────────────────────────────
    console.log('\n── Events ──');

    const exec5 = new WindowExecutor();
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

    const exec6 = new WindowExecutor();
    exec6._restartCount = 3;

    await assertAsync(async () => {
        const result = await exec6.execute('window.move', { x: 0, y: 0 });
        return result.status === 'error' && result.errorCode === WindowErrorCodes.WINDOW_HELPER_CRASHED;
    }, 'execute after 3 crashes returns WINDOW_HELPER_CRASHED');

    // ─── Domain Schema Validation ─────────────────────────────────────────
    console.log('\n── Domain Schema Validation ──');

    const windowDomain = require('../src/policy/registry/domains/window');

    assert(windowDomain.name === 'window', 'domain name is "window"');
    assert(windowDomain.version === '0.1.0', 'domain version is 0.1.0');
    assert(windowDomain.domainPolicy.defaultRiskFloor === 'medium', 'risk floor is MEDIUM');
    assert(windowDomain.domainPolicy.maxRiskCeiling === 'high', 'risk ceiling is HIGH');

    // Validate focus.app schema
    const focusSchema = windowDomain.intents['focus.app'].schema;
    const focusValid = focusSchema.safeParse({ app: 'com.apple.Safari' });
    assert(focusValid.success === true, 'focus schema accepts bundle id');

    const focusName = focusSchema.safeParse({ app: 'Safari' });
    assert(focusName.success === true, 'focus schema accepts app name');

    const focusEmpty = focusSchema.safeParse({ app: '' });
    assert(focusEmpty.success === false, 'focus schema rejects empty app');

    const focusMissing = focusSchema.safeParse({});
    assert(focusMissing.success === false, 'focus schema rejects missing app');

    // Validate minimize schema
    const minimizeSchema = windowDomain.intents['minimize'].schema;
    const minimizeValid = minimizeSchema.safeParse({});
    assert(minimizeValid.success === true, 'minimize schema accepts empty (defaults to frontmost)');

    const minimizeExplicit = minimizeSchema.safeParse({ target: 'frontmost' });
    assert(minimizeExplicit.success === true, 'minimize schema accepts target=frontmost');

    // Validate maximize schema
    const maximizeSchema = windowDomain.intents['maximize'].schema;
    const maximizeValid = maximizeSchema.safeParse({});
    assert(maximizeValid.success === true, 'maximize schema accepts empty (defaults to frontmost)');

    // Validate close schema
    const closeSchema = windowDomain.intents['close'].schema;
    const closeValid = closeSchema.safeParse({});
    assert(closeValid.success === true, 'close schema accepts empty (defaults to frontmost)');
    assert(windowDomain.intents['close'].risk === 'high', 'close intent risk is HIGH');

    // Validate move schema — bounds rules
    console.log('\n── Move/Resize Bounds Rules ──');

    const moveSchema = windowDomain.intents['move'].schema;

    const moveValid = moveSchema.safeParse({ x: 100, y: 200 });
    assert(moveValid.success === true, 'move schema accepts { x: 100, y: 200 }');

    const moveNeg = moveSchema.safeParse({ x: -50, y: 200 });
    assert(moveNeg.success === true, 'move schema allows negative x (multi-monitor)');

    const moveMissingX = moveSchema.safeParse({ y: 200 });
    assert(moveMissingX.success === false, 'move schema rejects missing x');

    const moveMissingY = moveSchema.safeParse({ x: 100 });
    assert(moveMissingY.success === false, 'move schema rejects missing y');

    const moveFloat = moveSchema.safeParse({ x: 100.5, y: 200.5 });
    assert(moveFloat.success === false, 'move schema rejects float coordinates');

    // Validate resize schema — bounds rules
    const resizeSchema = windowDomain.intents['resize'].schema;

    const resizeValid = resizeSchema.safeParse({ width: 800, height: 600 });
    assert(resizeValid.success === true, 'resize schema accepts { width: 800, height: 600 }');

    const resizedTooSmallW = resizeSchema.safeParse({ width: 100, height: 600 });
    assert(resizedTooSmallW.success === false, 'resize schema rejects width < 200');

    const resizeTooSmallH = resizeSchema.safeParse({ width: 800, height: 100 });
    assert(resizeTooSmallH.success === false, 'resize schema rejects height < 200');

    const resizeTooLargeW = resizeSchema.safeParse({ width: 5000, height: 600 });
    assert(resizeTooLargeW.success === false, 'resize schema rejects width > 4000');

    const resizeTooLargeH = resizeSchema.safeParse({ width: 800, height: 4000 });
    assert(resizeTooLargeH.success === false, 'resize schema rejects height > 3000');

    const resizeMax = resizeSchema.safeParse({ width: 4000, height: 3000 });
    assert(resizeMax.success === true, 'resize schema accepts max bounds { 4000, 3000 }');

    const resizeMin = resizeSchema.safeParse({ width: 200, height: 200 });
    assert(resizeMin.success === true, 'resize schema accepts min bounds { 200, 200 }');

    const resizeFloat = resizeSchema.safeParse({ width: 800.5, height: 600 });
    assert(resizeFloat.success === false, 'resize schema rejects float width');

    const resizeMissing = resizeSchema.safeParse({ width: 800 });
    assert(resizeMissing.success === false, 'resize schema rejects missing height');

    // ─── Permission Check ─────────────────────────────────────────────────
    console.log('\n── Permission Integration ──');

    const { Permissions } = require('../src/policy/permissions');

    assert(Permissions['ui.window.focus'] !== undefined, 'ui.window.focus permission exists');
    assert(Permissions['ui.window.focus'].risk === 'medium', 'ui.window.focus is MEDIUM risk');

    assert(Permissions['ui.window.control'] !== undefined, 'ui.window.control permission exists');
    assert(Permissions['ui.window.control'].risk === 'high', 'ui.window.control is HIGH risk');
    assert(Permissions['ui.window.control'].confirmation === true, 'ui.window.control requires confirmation');

    // ─── Risk Alignment ───────────────────────────────────────────────────
    console.log('\n── Risk Alignment ──');

    // focus.app uses ui.window.focus (MEDIUM) and has risk MEDIUM — ok
    assert(windowDomain.intents['focus.app'].risk === 'medium', 'focus.app risk is MEDIUM');
    assert(windowDomain.intents['focus.app'].permissions.includes('ui.window.focus'), 'focus.app uses ui.window.focus');

    // minimize uses ui.window.control (HIGH) and has risk MEDIUM — intent ≤ permission — ok
    assert(windowDomain.intents['minimize'].risk === 'medium', 'minimize risk is MEDIUM');
    assert(windowDomain.intents['minimize'].permissions.includes('ui.window.control'), 'minimize uses ui.window.control');

    // close uses ui.window.control (HIGH) and has risk HIGH — ok
    assert(windowDomain.intents['close'].risk === 'high', 'close risk is HIGH');

    // move/resize use ui.window.control (HIGH) and have risk HIGH — ok
    assert(windowDomain.intents['move'].risk === 'high', 'move risk is HIGH');
    assert(windowDomain.intents['resize'].risk === 'high', 'resize risk is HIGH');

    // ─── Protocol Parsing (Malformed Input) ───────────────────────────────
    console.log('\n── Protocol Parsing ──');

    // Test the _handleResponse method
    const exec7 = new WindowExecutor();

    // Calling _handleResponse with invalid JSON should not throw
    let didThrow = false;
    try {
        exec7._handleResponse('not valid json at all {{{');
    } catch {
        didThrow = true;
    }
    assert(!didThrow, '_handleResponse does not throw on invalid JSON');

    // Orphaned response should not throw
    didThrow = false;
    try {
        exec7._handleResponse('{"id":"orphan-1234","ok":true,"message":"test"}');
    } catch {
        didThrow = true;
    }
    assert(!didThrow, '_handleResponse does not throw on orphaned response');

    // ─── Domain Policy Validation ─────────────────────────────────────────
    console.log('\n── Domain Policy Contracts ──');

    const policy = windowDomain.domainPolicy;
    assert(policy.allowedPermissions.includes('ui.window.focus'), 'policy allows ui.window.focus');
    assert(policy.allowedPermissions.includes('ui.window.control'), 'policy allows ui.window.control');
    assert(policy.allowedExecutors.includes('window'), 'policy allows window executor');
    assert(policy.forbidIntents.includes('shell.exec'), 'policy forbids shell.exec');
    assert(policy.reservedNamespaces.includes('system'), 'policy reserves system namespace');
    assert(policy.reservedNamespaces.includes('policy'), 'policy reserves policy namespace');
    assert(policy.reservedNamespaces.includes('security'), 'policy reserves security namespace');

    // ─── Registry Integration ─────────────────────────────────────────────
    console.log('\n── Registry Integration ──');

    // Load registry to verify intents register without violations
    let registryOk = true;
    let registryError = '';
    try {
        const registry = require('../src/policy/registry/index');
        assert(registry.get('window.focus.app') !== undefined, 'window.focus.app registered');
        assert(registry.get('window.minimize') !== undefined, 'window.minimize registered');
        assert(registry.get('window.maximize') !== undefined, 'window.maximize registered');
        assert(registry.get('window.close') !== undefined, 'window.close registered');
        assert(registry.get('window.move') !== undefined, 'window.move registered');
        assert(registry.get('window.resize') !== undefined, 'window.resize registered');
    } catch (e) {
        registryOk = false;
        registryError = e.message;
    }
    assert(registryOk, `Intents register without contract violations${registryError ? ': ' + registryError : ''}`);

    // ─── Fuzz: Malformed Payloads Don't Crash ─────────────────────────────
    console.log('\n── Fuzz: Malformed Payloads ──');

    const exec8 = new WindowExecutor();
    exec8._stopped = true; // Keep stopped so we test action mapping only

    const fuzzPayloads = [
        [null, null],
        [undefined, undefined],
        ['', {}],
        ['window.move', null],
        ['window.move', undefined],
        ['window.move', ''],
        ['window.move', 42],
        ['window.resize', { width: 'abc', height: 'xyz' }],
        ['window.focus.app', { app: 123 }],
        ['window.close', { target: 'notfrontmost' }],
        ['window.minimize', []],
        ['window.maximize', true],
    ];

    let fuzzCrashes = 0;
    for (const [intent, params] of fuzzPayloads) {
        try {
            await exec8.execute(intent, params);
        } catch {
            fuzzCrashes++;
        }
    }
    assert(fuzzCrashes === 0, `Fuzz: ${fuzzPayloads.length} malformed payloads — 0 crashes`);

    // ─── Summary ──────────────────────────────────────────────────────────
    console.log(`\n════════════════════════════════════════`);
    console.log(`  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`════════════════════════════════════════\n`);

    if (failed > 0) process.exit(1);
    else process.exit(0);
}

runTests().catch(err => {
    console.error('Test runner crashed:', err);
    process.exit(1);
});
