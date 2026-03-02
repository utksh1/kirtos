/**
 * ContentGuard: Scans intent parameters for "Payload-in-Text" attacks.
 */
class ContentGuard {
    constructor() {
        this.CONTEXT_RULES = {
            url: [
                { regex: /^(javascript:|data:|file:)/i, severity: 'critical', reasonCode: 'XSS_PROTOCOL', label: 'dangerous URL protocol' },
                { regex: /<script/i, severity: 'critical', reasonCode: 'XSS_INJECTION', label: 'script tag in URL' }
            ],
            command: [
                { regex: /(rm\s+-rf\s+\/)|(sudo\s+rm)|(mkfs)|(dd\s+if=\/dev\/zero)/i, severity: 'critical', reasonCode: 'SHELL_DESTRUCTIVE', label: 'destructive shell command' },
                { regex: /(curl\s+.*?\s*\|\s*bash)|(wget\s+.*?\s*\|\s*sh)/i, severity: 'critical', reasonCode: 'SHELL_RCE', label: 'remote code execution pattern' }
            ],
            path: [
                { regex: /\.\.\//, severity: 'high', reasonCode: 'PATH_TRAVERSAL', label: 'path traversal attempt' },
                { regex: /(\/etc\/passwd)|(\/\.ssh\/)|(\/config\/)/i, severity: 'critical', reasonCode: 'SENSITIVE_PATH', label: 'access to sensitive system path' }
            ],
            text: [
                { regex: /(ignore\s+all\s+previous\s+instructions)|(system\s+prompt\s+is)|(you\s+are\s+now\s+in\s+admin\s+mode)/i, severity: 'medium', reasonCode: 'PROMPT_INJECTION', label: 'potential prompt injection' }
            ],
            message: [
                { regex: /(ignore\s+all\s+previous\s+instructions)/i, severity: 'medium', reasonCode: 'PROMPT_INJECTION', label: 'potential prompt injection (message)' },
                { regex: /(rm\s+-rf\s+\/)|(sudo\s+rm)|(mkfs)/i, severity: 'medium', reasonCode: 'SHELL_JOKE', label: 'destructive shell command in message' }
            ],
            keys: [
                { regex: /(CMD|COMMAND)\+Q/i, severity: 'high', reasonCode: 'UI_QUIT', label: 'Application Quit Shortcut' },
                { regex: /(CMD|COMMAND)\+W/i, severity: 'medium', reasonCode: 'UI_CLOSE', label: 'Window/Tab Close Shortcut' },
                { regex: /(CMD|COMMAND)\+(OPTION|ALT)\+ESC/i, severity: 'high', reasonCode: 'UI_DESTRUCTIVE', label: 'Force Quit Shortcut' }
            ],
            combo: [
                { regex: /(CMD|COMMAND)\+Q/i, severity: 'high', reasonCode: 'UI_QUIT', label: 'Application Quit Shortcut' },
                { regex: /(CMD|COMMAND)\+W/i, severity: 'medium', reasonCode: 'UI_CLOSE', label: 'Window/Tab Close Shortcut' },
                { regex: /(CMD|COMMAND)\+(OPTION|ALT)\+ESC/i, severity: 'high', reasonCode: 'UI_DESTRUCTIVE', label: 'Force Quit Shortcut' }
            ],
            filename_hint: [
                { regex: /\.\./, severity: 'high', reasonCode: 'PATH_TRAVERSAL', label: 'path traversal attempt in filename' },
                { regex: /[\/\\]/, severity: 'high', reasonCode: 'PATH_TRAVERSAL', label: 'directory separator in filename' }
            ]
        };

        this.GLOBAL_RULES = [
            { regex: /(<\s*script.*?>)|(onerror\s*=)|(onclick\s*=)/i, severity: 'high', reasonCode: 'XSS_INJECTION', label: 'HTML/JS injection' },
            { regex: /(rm\s+-rf\s+\/)|(sudo\s+rm)|(mkfs)/i, severity: 'high', reasonCode: 'SHELL_PAYLOAD', label: 'shell payload in non-shell field' }
        ];

        // Multi-signal scoring logic (combinations that elevate risk)
        this.MULTI_SIGNAL_RULES = [
            {
                signals: [/\bcurl\b/i, /\|\s*(bash|sh|zsh)/i],
                severity: 'critical',
                reasonCode: 'SHELL_RCE_COMBO',
                label: 'Combined curl + shell pipe'
            }
        ];

        // Hard refusals: These codes bypass confirmation and always deny.
        this.STRICT_REFUSE_CODES = ['XSS_PROTOCOL', 'SENSITIVE_PATH'];
    }


    scan(params) {
        const hazards = [];
        if (!params || typeof params !== 'object') return hazards;

        const scanValue = (val, key = null) => {
            // Convert arrays (like 'keys') to strings for regex matching
            const checkVal = Array.isArray(val) ? val.join('+') : val;

            if (typeof checkVal === 'string') {
                // 1. Contextual Rules
                if (key && this.CONTEXT_RULES[key]) {
                    for (const rule of this.CONTEXT_RULES[key]) {
                        if (rule.regex.test(checkVal)) hazards.push(this._formatHazard(rule, checkVal));
                    }
                }

                // UI 'text' secret scanning
                if (key === 'text' && (checkVal.match(/sk-[a-zA-Z0-9]{32}/) || checkVal.match(/AIza[a-zA-Z0-9_-]{35}/))) {
                    hazards.push({ severity: 'HIGH', reasonCode: 'PII_LEAK', pattern: 'Potential API Key', evidence: checkVal.substring(0, 10) });
                }

                // 2. Global Rules
                for (const rule of this.GLOBAL_RULES) {
                    if (rule.regex.test(checkVal)) hazards.push(this._formatHazard(rule, checkVal));
                }

                // 3. Multi-signal Rules
                for (const rule of this.MULTI_SIGNAL_RULES) {
                    const allMatched = rule.signals.every(regex => regex.test(checkVal));
                    if (allMatched) {
                        hazards.push(this._formatHazard(rule, checkVal));
                    }
                }
            } else if (typeof val === 'object' && val !== null) {
                Object.entries(val).forEach(([childKey, childVal]) => scanValue(childVal, childKey));
            }
        };

        scanValue(params);
        return hazards;
    }

    _formatHazard(rule, value) {
        return {
            severity: rule.severity,
            reasonCode: rule.reasonCode,
            pattern: rule.label,
            evidence: value.substring(0, 60) + (value.length > 60 ? '...' : '')
        };
    }
}

module.exports = new ContentGuard();
