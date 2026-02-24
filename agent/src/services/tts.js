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
     * Cleans text for TTS — strips URLs, file paths, and technical noise.
     */
    _cleanForSpeech(text) {
        return text
            // Remove URLs (http/https/www)
            .replace(/https?:\/\/[^\s,)]+/gi, '')
            .replace(/www\.[^\s,)]+/gi, '')
            // Remove file paths (/Users/..., ~/..., ./...)
            .replace(/(?:~|\.)?\/[\w\-./]+/g, '')
            // Remove port numbers like :3001, :5050
            .replace(/:\d{2,5}/g, '')
            // Clean up leftover artifacts
            .replace(/\s{2,}/g, ' ')          // collapse multiple spaces
            .replace(/,\s*,/g, ',')           // collapse double commas
            .replace(/\(\s*\)/g, '')          // remove empty parens
            .replace(/^\s*[,.\s]+/, '')       // leading punctuation
            .replace(/[,.\s]+\s*$/, '')       // trailing punctuation
            .trim();
    }

    /**
     * Converts text to speech.
     */
    async speak(text) {
        // Stop any currently playing audio before starting new one
        this.stop();

        // Clean up text for voice output
        const cleaned = this._cleanForSpeech(text);
        const spoken = cleaned || text; // fallback to original if cleaning nukes everything

        // Fallback to macOS native 'say' command for local playback
        console.log(`TTS Speaking: ${spoken}`);
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            const child = spawn('say', [spoken]);

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
