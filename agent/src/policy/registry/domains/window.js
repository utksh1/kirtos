const { z } = require('zod');

/**
 * Window Domain Configuration (Phase 2)
 * Native window control via AXUIElement helper process.
 * Enables minimize, maximize, move, resize, close, and focus operations.
 *
 * Security posture:
 *  - Kirtos PolicyEngine remains the gatekeeper.
 *  - Helper is a dumb executor (no network/shell/arbitrary fs).
 *  - Bounds checks enforced for move/resize.
 *  - Close window is HIGH risk; confirmation/trust rules apply.
 */
module.exports = {
    name: 'window',
    version: '0.1.0',
    domainPolicy: {
        defaultRiskFloor: 'medium',
        maxRiskCeiling: 'high',
        allowedPermissions: [
            'ui.window.focus',
            'ui.window.control'
        ],
        allowedExecutors: ['window'],
        forbidIntents: ['shell.exec'],
        reservedNamespaces: ['system', 'policy', 'security']
    },
    intents: {
        /**
         * window.focus.app — Bring a macOS application to the foreground via AX.
         * Risk: MEDIUM (no mutation, just activation).
         */
        'focus.app': {
            description: 'Bring a macOS application window to the foreground',
            risk: 'medium',
            runtime: 'window',
            permissions: ['ui.window.focus'],
            schema: z.object({
                app: z.string().min(1).max(80)
                    .describe('Bundle identifier (preferred) or application name to focus (e.g., "com.apple.Safari" or "Safari")')
            })
        },

        /**
         * window.minimize — Minimize the frontmost window.
         * Risk: MEDIUM.
         */
        'minimize': {
            description: 'Minimize the frontmost window',
            risk: 'medium',
            runtime: 'window',
            permissions: ['ui.window.control'],
            schema: z.object({
                target: z.literal('frontmost').default('frontmost')
                    .describe('Target window — currently only "frontmost" is supported')
            })
        },

        /**
         * window.maximize — Maximize (zoom) the frontmost window.
         * Risk: MEDIUM.
         */
        'maximize': {
            description: 'Maximize (zoom) the frontmost window to fill the screen',
            risk: 'medium',
            runtime: 'window',
            permissions: ['ui.window.control'],
            schema: z.object({
                target: z.literal('frontmost').default('frontmost')
                    .describe('Target window — currently only "frontmost" is supported')
            })
        },

        /**
         * window.close — Close the frontmost window.
         * Risk: HIGH (destructive — may lose unsaved work).
         */
        'close': {
            description: 'Close the frontmost window (may cause data loss)',
            risk: 'high',
            runtime: 'window',
            permissions: ['ui.window.control'],
            schema: z.object({
                target: z.literal('frontmost').default('frontmost')
                    .describe('Target window — currently only "frontmost" is supported')
            })
        },

        /**
         * window.move — Move the frontmost window to a specific position.
         * Risk: HIGH (bounds checked against visible screen frame).
         */
        'move': {
            description: 'Move the frontmost window to a specific screen position',
            risk: 'high',
            runtime: 'window',
            permissions: ['ui.window.control'],
            schema: z.object({
                x: z.number().int()
                    .describe('X coordinate (pixels from left edge of screen)'),
                y: z.number().int()
                    .describe('Y coordinate (pixels from top edge of screen)')
            })
        },

        /**
         * window.resize — Resize the frontmost window.
         * Risk: HIGH (clamped to 200–4000 width, 200–3000 height).
         */
        'resize': {
            description: 'Resize the frontmost window to specific dimensions',
            risk: 'high',
            runtime: 'window',
            permissions: ['ui.window.control'],
            schema: z.object({
                width: z.number().int().min(200).max(4000)
                    .describe('Window width in pixels (min 200, max 4000)'),
                height: z.number().int().min(200).max(3000)
                    .describe('Window height in pixels (min 200, max 3000)')
            })
        }
    }
};
