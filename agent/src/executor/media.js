const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const execPromise = util.promisify(exec);


const AUDIO_EXTENSIONS = new Set([
'.mp3', '.m4a', '.aac', '.flac', '.wav', '.ogg', '.aiff', '.wma']
);

class MediaExecutor {
  async execute(intent, params) {
    switch (intent) {
      case 'media.play_music':
        return await this._playMusic(params.query);
      case 'media.list_music':
        return await this._listMusic();
      case 'media.pause':
        return await this._pause();
      case 'media.stop':
        return await this._stop();
      case 'media.resume':
        return await this._resume();
      default:
        throw new Error(`MediaExecutor: Unsupported intent "${intent}"`);
    }
  }


  async _pause() {
    try {
      await execPromise('osascript -e "tell application \\"System Events\\" to key code 103"');
      return { status: 'success', message: 'Playback paused.' };
    } catch (err) {
      return { error: 'Failed to pause playback.' };
    }
  }


  async _resume() {
    try {
      await execPromise('osascript -e "tell application \\"System Events\\" to key code 103"');
      return { status: 'success', message: 'Playback resumed.' };
    } catch (err) {
      return { error: 'Failed to resume playback.' };
    }
  }


  async _stop() {
    const scripts = [

    'tell application "Google Chrome" to close (tabs of windows whose title contains "YouTube")',

    'tell application "Safari" to close (tabs of windows whose title contains "YouTube")',

    'if application "Music" is running then tell application "Music" to pause',

    'if application "Spotify" is running then tell application "Spotify" to pause',

    'if application "VLC" is running then tell application "VLC" to quit'];


    try {
      for (const script of scripts) {
        try {await execPromise(`osascript -e '${script}'`);} catch (e) {}
      }

      await execPromise('osascript -e "tell application \\"System Events\\" to key code 103"');

      return { status: 'success', message: 'Attempted to stop all media playback.' };
    } catch (err) {
      return { error: 'Failed to stop playback fully.' };
    }
  }






  async _playMusic(query) {
    const musicDir = path.join(os.homedir(), 'Music');

    if (!fs.existsSync(musicDir)) {
      return {
        status: 'failed',
        error: 'Music directory not found at ~/Music'
      };
    }

    try {
      const songs = this._scanForAudio(musicDir);

      if (songs.length === 0) {
        return {
          status: 'failed',
          error: 'No audio files found in ~/Music',
          hint: 'Add .mp3, .m4a, .flac, or other audio files to your Music folder.'
        };
      }

      let selected;
      if (query) {
        const q = query.toLowerCase();

        const matches = songs.filter((s) => {
          const name = path.basename(s).toLowerCase();
          return q.split(/\s+/).every((word) => name.includes(word));
        });


        if (matches.length === 0) {
          const looseMatches = songs.filter((s) =>
          path.basename(s).toLowerCase().includes(q)
          );
          selected = looseMatches.length > 0 ?
          looseMatches[Math.floor(Math.random() * looseMatches.length)] :
          null;
        } else {
          selected = matches[Math.floor(Math.random() * matches.length)];
        }

        if (!selected) {
          return {
            status: 'failed',
            error: `No song matching "${query}" found in ~/Music`,
            available: songs.slice(0, 10).map((s) => path.basename(s))
          };
        }
      } else {

        selected = songs[Math.floor(Math.random() * songs.length)];
      }

      const songName = path.basename(selected);
      await execPromise(`open "${selected}"`);

      return {
        status: 'success',
        message: `Playing "${songName}"`,
        file: selected
      };
    } catch (err) {
      return {
        status: 'failed',
        error: `Failed to play music: ${err.message}`
      };
    }
  }




  async _listMusic() {
    const musicDir = path.join(os.homedir(), 'Music');

    if (!fs.existsSync(musicDir)) {
      return { status: 'failed', error: 'Music directory not found' };
    }

    const songs = this._scanForAudio(musicDir);
    return {
      status: 'success',
      count: songs.length,
      songs: songs.slice(0, 25).map((s) => path.basename(s)),
      note: songs.length > 25 ? `Showing 25 of ${songs.length} songs.` : undefined
    };
  }




  _scanForAudio(dir, depth = 0) {
    if (depth > 2) return [];

    let results = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results = results.concat(this._scanForAudio(fullPath, depth + 1));
        } else if (AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
          results.push(fullPath);
        }
      }
    } catch (_) {


      // Permission denied or other FS error — skip silently
    }return results;}
}

module.exports = new MediaExecutor();