const { z } = require('zod');

/**
 * Domain-specific intents for Home Automation.
 * Namespace: 'home.*'
 */
module.exports = {
    name: 'home',
    version: '1.0.0',
    domainPolicy: {
        defaultRiskFloor: 'medium',
        allowedPermissions: ['home.control'],
        allowedExecutors: ['home']
    },
    intents: {
        'control_device': {
            schema: z.object({
                device_id: z.string().describe('ID or name of the device'),
                action: z.enum(['on', 'off', 'toggle', 'set_value']),
                value: z.union([z.string(), z.number()]).optional().describe('Value to set (e.g., brightness 50, temp 22)')
            }),
            permissions: ['home.control'],
            risk: 'high',
            runtime: 'home',
            category: 'automation'
        },
        'manage_security': {
            schema: z.object({
                action: z.enum(['arm', 'disarm', 'check_status']),
                mode: z.enum(['home', 'away', 'night']).optional()
            }),
            permissions: ['home.control'],
            risk: 'high',
            runtime: 'home',
            category: 'security'
        },
        'set_routine': {
            schema: z.object({
                name: z.string().describe('Name of the routine'),
                actions: z.array(z.object({
                    device_id: z.string(),
                    action: z.string(),
                    value: z.any().optional()
                })).describe('List of actions in the routine')
            }),
            permissions: ['home.control'],
            risk: 'high',
            runtime: 'home',
            category: 'automation'
        },
        'monitor_energy': {
            schema: z.object({
                period: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
                device_id: z.string().optional().describe('Specific device to monitor')
            }),
            permissions: ['home.control'],
            risk: 'medium',
            runtime: 'home',
            category: 'monitoring'
        }
    }
};
