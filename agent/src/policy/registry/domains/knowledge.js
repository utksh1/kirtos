const { z } = require('zod');

module.exports = {
  name: 'knowledge',
  version: '1.0.0',
  domainPolicy: {
    defaultRiskFloor: 'low',
    allowedPermissions: [],
    allowedExecutors: ['knowledge']
  },
  intents: {
    'search': {
      schema: z.object({
        query: z.string().optional()
      }),
      permissions: [],
      risk: 'low',
      runtime: 'knowledge',
      category: 'utility'
    },
    'define': {
      schema: z.object({
        word: z.string().optional()
      }),
      permissions: [],
      risk: 'low',
      runtime: 'knowledge',
      category: 'utility'
    },
    'weather': {
      schema: z.object({
        city: z.string().optional()
      }),
      permissions: [],
      risk: 'low',
      runtime: 'knowledge',
      category: 'utility'
    },
    'currency': {
      schema: z.object({
        amount: z.number().optional(),
        from: z.string().optional(),
        to: z.string().optional()
      }),
      permissions: [],
      risk: 'low',
      runtime: 'knowledge',
      category: 'utility'
    }
  }
};