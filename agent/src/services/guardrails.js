



class GuardrailService {
  constructor() {
    this.executionEnabled = true;
    this.lastExecutions = new Map();
    this.defaultCooldown = 30 * 1000;

    this.cooldownOverrides = {
      'whatsapp.': 3 * 1000,
      'chat.': 1 * 1000
    };
  }




  _getCooldown(key) {
    for (const [prefix, cooldown] of Object.entries(this.cooldownOverrides)) {
      if (key.startsWith(prefix)) return cooldown;
    }
    return this.defaultCooldown;
  }






  canExecute(key) {
    if (!this.executionEnabled) {
      console.warn('Execution is globally disabled via Kill Switch.');
      return false;
    }

    const now = Date.now();
    const last = this.lastExecutions.get(key);
    const cooldown = this._getCooldown(key);

    if (last && now - last < cooldown) {
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