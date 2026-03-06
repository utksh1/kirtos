const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const execPromise = util.promisify(exec);
// Circular dependency warning: we might need intelligence service here if we do analysis inside executor










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

    return { error: 'Not implemented yet' };
  }

  async _capture(customPath) {
    try {
      const timestamp = Date.now();
      const filePath = customPath || path.join('/tmp', `gg_screen_${timestamp}.png`);


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