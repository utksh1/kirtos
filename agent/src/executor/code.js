const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class CodeExecutor {
    async execute(intent, params) {
        switch (intent) {
            case 'network.ping':
                return await this._ping(params.target);
            case 'network.scan':
                return await this._scan(params.target);
            case 'code.run':
                return await this._runSnippet(params.language, params.code);
            default:
                throw new Error(`CodeExecutor: Unsupported intent "${intent}"`);
        }
    }

    async _ping(target) {
        try {
            const { stdout } = await execPromise(`ping -c 4 ${target}`);
            return {
                status: 'success',
                message: `Ping results for ${target}`,
                output: stdout
            };
        } catch (err) {
            return {
                status: 'failed',
                error: `Ping failed: ${err.message}`,
                output: err.stdout
            };
        }
    }

    async _scan(target) {
        try {
            // Use nmap if available, fallback to a simple ping sweep or report error
            const { stdout } = await execPromise(`nmap -F ${target}`);
            return {
                status: 'success',
                message: `Scan results for ${target}`,
                output: stdout
            };
        } catch (err) {
            return {
                status: 'failed',
                error: `Scan failed (Ensure nmap is installed): ${err.message}`,
                output: err.stdout
            };
        }
    }

    async _runSnippet(language, code) {
        let command;
        switch (language) {
            case 'python':
                command = `python3 -c "${code.replace(/"/g, '\\"')}"`;
                break;
            case 'node':
                command = `node -e "${code.replace(/"/g, '\\"')}"`;
                break;
            case 'bash':
                command = code;
                break;
            default:
                throw new Error(`Unsupported language: ${language}`);
        }

        try {
            const { stdout, stderr } = await execPromise(command);
            return {
                status: 'success',
                stdout: stdout.trim(),
                stderr: stderr.trim()
            };
        } catch (err) {
            return {
                status: 'failed',
                error: err.message,
                stdout: err.stdout,
                stderr: err.stderr
            };
        }
    }
}

module.exports = new CodeExecutor();
