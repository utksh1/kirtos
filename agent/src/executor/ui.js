const { spawn } = require('node:child_process');

// ─── Error Codes ───────────────────────────────────────────────────────────────
const UIErrorCodes = {
    UI_APPLESCRIPT_FAILED: 'UI_APPLESCRIPT_FAILED',
    UI_APPLESCRIPT_TIMEOUT: 'UI_APPLESCRIPT_TIMEOUT',
    UI_INVALID_APP_NAME: 'UI_INVALID_APP_NAME',
    UI_INVALID_SHORTCUT: 'UI_INVALID_SHORTCUT',
    UI_INVALID_KEY: 'UI_INVALID_KEY',
    UI_TEXT_TOO_LONG: 'UI_TEXT_TOO_LONG',
    UI_BLOCKED_SHORTCUT: 'UI_BLOCKED_SHORTCUT',
};

// ─── Blocked Shortcut Combos ───────────────────────────────────────────────────
const BLOCKED_COMBOS = new Set([
    'CMD+Q',
    'CMD+W',
    'CMD+OPTION+ESCAPE',
    'CMD+OPTION+ESC',
]);

// ─── Key Code Map (macOS virtual key codes) ────────────────────────────────────
const KEY_CODES = {
    'ENTER': 36,
    'RETURN': 36,
    'ESCAPE': 53,
    'TAB': 48,
    'SPACE': 49,
    'BACKSPACE': 51,
    'DELETE': 117,
    'UP': 126,
    'DOWN': 125,
    'LEFT': 123,
    'RIGHT': 124,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Escapes a string for safe embedding inside AppleScript double quotes.
 * Handles backslashes and double quotes.
 */
function escapeAppleScriptString(text) {
    return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Validates an application name is safe to embed in AppleScript.
 * Allows: letters (any script), numbers, spaces, dots, underscores, dashes.
 * Max length: 80.
 */
function validateAppName(app) {
    if (!app || app.length > 80) {
        return { ok: false, errorCode: UIErrorCodes.UI_INVALID_APP_NAME, message: 'App name must be 1-80 characters.' };
    }
    // Reject anything that could break out of an AppleScript string literal
    if (/[";\\<>|&`$()]/.test(app)) {
        return { ok: false, errorCode: UIErrorCodes.UI_INVALID_APP_NAME, message: `App name contains forbidden characters: ${app}` };
    }
    return { ok: true };
}

/**
 * Parses a shortcut combo string (e.g., "CMD+SHIFT+T") into components.
 * Returns { ok, keyChar, modifiersAppleScript } or { ok: false, errorCode, message }.
 */
function parseShortcutCombo(combo) {
    const parts = combo.toUpperCase().split('+');
    if (parts.length < 1) {
        return { ok: false, errorCode: UIErrorCodes.UI_INVALID_SHORTCUT, message: 'Empty combo.' };
    }

    const modifierParts = parts.slice(0, -1);
    const keyChar = parts[parts.length - 1];

    // Validate modifiers
    const MODIFIER_MAP = {
        'CMD': 'command down', 'COMMAND': 'command down',
        'CTRL': 'control down', 'CONTROL': 'control down',
        'ALT': 'option down', 'OPTION': 'option down',
        'SHIFT': 'shift down',
    };

    if (modifierParts.length > 3) {
        return { ok: false, errorCode: UIErrorCodes.UI_INVALID_SHORTCUT, message: 'Max 3 modifiers allowed.' };
    }

    const modifiersAppleScript = [];
    for (const m of modifierParts) {
        const mapped = MODIFIER_MAP[m];
        if (!mapped) {
            return { ok: false, errorCode: UIErrorCodes.UI_INVALID_SHORTCUT, message: `Unknown modifier: ${m}` };
        }
        modifiersAppleScript.push(mapped);
    }

    // Key must be exactly one printable character
    if (!keyChar || keyChar.length !== 1) {
        return { ok: false, errorCode: UIErrorCodes.UI_INVALID_SHORTCUT, message: `Key must be a single character, got: "${keyChar}". Use ui.key.press for special keys.` };
    }

    // Check blocked combos
    const normalizedCombo = combo.toUpperCase().replace(/COMMAND/g, 'CMD').replace(/ALT/g, 'OPTION');
    if (BLOCKED_COMBOS.has(normalizedCombo)) {
        return { ok: false, errorCode: UIErrorCodes.UI_BLOCKED_SHORTCUT, message: `Shortcut ${combo} is blocked for safety. Requires explicit policy override.` };
    }

    return { ok: true, keyChar: keyChar.toLowerCase(), modifiersAppleScript };
}

/**
 * Builds an AppleScript `using {...}` clause from an array of AppleScript modifier strings.
 */
function buildModifiersClause(modifiersAppleScript) {
    if (!modifiersAppleScript || modifiersAppleScript.length === 0) return '';
    return `using {${modifiersAppleScript.join(', ')}}`;
}


// ─── UIExecutor Class ──────────────────────────────────────────────────────────

/**
 * UIExecutor: Handles secure macOS UI automation via AppleScript (Phase 1 MVP).
 *
 * Invariants:
 *   - Only invoked AFTER PolicyEngine ALLOW decision (I1).
 *   - Input is already canonicalized (I2).
 *   - ContentGuard has already scanned params (I3).
 *   - No raw shell execution — only osascript for AppleScript.
 */
class UIExecutor {
    constructor() {
        this.lastExecutionTime = 0;
        this.COOLDOWN_MS = 500; // Minimum ms between executions
    }

    async execute(intent, params) {
        // Enforce executor-level rate limiting
        const now = Date.now();
        const timeSinceLast = now - this.lastExecutionTime;
        if (timeSinceLast < this.COOLDOWN_MS) {
            await new Promise(resolve => setTimeout(resolve, this.COOLDOWN_MS - timeSinceLast));
        }
        this.lastExecutionTime = Date.now();

        try {
            switch (intent) {
                case 'ui.focus.app':
                    return await this._focusApp(params);
                case 'ui.keyboard.shortcut':
                    return await this._sendShortcut(params);
                case 'ui.type.text':
                    return await this._typeText(params);
                case 'ui.key.press':
                    return await this._pressKey(params);
                default:
                    return { status: 'error', errorCode: 'UNSUPPORTED_INTENT', message: `UIExecutor: Unknown intent "${intent}"` };
            }
        } catch (error) {
            return {
                status: 'error',
                errorCode: error.code || UIErrorCodes.UI_APPLESCRIPT_FAILED,
                message: error.message
            };
        }
    }

    // ─── Core Operations ───────────────────────────────────────────────────

    /**
     * ui.focus.app — Bring an application to the foreground.
     */
    async _focusApp(params) {
        const validation = validateAppName(params.app);
        if (!validation.ok) return { status: 'error', ...validation };

        const safeApp = escapeAppleScriptString(params.app);
        const script = `tell application "${safeApp}" to activate`;
        await this._runAppleScript(script);
        return { status: 'success', message: `Focused ${params.app}` };
    }

    /**
     * ui.keyboard.shortcut — Send a keyboard shortcut combo.
     */
    async _sendShortcut(params) {
        const parsed = parseShortcutCombo(params.combo);
        if (!parsed.ok) return { status: 'error', errorCode: parsed.errorCode, message: parsed.message };

        const modifiersClause = buildModifiersClause(parsed.modifiersAppleScript);
        const script = `
            tell application "System Events"
                keystroke "${parsed.keyChar}" ${modifiersClause}
            end tell
        `;
        await this._runAppleScript(script);
        return { status: 'success', message: `Executed shortcut: ${params.combo}` };
    }

    /**
     * ui.type.text — Type text into the active application.
     */
    async _typeText(params) {
        if (params.text.length > 200) {
            return { status: 'error', errorCode: UIErrorCodes.UI_TEXT_TOO_LONG, message: 'Text exceeds maximum length of 200 characters.' };
        }

        const safe = escapeAppleScriptString(params.text);
        let script;

        if (params.method === 'paste') {
            // Clipboard paste: set clipboard, CMD+V, small delay for reliability.
            // Note: original clipboard content is NOT restored (documented trade-off).
            script = `
                set the clipboard to "${safe}"
                delay 0.1
                tell application "System Events" to keystroke "v" using command down
            `;
        } else {
            script = `
                tell application "System Events"
                    keystroke "${safe}"
                end tell
            `;
        }

        await this._runAppleScript(script);
        return { status: 'success', message: 'Text typed successfully' };
    }

    /**
     * ui.key.press — Press a single special key, optionally with modifiers.
     */
    async _pressKey(params) {
        const key = params.key.toUpperCase();
        const keyCode = KEY_CODES[key];

        if (keyCode === undefined) {
            return { status: 'error', errorCode: UIErrorCodes.UI_INVALID_KEY, message: `Unknown key: ${key}` };
        }

        // Build modifier clause from optional modifiers array
        const MODIFIER_MAP = {
            'CMD': 'command down', 'SHIFT': 'shift down',
            'CTRL': 'control down', 'OPTION': 'option down',
        };
        const modifiers = (params.modifiers || []).map(m => MODIFIER_MAP[m.toUpperCase()]).filter(Boolean);
        const modifiersClause = buildModifiersClause(modifiers);

        const script = `tell application "System Events" to key code ${keyCode} ${modifiersClause}`;
        await this._runAppleScript(script);
        return { status: 'success', message: `Pressed key: ${key}${modifiers.length > 0 ? ` with ${params.modifiers.join('+')}` : ''}` };
    }

    // ─── AppleScript Runner ────────────────────────────────────────────────

    /**
     * Executes an AppleScript string via osascript with a hard timeout.
     * Returns stdout on success, throws structured error on failure.
     */
    _runAppleScript(script, { timeoutMs = 3000 } = {}) {
        return new Promise((resolve, reject) => {
            const p = spawn('osascript', ['-e', script]);

            let out = '';
            let err = '';
            const t = setTimeout(() => {
                p.kill('SIGKILL');
                const error = new Error('AppleScript timeout (max 3s)');
                error.code = UIErrorCodes.UI_APPLESCRIPT_TIMEOUT;
                reject(error);
            }, timeoutMs);

            p.stdout.on('data', d => (out += d.toString()));
            p.stderr.on('data', d => (err += d.toString()));

            p.on('close', code => {
                clearTimeout(t);
                if (code === 0) {
                    resolve(out.trim());
                } else {
                    const msg = err.trim();
                    const error = new Error(
                        msg.includes('not allowed to send Apple events')
                            ? 'Accessibility permission denied. Grant access in System Settings > Privacy > Accessibility.'
                            : msg.includes('proc not found')
                                ? 'Application not found'
                                : msg || `osascript failed (exit ${code})`
                    );
                    error.code = UIErrorCodes.UI_APPLESCRIPT_FAILED;
                    reject(error);
                }
            });
        });
    }
}

// ─── Exports ───────────────────────────────────────────────────────────────────
module.exports = new UIExecutor();

// Export internals for unit testing
module.exports.UIErrorCodes = UIErrorCodes;
module.exports.escapeAppleScriptString = escapeAppleScriptString;
module.exports.validateAppName = validateAppName;
module.exports.parseShortcutCombo = parseShortcutCombo;
module.exports.BLOCKED_COMBOS = BLOCKED_COMBOS;
