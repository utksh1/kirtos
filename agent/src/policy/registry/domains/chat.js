const { z } = require('zod');

module.exports = {
  name: 'chat',
  version: '1.0.0',
  domainPolicy: {
    defaultRiskFloor: 'low',
    allowedPermissions: [],
    allowedExecutors: ['chat']
  },
  intents: {
    'message': {
      schema: z.object({
        text: z.string().optional()
      }),
      permissions: [],
      risk: 'low',
      runtime: 'chat',
      category: 'communication'
    }
  }
};