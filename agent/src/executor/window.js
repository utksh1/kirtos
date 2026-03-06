const { spawn } = require('node:child_process');
const path = require('node:path');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');

// ─── Error Codes ───────────────────────────────────────────────────────────────
const WindowErrorCodes = {
  WINDOW_AX_DENIED: 'WINDOW_AX_DENIED',
  WINDOW_NO_FRONTMOST: 'WINDOW_NO_FRONTMOST',
  WINDOW_ACTION_FAILED: 'WINDOW_ACTION_FAILED',
  WINDOW_OUT_OF_BOUNDS: 'WINDOW_OUT_OF_BOUNDS',
  WINDOW_INVALID_PAYLOAD: 'WINDOW_INVALID_PAYLOAD',
  WINDOW_HELPER_CRASHED: 'WINDOW_HELPER_CRASHED',
  WINDOW_HELPER_TIMEOUT: 'WINDOW_HELPER_TIMEOUT',
  WINDOW_HELPER_NOT_READY: 'WINDOW_HELPER_NOT_READY',
  WINDOW_STOPPED: 'WINDOW_STOPPED'
};


const ACTION_TIMEOUTS = {
  focus: 3000,
  minimize: 2000,
  maximize: 3000,
  close: 2000,
  move: 2000,
  resize: 2000
};


const HELPER_BINARY = path.resolve(
  __dirname, '..', '..', 'native', 'window-helper', '.build', 'release', 'kirtos-window-helper'
);


















class WindowExecutor extends EventEmitter {
  constructor() {
    super();
    this._process = null;
    this._ready = false;
    this._stopped = false;
    this._pendingRequests = new Map();
    this._lineBuffer = '';
    this._restartCount = 0;
    this._maxRestarts = 3;
    this._startupResolver = null;
  }



  async execute(intent, params) {
    if (this._stopped) {
      return {
        status: 'error',
        errorCode: WindowErrorCodes.WINDOW_STOPPED,
        message: 'Window helper is stopped. Call restart() to re-enable.'
      };
    }

    const actionMap = {
      'window.focus.app': 'focus',
      'window.minimize': 'minimize',
      'window.maximize': 'maximize',
      'window.close': 'close',
      'window.move': 'move',
      'window.resize': 'resize'
    };

    const action = actionMap[intent];
    if (!action) {
      return {
        status: 'error',
        errorCode: WindowErrorCodes.WINDOW_INVALID_PAYLOAD,
        message: `WindowExecutor: Unknown intent "${intent}"`
      };
    }

    try {
      await this._ensureHelper();
      const result = await this._sendCommand(action, params);
      return { status: 'success', ...result };
    } catch (error) {
      return {
        status: 'error',
        errorCode: error.code || WindowErrorCodes.WINDOW_ACTION_FAILED,
        message: error.message
      };
    }
  }






  stop() {
    this._stopped = true;
    this._killHelper('Stop requested');
    this.emit('stopped');
  }





  restart() {
    this._stopped = false;
    this._restartCount = 0;
    this.emit('restarted');
  }




  get isReady() {
    return this._ready && this._process !== null && !this._stopped;
  }




  async healthCheck() {
    if (this._stopped) return { status: 'stopped', message: 'Window helper disabled' };
    if (this.isReady) return { status: 'healthy', details: 'Window helper active' };

    return {
      status: 'unhealthy',
      errorCode: WindowErrorCodes.WINDOW_HELPER_NOT_READY,
      message: this._process ? 'Helper starting...' : 'Helper not running'
    };
  }



  async _ensureHelper() {
    if (this._process && this._ready) return;
    if (this._restartCount >= this._maxRestarts) {
      throw Object.assign(
        new Error(`Helper crashed ${this._maxRestarts} times consecutively. Manual restart required.`),
        { code: WindowErrorCodes.WINDOW_HELPER_CRASHED }
      );
    }
    await this._spawnHelper();
  }

  _spawnHelper() {
    return new Promise((resolve, reject) => {
      this._lineBuffer = '';
      this._ready = false;


      const fs = require('node:fs');
      if (!fs.existsSync(HELPER_BINARY)) {
        reject(Object.assign(
          new Error(`Helper binary not found at: ${HELPER_BINARY}. Run: cd native/window-helper && ./build.sh`),
          { code: WindowErrorCodes.WINDOW_HELPER_NOT_READY }
        ));
        return;
      }

      this._process = spawn(HELPER_BINARY, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {}
      });


      const startupTimer = setTimeout(() => {
        this._killHelper('Startup timeout');
        reject(Object.assign(
          new Error('Helper failed to start within 5s'),
          { code: WindowErrorCodes.WINDOW_HELPER_TIMEOUT }
        ));
      }, 5000);


      this._process.stdout.on('data', (chunk) => {
        this._lineBuffer += chunk.toString();
        const lines = this._lineBuffer.split('\n');
        this._lineBuffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          this._handleResponse(line.trim());
        }
      });


      this._process.stderr.on('data', (chunk) => {
        console.error(`[window-helper stderr] ${chunk.toString().trim()}`);
      });


      this._process.on('close', (code, signal) => {
        clearTimeout(startupTimer);
        const wasReady = this._ready;
        this._ready = false;
        this._process = null;


        for (const [, pending] of this._pendingRequests) {
          clearTimeout(pending.timer);
          pending.reject(Object.assign(
            new Error(`Helper exited (code=${code}, signal=${signal})`),
            { code: WindowErrorCodes.WINDOW_HELPER_CRASHED }
          ));
        }
        this._pendingRequests.clear();

        if (wasReady && !this._stopped) {
          this._restartCount++;
          console.error(`[window-helper] Crashed (code=${code}). Restart ${this._restartCount}/${this._maxRestarts}`);
          this.emit('crashed', { code, signal, restartCount: this._restartCount });
        }
      });


      this._startupResolver = (msg) => {
        clearTimeout(startupTimer);
        if (msg.ok) {
          this._ready = true;
          this._restartCount = 0;
          this.emit('ready');
          resolve();
        } else {
          this._killHelper('Startup failed');
          reject(Object.assign(
            new Error(msg.message || 'Helper startup failed'),
            { code: msg.errorCode || WindowErrorCodes.WINDOW_HELPER_NOT_READY }
          ));
        }
      };
    });
  }

  _handleResponse(line) {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      console.error(`[window-helper] Invalid JSON response: ${line.substring(0, 100)}`);
      return;
    }


    if (msg.id === 'startup' && this._startupResolver) {
      this._startupResolver(msg);
      this._startupResolver = null;
      return;
    }


    const pending = this._pendingRequests.get(msg.id);
    if (!pending) {
      console.error(`[window-helper] Orphaned response for id: ${msg.id}`);
      return;
    }

    clearTimeout(pending.timer);
    this._pendingRequests.delete(msg.id);

    if (msg.ok) {
      pending.resolve({
        message: msg.message,
        windowInfo: msg.windowInfo || undefined
      });
    } else {
      pending.reject(Object.assign(
        new Error(msg.message || 'Helper returned error'),
        { code: msg.errorCode || WindowErrorCodes.WINDOW_ACTION_FAILED }
      ));
    }
  }

  _sendCommand(action, params) {
    return new Promise((resolve, reject) => {
      if (!this._process || !this._ready) {
        reject(Object.assign(
          new Error('Helper not ready'),
          { code: WindowErrorCodes.WINDOW_HELPER_NOT_READY }
        ));
        return;
      }

      const id = crypto.randomUUID ?
      crypto.randomUUID() :
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const timeout = ACTION_TIMEOUTS[action] || 2000;

      const timer = setTimeout(() => {
        this._pendingRequests.delete(id);
        reject(Object.assign(
          new Error(`Helper timeout for ${action} (${timeout}ms)`),
          { code: WindowErrorCodes.WINDOW_HELPER_TIMEOUT }
        ));
      }, timeout);

      this._pendingRequests.set(id, { resolve, reject, timer });

      const command = JSON.stringify({ id, action, params });
      this._process.stdin.write(command + '\n');
    });
  }

  _killHelper(reason) {
    if (this._process) {
      try {
        this._process.kill('SIGTERM');

        const p = this._process;
        setTimeout(() => {
          try {p.kill('SIGKILL');} catch {}
        }, 500);
      } catch {

      }
    }

    this._ready = false;


    for (const [, pending] of this._pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(Object.assign(
        new Error(`Helper killed: ${reason}`),
        { code: WindowErrorCodes.WINDOW_STOPPED }
      ));
    }
    this._pendingRequests.clear();
  }
}


const executor = new WindowExecutor();
module.exports = executor;


module.exports.WindowErrorCodes = WindowErrorCodes;
module.exports.WindowExecutor = WindowExecutor;
module.exports.HELPER_BINARY = HELPER_BINARY;
module.exports.ACTION_TIMEOUTS = ACTION_TIMEOUTS;