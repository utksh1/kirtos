const { Intents } = require('./intents');
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

    /**
     * Evaluates an intent request and returns a complete security decision.
     */
    static evaluate(request) {
        // 1. Intent Validation
        if (!request.intent) {
            return this._deny('No intent specified', PolicyExplanations.intentDenied('none'));
        }

        const intentDef = Intents[request.intent];
        if (!intentDef) {
            return this._deny(`Unknown intent: ${request.intent}`, PolicyExplanations.intentDenied(request.intent));
        }

        // 2. Parameter Validation
        const paramsValidation = intentDef.schema.safeParse(request.params || {});
        if (!paramsValidation.success) {
            return this._deny('Validation failed', PolicyExplanations.validationFailed(paramsValidation.error.message));
        }

        // 3. Permission Validation & Risk Aggregation
        const requiredPermissions = intentDef.permissions;
        let highestRisk = intentDef.risk;
        let requiresConfirmation = false;
        let confirmationReasons = [];

        for (const permName of requiredPermissions) {
            const perm = Permissions[permName];
            if (!perm) {
                return this._deny('Missing permission definition', PolicyExplanations.permissionMissing(permName));
            }

            // Elevate risk if permission is more dangerous than intent default
            if (this.riskRank(perm.risk) > this.riskRank(highestRisk)) {
                highestRisk = perm.risk;
            }

            // Check if permission itself forces confirmation
            if (perm.confirmation) {
                requiresConfirmation = true;
                confirmationReasons.push(`the permission "${permName}" is high-risk`);
            }
        }

        // 4. Intelligence Confidence Check
        const confidence = request.confidence !== undefined ? request.confidence : 1.0;
        if (confidence < 0.6) {
            requiresConfirmation = true;
            confirmationReasons.push("the system's confidence is low");
        }

        // 5. Overall Risk Profile Check
        const profile = this.mapRiskToProfile(highestRisk);
        if (profile === 'dangerous' && !requiresConfirmation) {
            requiresConfirmation = true;
            confirmationReasons.push(`the action risk is ${highestRisk}`);
        }

        // 6. Generate Final Explanation
        let explanation = PolicyExplanations.allowed(request.intent);
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
            permissions: requiredPermissions
        };
    }

    static _deny(reason, explanation) {
        return {
            allowed: false,
            reason: reason,
            explanation: explanation || "Action denied by security policy."
        };
    }
}

module.exports = { PolicyEngine };
