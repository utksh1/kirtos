const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Permissions } = require('../permissions');





class IntentRegistry {
  constructor() {
    this.intents = {};
    this.domains = {};
    this.domainPolicies = {};
    this.RESERVED_NAMESPACES = ['system', 'policy', 'internal', 'security'];
    this._loadDomains();
    this._loadLegacyIntents();
    this._generateFingerprint();
  }

  _loadDomains() {
    const domainsDir = path.join(__dirname, 'domains');
    if (!fs.existsSync(domainsDir)) return;

    const files = fs.readdirSync(domainsDir).filter((f) => f.endsWith('.js'));

    for (const file of files) {
      const domainDef = require(path.join(domainsDir, file));
      const domainName = domainDef.name;


      if (this.RESERVED_NAMESPACES.includes(domainName) && file !== `${domainName}.js`) {
        throw new Error(`IntentRegistry: Domain "${domainName}" uses a reserved namespace prefix.`);
      }


      if (this.domains[domainName]) {
        throw new Error(`IntentRegistry: Collision detected for domain "${domainName}"`);
      }


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


      for (const [key, def] of Object.entries(domainDef.intents)) {
        const fullName = `${domainName}.${key}`;


        this._validateRiskAlignment(fullName, def);


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





  _loadLegacyIntents() {
    try {
      const { Intents } = require('../intents');
      let loaded = 0;
      for (const [name, def] of Object.entries(Intents)) {
        if (!this.intents[name]) {
          this.intents[name] = {
            ...def,
            domain: '_legacy',
            version: '1.0.0'
          };
          loaded++;
        }
      }
      if (loaded > 0) {
        console.log(`[Policy] Loaded ${loaded} legacy intents from intents.js`);
      }
    } catch (err) {

    }
  }




  _validateDomainPolicy(domain, key, def) {
    const policy = this.domainPolicies[domain];
    const riskWeights = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };


    const intentWeight = riskWeights[def.risk] || 0;
    const floorWeight = riskWeights[policy.defaultRiskFloor] || 0;
    const ceilingWeight = riskWeights[policy.maxRiskCeiling] || 4;

    if (intentWeight < floorWeight) {
      throw new Error(`[Policy] Contract Violation: Intent "${domain}.${key}" violates ${domain} risk floor (${policy.defaultRiskFloor})`);
    }
    if (intentWeight > ceilingWeight) {
      throw new Error(`[Policy] Contract Violation: Intent "${domain}.${key}" exceeds ${domain} risk ceiling (${policy.maxRiskCeiling})`);
    }


    if (policy.forbidIntents && (policy.forbidIntents.includes(key) || policy.forbidIntents.includes(`${domain}.${key}`))) {
      throw new Error(`[Policy] Contract Violation: Intent name "${key}" is explicitly forbidden in domain "${domain}"`);
    }


    if (policy.allowedPermissions && !policy.allowedPermissions.includes('*')) {
      for (const perm of def.permissions) {
        if (!policy.allowedPermissions.includes(perm)) {
          throw new Error(`[Policy] Contract Violation: Intent "${domain}.${key}" requests unauthorized permission "${perm}" for domain "${domain}"`);
        }
      }
    }


    if (policy.allowedExecutors && !policy.allowedExecutors.includes('*')) {
      if (!policy.allowedExecutors.includes(def.runtime)) {
        throw new Error(`[Policy] Contract Violation: Intent "${domain}.${key}" attempts to use forbidden executor "${def.runtime}" for domain "${domain}"`);
      }
    }
  }





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
    const hash = crypto.createHash('sha256').
    update(JSON.stringify(dump)).
    digest('hex');

    this.fingerprint = hash;
    console.log(`[Policy] Capability Fingerprint: ${hash.substring(0, 16)} (Intents: ${Object.keys(this.intents).length})`);
  }




  dump() {
    const sortedIntents = Object.keys(this.intents).sort();
    return {
      intents: sortedIntents.map((key) => {
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
          preConditions: i.preConditions || [],
          postConditions: i.postConditions || [],
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

  getAll() {
    return this.intents;
  }

  getFingerprint() {
    return this.fingerprint;
  }
}

module.exports = new IntentRegistry();