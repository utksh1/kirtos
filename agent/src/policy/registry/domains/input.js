const { z } = require('zod');






module.exports = {
  name: 'input',
  version: '0.1.0',
  domainPolicy: {
    defaultRiskFloor: 'high',
    maxRiskCeiling: 'high',
    allowedPermissions: [
    'ui.pointer.control'],

    allowedExecutors: ['input'],
    forbidIntents: ['shell.exec'],
    reservedNamespaces: ['system', 'policy', 'security']
  },
  intents: {




    'mouse.move': {
      description: 'Move the mouse cursor to an absolute screen position',
      risk: 'high',
      runtime: 'input',
      permissions: ['ui.pointer.control'],
      schema: z.object({
        x: z.number().nonnegative().
        describe('Horizontal pixel coordinate'),
        y: z.number().nonnegative().
        describe('Vertical pixel coordinate'),
        duration_ms: z.number().int().min(0).max(1000).default(0).
        describe('Animation duration in ms (0 = instant, max 1000)')
      })
    },





    'mouse.click': {
      description: 'Perform a mouse click at a screen position',
      risk: 'high',
      runtime: 'input',
      permissions: ['ui.pointer.control'],
      schema: z.object({
        x: z.number().nonnegative().
        describe('Horizontal pixel coordinate'),
        y: z.number().nonnegative().
        describe('Vertical pixel coordinate'),
        button: z.enum(['left', 'right']).default('left').
        describe('Mouse button to click'),
        clicks: z.number().int().min(1).max(3).default(1).
        describe('Number of clicks (1 = single, 2 = double, 3 = triple)')
      })
    },





    'mouse.scroll': {
      description: 'Scroll the mouse wheel at the current position',
      risk: 'high',
      runtime: 'input',
      permissions: ['ui.pointer.control'],
      schema: z.object({
        delta_x: z.number().int().min(-2000).max(2000).default(0).
        describe('Horizontal scroll delta (pixels)'),
        delta_y: z.number().int().min(-2000).max(2000).default(0).
        describe('Vertical scroll delta (pixels, negative = scroll up)')
      })
    },





    'mouse.drag': {
      description: 'Drag the mouse from one position to another',
      risk: 'high',
      runtime: 'input',
      permissions: ['ui.pointer.control'],
      schema: z.object({
        from_x: z.number().nonnegative().
        describe('Start horizontal pixel coordinate'),
        from_y: z.number().nonnegative().
        describe('Start vertical pixel coordinate'),
        to_x: z.number().nonnegative().
        describe('End horizontal pixel coordinate'),
        to_y: z.number().nonnegative().
        describe('End vertical pixel coordinate'),
        duration_ms: z.number().int().min(50).max(2000).default(200).
        describe('Drag animation duration in ms (50-2000)')
      })
    }
  }
};