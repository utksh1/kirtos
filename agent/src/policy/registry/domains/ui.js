const { z } = require('zod');

/**
 * UI Domain Configuration (Phase 1 MVP)
 * Enables secure macOS keyboard automation and application focus control.
 * No mouse / pointer / screen capture in this phase.
 */

const ALLOWED_MODIFIERS = ['CMD', 'SHIFT', 'CTRL', 'OPTION'];

module.exports = {
    name: 'ui',
    version: '0.1.0',
    domainPolicy: {
        defaultRiskFloor: 'medium',
        maxRiskCeiling: 'high',
        allowedPermissions: [
            'ui.window.focus',
            'ui.input.send'
        ],
        allowedExecutors: ['ui'],
        forbidIntents: ['shell.exec'],
        reservedNamespaces: ['system', 'policy', 'security']
    },
    intents: {
        /**
         * ui.focus.app — Bring a macOS application to the foreground.
         * Risk: MEDIUM (no keystrokes sent, just window activation).
         */
        'focus.app': {
            description: 'Bring a macOS application to the foreground',
            risk: 'medium',
            runtime: 'ui',
            permissions: ['ui.window.focus'],
            schema: z.object({
                app: z.string().min(1).max(80)
                    .describe('Name of macOS app to bring to foreground (e.g., "Safari")')
            })
        },

        /**
         * ui.keyboard.shortcut — Send a keyboard shortcut combo.
         * Risk: HIGH. Key must be a single printable character (A-Z, 0-9, punctuation).
         * Special keys (Enter, Escape, etc.) must use ui.key.press instead.
         */
        'keyboard.shortcut': {
            description: 'Send a keyboard shortcut combo to the active application',
            risk: 'high',
            runtime: 'ui',
            permissions: ['ui.input.send'],
            schema: z.object({
                combo: z.string()
                    .describe('Shortcut format: CMD+L, CMD+SHIFT+T, etc.')
                    .refine(val => {
                        const parts = val.toUpperCase().split('+');
                        if (parts.length < 1) return false;

                        const modifiers = parts.slice(0, -1);
                        const key = parts[parts.length - 1];

                        // Max 3 modifiers, all from allowlist
                        if (modifiers.length > 3) return false;
                        if (!modifiers.every(m => ALLOWED_MODIFIERS.includes(m))) return false;

                        // Key must be a single printable character (not a special key name)
                        if (!key || key.length !== 1) return false;
                        if (!/^[A-Z0-9\-=\[\]\\;',./`]$/i.test(key)) return false;

                        return true;
                    }, {
                        message: 'Invalid shortcut. Use format like CMD+L. ' +
                            'Max 3 modifiers (CMD, SHIFT, CTRL, OPTION). ' +
                            'Key must be a single printable character. ' +
                            'For special keys (Enter, Escape) use ui.key.press.'
                    })
            })
        },

        /**
         * ui.type.text — Send text input to the active application.
         * Risk: HIGH. Max 200 characters enforced at schema and executor level.
         */
        'type.text': {
            description: 'Send text input to the active application',
            risk: 'high',
            runtime: 'ui',
            permissions: ['ui.input.send'],
            schema: z.object({
                text: z.string().min(1).max(200)
                    .describe('Text to type (max 200 characters)'),
                method: z.enum(['keystroke', 'paste']).default('keystroke')
                    .describe('Typing method: keystroke simulates key presses, paste uses clipboard')
            })
        },

        /**
         * ui.key.press — Send a single special key press.
         * Risk: HIGH. Restricted to a known allowlist of special keys.
         * Optionally supports up to 3 modifiers (e.g., SHIFT+TAB).
         */
        'key.press': {
            description: 'Send a single key press (Enter, Escape, Tab, etc.)',
            risk: 'high',
            runtime: 'ui',
            permissions: ['ui.input.send'],
            schema: z.object({
                key: z.enum([
                    'ENTER', 'RETURN', 'ESCAPE', 'TAB', 'SPACE',
                    'BACKSPACE', 'DELETE',
                    'UP', 'DOWN', 'LEFT', 'RIGHT'
                ]).describe('The special key to press'),
                modifiers: z.array(
                    z.enum(['CMD', 'SHIFT', 'CTRL', 'OPTION'])
                ).max(3).default([])
                    .describe('Optional modifier keys (e.g., ["SHIFT"] for SHIFT+TAB)')
            })
        }
    }
};
