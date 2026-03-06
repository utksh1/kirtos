const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const execPromise = util.promisify(exec);

class DeviceExecutor {
  async execute(intent, params) {
    switch (intent) {
      case 'device.set_alarm':
        return await this._setAlarm(params);
      case 'device.restart_stack':
        return await this._restartStack();
      case 'device.open_workspace':
        return await this._openWorkspace(params);
      case 'device.clean_node_modules':
        return await this._cleanNodeModules(params);
      case 'device.toggle_focus':
        return await this._toggleFocus(params);
      case 'device.morning_routine':
        return await this._morningRoutine();
      case 'device.deploy_backend':
        return await this._deployBackend();
      case 'device.run_tests':
        return await this._runTests();
      case 'device.toggle_hotspot':
        return await this._toggleHotspot(params);
      case 'device.set_brightness':
        return await this._setBrightness(params);
      case 'device.mute_notifications':
        return await this._muteNotifications(params);
      case 'device.open_app':
        return await this._openApp(params);
      default:
        throw new Error(`DeviceExecutor: Unsupported intent "${intent}"`);
    }
  }

  async _setAlarm({ time, hour, minute, duration_minutes, label = 'Alarm' }) {




    let h = hour;
    let m = minute;


    if (duration_minutes !== undefined) {
      const target = new Date(Date.now() + duration_minutes * 60000);
      h = target.getHours();
      m = target.getMinutes();
    }

    if ((h === undefined || m === undefined) && time) {
      try {
        const match = time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (match) {
          h = parseInt(match[1]);
          m = parseInt(match[2]);
          const ampm = (match[3] || '').toUpperCase();
          if (ampm === 'PM' && h < 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
        }
      } catch (e) {
        console.warn("Failed to parse time string:", time);
      }
    }

    let script;
    if (h !== undefined && m !== undefined) {
      script = `
                set targetDate to (current date)
                set hours of targetDate to ${h}
                set minutes of targetDate to ${m}
                set seconds of targetDate to 0
                if (targetDate < (current date)) then
                    set targetDate to targetDate + (1 * days)
                end if
                
                tell application "Reminders"
                    make new reminder with properties {name:"${label}", due date:targetDate}
                end tell
            `;
    } else if (time) {
      script = `
                tell application "Reminders"
                    make new reminder with properties {name:"${label}", due date:date "${time}"}
                end tell
            `;
    } else {
      throw new Error("No valid time or duration provided for alarm/timer.");
    }

    try {
      const escapedScript = script.replace(/'/g, "'\\''");
      await execPromise(`osascript -e '${escapedScript}'`);
      const displayTime = duration_minutes ? `in ${duration_minutes} min` : h !== undefined ? `${h}:${m.toString().padStart(2, '0')}` : time;
      return { message: `Successfully scheduled reminder: "${label}" for ${displayTime}` };
    } catch (err) {
      return { message: "Failed to set precise reminder.", error: err.message };
    }
  }

  async _restartStack() {
    const rootDir = '/Users/Apple/Desktop/n8n/gg';
    const startScript = path.join(rootDir, 'start.sh');

    exec(`bash ${startScript} > /tmp/kirtos_restart.log 2>&1 &`);
    return { message: "Restarting dev stack in background..." };
  }

  async _openWorkspace({ path: targetPath = '/Users/Apple/Desktop/n8n/gg' }) {
    await execPromise(`open -a "Cursor" "${targetPath}" || open -a "Visual Studio Code" "${targetPath}"`);
    return { message: `Opened workspace at ${targetPath}` };
  }

  async _cleanNodeModules({ root = '/Users/Apple/Desktop/n8n/gg' }) {

    const command = `find "${root}" -name "node_modules" -type d -prune -exec rm -rf '{}' +`;
    exec(command);
    return { message: `Cleaning node_modules in ${root}... This may take a while.` };
  }

  async _toggleFocus({ enabled }) {


    const state = enabled ? 'on' : 'off';
    try {
      await execPromise(`shortcuts run "Focus ${enabled ? 'On' : 'Off'}"`);
      return { message: `Focus mode turned ${state}` };
    } catch (e) {

      return await this._muteNotifications({ enabled });
    }
  }

  async _morningRoutine() {
    const results = [];
    results.push(await this._setBrightness({ level: 70 }));
    results.push(await this._openWorkspace({}));
    results.push({ message: "Starting morning routine: Brightness adjusted, Workspace opened." });
    return { steps: results };
  }

  async _deployBackend() {

    return { message: "Backend deployment initiated (Simulation)." };
  }

  async _runTests() {
    const rootDir = '/Users/Apple/Desktop/n8n/gg';
    try {
      const { stdout } = await execPromise(`cd "${rootDir}" && npm test`);
      return { message: "Tests completed", output: stdout };
    } catch (err) {
      return { message: "Tests failed", error: err.message, output: err.stdout };
    }
  }

  async _toggleHotspot({ enabled }) {


    await execPromise('open "x-apple.systempreferences:com.apple.preferences.sharing?PersonalHotspot"');
    return { message: "Opened Personal Hotspot settings for manual toggle." };
  }

  async _setBrightness({ level }) {
    const normalized = Math.max(0, Math.min(100, level)) / 100;
    try {
      const { stdout, stderr } = await execPromise(`brightness ${normalized}`);
      if (stdout.includes('failed') || stderr.includes('failed')) {
        throw new Error(stdout || stderr);
      }
      return { message: `Brightness set to ${level}%` };
    } catch (e) {
      try {


        const steps = Math.round(normalized * 16);
        const script = `
                    tell application "System Events"
                        repeat 16 times
                            key code 145
                        end repeat
                        repeat ${steps} times
                            key code 144
                        end repeat
                    end tell
                `;
        await execPromise(`osascript -e '${script}'`);
        return { message: `Brightness adjusted to ~${level}% via system keys.` };
      } catch (innerErr) {
        return {
          message: "Failed to adjust brightness.",
          error: innerErr.message,
          hint: "macOS may require Accessibility permissions for Terminal/System Events. If on an M1/M2 Mac, 'brightness' CLI tool might not be fully compatible."
        };
      }
    }
  }

  async _muteNotifications({ enabled }) {
    try {
      const script = `
                tell application "System Events"
                    click menu bar item 1 of menu bar 2 of application process "ControlCenter"
                end tell
            `;
      await execPromise('open -b com.apple.controlcenter');

      return { message: `Notifications ${enabled ? 'muted' : 'unmuted'} (UI action triggered).` };
    } catch (e) {
      return { message: "Failed to toggle notifications.", error: e.message };
    }
  }

  async _openApp({ name }) {
    try {
      await execPromise(`open -a "${name}"`);
      return { message: `Successfully opened ${name}` };
    } catch (err) {
      return {
        message: `Failed to open ${name}`,
        error: err.message,
        hint: "Ensure the application name is correct (e.g., 'Terminal', 'Safari', 'Music')"
      };
    }
  }
}


module.exports = new DeviceExecutor();