const { z } = require('zod');





module.exports = {
  name: 'learning',
  version: '1.0.0',
  domainPolicy: {
    defaultRiskFloor: 'low',
    allowedPermissions: ['learning.read', 'learning.write'],
    allowedExecutors: ['learning']
  },
  intents: {
    'lesson_start': {
      schema: z.object({
        subject: z.string().describe('Subject to learn (e.g., Spanish, History)'),
        level: z.string().optional().describe('Difficulty level')
      }),
      permissions: ['learning.write'],
      risk: 'low',
      runtime: 'learning',
      category: 'education'
    },
    'practice_problem': {
      schema: z.object({
        topic: z.string().describe('Topic for practice (e.g., Python, Algebra)'),
        difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner')
      }),
      permissions: ['learning.write'],
      risk: 'low',
      runtime: 'learning',
      category: 'practice'
    },
    'set_reminder': {
      schema: z.object({
        subject: z.string(),
        time: z.string(),
        frequency: z.string().optional()
      }),
      permissions: ['learning.write'],
      risk: 'low',
      runtime: 'learning',
      category: 'planning'
    },
    'find_course': {
      schema: z.object({
        query: z.string().describe('Course keywords'),
        platform: z.string().optional().describe('Preferred platform (e.g., Coursera, Udemy)')
      }),
      permissions: ['learning.read'],
      risk: 'low',
      runtime: 'learning',
      category: 'discovery'
    },
    'track_progress': {
      schema: z.object({
        subject: z.string().optional(),
        period: z.string().optional()
      }),
      permissions: ['learning.read'],
      risk: 'low',
      runtime: 'learning',
      category: 'reporting'
    }
  }
};