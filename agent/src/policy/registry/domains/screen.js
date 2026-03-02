const { z } = require('zod');

/**
 * Screen Domain Configuration (Phase 1 MVP)
 * Enables controlled macOS screenshot capture via native `screencapture` CLI.
 * No screen recording, OCR, or arbitrary file path saving.
 */
module.exports = {
    name: 'screen',
    version: '0.1.0',

    domainPolicy: {
        defaultRiskFloor: 'medium',
        maxRiskCeiling: 'high',
        allowedPermissions: [
            'ui.screen.capture'
        ],
        allowedExecutors: [
            'screen'
        ],
        forbidIntents: [
            'shell.exec'
        ],
        reservedNamespaces: [
            'system',
            'policy',
            'security'
        ]
    },

    intents: {
        /**
         * screen.screenshot — Capture a screenshot of the current display.
         * Risk: MEDIUM. Saves only to ~/Library/Application Support/Kirtos/screenshots/.
         */
        'screenshot': {
            description: 'Capture a screenshot of the current macOS display',
            risk: 'medium',
            runtime: 'screen',
            permissions: [
                'ui.screen.capture'
            ],
            schema: z.object({
                mode: z.enum(['full', 'window', 'interactive'])
                    .default('full')
                    .describe('Capture mode: full screen, window selection, or interactive region'),

                format: z.enum(['png', 'jpg'])
                    .default('png')
                    .describe('Output image format'),

                include_cursor: z.boolean()
                    .default(false)
                    .describe('Whether to include the mouse cursor in the screenshot'),

                copy_to_clipboard: z.boolean()
                    .default(false)
                    .describe('Whether to also copy the screenshot to the clipboard'),

                filename_hint: z.string()
                    .max(40)
                    .optional()
                    .describe('Optional filename hint (A-Z, a-z, 0-9, hyphen, underscore only, max 40 chars)')
            })
        }
    }
};
