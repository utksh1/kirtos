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
        allowedPermissions: ['browser.open'],
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
            category: 'navigation'
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
        }
    }
};
