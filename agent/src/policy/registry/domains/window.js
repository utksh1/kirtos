const { z } = require('zod');












module.exports = {
  name: 'window',
  version: '0.1.0',
  domainPolicy: {
    defaultRiskFloor: 'medium',
    maxRiskCeiling: 'high',
    allowedPermissions: [
    'ui.window.focus',
    'ui.window.control'],

    allowedExecutors: ['window'],
    forbidIntents: ['shell.exec'],
    reservedNamespaces: ['system', 'policy', 'security']
  },
  intents: {




    'focus.app': {
      description: 'Bring a macOS application window to the foreground',
      risk: 'medium',
      runtime: 'window',
      permissions: ['ui.window.focus'],
      schema: z.object({
        app: z.string().min(1).max(80).
        describe('Bundle identifier (preferred) or application name to focus (e.g., "com.apple.Safari" or "Safari")')
      })
    },





    'minimize': {
      description: 'Minimize the frontmost window',
      risk: 'medium',
      runtime: 'window',
      permissions: ['ui.window.control'],
      schema: z.object({
        target: z.literal('frontmost').default('frontmost').
        describe('Target window — currently only "frontmost" is supported')
      })
    },





    'maximize': {
      description: 'Maximize (zoom) the frontmost window to fill the screen',
      risk: 'medium',
      runtime: 'window',
      permissions: ['ui.window.control'],
      schema: z.object({
        target: z.literal('frontmost').default('frontmost').
        describe('Target window — currently only "frontmost" is supported')
      })
    },





    'close': {
      description: 'Close the frontmost window (may cause data loss)',
      risk: 'high',
      runtime: 'window',
      permissions: ['ui.window.control'],
      schema: z.object({
        target: z.literal('frontmost').default('frontmost').
        describe('Target window — currently only "frontmost" is supported')
      })
    },





    'move': {
      description: 'Move the frontmost window to a specific screen position',
      risk: 'high',
      runtime: 'window',
      permissions: ['ui.window.control'],
      schema: z.object({
        x: z.number().int().
        describe('X coordinate (pixels from left edge of screen)'),
        y: z.number().int().
        describe('Y coordinate (pixels from top edge of screen)')
      })
    },





    'resize': {
      description: 'Resize the frontmost window to specific dimensions',
      risk: 'high',
      runtime: 'window',
      permissions: ['ui.window.control'],
      schema: z.object({
        width: z.number().int().min(200).max(4000).
        describe('Window width in pixels (min 200, max 4000)'),
        height: z.number().int().min(200).max(3000).
        describe('Window height in pixels (min 200, max 3000)')
      })
    }
  }
};