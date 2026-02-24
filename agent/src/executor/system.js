const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const guardrails = require('../services/guardrails');

class SystemExecutor {
    /**
     * Executes system-level intents.
     * @param {string} intent - The intent name (e.g., 'system.status')
     * @param {object} params - Parameters for the intent
     * @returns {Promise<object>} - The execution result
     */
    async execute(intent, params) {
        switch (intent) {
            case 'system.status':
                return await this._getStatus();
            case 'system.uptime':
                return await this._getUptime();
            case 'system.resource_usage':
                return await this._getResourceUsage();
            case 'system.kill_switch':
                guardrails.setExecutionEnabled(params.enabled);
                return {
                    message: `System execution has been ${params.enabled ? 'enabled' : 'disabled'}.`,
                    enabled: params.enabled
                };
            case 'query.help':
                return {
                    message: "I am Kirtos, your local macOS control agent. I can manage Docker containers, explore the filesystem, and run shell commands. Try asking 'What's the system status?' or 'List my files'."
                };
            case 'query.time':
                return {
                    time: new Date().toLocaleTimeString(),
                    date: new Date().toLocaleDateString(),
                    iso: new Date().toISOString()
                };
            case 'query.greet':
                return this._greet();
            default:
                throw new Error(`SystemExecutor: Unsupported intent "${intent}"`);
        }
    }

    async _getStatus() {
        try {
            const { stdout: hostname } = await execPromise('hostname');
            const { stdout: uptime } = await execPromise('uptime');

            return {
                hostname: hostname.trim(),
                uptime: uptime.trim(),
                platform: process.platform,
                arch: process.arch,
                node_version: process.version,
                execution_enabled: guardrails.getExecutionStatus(),
                timestamp: new Date().toISOString()
            };
        } catch (err) {
            return {
                error: `Failed to retrieve system status: ${err.message}`
            };
        }
    }

    async _getUptime() {
        try {
            const { stdout } = await execPromise('uptime');
            return { uptime: stdout.trim() };
        } catch (err) {
            return { error: `Failed to get uptime: ${err.message}` };
        }
    }

    async _getResourceUsage() {
        try {
            const { stdout: cpu } = await execPromise("top -l 1 | grep 'CPU usage'");
            const { stdout: mem } = await execPromise("top -l 1 | grep 'PhysMem'");
            return {
                cpu: cpu.trim(),
                memory: mem.trim(),
                note: "Resource usage snapshots from 'top'"
            };
        } catch (err) {
            return { error: `Failed to get resource usage: ${err.message}` };
        }
    }

    _greet() {
        const hour = new Date().getHours();
        let greeting, emoji;

        if (hour >= 4 && hour < 12) {
            greeting = 'Good morning';
            emoji = '☀️';
        } else if (hour >= 12 && hour < 17) {
            greeting = 'Good afternoon';
            emoji = '🌤️';
        } else if (hour >= 17 && hour < 22) {
            greeting = 'Good evening';
            emoji = '🌆';
        } else {
            greeting = 'Hey, night owl';
            emoji = '🌙';
        }

        return {
            message: `${emoji} ${greeting}! Kirtos at your service. How can I help you?`,
            time_of_day: greeting.replace('Hey, ', '').toLowerCase(),
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = new SystemExecutor();
