const { z } = require('zod');

/**
 * Domain-specific intents for Wellness.
 * Namespace: 'wellness.*'
 */
module.exports = {
    name: 'wellness',
    version: '1.0.0',
    domainPolicy: {
        defaultRiskFloor: 'low',
        allowedPermissions: ['wellness.read', 'wellness.write'],
        allowedExecutors: ['wellness']
    },
    intents: {
        'meditation_start': {
            schema: z.object({
                duration_minutes: z.number().default(10),
                type: z.string().optional().describe('e.g., mindful, Zen, sleep')
            }),
            permissions: ['wellness.write'],
            risk: 'low',
            runtime: 'wellness',
            category: 'practice'
        },
        'stress_relief': {
            schema: z.object({
                technique: z.string().optional().describe('e.g., guided imagery, muscle relaxation')
            }),
            permissions: ['wellness.read'],
            risk: 'low',
            runtime: 'wellness',
            category: 'practice'
        },
        'breathing_exercise': {
            schema: z.object({
                pattern: z.string().optional().describe('e.g., 4-7-8, box breathing'),
                duration_minutes: z.number().optional()
            }),
            permissions: ['wellness.write'],
            risk: 'low',
            runtime: 'wellness',
            category: 'practice'
        },
        'track_mood': {
            schema: z.object({
                mood: z.string().describe('e.g., happy, anxious, calm'),
                note: z.string().optional()
            }),
            permissions: ['wellness.write'],
            risk: 'low',
            runtime: 'wellness',
            category: 'tracking'
        }
    }
};
