const { z } = require('zod');

/**
 * Domain-specific intents for Entertainment.
 * Namespace: 'entertainment.*'
 */
module.exports = {
    name: 'entertainment',
    version: '1.0.0',
    domainPolicy: {
        defaultRiskFloor: 'low',
        allowedPermissions: ['entertainment.read', 'entertainment.write'],
        allowedExecutors: ['entertainment']
    },
    intents: {
        'find_content': {
            schema: z.object({
                query: z.string().describe('Movie, TV show, or genre'),
                type: z.enum(['movie', 'tv_show', 'genre']).optional()
            }),
            permissions: ['entertainment.read'],
            risk: 'low',
            runtime: 'entertainment',
            category: 'discovery'
        },
        'recommend': {
            schema: z.object({
                likes: z.array(z.string()).optional().describe('List of liked content for context'),
                genre: z.string().optional()
            }),
            permissions: ['entertainment.read'],
            risk: 'low',
            runtime: 'entertainment',
            category: 'discovery'
        },
        'check_showtimes': {
            schema: z.object({
                movie: z.string(),
                location: z.string().optional(),
                date: z.string().optional()
            }),
            permissions: ['entertainment.read'],
            risk: 'low',
            runtime: 'entertainment',
            category: 'discovery'
        },
        'watchlist_add': {
            schema: z.object({
                title: z.string().describe('Item to add to watchlist')
            }),
            permissions: ['entertainment.write'],
            risk: 'low',
            runtime: 'entertainment',
            category: 'management'
        },
        'find_streaming': {
            schema: z.object({
                title: z.string().describe('Movie/Show to find on streaming services')
            }),
            permissions: ['entertainment.read'],
            risk: 'low',
            runtime: 'entertainment',
            category: 'discovery'
        }
    }
};
