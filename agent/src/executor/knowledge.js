const https = require('https');

class KnowledgeExecutor {
    async execute(intent, params) {
        switch (intent) {
            case 'knowledge.search':
                return await this._searchWikipedia(params.query);
            default:
                throw new Error(`KnowledgeExecutor: Unsupported intent "${intent}"`);
        }
    }

    /**
     * Searches Wikipedia and returns a concise summary.
     * Uses the Wikipedia REST API (no dependencies needed).
     */
    async _searchWikipedia(query) {
        if (!query) return { error: 'No search query provided' };

        try {
            const summary = await this._fetchWikiSummary(query);
            return {
                status: 'success',
                query,
                title: summary.title,
                summary: summary.extract,
                url: summary.url,
                thumbnail: summary.thumbnail || null
            };
        } catch (err) {
            return {
                status: 'failed',
                error: `Wikipedia search failed: ${err.message}`,
                query
            };
        }
    }

    /**
     * Fetches a summary from Wikipedia's REST API.
     * Endpoint: /api/rest_v1/page/summary/{title}
     * This returns a clean, pre-formatted extract — no HTML parsing needed.
     */
    _fetchWikiSummary(query) {
        return new Promise((resolve, reject) => {
            const encoded = encodeURIComponent(query.trim());
            const options = {
                hostname: 'en.wikipedia.org',
                path: `/api/rest_v1/page/summary/${encoded}`,
                headers: {
                    'User-Agent': 'Kirtos/1.0 (macOS local assistant)',
                    'Accept': 'application/json'
                }
            };

            const req = https.get(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);

                        if (json.type === 'disambiguation') {
                            reject(new Error(`Multiple results found for "${query}". Try being more specific.`));
                            return;
                        }

                        if (!json.extract) {
                            reject(new Error(`No Wikipedia article found for "${query}".`));
                            return;
                        }

                        resolve({
                            title: json.title,
                            extract: json.extract,
                            url: json.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encoded}`,
                            thumbnail: json.thumbnail?.source || null
                        });
                    } catch (e) {
                        reject(new Error('Failed to parse Wikipedia response'));
                    }
                });
            });

            req.on('error', (err) => reject(err));
            req.setTimeout(8000, () => {
                req.destroy();
                reject(new Error('Wikipedia request timed out'));
            });
        });
    }
}

module.exports = new KnowledgeExecutor();
