const { CartesiaClient } = require('@cartesia/cartesia-js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
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

        // Custom pronunciation dictionary
        this.pronunciationMap = {
            'api': 'A.P.I.',
            'ui': 'U.I.',
            'usa': 'U.S.A.',
            'sql': 'sequel',
            'json': 'jay-son',
            'gif': 'jiff',
            // Add custom slang, names or local place names as needed here
            'kirtos': 'Keer-tos'
        };

        this.cacheDir = path.join(os.homedir(), '.kirtos', 'tts_cache');
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
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
     * Pauses the current TTS playback.
     */
    pause() {
        if (this.activeProcess) {
            console.log('Pausing TTS playback...');
            try {
                this.activeProcess.kill('SIGSTOP');
            } catch (e) {
                console.error('Failed to pause TTS process:', e);
            }
        }
    }

    /**
     * Resumes the current TTS playback.
     */
    resume() {
        if (this.activeProcess) {
            console.log('Resuming TTS playback...');
            try {
                this.activeProcess.kill('SIGCONT');
            } catch (e) {
                console.error('Failed to resume TTS process:', e);
            }
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
     * Advanced normalizations for numbers, dates, acronyms, and custom pronunciations.
     */
    _normalizeText(text) {
        let normalized = text;

        // 1. Apply Dictionary Replacements (case-insensitive, whole word boundaries)
        Object.entries(this.pronunciationMap).forEach(([word, replacement]) => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            normalized = normalized.replace(regex, replacement);
        });

        // 2. Acronyms (e.g. NATO -> N.A.T.O.) - words with 3+ capitals
        normalized = normalized.replace(/\b([A-Z]{3,})\b/g, (match) => {
            return match.split('').join('.') + '.';
        });

        // 3. Simple Dates (e.g. 10/12 -> October twelfth)
        // This is a naive implementation; for robust parsing use a library, 
        // but for basic mapping we can map explicit months.
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const ordinals = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth", "twentieth", "twenty-first", "twenty-second", "twenty-third", "twenty-fourth", "twenty-fifth", "twenty-sixth", "twenty-seventh", "twenty-eighth", "twenty-ninth", "thirtieth", "thirty-first"];
        normalized = normalized.replace(/\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\b/g, (match, m, d) => {
            const outMonth = months[parseInt(m) - 1];
            const outDay = ordinals[parseInt(d) - 1] || d; // fallback for invalid days
            return `${outMonth} ${outDay}`;
        });

        // 4. Basic Number to Word translation (0-10 just as an example for better flow)
        const numMap = { '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten' };
        normalized = normalized.replace(/\b([0-9]|10)\b/g, (match) => {
            return numMap[match] || match;
        });

        return normalized;
    }

    /**
     * Check cache for existing audio
     */
    _getCacheFilePath(text, voiceId, speed, emotion) {
        const hash = crypto.createHash('md5').update(`${text}-${voiceId}-${speed}-${emotion}`).digest('hex');
        return path.join(this.cacheDir, `${hash}.wav`);
    }

    /**
     * Plays an audio file using native afplay.
     */
    _playAudioFile(filePath) {
        return new Promise((resolve) => {
            const child = spawn('afplay', [filePath]);
            this.activeProcess = child;

            child.on('close', (code) => {
                if (this.activeProcess === child) this.activeProcess = null;

                let base64Audio = null;
                try {
                    base64Audio = fs.readFileSync(filePath).toString('base64');
                } catch (e) {
                    console.error("Failed to read audio file for base64 return:", e.message);
                }

                resolve({
                    status: 'success',
                    source: 'cache/cartesia',
                    file_path: filePath,
                    audio_base64: base64Audio
                });
            });

            child.on('error', (err) => {
                console.error('Audio Playback Error:', err);
                if (this.activeProcess === child) this.activeProcess = null;
                resolve({ error: err.message });
            });
        });
    }

    /**
     * Fallback to macOS `say` command with voice and speed mapping.
     */
    _fallbackSay(text, speedOption) {
        console.log(`[TTS] Falling back to macOS 'say'...`);
        return new Promise((resolve) => {
            // Speed mapping: say default is ~175. speed='fast' ~220, 'slow' ~130
            let rate = '175';
            if (speedOption === 'fast') rate = '220';
            else if (speedOption === 'slow') rate = '130';

            const child = spawn('say', ['-r', rate, text]);
            this.activeProcess = child;

            child.on('close', (code) => {
                if (this.activeProcess === child) this.activeProcess = null;
                resolve({ status: 'success', source: 'fallback_say' });
            });

            child.on('error', (err) => {
                console.error('TTS Say Error:', err);
                if (this.activeProcess === child) this.activeProcess = null;
                resolve({ error: err.message });
            });
        });
    }

    /**
     * Converts text to speech.
     * @param {string} text The text to speak.
     * @param {object} options Options for playback (voice, speed, emotion).
     */
    async speak(text, options = {}) {
        // Stop any currently playing audio before starting new one
        this.stop();

        // Clean up text for voice output
        const cleaned = this._cleanForSpeech(text);
        const normalized = this._normalizeText(cleaned);
        const spoken = normalized || text; // fallback to original if cleaning nukes everything

        const voiceId = options.voice || '95d51f79-c397-46f9-b49a-23763d3eaa2d'; // Custom Kirtos voice
        const speed = options.speed || 'normal';
        const emotion = options.emotion || 'neutral'; // Available mapped via Cartesia controls

        console.log(`TTS Speaking: ${spoken}`);

        // 1. Check Cache
        const cachePath = this._getCacheFilePath(spoken, voiceId, speed, emotion);
        if (fs.existsSync(cachePath)) {
            console.log('[TTS] Playing from cache.');
            return this._playAudioFile(cachePath);
        }

        // 2. Try High-Quality TTS (Cartesia)
        if (this.client) {
            try {
                console.log(`[TTS] Generating with Cartesia...`);
                // Use a websocket to generate standard quality, or standard file download
                const response = await this.client.tts.bytes({
                    modelId: "sonic-english",
                    transcript: spoken,
                    voice: {
                        mode: "id",
                        id: voiceId,
                        __experimental_controls: {
                            speed: speed,
                            emotion: [emotion, "high"]
                        }
                    },
                    outputFormat: {
                        container: "wav",
                        encoding: "pcm_s16le",
                        sampleRate: 44100
                    }
                });

                // The SDK returns an async iterable (Node18UniversalStreamWrapper)
                const chunks = [];
                for await (const chunk of response) {
                    chunks.push(chunk);
                }
                const buffer = Buffer.concat(chunks);

                // Save to cache
                fs.writeFileSync(cachePath, buffer);
                console.log('[TTS] Cached new generation.');

                return this._playAudioFile(cachePath);

            } catch (err) {
                console.error(`[TTS] Cartesia generation failed: ${err.message}. Falling back.`);
                // Fallthrough to macOS say
            }
        }

        // 3. Fallback (macOS say)
        return this._fallbackSay(spoken, speed);
    }
}

module.exports = new TTSService();
