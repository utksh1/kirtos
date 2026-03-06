const { z } = require('zod');

/**
 * Domain-specific intents for WhatsApp.
 * Namespace: 'whatsapp.*'
 */
module.exports = {
    name: 'whatsapp',
    version: '1.2.0',
    domainPolicy: {
        defaultRiskFloor: 'low',
        allowedPermissions: ['communication.send', 'system.read'],
        allowedExecutors: ['whatsapp']
    },
    intents: {
        'send': {
            schema: z.object({
                number: z.string().min(1).describe('Phone number or contact name'),
                message: z.string().min(1)
            }),
            permissions: ['communication.send'],
            risk: 'high',
            runtime: 'whatsapp',
            category: 'messaging',
            preConditions: ['whatsapp.connected']
        },
        'status': {
            schema: z.object({}),
            permissions: ['system.read'],
            risk: 'low',
            runtime: 'whatsapp',
            category: 'utility'
        },
        'read': {
            schema: z.object({
                number: z.string().optional(),
                limit: z.coerce.number().optional().default(10)
            }),
            permissions: ['system.read'],
            risk: 'low',
            runtime: 'whatsapp',
            category: 'messaging'
        }
    }
};
