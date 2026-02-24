const { CartesiaClient } = require('@cartesia/cartesia-js');
require('dotenv').config();

class TTSService {
    constructor() {
        const apiKey = process.env.CARTESIA_API_KEY;
        this.activeProcess = null; // Track the active implementation
        if (!apiKey) {
            console.error('CARTESIA_API_KEY not found in environment');
            this.client = null;
        } else {
            this.client = new CartesiaClient({ apiKey });
        }
    }

    /**
     * Stops the current TTS playback immediately.
     */
    stop() {
        if (this.activeProcess) {
            console.log('Stopping TTS playback...');
            try {
                this.activeProcess.kill('SIGKILL');
            } catch (e) {
                console.error('Failed to kill TTS process:', e);
            }
            this.activeProcess = null;
        }
    }

    /**
     * Converts text to speech.
     */
    async speak(text) {
        // Stop any currently playing audio before starting new one
        this.stop();

        // if (!this.client) return { error: 'TTS Service not configured' };

        // Fallback to macOS native 'say' command for local playback
        console.log(`TTS Speaking: ${text}`);
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            const child = spawn('say', [text]);

            this.activeProcess = child;

            child.on('close', (code) => {
                if (this.activeProcess === child) {
                    this.activeProcess = null;
                }
                resolve({ status: 'success', message: `Spoke: ${text}` });
            });

            child.on('error', (err) => {
                console.error('TTS Error:', err);
                if (this.activeProcess === child) {
                    this.activeProcess = null;
                }
                resolve({ error: err.message });
            });
        });
    }
}

module.exports = new TTSService();
