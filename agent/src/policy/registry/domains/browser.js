const { z } = require('zod');

/**
 * Domain-specific intents for Browser control.
 * Namespace: 'browser.*'
 */
module.exports = {
    name: 'browser',
    version: '1.0.0',
    domainPolicy: {
        defaultRiskFloor: 'medium',
        allowedPermissions: ['browser.open', 'browser.automation'],
        allowedExecutors: ['browser']
    },
    intents: {
        'open': {
            schema: z.object({
                url: z.string().url().describe('The URL to open')
            }),
            permissions: ['browser.open'],
            risk: 'medium',
            runtime: 'browser',
            category: 'navigation',
            preConditions: ['network.online']
        },
        'play_youtube': {
            schema: z.object({
                query: z.string().describe('Search query for YouTube')
            }),
            permissions: ['browser.open'],
            risk: 'medium',
            runtime: 'browser',
            category: 'media'
        },
        'search': {
            schema: z.object({
                query: z.string().describe('Search query'),
                engine: z.enum(['google', 'bing', 'duckduckgo', 'amazon', 'flipkart']).default('google')
            }),
            permissions: ['browser.open'],
            risk: 'medium',
            runtime: 'browser',
            category: 'navigation'
        },

        // Agentic automation intents
        'session.start': {
            schema: z.object({
                session_id: z.string().describe('Logical browser automation session id (use chat session_id)').optional()
            }),
            permissions: ['browser.automation'],
            risk: 'high',
            runtime: 'browser',
            category: 'automation'
        },
        'session.stop': {
            schema: z.object({
                session_id: z.string().describe('Browser automation session id to close')
            }),
            permissions: ['browser.automation'],
            risk: 'medium',
            runtime: 'browser',
            category: 'automation'
        },
        'navigate': {
            schema: z.object({
                url: z.string().url(),
                session_id: z.string().describe('Automation session id')
            }),
            permissions: ['browser.automation'],
            risk: 'high',
            runtime: 'browser',
            category: 'automation',
            preConditions: ['network.online']
        },
        'click': {
            schema: z.object({
                session_id: z.string(),
                selector: z.string().describe('CSS selector to click'),
                timeout_ms: z.coerce.number().optional().default(8000)
            }),
            permissions: ['browser.automation'],
            risk: 'high',
            runtime: 'browser',
            category: 'automation'
        },
        'type': {
            schema: z.object({
                session_id: z.string(),
                selector: z.string(),
                text: z.string(),
                clear: z.boolean().optional().default(true),
                timeout_ms: z.coerce.number().optional().default(8000)
            }),
            permissions: ['browser.automation'],
            risk: 'high',
            runtime: 'browser',
            category: 'automation'
        },
        'wait_for': {
            schema: z.object({
                session_id: z.string(),
                selector: z.string(),
                state: z.enum(['visible', 'attached', 'hidden', 'detached']).optional().default('visible'),
                timeout_ms: z.coerce.number().optional().default(8000)
            }),
            permissions: ['browser.automation'],
            risk: 'medium',
            runtime: 'browser',
            category: 'automation'
        },
        'extract_text': {
            schema: z.object({
                session_id: z.string(),
                selector: z.string(),
                timeout_ms: z.coerce.number().optional().default(8000),
                max_length: z.coerce.number().optional().default(4000)
            }),
            permissions: ['browser.automation'],
            risk: 'high',
            runtime: 'browser',
            category: 'automation'
        },
        'screenshot': {
            schema: z.object({
                session_id: z.string(),
                full_page: z.boolean().optional().default(true),
                path: z.string().optional(),
                timeout_ms: z.coerce.number().optional().default(8000)
            }),
            permissions: ['browser.automation'],
            risk: 'high',
            runtime: 'browser',
            category: 'automation'
        }
    }
};
