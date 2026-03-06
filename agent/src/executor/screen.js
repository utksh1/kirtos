const { spawn } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');









class ScreenExecutor {
  constructor() {

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
        errorCode: error.code || 'SCREEN_CAPTURE_FAILED',
        message: error.message
      };
    }
  }




  async _screenshot(params) {

    const mode = params.mode || 'full';
    const format = params.format || 'png';
    const includeCursor = params.include_cursor || false;
    const copyToClipboard = params.copy_to_clipboard || false;
    const filenameHint = params.filename_hint || null;

    const validModes = ['full', 'window', 'interactive'];
    if (!validModes.includes(mode)) {
      return {
        status: 'error',
        errorCode: 'SCREEN_INVALID_PARAMS',
        message: `Invalid mode "${mode}". Supported: ${validModes.join(', ')}`
      };
    }

    const validFormats = ['png', 'jpg'];
    if (!validFormats.includes(format)) {
      return {
        status: 'error',
        errorCode: 'SCREEN_INVALID_PARAMS',
        message: `Invalid format "${format}". Supported: ${validFormats.join(', ')}`
      };
    }


    try {
      if (!fs.existsSync(this.SCREENSHOT_DIR)) {
        fs.mkdirSync(this.SCREENSHOT_DIR, { recursive: true });
      }
    } catch (err) {
      return {
        status: 'error',
        errorCode: 'SCREEN_STORAGE_ERROR',
        message: `Failed to create screenshot directory: ${err.message}`
      };
    }


    const filename = this._buildFilename(filenameHint, format);
    const outputPath = path.join(this.SCREENSHOT_DIR, filename);


    try {
      this._validatePath(outputPath);
    } catch (err) {
      return {
        status: 'error',
        errorCode: 'SCREEN_INVALID_PARAMS',
        message: err.message
      };
    }


    const args = this._buildArgs(mode, format, includeCursor, copyToClipboard, outputPath);


    const timeoutMs = mode === 'interactive' ? 30000 : 5000;


    await this._runScreenCapture(args, timeoutMs);


    if (!fs.existsSync(outputPath)) {
      const errorMsg = 'Screenshot command completed but file was not created';
      return {
        status: 'error',
        errorCode: 'SCREEN_CAPTURE_FAILED',
        message: errorMsg,
        remediation: 'Check if Kirtos has Screen Recording permissions in System Settings.'
      };
    }

    return {
      status: 'success',
      path: outputPath,
      mode,
      format
    };
  }












  _buildFilename(hint, format) {
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    'T' +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0');

    let base = 'kirtos';
    if (hint && typeof hint === 'string') {

      base = hint.replace(/[^A-Za-z0-9_]/g, '-').

      replace(/-+/g, '-').

      replace(/^-+|-+$/g, '');

      if (base.length === 0) {
        base = 'kirtos';
      } else {

        base = base.substring(0, 40);

        base = base.replace(/-+$/, '');
      }
    }

    const ext = format === 'jpg' ? 'jpg' : 'png';
    return `${base}-${timestamp}.${ext}`;
  }





  _validatePath(filePath) {
    const resolved = path.resolve(filePath);
    const dirResolved = path.resolve(this.SCREENSHOT_DIR);

    if (!resolved.startsWith(dirResolved + path.sep) && resolved !== dirResolved) {
      throw new Error('Path traversal detected: screenshot path escapes controlled directory');
    }
  }












  _buildArgs(mode, format, includeCursor, copyToClipboard, outputPath) {
    const args = ['-x'];


    args.push('-t', format);


    if (includeCursor) {
      args.push('-C');
    }


    if (copyToClipboard) {
      args.push('-c');
    }


    if (mode === 'window') {
      args.push('-w');
    } else if (mode === 'interactive') {
      args.push('-i');
    }



    args.push(outputPath);

    return args;
  }




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

      p.stderr.on('data', (d) => stderr += d.toString());

      p.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve();
        } else {
          const msg = stderr.trim();
          if (msg.includes('not permitted') || msg.includes('Screen Recording')) {
            reject(Object.assign(
              new Error('Enable Screen Recording for Kirtos in System Settings \u2192 Privacy & Security \u2192 Screen Recording.'),
              { code: 'SCREEN_PERMISSION_DENIED' }
            ));
          } else {
            reject(Object.assign(
              new Error(msg || `screencapture failed with exit code ${code}`),
              { code: 'SCREEN_CAPTURE_FAILED' }
            ));
          }
        }
      });

      p.on('error', (err) => {
        clearTimeout(timer);
        reject(Object.assign(
          new Error(`Failed to spawn screencapture: ${err.message}`),
          { code: 'SCREEN_CAPTURE_FAILED' }
        ));
      });
    });
  }




  async healthCheck() {
    return new Promise((resolve) => {
      const p = spawn('which', ['screencapture']);
      p.on('close', (code) => {
        if (code === 0) {
          resolve({ status: 'healthy', details: 'screencapture CLI available' });
        } else {
          resolve({ status: 'unhealthy', errorCode: 'SCREEN_CLI_MISSING', message: 'screencapture CLI not found' });
        }
      });
      p.on('error', () => {
        resolve({ status: 'unhealthy', errorCode: 'SCREEN_CLI_MISSING', message: 'Failed to check screencapture availability' });
      });
    });
  }
}

module.exports = new ScreenExecutor();