/**
 * GuardrailService handles safety checks before execution.
 * Implementation based on the Kirtos patterns.
 */
class GuardrailService {
    constructor() {
        this.executionEnabled = true;
        this.lastExecutions = new Map();
        this.defaultCooldown = 30 * 1000; // 30 seconds default
        // Per-prefix cooldown overrides (shorter for messaging)
        this.cooldownOverrides = {
            'whatsapp.': 3 * 1000,   // 3s — users send multiple messages quickly
            'chat.': 1 * 1000,       // 1s
        };
    }

    /**
     * Get the cooldown period for a given action key.
     */
    _getCooldown(key) {
        for (const [prefix, cooldown] of Object.entries(this.cooldownOverrides)) {
            if (key.startsWith(prefix)) return cooldown;
        }
        return this.defaultCooldown;
    }

    /**
     * Checks if a specific action (or global execution) is permitted.
     * @param {string} key - A unique key for the action (e.g., 'docker.restart:my-container')
     * @returns {boolean}
     */
    canExecute(key) {
        if (!this.executionEnabled) {
            console.warn('Execution is globally disabled via Kill Switch.');
            return false;
        }

        const now = Date.now();
        const last = this.lastExecutions.get(key);
        const cooldown = this._getCooldown(key);

        if (last && (now - last < cooldown)) {
            const remaining = Math.ceil((cooldown - (now - last)) / 1000);
            console.warn(`Action "${key}" is on cooldown. ${remaining}s remaining.`);
            return false;
        }

        this.lastExecutions.set(key, now);
        return true;
    }

    setExecutionEnabled(enabled) {
        this.executionEnabled = enabled;
        console.log(`Global Execution Enabled: ${enabled}`);
    }

    getExecutionStatus() {
        return this.executionEnabled;
    }
}

module.exports = new GuardrailService();
