const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const execPromise = util.promisify(exec);

/**
 * System Settings Executor
 * Manages macOS system states (Brightness, Volume, Clock, Focus, Apps)
 * follows a deterministic, CLI-first approach.
 */
class SettingsExecutor {
    async execute(intent, params) {
        try {
            switch (intent) {
                case 'system.brightness.set':
                    return await this._setBrightness(params.level);
                case 'system.volume.set':
                    return await this._setVolume(params.level);
                case 'system.volume.mute':
                    return await this._setMute(params.enabled);
                case 'clock.alarm.set':
                    return await this._setAlarm(params.time, params.label);
                case 'clock.timer.start':
                    return await this._startTimer(params.duration_seconds, params.label);
                case 'system.app.open':
                    return await this._openApp(params.app);
                case 'system.focus.set':
                    return await this._setFocus(params.mode, params.enabled);
                case 'system.notification.show':
                    return await this._showNotification(params.title, params.message);
                default:
                    throw new Error(`SettingsExecutor: Unsupported intent "${intent}"`);
            }
        } catch (error) {
            return {
                status: 'error',
                summary: `Failed to execute ${intent}`,
                details: error.message
            };
        }
    }

    /**
     * 1. Brightness Control
     * Uses 'brightness' CLI if available, falls back to AppleScript.
     */
    async _setBrightness(level) {
        // level is expected 0.0 to 1.0
        const normalized = Math.max(0, Math.min(1, level));
        try {
            // Priority: brightness CLI tool
            const { stdout, stderr } = await execPromise(`brightness ${normalized}`);

            // The 'brightness' tool often returns exit code 0 even if it fails with an error message
            if (stdout.includes('failed') || stderr.includes('failed')) {
                throw new Error(stdout || stderr);
            }

            return {
                status: 'success',
                summary: `Brightness set to ${Math.round(normalized * 100)}%`,
                details: { level: normalized, method: 'cli' }
            };
        } catch (e) {
            // Fallback: AppleScript (System Events)
            // This method is a bit slow but works on most Macs if Accessibility is granted.
            // It resets to 0 and then steps up to the desired level.
            try {
                const steps = Math.round(normalized * 16);
                const script = `
                    tell application "System Events"
                        -- Reset to 0 (Brightness Down)
                        repeat 16 times
                            key code 145
                        end repeat
                        -- Set to level (Brightness Up)
                        repeat ${steps} times
                            key code 144
                        end repeat
                    end tell
                `;
                await execPromise(`osascript -e '${script}'`);

                return {
                    status: 'success',
                    summary: `Brightness adjusted to ~${Math.round(normalized * 100)}% via System Events.`,
                    details: { level: normalized, method: 'applescript' }
                };
            } catch (innerErr) {
                return {
                    status: 'error',
                    summary: 'Failed to adjust brightness.',
                    details: 'The brightness tool failed, and AppleScript fallback also failed. Ensure Terminal has Accessibility permissions in System Settings > Privacy & Security.',
                    hint: 'If you have an M1/M2/M3 Mac, you might need a tool like "m-cli" or "BetterDisplay" CLI for better results.'
                };
            }
        }
    }

    /**
     * 2. Volume Control
     * Uses AppleScript via osascript.
     */
    async _setVolume(level) {
        // level 0-100
        const vol = Math.max(0, Math.min(100, level));
        await execPromise(`osascript -e "set volume output volume ${vol}"`);
        return {
            status: 'success',
            summary: `Volume set to ${vol}%`,
            details: { level: vol }
        };
    }

    async _setMute(enabled) {
        const state = enabled ? 'true' : 'false';
        await execPromise(`osascript -e "set volume output muted ${state}"`);
        return {
            status: 'success',
            summary: `System volume ${enabled ? 'muted' : 'unmuted'}`,
            details: { muted: enabled }
        };
    }

    /**
     * 3. Clock App Automation (Alarms & Timers)
     * MUST use macOS Shortcuts as per strict constraints.
     */
    async _setAlarm(time, label = 'Kirtos Alarm') {
        // Protocol: Shortcuts should have a shortcut named "Set Alarm"
        // that accepts input like "17:00,Label"
        try {
            await execPromise(`shortcuts run "Set Alarm" <<< "${time},${label}"`);
            return {
                status: 'success',
                summary: `Alarm set for ${time}`,
                details: { time, label, mechanism: 'shortcuts' }
            };
        } catch (e) {
            return {
                status: 'error',
                summary: 'Shortcut "Set Alarm" not found.',
                details: 'Create a Shortcut that takes text input and uses the "Add Alarm" action.'
            };
        }
    }

    async _startTimer(seconds, label = 'Timer') {
        try {
            await execPromise(`shortcuts run "Start Timer" <<< "${seconds},${label}"`);
            return {
                status: 'success',
                summary: `Timer started for ${seconds} seconds`,
                details: { duration: seconds, label, mechanism: 'shortcuts' }
            };
        } catch (e) {
            // Local fallback for timers (background process)
            exec(`sleep ${seconds} && osascript -e 'display notification "Timer ${label} Finished" with title "Kirtos Timer"' &`);
            return {
                status: 'success',
                summary: `Timer started for ${seconds}s (Background process fallback)`,
                details: { duration: seconds, label, fallback: true }
            };
        }
    }

    /**
     * 4. App Launching
     */
    async _openApp(appName) {
        try {
            await execPromise(`open -a "${appName}"`);
            return {
                status: 'success',
                summary: `Opened ${appName}`,
                details: { app: appName }
            };
        } catch (e) {
            throw new Error(`Could not find or open application: ${appName}`);
        }
    }

    /**
     * 5. Focus Mode
     */
    async _setFocus(mode, enabled) {
        const action = enabled ? 'On' : 'Off';
        try {
            // Leveraging Shortcuts for Focus is the Apple-recommended way for DND control via CLI
            await execPromise(`shortcuts run "Focus ${mode}" <<< "${action}"`);
            return {
                status: 'success',
                summary: `Focus mode "${mode}" turned ${action}`,
                details: { mode, enabled }
            };
        } catch (e) {
            return {
                status: 'error',
                summary: `Failed to toggle focus mode "${mode}"`,
                details: 'Ensure a Shortcut exists with this name to toggle DND/Focus.'
            };
        }
    }

    /**
     * 6. Notifications
     */
    async _showNotification(title, message) {
        await execPromise(`osascript -e 'display notification "${message}" with title "${title}"'`);
        return {
            status: 'success',
            summary: 'Notification displayed',
            details: { title, message }
        };
    }
}

module.exports = new SettingsExecutor();
