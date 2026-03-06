const { z } = require('zod');





module.exports = {
  name: 'shopping',
  version: '1.0.0',
  domainPolicy: {
    defaultRiskFloor: 'medium',
    allowedPermissions: ['shopping.read', 'shopping.write', 'browser.open', 'browser.automation'],
    allowedExecutors: ['shopping', 'browser']
  },
  intents: {
    'list.add': {
      description: 'Add an item to the shopping list',
      schema: z.object({
        item: z.string().min(1).describe('The name of the item to add'),
        quantity: z.string().optional().describe('Optional quantity or notes')
      }),
      permissions: ['shopping.write'],
      risk: 'medium',
      runtime: 'shopping'
    },
    'list.remove': {
      description: 'Remove an item from the shopping list',
      schema: z.object({
        item: z.string().min(1).describe('The name of the item to remove')
      }),
      permissions: ['shopping.write'],
      risk: 'medium',
      runtime: 'shopping'
    },
    'list.view': {
      description: 'View the current shopping list',
      schema: z.object({}),
      permissions: ['shopping.read'],
      risk: 'medium',
      runtime: 'shopping'
    },
    'price.compare': {
      description: 'Compare prices for a product across retailers',
      schema: z.object({
        product: z.string().min(1).describe('The name of the product to compare')
      }),
      permissions: ['browser.open'],
      risk: 'medium',
      runtime: 'shopping'
    },
    'price.alert_set': {
      description: 'Set a price alert for a product',
      schema: z.object({
        product: z.string().min(1).describe('Product name'),
        target_price: z.coerce.number().min(0.01).describe('The price threshold to alert at')
      }),
      permissions: ['shopping.write'],
      risk: 'medium',
      runtime: 'shopping'
    },
    'order.track': {
      description: 'Track a delivery status',
      schema: z.object({
        tracking_number: z.string().min(1).optional().describe('The tracking number'),
        merchant_url: z.string().url().optional().describe('URL to the merchant order page')
      }),
      permissions: ['shopping.read', 'browser.open'],
      risk: 'medium',
      runtime: 'shopping'
    },
    'coupon.find': {
      description: 'Find discount codes for a merchant',
      schema: z.object({
        merchant: z.string().min(1).describe('The name of the merchant (e.g. Amazon, Nike)')
      }),
      permissions: ['browser.open'],
      risk: 'medium',
      runtime: 'shopping'
    }
  }
};