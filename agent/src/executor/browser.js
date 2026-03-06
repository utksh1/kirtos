const { exec } = require('child_process');
const util = require('util');
const https = require('https');
const execPromise = util.promisify(exec);


let playwright;
async function getPlaywright() {
  if (playwright) return playwright;
  try {
    playwright = require('playwright');
    return playwright;
  } catch (err) {
    throw new Error('Playwright not installed. Run `npm install playwright` and `npx playwright install chromium`.');
  }
}

class BrowserAutomationManager {
  constructor() {
    this.sessions = new Map();
  }

  async ensureSession(sessionId) {
    if (this.sessions.has(sessionId)) return this.sessions.get(sessionId);
    try {
      const pw = await getPlaywright();
      const browser = await pw.chromium.launch({ headless: true });
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      this.sessions.set(sessionId, { browser, context, page });
      return this.sessions.get(sessionId);
    } catch (err) {

      this.sessions.set(sessionId, { error: err.message, fallback: true });
      return this.sessions.get(sessionId);
    }
  }

  async closeSession(sessionId) {
    const sess = this.sessions.get(sessionId);
    if (!sess) return false;
    await sess.browser.close().catch(() => {});
    this.sessions.delete(sessionId);
    return true;
  }

  async navigate(sessionId, url, timeout = 15000) {
    const session = await this.ensureSession(sessionId);
    if (session.fallback) {

      await execPromise(`open "${url}"`);
      return {
        status: 'partial_success',
        url,
        automated: false,
        message: `Automation unavailable (${session.error}). Opened URL in default browser instead.`
      };
    }
    await session.page.goto(url, { timeout, waitUntil: 'networkidle' });
    return { status: 'success', url, automated: true };
  }

  async click(sessionId, selector, timeout = 8000) {
    const { page } = await this.ensureSession(sessionId);
    await page.waitForSelector(selector, { timeout, state: 'visible' });
    await page.click(selector, { timeout });
    return { status: 'success', selector };
  }

  async type(sessionId, selector, text, clear = true, timeout = 8000) {
    const { page } = await this.ensureSession(sessionId);
    const el = await page.waitForSelector(selector, { timeout, state: 'visible' });
    if (clear) await el.fill('');
    await el.type(text, { timeout });
    return { status: 'success', selector, typed: text.length };
  }

  async waitFor(sessionId, selector, state = 'visible', timeout = 8000) {
    const { page } = await this.ensureSession(sessionId);
    await page.waitForSelector(selector, { timeout, state });
    return { status: 'success', selector, state };
  }

  async extractText(sessionId, selector, timeout = 8000, maxLength = 4000) {
    const { page } = await this.ensureSession(sessionId);
    const el = await page.waitForSelector(selector, { timeout });
    const text = (await el.innerText()) || '';
    return { status: 'success', selector, text: text.slice(0, maxLength) };
  }

  async screenshot(sessionId, fullPage = true, path = null, timeout = 8000) {
    const { page } = await this.ensureSession(sessionId);
    const options = { fullPage, timeout };
    if (path) options.path = path;
    const buffer = await page.screenshot(options);
    return { status: 'success', path: path || null, bytes: buffer.length };
  }
}

class BrowserExecutor {
  constructor() {
    this.automation = new BrowserAutomationManager();
  }

  async execute(intent, params) {
    switch (intent) {
      case 'browser.open':
        return await this._openUrl(params.url);
      case 'browser.play_youtube':
        return await this._playYoutube(params.query);
      case 'browser.search':
        return await this._search(params.query, params.engine);
      case 'browser.fetch':
        return await this._fetch(params.url);
      case 'browser.session.start':
        return await this._startSession(params.session_id);
      case 'browser.session.stop':
        return await this._stopSession(params.session_id);
      case 'browser.navigate':
        return await this._navigate(params.session_id, params.url);
      case 'browser.click':
        return await this._click(params.session_id, params.selector, params.timeout_ms);
      case 'browser.type':
        return await this._type(params.session_id, params.selector, params.text, params.clear, params.timeout_ms);
      case 'browser.wait_for':
        return await this._waitFor(params.session_id, params.selector, params.state, params.timeout_ms);
      case 'browser.extract_text':
        return await this._extractText(params.session_id, params.selector, params.timeout_ms, params.max_length);
      case 'browser.screenshot':
        return await this._screenshot(params.session_id, params.full_page, params.path, params.timeout_ms);
      default:
        throw new Error(`BrowserExecutor: Unsupported intent "${intent}"`);
    }
  }

  async _startSession(sessionId) {
    const id = sessionId || `browser-${Math.random().toString(36).slice(2, 8)}`;
    await this.automation.ensureSession(id);
    return { status: 'success', session_id: id };
  }

  async _stopSession(sessionId) {
    if (!sessionId) return { status: 'failed', error: 'session_id is required' };
    const closed = await this.automation.closeSession(sessionId);
    return closed ? { status: 'success', session_id: sessionId } : { status: 'failed', error: 'Session not found' };
  }

  async _navigate(sessionId, url) {
    if (!sessionId || !url) return { status: 'failed', error: 'session_id and url are required' };
    return await this.automation.navigate(sessionId, url);
  }

  async _click(sessionId, selector, timeout) {
    if (!sessionId || !selector) return { status: 'failed', error: 'session_id and selector are required' };
    return await this.automation.click(sessionId, selector, timeout);
  }

  async _type(sessionId, selector, text, clear, timeout) {
    if (!sessionId || !selector || text === undefined) return { status: 'failed', error: 'session_id, selector, and text are required' };
    return await this.automation.type(sessionId, selector, text, clear, timeout);
  }

  async _waitFor(sessionId, selector, state, timeout) {
    if (!sessionId || !selector) return { status: 'failed', error: 'session_id and selector are required' };
    return await this.automation.waitFor(sessionId, selector, state, timeout);
  }

  async _extractText(sessionId, selector, timeout, maxLength) {
    if (!sessionId || !selector) return { status: 'failed', error: 'session_id and selector are required' };
    return await this.automation.extractText(sessionId, selector, timeout, maxLength);
  }

  async _screenshot(sessionId, fullPage, path, timeout) {
    if (!sessionId) return { status: 'failed', error: 'session_id is required' };
    return await this.automation.screenshot(sessionId, fullPage, path, timeout);
  }

  async _fetch(url) {
    if (!url) return { error: 'No URL provided' };
    try {
      const { stdout } = await execPromise(`curl -sL "${url}" | head -c 10000 | sed 's/<[^>]*>//g' | tr -s ' '`);
      return {
        status: 'success',
        url,
        content: stdout.trim(),
        note: 'Content has been sanitized and truncated.'
      };
    } catch (err) {
      return { error: `Failed to fetch URL: ${err.message}` };
    }
  }

  async _search(query, engine = 'google') {
    const engines = {
      google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      amazon: `https://www.amazon.com/s?k=${encodeURIComponent(query)}`,
      flipkart: `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`,
      youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      github: `https://github.com/search?q=${encodeURIComponent(query)}`
    };

    const url = engines[engine] || engines.google;
    try {
      await execPromise(`open "${url}"`);
      return {
        status: 'success',
        message: `Searched for "${query}" on ${engine}.`,
        url
      };
    } catch (err) {
      return { status: 'failed', error: `Failed to open search: ${err.message}` };
    }
  }

  async _openUrl(url) {
    try {
      await execPromise(`open "${url}"`);
      return {
        status: 'success',
        message: `Opened ${url} in your default browser.`,
        url
      };
    } catch (err) {
      return { status: 'failed', error: `Failed to open URL: ${err.message}` };
    }
  }

  async _playYoutube(query) {
    try {
      const videoId = await this._findYoutubeVideoId(query);

      if (videoId) {
        const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
        await execPromise(`open "${watchUrl}"`);
        return {
          status: 'success',
          message: `Playing "${query}" on YouTube...`,
          details: `Found and opening video ${videoId}.`
        };
      }

      throw new Error('No video ID found');
    } catch (err) {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      await execPromise(`open "${searchUrl}"`);
      return {
        status: 'success',
        message: `Searching for "${query}" on YouTube...`,
        details: `Auto-play failed (${err && err.message ? err.message : String(err)}). Opened search results instead.`
      };
    }
  }

  _findYoutubeVideoId(query) {
    return new Promise((resolve, reject) => {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      let resolved = false;

      const req = https.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html'
        }
      }, (res) => {
        let html = '';

        res.on('data', (chunk) => {
          html += chunk;


          if (!resolved) {
            const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
            if (match) {
              resolved = true;
              res.destroy();
              resolve(match[1]);
            }
          }
        });

        res.on('end', () => {
          if (!resolved) {
            reject(new Error('No video ID found in YouTube response'));
          }
        });

        res.on('error', () => {
          // Ignore errors after we already resolved (from res.destroy())
          if (!resolved) {
            reject(new Error('YouTube response stream error'));
          }
        });
      });

      req.on('error', (err) => {
        if (!resolved) reject(new Error(err.message || 'YouTube request failed'));
      });

      req.setTimeout(8000, () => {
        if (!resolved) {
          req.destroy();
          reject(new Error('YouTube search request timed out'));
        }
      });
    });
  }
}

module.exports = new BrowserExecutor();