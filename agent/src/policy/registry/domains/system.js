const { z } = require('zod');

/**
 * Domain-specific intents for System control.
 * Namespace: 'system.*'
 */
module.exports = {
    name: 'system',
    version: '1.0.0',
    domainPolicy: {
        defaultRiskFloor: 'low',
        allowedPermissions: ['system.read', 'system.write', 'system.admin'],
        allowedExecutors: ['system']
    },
    intents: {
        'status': {
            schema: z.object({}),
            permissions: ['system.read'],
            risk: 'low',
            runtime: 'system',
            category: 'utility'
        },
        'uptime': {
            schema: z.object({}),
            permissions: ['system.read'],
            risk: 'low',
            runtime: 'system',
            category: 'stats'
        },
        'kill_switch': {
            schema: z.object({
                enabled: z.boolean()
            }),
            permissions: ['system.admin'],
            risk: 'high',
            runtime: 'system',
            category: 'security'
        }
    }
};
