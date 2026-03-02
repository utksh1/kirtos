/**
 * Unit tests for UIExecutor internals.
 * Run: node test/ui-executor.test.js
 */
const {
    UIErrorCodes,
    escapeAppleScriptString,
    validateAppName,
    parseShortcutCombo,
    BLOCKED_COMBOS
} = require('../src/executor/ui');

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

// ─── escapeAppleScriptString ───────────────────────────────────────────────────
console.log('\n── escapeAppleScriptString ──');

assert(escapeAppleScriptString('hello') === 'hello', 'plain string unchanged');
assert(escapeAppleScriptString('say "hi"') === 'say \\"hi\\"', 'escapes double quotes');
assert(escapeAppleScriptString('path\\to') === 'path\\\\to', 'escapes backslashes');
assert(escapeAppleScriptString('a"b\\c') === 'a\\"b\\\\c', 'escapes both quotes and backslashes');
assert(escapeAppleScriptString('') === '', 'handles empty string');

// ─── validateAppName ───────────────────────────────────────────────────────────
console.log('\n── validateAppName ──');

assert(validateAppName('Safari').ok === true, 'accepts "Safari"');
assert(validateAppName('Visual Studio Code').ok === true, 'accepts spaces');
assert(validateAppName('Xcode-15.2').ok === true, 'accepts dashes and dots');
assert(validateAppName('My_App').ok === true, 'accepts underscores');

assert(validateAppName('').ok === false, 'rejects empty string');
assert(validateAppName('A'.repeat(81)).ok === false, 'rejects over 80 chars');
assert(validateAppName('Safari";exit').ok === false, 'rejects double quote + semicolon');
assert(validateAppName('App<script>').ok === false, 'rejects angle brackets');
assert(validateAppName('App|pipe').ok === false, 'rejects pipe character');
assert(validateAppName('App&bg').ok === false, 'rejects ampersand');
assert(validateAppName('App`tick`').ok === false, 'rejects backtick');
assert(validateAppName('App$var').ok === false, 'rejects dollar sign');
assert(validateAppName('App(paren)').ok === false, 'rejects parentheses');

const invalidResult = validateAppName('bad"app');
assert(invalidResult.errorCode === UIErrorCodes.UI_INVALID_APP_NAME, 'returns correct error code');

// ─── parseShortcutCombo ────────────────────────────────────────────────────────
console.log('\n── parseShortcutCombo (valid combos) ──');

const cmdL = parseShortcutCombo('CMD+L');
assert(cmdL.ok === true, 'CMD+L is valid');
assert(cmdL.keyChar === 'l', 'CMD+L key is "l"');
assert(cmdL.modifiersAppleScript.includes('command down'), 'CMD maps to "command down"');

const cmdShiftT = parseShortcutCombo('CMD+SHIFT+T');
assert(cmdShiftT.ok === true, 'CMD+SHIFT+T is valid');
assert(cmdShiftT.keyChar === 't', 'CMD+SHIFT+T key is "t"');
assert(cmdShiftT.modifiersAppleScript.length === 2, 'CMD+SHIFT+T has 2 modifiers');

const ctrlC = parseShortcutCombo('CTRL+C');
assert(ctrlC.ok === true, 'CTRL+C is valid');
assert(ctrlC.modifiersAppleScript.includes('control down'), 'CTRL maps to "control down"');

const optionA = parseShortcutCombo('OPTION+A');
assert(optionA.ok === true, 'OPTION+A is valid');
assert(optionA.modifiersAppleScript.includes('option down'), 'OPTION maps to "option down"');

const justL = parseShortcutCombo('L');
assert(justL.ok === true, 'bare key "L" is valid (no modifiers)');
assert(justL.modifiersAppleScript.length === 0, 'no modifiers for bare key');

console.log('\n── parseShortcutCombo (invalid combos) ──');

const tooMany = parseShortcutCombo('CMD+SHIFT+CTRL+OPTION+L');
assert(tooMany.ok === false, 'rejects 4 modifiers');
assert(tooMany.errorCode === UIErrorCodes.UI_INVALID_SHORTCUT, 'correct error code for too many modifiers');

const multiKey = parseShortcutCombo('CMD+AB');
assert(multiKey.ok === false, 'rejects multi-character key "AB"');

const noKey = parseShortcutCombo('CMD+');
assert(noKey.ok === false, 'rejects trailing +');

const badModifier = parseShortcutCombo('META+L');
assert(badModifier.ok === false, 'rejects unknown modifier "META"');

const specialKey = parseShortcutCombo('CMD+ENTER');
assert(specialKey.ok === false, 'rejects special key name "ENTER" (use ui.key.press instead)');

console.log('\n── parseShortcutCombo (blocked combos) ──');

const cmdQ = parseShortcutCombo('CMD+Q');
assert(cmdQ.ok === false, 'CMD+Q is blocked');
assert(cmdQ.errorCode === UIErrorCodes.UI_BLOCKED_SHORTCUT, 'CMD+Q returns UI_BLOCKED_SHORTCUT');

const cmdW = parseShortcutCombo('CMD+W');
assert(cmdW.ok === false, 'CMD+W is blocked');
assert(cmdW.errorCode === UIErrorCodes.UI_BLOCKED_SHORTCUT, 'CMD+W returns UI_BLOCKED_SHORTCUT');

const cmdOptEsc = parseShortcutCombo('CMD+OPTION+ESCAPE');
// ESCAPE is multi-char so it fails as invalid shortcut (not a single char key)
assert(cmdOptEsc.ok === false, 'CMD+OPTION+ESCAPE is rejected');

// ─── BLOCKED_COMBOS set ────────────────────────────────────────────────────────
console.log('\n── BLOCKED_COMBOS Set ──');

assert(BLOCKED_COMBOS.has('CMD+Q'), 'CMD+Q in blocked set');
assert(BLOCKED_COMBOS.has('CMD+W'), 'CMD+W in blocked set');
assert(BLOCKED_COMBOS.has('CMD+OPTION+ESCAPE'), 'CMD+OPTION+ESCAPE in blocked set');
assert(BLOCKED_COMBOS.has('CMD+OPTION+ESC'), 'CMD+OPTION+ESC in blocked set');
assert(!BLOCKED_COMBOS.has('CMD+L'), 'CMD+L is NOT blocked');

// ─── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n════════════════════════════════════════`);
console.log(`  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`════════════════════════════════════════\n`);

if (failed > 0) process.exit(1);
