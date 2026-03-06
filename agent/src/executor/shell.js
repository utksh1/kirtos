const { spawn, execSync } = require('child_process');
const ProcessPool = require('../utils/process-pool');

class ShellExecutor {
    constructor() {
        this.pool = new ProcessPool('/bin/zsh', ['-is'], { stdio: ['pipe', 'pipe', 'pipe'] }, 2);
    }

    async execute(intent, params) {
        if (intent !== 'shell.exec') {
            throw new Error(`ShellExecutor: Unsupported intent "${intent}"`);
        }

        // Preflight Check
        const command = params.command;
        try {
            execSync(`which ${command}`, { stdio: 'ignore' });
        } catch (e) {
            return { error: `Preflight failed: Command "${command}" not found on system.` };
        }

        // For complex commands with multiple args, we stick to spawn for safety
        // But for many internal automation scripts, we'll try to use the pool if possible.
        // Actually, let's use the pool for all shell.exec if it's just a string command.

        const fullCommand = [params.command, ...(params.args || [])].join(' ');

        try {
            const { stdout, stderr } = await this.pool.run(fullCommand);
            return {
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                command: fullCommand,
                message: this._successMessage(params.command, params.args || [])
            };
        } catch (err) {
            // Fallback to traditional spawn if pool fails
            return this._exec(
                params.command,
                params.args || [],
                params.options || {}
            );
        }
    }

    async _exec(command, args, options = {}) {
        const cleanArgs = args.map(arg =>
            typeof arg === 'string'
                ? arg.replace(/^['"]|['"]$/g, '')
                : String(arg)
        );

        const cwd = options.cwd || process.cwd();
        const env = { ...process.env, ...(options.env || {}) };
        const timeout = options.timeout || 0;

        return new Promise((resolve) => {
            const child = spawn(command, cleanArgs, {
                cwd,
                env,
                shell: true
            });

            let stdout = '';
            let stderr = '';
            let killed = false;

            let timer;
            if (timeout > 0) {
                timer = setTimeout(() => {
                    killed = true;
                    child.kill('SIGKILL');
                }, timeout);
            }

            child.stdout.on('data', d => stdout += d.toString());
            child.stderr.on('data', d => stderr += d.toString());

            child.on('close', code => {
                if (timer) clearTimeout(timer);

                if (killed) {
                    resolve({
                        error: `Command timed out after ${timeout}ms`,
                        stdout,
                        stderr
                    });
                    return;
                }

                if (code === 0) {
                    resolve({
                        stdout: stdout.trim(),
                        stderr: stderr.trim(),
                        command: [command, ...cleanArgs].join(' '),
                        message: this._successMessage(command, cleanArgs)
                    });
                } else {
                    resolve({
                        error: `Exit code ${code}`,
                        stdout: stdout.trim(),
                        stderr: stderr.trim()
                    });
                }
            });

            child.on('error', err => {
                if (timer) clearTimeout(timer);
                resolve({
                    error: err.message,
                    stdout: '',
                    stderr: ''
                });
            });
        });
    }

    _successMessage(command, args) {
        if (command === 'open' && args.includes('-a')) {
            return `I've opened ${args[args.indexOf('-a') + 1]} for you.`;
        }

        if (command === 'ollama' && args[0] === 'serve') {
            return 'Ollama server started successfully.';
        }

        return `Command executed: ${command} ${args.join(' ')}`;
    }
}

module.exports = new ShellExecutor();
