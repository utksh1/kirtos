const IntentRegistry = require('./registry');
const TrustManager = require('./trust');
const ContentGuard = require('./guard');
const { Permissions } = require('./permissions');
const { PolicyExplanations } = require('./explanations');

class PolicyEngine {
  static riskRank(risk) {
    const ranks = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    return ranks[risk] || 0;
  }

  static mapRiskToProfile(risk) {
    if (risk === 'medium') return 'restricted';
    if (risk === 'high' || risk === 'critical') return 'dangerous';
    return 'safe';
  }




  static evaluatePlan(plan, sessionId, clientId = 'default') {
    const fingerprint = IntentRegistry.getFingerprint();
    const decisions = plan.map((request) => {
      const decision = this.evaluate(request, sessionId, clientId, { plan });
      return {
        intent: request.intent,
        params: request.params,
        ...decision
      };
    });

    const requiresConfirmation = decisions.some((d) => d.requires_confirmation);
    const anyDenied = decisions.find((d) => !d.allowed);

    if (anyDenied) {
      return {
        allowed: false,
        reason: anyDenied.reason,
        explanation: anyDenied.explanation,
        capability_fingerprint: fingerprint,
        decisions
      };
    }

    return {
      allowed: true,
      requires_confirmation: requiresConfirmation,
      capability_fingerprint: fingerprint,
      decisions
    };
  }




  static evaluate(request, sessionId = null, clientId = 'default', context = {}) {
    const fingerprint = IntentRegistry.getFingerprint();


    const intentName = request.intent;
    if (!intentName) {
      return this._deny('No intent specified', PolicyExplanations.intentDenied('none'), fingerprint);
    }

    const intentDef = IntentRegistry.get(intentName);
    if (!intentDef) {
      return this._deny(`Unknown intent: ${intentName}`, PolicyExplanations.intentDenied(intentName), fingerprint);
    }


    const paramsValidation = intentDef.schema.safeParse(request.params || {});
    if (!paramsValidation.success) {
      return this._deny('Validation failed', PolicyExplanations.validationFailed(paramsValidation.error.message), fingerprint);
    }

    const hazards = ContentGuard.scan(request.params);
    let hazardRiskOverride = 'low';
    let hazardWarnings = [];


    const strictRefusal = hazards.find((h) => ContentGuard.STRICT_REFUSE_CODES.includes(h.reasonCode));
    if (strictRefusal) {
      return this._deny(
        `Security Violation: ${strictRefusal.pattern}`,
        `The request contains a strictly forbidden payload [${strictRefusal.reasonCode}]. Access denied for system safety.`,
        fingerprint
      );
    }

    if (hazards.length > 0) {
      hazardWarnings = hazards.map((h) => `[${h.severity}] ${h.pattern} (${h.reasonCode})`);
      const severityToRisk = { 'low': 'low', 'medium': 'medium', 'high': 'high', 'critical': 'critical' };
      for (const h of hazards) {
        if (this.riskRank(severityToRisk[h.severity]) > this.riskRank(hazardRiskOverride)) {
          hazardRiskOverride = severityToRisk[h.severity];
        }
      }
    }


    const requiredPermissions = intentDef.permissions;
    let highestRisk = intentDef.risk;

    if (this.riskRank(hazardRiskOverride) > this.riskRank(highestRisk)) {
      highestRisk = hazardRiskOverride;
    }

    let requiresConfirmation = false;
    let confirmationReasons = [...hazardWarnings];

    if (hazards.length > 0) {
      requiresConfirmation = true;
    }

    for (const permName of requiredPermissions) {
      const perm = Permissions[permName];
      if (!perm) {
        return this._deny('Missing permission definition', PolicyExplanations.permissionMissing(permName), fingerprint);
      }

      const isTrusted = sessionId && TrustManager.isTrusted(sessionId, clientId, permName, context);

      if (this.riskRank(perm.risk) > this.riskRank(highestRisk)) {
        highestRisk = perm.risk;
      }

      if (perm.confirmation && !isTrusted) {
        requiresConfirmation = true;
        confirmationReasons.push(`the permission "${permName}" is high-risk`);
      }

      if (isTrusted) {
        TrustManager.consume(sessionId, clientId, permName);
      }
    }


    const confidence = request.confidence !== undefined ? request.confidence : 1.0;
    if (confidence < 0.3) {
      requiresConfirmation = true;
      confirmationReasons.push("the system's confidence is low");
    }


    const profile = this.mapRiskToProfile(highestRisk);
    if (profile === 'dangerous' && !requiresConfirmation) {
      const hasUntrustedSensitivePerm = requiredPermissions.some((p) => !TrustManager.isTrusted(sessionId, clientId, p, context));
      if (hasUntrustedSensitivePerm) {
        requiresConfirmation = true;
        confirmationReasons.push(`the action risk is ${highestRisk}`);
      }
    }


    let explanation = PolicyExplanations.allowed(intentName);
    if (requiresConfirmation) {
      explanation = PolicyExplanations.confirmationRequired(confirmationReasons);
    }

    return {
      allowed: true,
      execution_profile: profile,
      requires_confirmation: requiresConfirmation,
      runtime: intentDef.runtime,
      risk: highestRisk,
      explanation: explanation,
      permissions: requiredPermissions,
      params: paramsValidation.data,
      capability_fingerprint: fingerprint,
      guard_findings: hazards
    };
  }

  static _deny(reason, explanation, fingerprint) {
    return {
      allowed: false,
      reason: reason,
      explanation: explanation,
      capability_fingerprint: fingerprint
    };
  }
}

PolicyEngine.IntentRegistry = IntentRegistry;

module.exports = { PolicyEngine };