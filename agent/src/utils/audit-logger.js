const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * AuditLogger: Persists redacted audit traces to Disk in JSONL format.
 * Logs are stored at ~/.kirtos/logs/agent.log
 */
class AuditLogger {
    constructor() {
        this.logDir = path.join(os.homedir(), '.kirtos', 'logs');
        this.logFile = path.join(this.logDir, 'agent.log');
        this.initialized = false;
        this._init();
    }

    _init() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
            // Ensure file exists
            if (!fs.existsSync(this.logFile)) {
                fs.writeFileSync(this.logFile, '');
            }
            this.initialized = true;
            this.MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
        } catch (err) {
            console.error('[AuditLogger] Initialization failed:', err.message);
        }
    }

    /**
     * Appends a redacted audit trace to the log file.
     * @param {Object} trace Redacted audit trace object.
     */
    log(trace) {
        if (!this.initialized) return;

        try {
            this._rotateIfNeeded();
            const entry = JSON.stringify(trace) + '\n';
            fs.appendFileSync(this.logFile, entry, 'utf8');
        } catch (err) {
            console.error('[AuditLogger] Failed to write audit log:', err.message);
        }
    }

    _rotateIfNeeded() {
        try {
            const stats = fs.statSync(this.logFile);
            if (stats.size >= this.MAX_LOG_SIZE) {
                const backupFile = this.logFile + '.1';
                if (fs.existsSync(backupFile)) {
                    fs.unlinkSync(backupFile);
                }
                fs.renameSync(this.logFile, backupFile);
                fs.writeFileSync(this.logFile, '');
            }
        } catch (err) {
            // If file doesn't exist yet, stats will fail, just ignore
        }
    }

    /**
     * Helper to redact and log a full trace in one go if needed.
     * @param {Object} trace Raw audit trace.
     * @param {Redactor} redactor Redactor instance.
     */
    logRedacted(trace, redactor) {
        this.log(trace);
    }
}

module.exports = new AuditLogger();
