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
    this.activeProcess = null;
    if (!apiKey) {
      console.error('CARTESIA_API_KEY not found in environment');
      this.client = null;
    } else {
      this.client = new CartesiaClient({ apiKey });
    }


    this.pronunciationMap = {
      'api': 'A.P.I.',
      'ui': 'U.I.',
      'usa': 'U.S.A.',
      'sql': 'sequel',
      'json': 'jay-son',
      'gif': 'jiff',

      'kirtos': 'Keer-tos'
    };

    this.cacheDir = path.join(os.homedir(), '.kirtos', 'tts_cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }




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




  _cleanForSpeech(text) {
    return text.

    replace(/https?:\/\/[^\s,)]+/gi, '').
    replace(/www\.[^\s,)]+/gi, '').

    replace(/(?:~|\.)?\/[\w\-./]+/g, '').

    replace(/:\d{2,5}/g, '').

    replace(/\s{2,}/g, ' ').
    replace(/,\s*,/g, ',').
    replace(/\(\s*\)/g, '').
    replace(/^\s*[,.\s]+/, '').
    replace(/[,.\s]+\s*$/, '').
    trim();
  }




  _normalizeText(text) {
    let normalized = text;


    Object.entries(this.pronunciationMap).forEach(([word, replacement]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      normalized = normalized.replace(regex, replacement);
    });


    normalized = normalized.replace(/\b([A-Z]{3,})\b/g, (match) => {
      return match.split('').join('.') + '.';
    });




    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const ordinals = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth", "twentieth", "twenty-first", "twenty-second", "twenty-third", "twenty-fourth", "twenty-fifth", "twenty-sixth", "twenty-seventh", "twenty-eighth", "twenty-ninth", "thirtieth", "thirty-first"];
    normalized = normalized.replace(/\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\b/g, (match, m, d) => {
      const outMonth = months[parseInt(m) - 1];
      const outDay = ordinals[parseInt(d) - 1] || d;
      return `${outMonth} ${outDay}`;
    });


    const numMap = { '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten' };
    normalized = normalized.replace(/\b([0-9]|10)\b/g, (match) => {
      return numMap[match] || match;
    });

    return normalized;
  }




  _getCacheFilePath(text, voiceId, speed, emotion) {
    const hash = crypto.createHash('md5').update(`${text}-${voiceId}-${speed}-${emotion}`).digest('hex');
    return path.join(this.cacheDir, `${hash}.wav`);
  }




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




  _fallbackSay(text, speedOption) {
    console.log(`[TTS] Falling back to macOS 'say'...`);
    return new Promise((resolve) => {

      let rate = '175';
      if (speedOption === 'fast') rate = '220';else
      if (speedOption === 'slow') rate = '130';

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






  async speak(text, options = {}) {

    this.stop();


    const cleaned = this._cleanForSpeech(text);
    const normalized = this._normalizeText(cleaned);
    const spoken = normalized || text;

    const voiceId = options.voice || '95d51f79-c397-46f9-b49a-23763d3eaa2d';
    const speed = options.speed || 'normal';
    const emotion = options.emotion || 'neutral';

    console.log(`TTS Speaking: ${spoken}`);


    const cachePath = this._getCacheFilePath(spoken, voiceId, speed, emotion);
    if (fs.existsSync(cachePath)) {
      console.log('[TTS] Playing from cache.');
      return this._playAudioFile(cachePath);
    }


    if (this.client) {
      try {
        console.log(`[TTS] Generating with Cartesia...`);

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


        const chunks = [];
        for await (const chunk of response) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);


        fs.writeFileSync(cachePath, buffer);
        console.log('[TTS] Cached new generation.');

        return this._playAudioFile(cachePath);

      } catch (err) {
        console.error(`[TTS] Cartesia generation failed: ${err.message}. Falling back.`);

      }
    }


    return this._fallbackSay(spoken, speed);
  }
}

module.exports = new TTSService();