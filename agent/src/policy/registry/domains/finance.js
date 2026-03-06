const { z } = require('zod');

/**
 * Domain-specific intents for Finance.
 * Namespace: 'finance.*'
 */
module.exports = {
    name: 'finance',
    version: '1.0.0',
    domainPolicy: {
        defaultRiskFloor: 'medium',
        allowedPermissions: ['finance.read', 'finance.write'],
        allowedExecutors: ['finance']
    },
    intents: {
        'track_expense': {
            schema: z.object({
                amount: z.number().describe('Amount spent'),
                category: z.string().describe('Expense category (e.g., coffee, rent, groceries)'),
                description: z.string().optional().describe('Description of the expense'),
                date: z.string().optional().describe('Date of expense (defaults to today)')
            }),
            permissions: ['finance.write'],
            risk: 'medium',
            runtime: 'finance',
            category: 'tracking'
        },
        'set_budget_alert': {
            schema: z.object({
                category: z.string().describe('Category to set alert for'),
                limit: z.number().describe('Budget limit'),
                frequency: z.enum(['daily', 'weekly', 'monthly']).default('monthly')
            }),
            permissions: ['finance.write'],
            risk: 'medium',
            runtime: 'finance',
            category: 'budgeting'
        },
        'check_balance': {
            schema: z.object({
                account_type: z.string().optional().describe('Type of account (e.g., savings, checking)')
            }),
            permissions: ['finance.read'],
            risk: 'medium',
            runtime: 'finance',
            category: 'banking'
        },
        'pay_bill': {
            schema: z.object({
                bill_name: z.string().describe('Name of the bill/utility'),
                amount: z.number().describe('Amount to pay'),
                due_date: z.string().optional().describe('Due date')
            }),
            permissions: ['finance.write'],
            risk: 'high',
            runtime: 'finance',
            category: 'banking'
        },
        'transfer_money': {
            schema: z.object({
                from_account: z.string().describe('Source account'),
                to_account: z.string().describe('Destination account/recipient'),
                amount: z.number().describe('Amount to transfer')
            }),
            permissions: ['finance.write'],
            risk: 'high',
            runtime: 'finance',
            category: 'banking'
        },
        'report_spending': {
            schema: z.object({
                period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('monthly'),
                category: z.string().optional().describe('Filter by category')
            }),
            permissions: ['finance.read'],
            risk: 'medium',
            runtime: 'finance',
            category: 'reporting'
        }
    }
};
