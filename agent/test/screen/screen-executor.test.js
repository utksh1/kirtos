














const path = require('path');
const os = require('os');
const assert = require('assert');




const ScreenExecutor = require('../../src/executor/screen');
const { PolicyEngine } = require('../../src/policy/engine');
const ContentGuard = require('../../src/policy/guard');
const Canonicalizer = require('../../src/policy/canonicalizer');
const IntentRegistry = require('../../src/policy/registry');

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

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}


const executor = ScreenExecutor;

console.log('\n═══════════════════════════════════════════');
console.log('  Screen Executor Test Suite');
console.log('═══════════════════════════════════════════\n');



console.log('── 1. Filename Hint Sanitization ──');

test('replaces unsafe characters from filename_hint with hyphens', () => {
  const filename = executor._buildFilename('my<>file|name?*', 'png');
  assert.ok(filename.includes('-'), 'should include hyphens');
  assert.ok(!filename.includes('<'), 'should not include <');
  assert.ok(filename.startsWith('my-file-name-'), 'should replace unsafe with -');
  assert.ok(filename.endsWith('.png'), 'should end with .png');
});

test('replaces path separators from filename_hint with hyphens', () => {
  const filename = executor._buildFilename('../../etc/passwd', 'png');
  assert.ok(!filename.includes('/'), 'should not include /');
  assert.ok(filename.includes('etc-passwd'), 'should replace separators with -');
});

test('collapses consecutive hyphens', () => {
  const filename = executor._buildFilename('my---cool---shot', 'png');
  assert.ok(filename.includes('my-cool-shot'), 'should collapse dashes');
  assert.ok(!filename.includes('--'), 'should not contain double dashes');
});

test('truncates hint to 40 characters after normalization', () => {
  const longHint = 'a'.repeat(100);
  const filename = executor._buildFilename(longHint, 'png');
  const parts = filename.split('-');
  assert.ok(parts[0].length <= 40, 'base should be max 40 chars');
});

test('uses "kirtos" prefix when hint is empty/null', () => {
  const fn1 = executor._buildFilename(null, 'png');
  assert.ok(fn1.startsWith('kirtos-'), 'null hint => kirtos prefix');

  const fn2 = executor._buildFilename('', 'png');
  assert.ok(fn2.startsWith('kirtos-'), 'empty hint => kirtos prefix');
});

test('uses "kirtos" prefix when hint is all unsafe chars', () => {
  const filename = executor._buildFilename('!@#$%^&*()', 'png');
  assert.ok(filename.startsWith('kirtos-'), 'all-unsafe hint => kirtos prefix');
});

test('respects format in extension', () => {
  const fn1 = executor._buildFilename('test', 'jpg');
  assert.ok(fn1.endsWith('.jpg'), 'jpg format => .jpg extension');

  const fn2 = executor._buildFilename('test', 'png');
  assert.ok(fn2.endsWith('.png'), 'png format => .png extension');
});

test('preserves underscores in hint', () => {
  const filename = executor._buildFilename('my_cool_shot', 'png');
  assert.ok(filename.startsWith('my_cool_shot-'), 'should preserve _');
});

test('uses YYYYMMDDTHHMMSS timestamp format', () => {
  const filename = executor._buildFilename('test', 'png');
  const parts = filename.split('-');
  const ts = parts[1].split('.')[0];
  assert.ok(/^\d{8}T\d{6}$/.test(ts), `Timestamp ${ts} should be YYYYMMDDTHHMMSS`);
});




console.log('\n── 2. Directory Path & Controlled Directory ──');

test('screenshot directory is under ~/Library/Application Support/Kirtos/screenshots', () => {
  const expected = path.join(os.homedir(), 'Library', 'Application Support', 'Kirtos', 'screenshots');
  assert.strictEqual(executor.SCREENSHOT_DIR, expected);
});




console.log('\n── 3. Path Traversal Prevention ──');

test('rejects path outside controlled directory', () => {
  assert.throws(() => {
    executor._validatePath('/tmp/malicious.png');
  }, /Path traversal detected/);
});

test('rejects parent directory traversal', () => {
  const traversal = path.join(executor.SCREENSHOT_DIR, '..', '..', 'evil.png');
  assert.throws(() => {
    executor._validatePath(traversal);
  }, /Path traversal detected/);
});

test('accepts path within controlled directory', () => {
  const validPath = path.join(executor.SCREENSHOT_DIR, 'test-123.png');

  executor._validatePath(validPath);
});




console.log('\n── 4. Command Argument Generation ──');

test('full mode generates correct args', () => {
  const args = executor._buildArgs('full', 'png', false, false, '/tmp/test.png');
  assert.ok(args.includes('-x'), 'should include -x (quiet)');
  assert.ok(args.includes('-t'), 'should include -t');
  assert.ok(args.includes('png'), 'should include format');
  assert.ok(!args.includes('-w'), 'should NOT include -w');
  assert.ok(!args.includes('-i'), 'should NOT include -i');
  assert.ok(!args.includes('-C'), 'should NOT include -C');
  assert.ok(!args.includes('-c'), 'should NOT include -c');
  assert.strictEqual(args[args.length - 1], '/tmp/test.png', 'path should be last');
});

test('window mode adds -w flag', () => {
  const args = executor._buildArgs('window', 'png', false, false, '/tmp/test.png');
  assert.ok(args.includes('-w'), 'should include -w');
  assert.ok(!args.includes('-i'), 'should NOT include -i');
});

test('interactive mode adds -i flag', () => {
  const args = executor._buildArgs('interactive', 'png', false, false, '/tmp/test.png');
  assert.ok(args.includes('-i'), 'should include -i');
  assert.ok(!args.includes('-w'), 'should NOT include -w');
});

test('include_cursor adds -C flag', () => {
  const args = executor._buildArgs('full', 'png', true, false, '/tmp/test.png');
  assert.ok(args.includes('-C'), 'should include -C');
});

test('copy_to_clipboard adds -c flag', () => {
  const args = executor._buildArgs('full', 'png', false, true, '/tmp/test.png');
  assert.ok(args.includes('-c'), 'should include -c');
});

test('jpg format is passed correctly', () => {
  const args = executor._buildArgs('full', 'jpg', false, false, '/tmp/test.jpg');
  const tIdx = args.indexOf('-t');
  assert.strictEqual(args[tIdx + 1], 'jpg', 'format after -t should be jpg');
});


// 5. Executor Error Handling (no crashes)

console.log('\n── 5. Executor Error Handling ──');

test('unsupported intent returns error (does not throw)', async () => {
  const result = await executor.execute('screen.nonexistent', {});
  assert.strictEqual(result.status, 'error');
  assert.strictEqual(result.errorCode, 'UNSUPPORTED_INTENT');
});

test('invalid mode returns SCREEN_INVALID_PARAMS', async () => {
  const result = await executor.execute('screen.screenshot', { mode: 'teleport' });
  assert.strictEqual(result.status, 'error');
  assert.strictEqual(result.errorCode, 'SCREEN_INVALID_PARAMS');
});

test('invalid format returns SCREEN_INVALID_PARAMS', async () => {
  const result = await executor.execute('screen.screenshot', { format: 'gif' });
  assert.strictEqual(result.status, 'error');
  assert.strictEqual(result.errorCode, 'SCREEN_INVALID_PARAMS');
});




console.log('\n── 6. Domain Registration ──');

test('screen.screenshot is registered in IntentRegistry', () => {
  const def = IntentRegistry.get('screen.screenshot');
  assert.ok(def, 'screen.screenshot should be registered');
  assert.strictEqual(def.risk, 'medium', 'risk should be medium');
  assert.strictEqual(def.runtime, 'screen', 'runtime should be screen');
  assert.deepStrictEqual(def.permissions, ['ui.screen.capture'], 'permissions should be [ui.screen.capture]');
});

test('screen domain is registered with version 0.1.0', () => {
  const def = IntentRegistry.get('screen.screenshot');
  assert.ok(def, 'should exist');
  assert.strictEqual(def.version, '0.1.0', 'version should be 0.1.0');
});




console.log('\n── 7. PolicyEngine Integration ──');

test('PolicyEngine evaluates screen.screenshot with valid params', () => {
  const decision = PolicyEngine.evaluate({
    intent: 'screen.screenshot',
    params: { mode: 'full', format: 'png' }
  }, 'test-session');

  assert.strictEqual(decision.allowed, true, 'should be allowed');
  assert.strictEqual(decision.runtime, 'screen', 'runtime should be screen');
  assert.ok(decision.capability_fingerprint, 'should have fingerprint');
});

test('PolicyEngine rejects invalid mode', () => {
  const decision = PolicyEngine.evaluate({
    intent: 'screen.screenshot',
    params: { mode: 'invalid_mode' }
  }, 'test-session');

  assert.strictEqual(decision.allowed, false, 'should be denied for invalid mode');
});




console.log('\n── 8. ContentGuard Integration ──');

test('ContentGuard flags path traversal in filename_hint', () => {
  const hazards = ContentGuard.scan({ filename_hint: '../../etc/passwd' });
  const traversal = hazards.find((h) => h.reasonCode === 'PATH_TRAVERSAL');
  assert.ok(traversal, 'should detect path traversal in filename_hint');
});

test('ContentGuard flags directory separator in filename_hint', () => {
  const hazards = ContentGuard.scan({ filename_hint: 'dir/file' });
  const traversal = hazards.find((h) => h.reasonCode === 'PATH_TRAVERSAL');
  assert.ok(traversal, 'should detect slash in filename_hint');
});

test('ContentGuard passes clean filename_hint', () => {
  const hazards = ContentGuard.scan({ filename_hint: 'my-screenshot_01' });
  const traversal = hazards.find((h) => h.reasonCode === 'PATH_TRAVERSAL');
  assert.ok(!traversal, 'should not flag clean filename');
});




console.log('\n── 9. Canonicalizer Integration ──');

test('Canonicalizer strips invisible chars from filename_hint', () => {
  const result = Canonicalizer.canonicalizeWithTrace({ filename_hint: 'test\u200Bfile' });
  assert.ok(!result.data.filename_hint.includes('\u200B'), 'should strip zero-width space');
  assert.ok(result.transformations.includes('STRIP_INVISIBLE'), 'should report STRIP_INVISIBLE');
});




console.log('\n── 10. Timeout Handling (Mocked Spawn) ──');

testAsync('executor times out after configured timeoutMs', async () => {

  const screenJsPath = require.resolve('../../src/executor/screen');
  delete require.cache[screenJsPath];

  const cp = require('node:child_process');
  const originalSpawn = cp.spawn;


  cp.spawn = function (cmd, args) {
    return {
      kill: function (sig) {this.killedWith = sig;},
      stderr: { on: function () {} },
      on: function () {} // never emits close or error
    };
  };

  const MockedScreenExecutor = require('../../src/executor/screen');

  let caughtError = null;
  try {

    await MockedScreenExecutor._runScreenCapture(['-x'], 10);
  } catch (err) {
    caughtError = err;
  } finally {

    cp.spawn = originalSpawn;
    delete require.cache[screenJsPath];
  }

  assert.ok(caughtError, 'should throw an error on timeout');
  assert.strictEqual(caughtError.code, 'SCREEN_CAPTURE_TIMEOUT', 'error code should be SCREEN_CAPTURE_TIMEOUT');
  assert.ok(caughtError.message.includes('10ms'), 'error message should mention timeout duration');
});

testAsync('non-zero exit triggers SCREEN_CAPTURE_FAILED', async () => {
  const screenJsPath = require.resolve('../../src/executor/screen');
  delete require.cache[screenJsPath];

  const cp = require('node:child_process');
  const originalSpawn = cp.spawn;

  cp.spawn = function () {
    return {
      kill: () => {},
      stderr: { on: (event, cb) => {if (event === 'data') cb('some error');} },
      on: (event, cb) => {if (event === 'close') cb(1);}
    };
  };

  const MockedScreenExecutor = require('../../src/executor/screen');
  let caughtError = null;
  try {
    await MockedScreenExecutor._runScreenCapture(['-x'], 1000);
  } catch (err) {
    caughtError = err;
  } finally {
    cp.spawn = originalSpawn;
    delete require.cache[screenJsPath];
  }

  assert.ok(caughtError, 'should throw an error on non-zero exit');
  assert.strictEqual(caughtError.code, 'SCREEN_CAPTURE_FAILED', 'error code should be SCREEN_CAPTURE_FAILED');
  assert.ok(caughtError.message.includes('some error'), 'error message should contain stderr');
});

testAsync('permission denied stderr triggers SCREEN_PERMISSION_DENIED', async () => {
  const screenJsPath = require.resolve('../../src/executor/screen');
  delete require.cache[screenJsPath];

  const cp = require('node:child_process');
  const originalSpawn = cp.spawn;

  cp.spawn = function () {
    return {
      kill: () => {},
      stderr: { on: (event, cb) => {if (event === 'data') cb('Screen Recording is not permitted');} },
      on: (event, cb) => {if (event === 'close') cb(1);}
    };
  };

  const MockedScreenExecutor = require('../../src/executor/screen');
  let caughtError = null;
  try {
    await MockedScreenExecutor._runScreenCapture(['-x'], 1000);
  } catch (err) {
    caughtError = err;
  } finally {
    cp.spawn = originalSpawn;
    delete require.cache[screenJsPath];
  }

  assert.ok(caughtError, 'should throw on permission denied');
  assert.strictEqual(caughtError.code, 'SCREEN_PERMISSION_DENIED', 'code should be SCREEN_PERMISSION_DENIED');
  assert.ok(caughtError.message.includes('Privacy & Security'), 'message should contain help instructions');
});




async function finish() {
  console.log('\n═══════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}


setTimeout(finish, 100);