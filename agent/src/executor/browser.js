const { exec } = require('child_process');
const util = require('util');
const https = require('https');
const execPromise = util.promisify(exec);

class BrowserExecutor {
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
            default:
                throw new Error(`BrowserExecutor: Unsupported intent "${intent}"`);
        }
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
                    'Accept': 'text/html',
                }
            }, (res) => {
                let html = '';

                res.on('data', (chunk) => {
                    html += chunk;

                    // Try to find a video ID as data streams in
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
