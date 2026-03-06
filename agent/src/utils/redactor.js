const crypto = require('crypto');





class Redactor {
  constructor(mode = 'normal') {
    this.mode = mode;
    this.SALT = process.env.AUDIT_SALT || 'kirtos-default-salt';
  }




  redact(intentName, params) {
    if (this.mode === 'debug') return params;
    if (!params || typeof params !== 'object') return params;

    const redacted = { ...params };


    if (intentName === 'whatsapp.send') {
      if (redacted.message) {
        redacted.message = this._redactText(redacted.message);
      }
      if (redacted.number) {
        redacted.number = this._redactIdentity(redacted.number);
      }
    }

    if (intentName && (intentName.startsWith('file.') || intentName.startsWith('system.') || intentName.startsWith('screen.'))) {
      const pathKeys = ['path', 'filepath', 'dest', 'src'];
      pathKeys.forEach((key) => {
        if (redacted[key]) redacted[key] = this._redactPath(redacted[key]);
      });
    }

    if (intentName === 'shell.exec' || intentName === 'shell.run') {
      if (redacted.command) redacted.command = this._redactCommand(redacted.command);
    }


    if (intentName === 'ui.type.text') {
      if (redacted.text) {
        redacted.text = this._redactText(redacted.text);
      }
    }




    Object.keys(redacted).forEach((key) => {
      const val = redacted[key];
      if (typeof val === 'string') {
        if (key.match(/email|phone|number|contact|id|token|key|password/i)) {
          redacted[key] = this._redactIdentity(val);
        }
      }
    });

    return redacted;
  }




  redactResult(intentName, result) {
    if (this.mode === 'debug') return result;
    if (!result || typeof result !== 'object') return result;

    const redacted = { ...result };

    if (intentName === 'screen.screenshot' && redacted.path) {

      redacted.path = this._redactPath(redacted.path);
    }

    return redacted;
  }

  _hash(val) {
    return crypto.createHash('sha256').update(val + this.SALT).digest('hex').substring(0, 12);
  }

  _redactText(text) {
    if (this.mode === 'strict') return `LEN:${text.length}_HASH:${this._hash(text)}`;

    const preview = text.substring(0, 20).replace(/\n/g, ' ');
    return `${preview}... [LEN:${text.length}_HASH:${this._hash(text)}]`;
  }

  _redactIdentity(id) {
    return `ID:${this._hash(id)}`;
  }

  _redactPath(p) {
    if (this.mode === 'strict') return `PATH_HASH:${this._hash(p)}`;

    const parts = p.split(/[\\/]/);
    const basename = parts[parts.length - 1];
    return `${basename} (HASH:${this._hash(p)})`;
  }

  _redactCommand(cmd) {

    const allowlist = ['ls', 'pwd', 'whoami', 'uptime'];
    const base = cmd.trim().split(' ')[0];
    if (allowlist.includes(base)) return `${base} ... [HASH:${this._hash(cmd)}]`;
    return `CMD_HASH:${this._hash(cmd)}`;
  }
}

module.exports = Redactor;