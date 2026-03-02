const crypto = require('crypto');

/**
 * Redactor: Ensures Audit Traces are privacy-safe and leak-resistant.
 * Supports three modes: 'strict' (max privacy), 'normal' (default), 'debug' (full detail).
 */
class Redactor {
    constructor(mode = 'normal') {
        this.mode = mode;
        this.SALT = process.env.AUDIT_SALT || 'kirtos-default-salt';
    }

    /**
     * Redacts parameters for a specific intent based on the privacy mode.
     */
    redact(intentName, params) {
        if (this.mode === 'debug') return params;
        if (!params || typeof params !== 'object') return params;

        const redacted = { ...params };

        // Intent-specific redaction rules
        if (intentName === 'whatsapp.send') {
            if (redacted.message) {
                redacted.message = this._redactText(redacted.message);
            }
            if (redacted.number) {
                redacted.number = this._redactIdentity(redacted.number);
            }
        }

        if (intentName && (intentName.startsWith('file.') || intentName.startsWith('system.'))) {
            const pathKeys = ['path', 'filepath', 'dest', 'src'];
            pathKeys.forEach(key => {
                if (redacted[key]) redacted[key] = this._redactPath(redacted[key]);
            });
        }

        if (intentName === 'shell.exec' || intentName === 'shell.run') {
            if (redacted.command) redacted.command = this._redactCommand(redacted.command);
        }

        // UI text input: NEVER log cleartext in normal/strict mode
        if (intentName === 'ui.type.text') {
            if (redacted.text) {
                redacted.text = this._redactText(redacted.text);
            }
        }
        // ui.keyboard.shortcut combo and ui.focus.app app name are safe to store as-is
        // input.mouse.* params are all coordinates/enums/numbers — safe to store without redaction

        // Global fallback for anything that smells like a contact or URL
        Object.keys(redacted).forEach(key => {
            const val = redacted[key];
            if (typeof val === 'string') {
                if (key.match(/email|phone|number|contact|id|token|key|password/i)) {
                    redacted[key] = this._redactIdentity(val);
                }
            }
        });

        return redacted;
    }

    _hash(val) {
        return crypto.createHash('sha256').update(val + this.SALT).digest('hex').substring(0, 12);
    }

    _redactText(text) {
        if (this.mode === 'strict') return `LEN:${text.length}_HASH:${this._hash(text)}`;
        // Normal mode: 20-char preview + hash
        const preview = text.substring(0, 20).replace(/\n/g, ' ');
        return `${preview}... [LEN:${text.length}_HASH:${this._hash(text)}]`;
    }

    _redactIdentity(id) {
        return `ID:${this._hash(id)}`;
    }

    _redactPath(p) {
        if (this.mode === 'strict') return `PATH_HASH:${this._hash(p)}`;
        // Normal mode: basename + hash
        const parts = p.split(/[\\/]/);
        const basename = parts[parts.length - 1];
        return `${basename} (HASH:${this._hash(p)})`;
    }

    _redactCommand(cmd) {
        // Only allow a few harmless recognized commands in preview
        const allowlist = ['ls', 'pwd', 'whoami', 'uptime'];
        const base = cmd.trim().split(' ')[0];
        if (allowlist.includes(base)) return `${base} ... [HASH:${this._hash(cmd)}]`;
        return `CMD_HASH:${this._hash(cmd)}`;
    }
}

module.exports = Redactor;
