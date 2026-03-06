const { z } = require('zod');

/**
 * Domain-specific intents for Health.
 * Namespace: 'health.*'
 */
module.exports = {
    name: 'health',
    version: '1.0.0',
    domainPolicy: {
        defaultRiskFloor: 'low',
        allowedPermissions: ['health.read', 'health.write'],
        allowedExecutors: ['health']
    },
    intents: {
        'track_steps': {
            schema: z.object({
                count: z.number().describe('Daily step count'),
                date: z.string().optional()
            }),
            permissions: ['health.write'],
            risk: 'low',
            runtime: 'health',
            category: 'activity'
        },
        'log_meal': {
            schema: z.object({
                meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
                foods: z.array(z.string()).describe('List of food items'),
                calories: z.number().optional().describe('Estimated calories')
            }),
            permissions: ['health.write'],
            risk: 'low',
            runtime: 'health',
            category: 'nutrition'
        },
        'workout_reminder': {
            schema: z.object({
                type: z.string().describe('Type of workout'),
                time: z.string().describe('Time for reminder'),
                days: z.array(z.string()).optional().describe('Days of the week')
            }),
            permissions: ['health.write'],
            risk: 'low',
            runtime: 'health',
            category: 'fitness'
        },
        'monitor_sleep': {
            schema: z.object({
                duration_hours: z.number().describe('Hours of sleep'),
                quality: z.string().optional().describe('Sleep quality (e.g., deep, restless)')
            }),
            permissions: ['health.read'],
            risk: 'low',
            runtime: 'health',
            category: 'wellness'
        },
        'suggest_recipe': {
            schema: z.object({
                dietary_preference: z.string().optional().describe('e.g., vegan, keto, gluten-free'),
                ingredients: z.array(z.string()).optional().describe('Ingredients available')
            }),
            permissions: ['health.read'],
            risk: 'low',
            runtime: 'health',
            category: 'nutrition'
        }
    }
};
