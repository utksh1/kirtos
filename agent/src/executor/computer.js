const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const execPromise = util.promisify(exec);
// Circular dependency warning: we might need intelligence service here if we do analysis inside executor
// But usually better to keep executor dumb. 
// However, for "What's on my screen", the action IS "analyze screen".
// Let's rely on the result summary to handle the analysis IF we return the image path?
// No, the summary is typically for "I did X". Analysis is the *result* of X.
// Let's treat screen capture as a tool that returns a path. 
// BUT the user asked "What's on the screen". 
// Let's inject a helper to analyze if needed, or better:
// The `summarizeOutcome` in index.js can see the image path and call `analyzeImage`?
// Or we explicitly have a `screen.analyze` intent.

class ComputerExecutor {
    async execute(intent, params) {
        switch (intent) {
            case 'computer.type':
                return await this._type(params.text);
            case 'computer.press':
                return await this._press(params.key, params.modifiers);
            case 'screen.capture':
                return await this._capture(params.path);
            default:
                throw new Error(`ComputerExecutor: Unsupported intent "${intent}"`);
        }
    }

    async _type(text) {
        try {
            // Escape double quotes and backslashes for AppleScript
            const escapedText = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            await execPromise(`osascript -e 'tell application "System Events" to keystroke "${escapedText}"'`);
            return {
                status: 'success',
                message: `Typed text: "${text}"`
            };
        } catch (err) {
            return { error: `Typing failed: ${err.message}` };
        }
    }

    async _press(key, modifiers = []) {
        // TODO: Implement cleaner key mapping if needed.
        // For now, this is a stub or simple implementation.
        return { error: 'Not implemented yet' };
    }

    async _capture(customPath) {
        try {
            const timestamp = Date.now();
            const filePath = customPath || path.join('/tmp', `gg_screen_${timestamp}.png`);

            // -x: mute sound, -C: capture cursor
            await execPromise(`screencapture -x -C ${filePath}`);

            return {
                status: 'success',
                path: filePath,
                message: 'Screen captured successfully.'
            };
        } catch (err) {
            return { error: `Screen capture failed: ${err.message}` };
        }
    }
}

module.exports = new ComputerExecutor();
