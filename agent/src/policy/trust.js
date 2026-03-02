const crypto = require('crypto');
const { Permissions } = require('./permissions');

/**
 * TrustManager: Handles "Temporary Trusted Sessions" to prevent confirmation fatigue.
 * 
 * V3 Enhancements:
 * - Metadata-rich tokens (Audit ready).
 * - Plan-hash scoping (Safe batch execution).
 * - Revocation on session/client level.
 */
class TrustManager {
    constructor() {
        this.trustTokens = new Map(); // sessionId -> Map(clientId -> { permissionName -> token })
        this.DEFAULT_DURATION = 30 * 60 * 1000; // 30 minutes
    }

    /**
     * Grant temporary trust for a specific permission in a session/client scope.
     * @param {string} sessionId
     * @param {string} clientId
     * @param {string[]} permissions
     * @param {object} options { durationMs, maxUses, isExplicit, grantedBy, grantedFromIntent, plan }
     */
    grant(sessionId, clientId = 'default', permissions, options = {}) {
        const {
            durationMs = this.DEFAULT_DURATION,
            maxUses = null,
            isExplicit = false,
            grantedBy = 'unknown',
            grantedFromIntent = null,
            plan = null
        } = options;

        if (!this.trustTokens.has(sessionId)) {
            this.trustTokens.set(sessionId, new Map());
        }

        const sessionClients = this.trustTokens.get(sessionId);
        if (!sessionClients.has(clientId)) {
            sessionClients.set(clientId, {});
        }

        const clientTrust = sessionClients.get(clientId);
        const planHash = plan ? this._computePlanHash(plan) : null;
        const now = Date.now();

        permissions.forEach(p => {
            const permDef = Permissions[p];

            // Prevention: CRITICAL permissions cannot be trusted automatically (only via explicit UI approval)
            if (permDef?.risk === 'critical' && !isExplicit) {
                console.warn(`[Policy] Escalation Blocked: Automatic trust grant denied for CRITICAL permission "${p}"`);
                return;
            }

            clientTrust[p] = {
                grantedAt: now,
                expiry: now + durationMs,
                maxUses,
                usedCount: 0,
                isExplicit,
                grantedBy,
                grantedFromIntent,
                planHash
            };
        });

        console.log(`[Policy] Granted trust via ${grantedBy} for ${permissions.length} perms in session ${sessionId} (Client: ${clientId})`);
    }

    /**
     * Check if a specific permission is currently "Trusted".
     */
    isTrusted(sessionId, clientId = 'default', permission, context = {}) {
        const sessionClients = this.trustTokens.get(sessionId);
        if (!sessionClients) return false;

        const clientTrust = sessionClients.get(clientId);
        if (!clientTrust || !clientTrust[permission]) return false;

        const token = clientTrust[permission];

        // 1. Time Check
        if (Date.now() > token.expiry) {
            delete clientTrust[permission];
            return false;
        }

        // 2. Max Uses Check
        if (token.maxUses !== null && token.usedCount >= token.maxUses) {
            delete clientTrust[permission];
            return false;
        }

        // 3. Plan Hash Check (If token was granted for a specific plan)
        if (token.planHash && context.plan) {
            const currentPlanHash = this._computePlanHash(context.plan);
            if (token.planHash !== currentPlanHash) {
                return false; // Trust scoped to a different plan
            }
        }

        return true;
    }

    /**
     * Explicitly consumes a trust use for delicate operations.
     */
    consume(sessionId, clientId = 'default', permission) {
        const sessionClients = this.trustTokens.get(sessionId);
        if (!sessionClients) return;

        const clientTrust = sessionClients.get(clientId);
        if (!clientTrust || !clientTrust[permission]) return;

        clientTrust[permission].usedCount++;

        // Cleanup if exhausted
        if (clientTrust[permission].maxUses !== null && clientTrust[permission].usedCount >= clientTrust[permission].maxUses) {
            delete clientTrust[permission];
        }
    }

    /**
     * Clear all trust for a session.
     */
    revoke(sessionId) {
        this.trustTokens.delete(sessionId);
    }

    /**
     * Clear all trust for a specific client in a session.
     */
    revokeClient(sessionId, clientId) {
        const sessionClients = this.trustTokens.get(sessionId);
        if (sessionClients) {
            sessionClients.delete(clientId);
        }
    }

    _computePlanHash(plan) {
        // Canonicalize plan (only intents and params)
        const canonical = plan.map(step => ({
            intent: step.intent,
            params: step.params
        }));
        return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
    }
}

module.exports = new TrustManager();
