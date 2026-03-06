const { z } = require('zod');

/**
 * Domain-specific intents for Travel.
 * Namespace: 'travel.*'
 */
module.exports = {
    name: 'travel',
    version: '1.0.0',
    domainPolicy: {
        defaultRiskFloor: 'medium',
        allowedPermissions: ['travel.read', 'travel.write'],
        allowedExecutors: ['travel']
    },
    intents: {
        'book': {
            schema: z.object({
                type: z.enum(['flight', 'hotel', 'car_rental']),
                details: z.string().describe('Booking details (destinations, dates)')
            }),
            permissions: ['travel.write'],
            risk: 'high',
            runtime: 'travel',
            category: 'booking'
        },
        'flight_status': {
            schema: z.object({
                flight_number: z.string().describe('e.g., AI 123'),
                date: z.string().optional()
            }),
            permissions: ['travel.read'],
            risk: 'medium',
            runtime: 'travel',
            category: 'info'
        },
        'find_local': {
            schema: z.object({
                location: z.string(),
                type: z.enum(['attraction', 'restaurant', 'hotel']).default('attraction'),
                query: z.string().optional().describe('e.g., Italian, Museum')
            }),
            permissions: ['travel.read'],
            risk: 'medium',
            runtime: 'travel',
            category: 'discovery'
        },
        'weather': {
            schema: z.object({
                location: z.string(),
                period: z.string().optional().describe('e.g., 5-day, tomorrow')
            }),
            permissions: ['travel.read'],
            risk: 'medium',
            runtime: 'travel',
            category: 'info'
        },
        'organize_itinerary': {
            schema: z.object({
                trip_name: z.string(),
                items: z.array(z.string()).describe('List of bookings or events')
            }),
            permissions: ['travel.write'],
            risk: 'medium',
            runtime: 'travel',
            category: 'management'
        }
    }
};
