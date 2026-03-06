const { z } = require('zod');

module.exports = {
  name: 'query',
  version: '1.0.0',
  domainPolicy: {
    defaultRiskFloor: 'low',
    allowedPermissions: [],
    allowedExecutors: ['system']
  },
  intents: {
    'help': {
      schema: z.object({}),
      permissions: [],
      risk: 'low',
      runtime: 'system',
      category: 'utility'
    },
    'time': {
      schema: z.object({}),
      permissions: [],
      risk: 'low',
      runtime: 'system',
      category: 'utility'
    },
    'greet': {
      schema: z.object({}),
      permissions: [],
      risk: 'low',
      runtime: 'system',
      category: 'utility'
    }
  }
};