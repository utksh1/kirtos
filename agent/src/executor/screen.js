const { spawn } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');

/**
 * ScreenExecutor: Handles controlled macOS screenshot capture (Phase 1 MVP).
 *
 * All screenshots are saved exclusively to:
 *   ~/Library/Application Support/Kirtos/screenshots/
 *
 * No arbitrary file paths are accepted. No raw shell exposure.
 */
class ScreenExecutor {
    constructor() {
        // Controlled screenshot directory — never user-configurable
        this.SCREENSHOT_DIR = path.join(
            os.homedir(),
            'Library', 'Application Support', 'Kirtos', 'screenshots'
        );
    }

    async execute(intent, params) {
        try {
            switch (intent) {
                case 'screen.screenshot':
                    return await this._screenshot(params);
                default:
                    return {
                        status: 'error',
                        errorCode: 'UNSUPPORTED_INTENT',
                        message: `ScreenExecutor: Unsupported intent "${intent}"`
                    };
            }
        } catch (error) {
            return {
                status: 'error',
                errorCode: error.code || 'EXECUTION_FAILURE',
                message: error.message
            };
        }
    }

    /**
     * screen.screenshot — Capture macOS screenshot via `screencapture` CLI.
     */
    async _screenshot(params) {
        const mode = params.mode || 'full';
        const format = params.format || 'png';
        const includeCursor = params.include_cursor || false;
        const copyToClipboard = params.copy_to_clipboard || false;
        const filenameHint = params.filename_hint || null;

        // 1. Ensure screenshot directory exists
        this._ensureDirectory();

        // 2. Build safe filename
        const filename = this._buildFilename(filenameHint, format);
        const outputPath = path.join(this.SCREENSHOT_DIR, filename);

        // 3. Validate path (defense-in-depth against traversal)
        this._validatePath(outputPath);

        // 4. Build command arguments
        const args = this._buildArgs(mode, format, includeCursor, copyToClipboard, outputPath);

        // 5. Determine timeout based on mode
        const timeoutMs = mode === 'interactive' ? 30000 : 5000;

        // 6. Execute screencapture
        await this._runScreenCapture(args, timeoutMs);

        // 7. Verify the file was actually created
        if (!fs.existsSync(outputPath)) {
            return {
                status: 'error',
                errorCode: 'CAPTURE_FAILED',
                message: 'Screenshot command completed but file was not created'
            };
        }

        return {
            status: 'success',
            path: outputPath,
            mode,
            format
        };
    }

    /**
     * Ensure the controlled screenshot directory exists.
     */
    _ensureDirectory() {
        if (!fs.existsSync(this.SCREENSHOT_DIR)) {
            fs.mkdirSync(this.SCREENSHOT_DIR, { recursive: true });
        }
    }

    /**
     * Build a sanitized filename from an optional hint plus timestamp.
     *
     * Rules:
     * - Only [A-Za-z0-9_-] allowed in the hint
     * - Truncate to 40 characters
     * - Always append ISO timestamp (compact)
     * - Force extension from format param
     */
    _buildFilename(hint, format) {
        const timestamp = new Date().toISOString()
            .replace(/[:.]/g, '')
            .replace('T', 'T')
            .replace('Z', '');

        let base;
        if (hint && typeof hint === 'string') {
            // Strip everything except A-Za-z0-9 hyphen underscore
            const sanitized = hint.replace(/[^A-Za-z0-9\-_]/g, '');
            // Truncate to 40 chars
            base = sanitized.substring(0, 40);
            if (base.length === 0) {
                base = 'kirtos';
            }
        } else {
            base = 'kirtos';
        }

        const ext = format === 'jpg' ? 'jpg' : 'png';
        return `${base}-${timestamp}.${ext}`;
    }

    /**
     * Validate that the resolved path is within the controlled directory.
     * Prevents directory traversal attacks.
     */
    _validatePath(filePath) {
        const resolved = path.resolve(filePath);
        const dirResolved = path.resolve(this.SCREENSHOT_DIR);

        if (!resolved.startsWith(dirResolved + path.sep) && resolved !== dirResolved) {
            throw Object.assign(
                new Error('Path traversal detected: screenshot path escapes controlled directory'),
                { code: 'PATH_TRAVERSAL' }
            );
        }
    }

    /**
     * Build screencapture CLI arguments.
     *
     * Base flags:
     *  -x   Disable UI sound
     *  -t   Format (png/jpg)
     *  -C   Include cursor
     *  -c   Copy to clipboard
     *  -w   Window mode
     *  -i   Interactive mode
     */
    _buildArgs(mode, format, includeCursor, copyToClipboard, outputPath) {
        const args = ['-x']; // Always disable capture sound

        // Format
        args.push('-t', format);

        // Include cursor
        if (includeCursor) {
            args.push('-C');
        }

        // Copy to clipboard
        if (copyToClipboard) {
            args.push('-c');
        }

        // Mode
        if (mode === 'window') {
            args.push('-w');
        } else if (mode === 'interactive') {
            args.push('-i');
        }
        // 'full' mode uses no extra flag (default behavior)

        // Output path (always last)
        args.push(outputPath);

        return args;
    }

    /**
     * Execute the `screencapture` command with proper timeout handling.
     */
    _runScreenCapture(args, timeoutMs) {
        return new Promise((resolve, reject) => {
            const p = spawn('screencapture', args);

            let stderr = '';
            const timer = setTimeout(() => {
                p.kill('SIGKILL');
                reject(Object.assign(
                    new Error(`Screenshot capture timed out after ${timeoutMs}ms`),
                    { code: 'SCREEN_CAPTURE_TIMEOUT' }
                ));
            }, timeoutMs);

            p.stderr.on('data', d => (stderr += d.toString()));

            p.on('close', code => {
                clearTimeout(timer);
                if (code === 0) {
                    resolve();
                } else {
                    const msg = stderr.trim();
                    if (msg.includes('not permitted') || msg.includes('Screen Recording')) {
                        reject(Object.assign(
                            new Error('Screen Recording permission denied. Grant permission in System Preferences > Privacy > Screen Recording.'),
                            { code: 'SCREEN_PERMISSION_DENIED' }
                        ));
                    } else {
                        reject(Object.assign(
                            new Error(msg || `screencapture failed with exit code ${code}`),
                            { code: 'CAPTURE_FAILED' }
                        ));
                    }
                }
            });

            p.on('error', err => {
                clearTimeout(timer);
                reject(Object.assign(
                    new Error(`Failed to spawn screencapture: ${err.message}`),
                    { code: 'SPAWN_FAILED' }
                ));
            });
        });
    }

    /**
     * Static helper: hash a path for audit logging (privacy-safe).
     */
    static hashPath(filePath) {
        return crypto.createHash('sha256').update(filePath).digest('hex').substring(0, 16);
    }
}

module.exports = new ScreenExecutor();
