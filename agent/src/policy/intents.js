const { z } = require('zod');




const Intents = {

  'system.status': {
    schema: z.object({}),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'system'
  },
  'chat.message': {
    schema: z.object({
      text: z.string().optional()
    }),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'chat'
  },
  'system.uptime': {
    schema: z.object({}),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'system'
  },
  'system.resource_usage': {
    schema: z.object({}),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'system'
  },
  'system.kill_switch': {
    schema: z.object({
      enabled: z.boolean()
    }),
    permissions: ['system.admin'],
    risk: 'high',
    runtime: 'system'
  },
  'system.battery': {
    schema: z.object({}),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'system'
  },


  'query.time': {
    schema: z.object({}),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'system'
  },
  'query.help': {
    schema: z.object({}),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'system'
  },


  'docker.list': {
    schema: z.object({}),
    permissions: ['docker.read'],
    risk: 'medium',
    runtime: 'docker'
  },
  'docker.start': {
    schema: z.object({
      container: z.string().min(1)
    }),
    permissions: ['docker.control'],
    risk: 'medium',
    runtime: 'docker'
  },
  'docker.stop': {
    schema: z.object({
      container: z.string().min(1)
    }),
    permissions: ['docker.control'],
    risk: 'medium',
    runtime: 'docker'
  },
  'docker.restart': {
    schema: z.object({
      container: z.string().min(1)
    }),
    permissions: ['docker.control'],
    risk: 'medium',
    runtime: 'docker'
  },
  'docker.logs': {
    schema: z.object({
      container: z.string().min(1),
      lines: z.coerce.number().max(1000).optional().default(100)
    }),
    permissions: ['docker.read'],
    risk: 'medium',
    runtime: 'docker'
  },


  'file.read': {
    schema: z.object({
      path: z.string().min(1)
    }),
    permissions: ['file.read'],
    risk: 'medium',
    runtime: 'fs'
  },
  'file.write': {
    schema: z.object({
      path: z.string().min(1),
      content: z.string()
    }),
    permissions: ['file.write'],
    risk: 'high',
    runtime: 'fs'
  },
  'file.list': {
    schema: z.object({
      path: z.string().default('.')
    }),
    permissions: ['file.read'],
    risk: 'medium',
    runtime: 'fs'
  },


  'network.ping': {
    schema: z.object({
      target: z.string().min(1)
    }),
    permissions: ['network.read'],
    risk: 'high',
    runtime: 'code'

  },
  'network.scan': {
    schema: z.object({
      target: z.string().min(1)
    }),
    permissions: ['network.scan'],
    risk: 'high',
    runtime: 'code'
  },


  'shell.exec': {
    schema: z.object({
      command: z.string().min(1),
      args: z.array(z.string()).optional().default([])
    }),
    permissions: ['shell.exec'],
    risk: 'critical',
    runtime: 'shell'
  },


  'browser.open': {
    schema: z.object({
      url: z.string().url()
    }),
    permissions: ['browser.open'],
    risk: 'medium',
    runtime: 'browser'
  },
  'browser.play_youtube': {
    schema: z.object({
      query: z.string().min(1)
    }),
    permissions: ['browser.open'],
    risk: 'medium',
    runtime: 'browser'
  },
  'browser.search': {
    schema: z.object({
      query: z.string().min(1),
      engine: z.enum(['google', 'amazon', 'flipkart', 'youtube', 'github']).optional().default('google')
    }),
    permissions: ['browser.open'],
    risk: 'medium',
    runtime: 'browser'
  },


  'communication.send_message': {
    schema: z.object({
      recipient: z.string().min(1),
      message: z.string().min(1)
    }),
    permissions: ['communication.send'],
    risk: 'high',
    runtime: 'communication'
  },


  'code.run': {
    schema: z.object({
      language: z.enum(['python', 'node', 'bash']),
      code: z.string().min(1)
    }),
    permissions: ['code.exec'],
    risk: 'critical',
    runtime: 'code'
  },

  'computer.type': {
    schema: z.object({
      text: z.string().min(1)
    }),
    permissions: ['computer.type'],
    risk: 'high',
    runtime: 'computer'
  },
  'screen.capture': {
    schema: z.object({
      path: z.string().optional()
    }),
    permissions: ['screen.capture'],
    risk: 'high',
    runtime: 'computer'
  },

  'device.set_alarm': {
    schema: z.object({
      time: z.string().describe('e.g. "5:30 PM" or "17:30"').optional(),
      hour: z.coerce.number().min(0).max(23).optional(),
      minute: z.coerce.number().min(0).max(59).optional(),
      label: z.string().optional().default('Alarm'),
      duration_minutes: z.coerce.number().optional().describe('For timers, e.g. 5')
    }),
    permissions: ['system.write'],
    risk: 'medium',
    runtime: 'device'
  },
  'device.restart_stack': {
    schema: z.object({}),
    permissions: ['system.write'],
    risk: 'high',
    runtime: 'device'
  },
  'device.open_workspace': {
    schema: z.object({
      path: z.string().optional()
    }),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'device'
  },
  'device.clean_node_modules': {
    schema: z.object({
      root: z.string().optional()
    }),
    permissions: ['file.write'],
    risk: 'high',
    runtime: 'device'
  },
  'device.toggle_focus': {
    schema: z.object({
      enabled: z.boolean()
    }),
    permissions: ['system.write'],
    risk: 'medium',
    runtime: 'device'
  },
  'device.morning_routine': {
    schema: z.object({}),
    permissions: ['system.write'],
    risk: 'medium',
    runtime: 'device'
  },
  'device.deploy_backend': {
    schema: z.object({}),
    permissions: ['system.write'],
    risk: 'high',
    runtime: 'device'
  },
  'device.run_tests': {
    schema: z.object({}),
    permissions: ['system.read'],
    risk: 'medium',
    runtime: 'device'
  },
  'device.toggle_hotspot': {
    schema: z.object({
      enabled: z.boolean()
    }),
    permissions: ['system.write'],
    risk: 'medium',
    runtime: 'device'
  },
  'device.set_brightness': {
    schema: z.object({
      level: z.coerce.number().min(0).max(100)
    }),
    permissions: ['system.write'],
    risk: 'low',
    runtime: 'device'
  },
  'device.mute_notifications': {
    schema: z.object({
      enabled: z.boolean()
    }),
    permissions: ['system.write'],
    risk: 'low',
    runtime: 'device'
  },
  'device.open_app': {
    schema: z.object({
      name: z.string().min(1)
    }),
    permissions: ['system.read'],
    risk: 'medium',
    runtime: 'device'
  },

  'system.brightness.set': {
    schema: z.object({
      level: z.coerce.number().min(0).max(1)
    }),
    permissions: ['system.write'],
    risk: 'low',
    runtime: 'settings'
  },
  'system.volume.set': {
    schema: z.object({
      level: z.coerce.number().min(0).max(100)
    }),
    permissions: ['system.write'],
    risk: 'low',
    runtime: 'settings'
  },
  'system.volume.mute': {
    schema: z.object({
      enabled: z.boolean()
    }),
    permissions: ['system.write'],
    risk: 'low',
    runtime: 'settings'
  },
  'clock.alarm.set': {
    schema: z.object({
      time: z.string().min(1),
      label: z.string().optional().default('Kirtos Alarm')
    }),
    permissions: ['system.write'],
    risk: 'medium',
    runtime: 'settings'
  },
  'clock.timer.start': {
    schema: z.object({
      duration_seconds: z.coerce.number().min(1),
      label: z.string().optional().default('Timer')
    }),
    permissions: ['system.write'],
    risk: 'medium',
    runtime: 'settings'
  },
  'system.app.open': {
    schema: z.object({
      app: z.string().min(1)
    }),
    permissions: ['system.read'],
    risk: 'medium',
    runtime: 'settings'
  },
  'system.focus.set': {
    schema: z.object({
      mode: z.string().min(1),
      enabled: z.boolean()
    }),
    permissions: ['system.write'],
    risk: 'medium',
    runtime: 'settings'
  },
  'system.notification.show': {
    schema: z.object({
      title: z.string().optional().default('Kirtos'),
      message: z.string().min(1)
    }),
    permissions: ['system.write'],
    risk: 'low',
    runtime: 'settings'
  },


  'query.greet': {
    schema: z.object({}),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'system'
  },


  'knowledge.search': {
    schema: z.object({
      query: z.string().min(1).describe('Topic to search for on Wikipedia')
    }),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'knowledge'
  },


  'fun.joke': {
    schema: z.object({
      category: z.string().optional().default('Programming')
    }),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'fun'
  },
  'fun.quote': {
    schema: z.object({}),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'fun'
  },
  'fun.fact': {
    schema: z.object({}),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'fun'
  },


  'knowledge.define': {
    schema: z.object({
      word: z.string().min(1).describe('Word to look up in the dictionary')
    }),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'knowledge'
  },
  'knowledge.math': {
    schema: z.object({
      expression: z.string().min(1)
    }),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'knowledge'
  },


  'knowledge.weather': {
    schema: z.object({
      city: z.string().min(1).describe('City name to get weather for')
    }),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'knowledge'
  },


  'knowledge.currency': {
    schema: z.object({
      amount: z.coerce.number().min(0).describe('Amount to convert'),
      from: z.string().min(3).max(3).describe('Source currency code, e.g. USD'),
      to: z.string().min(3).max(3).describe('Target currency code, e.g. INR')
    }),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'knowledge'
  },


  'media.play_music': {
    schema: z.object({
      query: z.string().optional().describe('Song name to search for in ~/Music')
    }),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'media'
  },
  'media.list_music': {
    schema: z.object({}),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'media'
  },
  'media.pause': {
    schema: z.object({}),
    permissions: ['system.write'],
    risk: 'low',
    runtime: 'media'
  },
  'media.stop': {
    schema: z.object({}),
    permissions: ['system.write'],
    risk: 'low',
    runtime: 'media'
  },
  'media.resume': {
    schema: z.object({}),
    permissions: ['system.write'],
    risk: 'low',
    runtime: 'media'
  },


  'whatsapp.connect': {
    schema: z.object({}),
    permissions: ['communication.send'],
    risk: 'medium',
    runtime: 'whatsapp'
  },
  'whatsapp.status': {
    schema: z.object({}),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'whatsapp'
  },
  'whatsapp.send': {
    schema: z.object({
      number: z.string().min(1).describe('Phone number with country code (e.g. 919876543210) OR contact name (e.g. Utkarsh)'),
      message: z.string().min(1)
    }),
    permissions: ['communication.send'],
    risk: 'high',
    runtime: 'whatsapp'
  },
  'whatsapp.read': {
    schema: z.object({
      number: z.string().optional().describe('Filter by sender phone number'),
      limit: z.coerce.number().optional().default(10)
    }),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'whatsapp'
  },
  'whatsapp.disconnect': {
    schema: z.object({}),
    permissions: ['communication.send'],
    risk: 'low',
    runtime: 'whatsapp'
  },
  'whatsapp.contacts': {
    schema: z.object({}),
    permissions: ['system.read'],
    risk: 'low',
    runtime: 'whatsapp'
  }
};

module.exports = { Intents };