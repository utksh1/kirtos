const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Permissions } = require('../permissions');

/**
 * IntentRegistry: Prevents "Intent Explosion" by enforcing namespaces,
 * validating risk alignment, and providing versioned discovery.
 */
class IntentRegistry {
    constructor() {
        this.intents = {};
        this.domains = {};
        this.domainPolicies = {};
        this.RESERVED_NAMESPACES = ['system', 'policy', 'internal', 'security'];
        this._loadDomains();
        this._generateFingerprint();
    }

    _loadDomains() {
        const domainsDir = path.join(__dirname, 'domains');
        if (!fs.existsSync(domainsDir)) return;

        const files = fs.readdirSync(domainsDir).filter(f => f.endsWith('.js'));

        for (const file of files) {
            const domainDef = require(path.join(domainsDir, file));
            const domainName = domainDef.name;

            // 1. Reserved Namespace Check
            if (this.RESERVED_NAMESPACES.includes(domainName) && file !== `${domainName}.js`) {
                throw new Error(`IntentRegistry: Domain "${domainName}" uses a reserved namespace prefix.`);
            }

            // 2. Prevent Namespace Collisions
            if (this.domains[domainName]) {
                throw new Error(`IntentRegistry: Collision detected for domain "${domainName}"`);
            }

            // 3. Load Domain Policy Contract
            this.domainPolicies[domainName] = {
                defaultRiskFloor: 'low',
                maxRiskCeiling: 'critical',
                allowedPermissions: ['*'],
                allowedExecutors: ['*'],
                forbidIntents: [],
                ...domainDef.domainPolicy
            };

            this.domains[domainName] = {
                version: domainDef.version || '1.0.0',
                path: file
            };

            // 4. Register & Validate Intents
            for (const [key, def] of Object.entries(domainDef.intents)) {
                const fullName = `${domainName}.${key}`;

                // A. Risk Alignment Validation (Permission based)
                this._validateRiskAlignment(fullName, def);

                // B. Domain Policy Validation
                this._validateDomainPolicy(domainName, key, def);

                this.intents[fullName] = {
                    ...def,
                    domain: domainName,
                    version: def.version || domainDef.version || '1.0.0'
                };
            }
        }
        console.log(`[Policy] IntentRegistry loaded ${Object.keys(this.intents).length} intents across ${Object.keys(this.domains).length} domains.`);
    }

    /**
     * Rejects domains that violate their own policy contracts.
     */
    _validateDomainPolicy(domain, key, def) {
        const policy = this.domainPolicies[domain];
        const riskWeights = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };

        // 1. Risk Constraints
        const intentWeight = riskWeights[def.risk] || 0;
        const floorWeight = riskWeights[policy.defaultRiskFloor] || 0;
        const ceilingWeight = riskWeights[policy.maxRiskCeiling] || 4;

        if (intentWeight < floorWeight) {
            throw new Error(`[Policy] Contract Violation: Intent "${domain}.${key}" violates ${domain} risk floor (${policy.defaultRiskFloor})`);
        }
        if (intentWeight > ceilingWeight) {
            throw new Error(`[Policy] Contract Violation: Intent "${domain}.${key}" exceeds ${domain} risk ceiling (${policy.maxRiskCeiling})`);
        }

        // 2. Intent Name Blacklist
        if (policy.forbidIntents && (policy.forbidIntents.includes(key) || policy.forbidIntents.includes(`${domain}.${key}`))) {
            throw new Error(`[Policy] Contract Violation: Intent name "${key}" is explicitly forbidden in domain "${domain}"`);
        }

        // 3. Permission Whitelist
        if (policy.allowedPermissions && !policy.allowedPermissions.includes('*')) {
            for (const perm of def.permissions) {
                if (!policy.allowedPermissions.includes(perm)) {
                    throw new Error(`[Policy] Contract Violation: Intent "${domain}.${key}" requests unauthorized permission "${perm}" for domain "${domain}"`);
                }
            }
        }

        // 4. Executor Whitelist
        if (policy.allowedExecutors && !policy.allowedExecutors.includes('*')) {
            if (!policy.allowedExecutors.includes(def.runtime)) {
                throw new Error(`[Policy] Contract Violation: Intent "${domain}.${key}" attempts to use forbidden executor "${def.runtime}" for domain "${domain}"`);
            }
        }
    }

    /**
     * Ensures that the intent's risk level does not exceed the risk levels
     * of its associated permissions.
     */
    _validateRiskAlignment(name, def) {
        const riskWeights = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
        const intentWeight = riskWeights[def.risk] || 0;

        for (const permKey of def.permissions) {
            const perm = Permissions[permKey];
            if (!perm) {
                console.warn(`[Policy] Warning: Intent "${name}" references undefined permission "${permKey}"`);
                continue;
            }
            const permWeight = riskWeights[perm.risk] || 0;
            if (intentWeight > permWeight) {
                throw new Error(`[Policy] Risk Inconsistency: Intent "${name}" (${def.risk}) cannot be riskier than its permission "${permKey}" (${perm.risk})`);
            }
        }
    }

    _generateFingerprint() {
        const dump = this.dump();
        const hash = crypto.createHash('sha256')
            .update(JSON.stringify(dump))
            .digest('hex');

        this.fingerprint = hash;
        console.log(`[Policy] Capability Fingerprint: ${hash.substring(0, 16)} (Intents: ${Object.keys(this.intents).length})`);
    }

    /**
     * Provides a canonical JSON dump for fingerprint stability and diffing.
     */
    dump() {
        const sortedIntents = Object.keys(this.intents).sort();
        return {
            intents: sortedIntents.map(key => {
                const i = this.intents[key];
                const schemaSummary = i.schema && i.schema._def ? {
                    type: i.schema._def.typeName,
                    checks: i.schema._def.checks,
                    shape: i.schema._def.shape ? Object.keys(i.schema._def.shape()).sort() : undefined
                } : 'none';

                return {
                    name: key,
                    version: i.version,
                    risk: i.risk,
                    runtime: i.runtime,
                    permissions: [...i.permissions].sort(),
                    schema: schemaSummary
                };
            }),
            policies: Object.keys(this.domainPolicies).sort().reduce((acc, key) => {
                acc[key] = this.domainPolicies[key];
                return acc;
            }, {})
        };
    }

    get(name) {
        return this.intents[name];
    }

    getFingerprint() {
        return this.fingerprint;
    }
}

module.exports = new IntentRegistry();
