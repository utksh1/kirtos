const { z } = require('zod');

module.exports = {
  name: 'device',
  version: '1.0.0',
  domainPolicy: {
    defaultRiskFloor: 'low',
    allowedPermissions: ['system.write', 'system.read', 'system.admin'],
    allowedExecutors: ['device']
  },
  intents: {
    'set_alarm': {
      schema: z.object({
        time: z.string().optional(),
        hour: z.number().optional(),
        minute: z.number().optional(),
        duration_minutes: z.number().optional(),
        label: z.string().optional()
      }),
      permissions: ['system.write'],
      risk: 'low',
      runtime: 'device',
      category: 'utility'
    },
    'restart_stack': {
      schema: z.object({}),
      permissions: ['system.admin'],
      risk: 'high',
      runtime: 'device',
      category: 'system'
    },
    'open_workspace': {
      schema: z.object({
        path: z.string().optional()
      }),
      permissions: ['system.read'],
      risk: 'low',
      runtime: 'device',
      category: 'utility'
    },
    'clean_node_modules': {
      schema: z.object({
        root: z.string().optional()
      }),
      permissions: ['system.write'],
      risk: 'medium',
      runtime: 'device',
      category: 'utility'
    },
    'toggle_focus': {
      schema: z.object({
        enabled: z.boolean()
      }),
      permissions: ['system.write'],
      risk: 'low',
      runtime: 'device',
      category: 'utility'
    },
    'morning_routine': {
      schema: z.object({}),
      permissions: ['system.write'],
      risk: 'low',
      runtime: 'device',
      category: 'utility'
    },
    'deploy_backend': {
      schema: z.object({}),
      permissions: ['system.admin'],
      risk: 'medium',
      runtime: 'device',
      category: 'utility'
    },
    'run_tests': {
      schema: z.object({}),
      permissions: ['system.read'],
      risk: 'low',
      runtime: 'device',
      category: 'utility'
    },
    'toggle_hotspot': {
      schema: z.object({
        enabled: z.boolean()
      }),
      permissions: ['system.write'],
      risk: 'low',
      runtime: 'device',
      category: 'utility'
    },
    'set_brightness': {
      schema: z.object({
        level: z.number()
      }),
      permissions: ['system.write'],
      risk: 'low',
      runtime: 'device',
      category: 'utility'
    },
    'mute_notifications': {
      schema: z.object({
        enabled: z.boolean()
      }),
      permissions: ['system.write'],
      risk: 'low',
      runtime: 'device',
      category: 'utility'
    },
    'open_app': {
      schema: z.object({
        name: z.string()
      }),
      permissions: ['system.read'],
      risk: 'low',
      runtime: 'device',
      category: 'utility'
    }
  }
};