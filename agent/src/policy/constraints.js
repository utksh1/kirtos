const { execSync } = require('child_process');

/**
 * ConstraintValidator: Implements environmental and state-based checks
 * inspired by IntentionEngine's deterministic constraints.
 */
class ConstraintValidator {
    constructor() {
        this.checks = {
            'network.online': async () => {
                try {
                    if (process.env.KIRTOS_TEST_SKIP_NETWORK === 'true') {
                        return { satisfied: true };
                    }
                    execSync('ping -c 1 -t 2 google.com');
                    return { satisfied: true };
                } catch (e) {
                    return { satisfied: false, reason: 'Device is offline or google.com is unreachable.' };
                }
            },
            'whatsapp.connected': async () => {
                // In a real scenario, this would check the whatsapp service status
                // For now, we'll check if the whatsapp-auth directory exists as a proxy
                const fs = require('fs');
                const path = require('path');
                const authDir = path.join(process.cwd(), 'agent', '.whatsapp-auth');
                if (fs.existsSync(authDir)) {
                    return { satisfied: true };
                }
                return { satisfied: false, reason: 'WhatsApp is not connected or authenticated.' };
            },
            'app.safari.running': async () => {
                try {
                    execSync('pgrep Safari');
                    return { satisfied: true };
                } catch (e) {
                    return { satisfied: false, reason: 'Safari is not running.' };
                }
            }
        };
    }

    /**
     * Validates a list of conditions.
     * @param {string[]} conditions 
     * @returns {Promise<{satisfied: boolean, failures: string[]}>}
     */
    async validate(conditions) {
        if (!conditions || !Array.isArray(conditions)) return { satisfied: true, failures: [] };

        const results = await Promise.all(conditions.map(async (c) => {
            const check = this.checks[c];
            if (!check) return { satisfied: true }; // Unknown checks are ignored or could be logged
            const result = await check();
            return { condition: c, ...result };
        }));

        const failures = results.filter(r => !r.satisfied);
        return {
            satisfied: failures.length === 0,
            failures: failures.map(f => f.reason || `Condition "${f.condition}" not met.`)
        };
    }
}

module.exports = new ConstraintValidator();
