



class PolicyExplanations {
  static intentDenied(intent) {
    return "The requested action is not supported by the current security policy.";
  }

  static permissionMissing(permission) {
    return `The action requires a permission that is not defined: "${permission}".`;
  }

  static allowed(intent) {
    return "The action is allowed under the current policy rules.";
  }

  static confirmationRequired(reasons) {
    const reasonStr = reasons.join(' and ');
    return `User confirmation is required because ${reasonStr}.`;
  }

  static validationFailed(error) {
    return `The request failed parameter validation: ${error}`;
  }
}

module.exports = { PolicyExplanations };