const https = require('https');
const intelligenceService = require('../services/intelligence');

class KnowledgeExecutor {
    async execute(intent, params) {
        switch (intent) {
            case 'knowledge.search':
                return await this._searchWikipedia(params.query);
            case 'knowledge.define':
                return await this._defineWord(params.word);
            case 'knowledge.weather':
                return await this._getWeather(params.city);
            case 'knowledge.currency':
                return await this._convertCurrency(params.amount, params.from, params.to);
            default:
                throw new Error(`KnowledgeExecutor: Unsupported intent "${intent}"`);
        }
    }

    // ───── Knowledge (Central 120B LLM) ─────

    async _searchWikipedia(query) {
        if (!query) return { error: 'No search query provided' };
        try {
            const response = await intelligenceService.askKnowledge(query);
            return {
                status: 'success',
                query,
                title: 'Kirtos Central Intelligence',
                summary: response,
                source: 'Central LLM (120B)'
            };
        } catch (err) {
            return { status: 'failed', error: `Knowledge lookup failed: ${err.message}`, query };
        }
    }

    // ───── Dictionary (Free Dictionary API) ─────

    async _defineWord(word) {
        if (!word) return { error: 'No word provided' };
        try {
            const data = await this._httpGet('api.dictionaryapi.dev', `/api/v2/entries/en/${encodeURIComponent(word.trim())}`);
            const json = JSON.parse(data);
            if (!Array.isArray(json) || json.length === 0) {
                return { error: `No definition found for "${word}".` };
            }
            const entry = json[0];
            const meanings = entry.meanings.slice(0, 3).map(m => ({
                partOfSpeech: m.partOfSpeech,
                definition: m.definitions[0]?.definition || '',
                example: m.definitions[0]?.example || null
            }));
            return {
                status: 'success',
                word: entry.word,
                phonetic: entry.phonetic || entry.phonetics?.[0]?.text || null,
                meanings,
                source: 'Free Dictionary API'
            };
        } catch (err) {
            return { error: `Dictionary lookup failed: ${err.message}` };
        }
    }

    // ───── Weather (Open-Meteo — free, no key) ─────

    async _getWeather(city) {
        if (!city) return { error: 'No city provided' };
        try {
            // Step 1: Geocode city name to lat/lon
            const geoData = await this._httpGet(
                'geocoding-api.open-meteo.com',
                `/v1/search?name=${encodeURIComponent(city.trim())}&count=1&language=en&format=json`
            );
            const geo = JSON.parse(geoData);
            if (!geo.results || geo.results.length === 0) {
                return { error: `City "${city}" not found.` };
            }
            const { latitude, longitude, name, country } = geo.results[0];

            // Step 2: Fetch weather
            const wxData = await this._httpGet(
                'api.open-meteo.com',
                `/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`
            );
            const wx = JSON.parse(wxData);
            const current = wx.current;

            const condition = this._weatherCodeToText(current.weather_code);

            return {
                status: 'success',
                city: name,
                country,
                temperature: `${current.temperature_2m}°C`,
                feels_like: `${current.apparent_temperature}°C`,
                humidity: `${current.relative_humidity_2m}%`,
                wind: `${current.wind_speed_10m} km/h`,
                condition,
                message: `${name}, ${country}: ${condition}, ${current.temperature_2m}°C (feels like ${current.apparent_temperature}°C). Humidity ${current.relative_humidity_2m}%, wind ${current.wind_speed_10m} km/h.`
            };
        } catch (err) {
            return { error: `Weather lookup failed: ${err.message}` };
        }
    }

    _weatherCodeToText(code) {
        const map = {
            0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
            45: 'Foggy', 48: 'Depositing rime fog',
            51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
            61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
            71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
            80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Heavy rain showers',
            95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm'
        };
        return map[code] || 'Unknown';
    }

    // ───── Currency Conversion (ExchangeRate-API — free, no key) ─────

    async _convertCurrency(amount, from, to) {
        if (!from || !to) return { error: 'Provide both source and target currency codes (e.g. USD, INR).' };
        const amt = parseFloat(amount) || 1;
        const fromCode = from.toUpperCase();
        const toCode = to.toUpperCase();

        try {
            // Using ExchangeRate-API (v4) which is free and requires no key
            const data = await this._httpGet(
                'api.exchangerate-api.com',
                `/v4/latest/${fromCode}`
            );
            const json = JSON.parse(data);
            if (!json.rates || !json.rates[toCode]) {
                return { error: `Could not convert ${fromCode} to ${toCode}. Check currency codes.` };
            }
            const rate = json.rates[toCode];
            const converted = (amt * rate).toFixed(2);
            return {
                status: 'success',
                amount: amt,
                from: fromCode,
                to: toCode,
                result: parseFloat(converted),
                rate: rate.toFixed(4),
                message: `${amt} ${fromCode} = ${converted} ${toCode}`,
                date: json.date,
                source: 'ExchangeRate-API'
            };
        } catch (err) {
            return { error: `Currency conversion failed: ${err.message}` };
        }
    }

    // ───── Shared HTTP helper ─────

    _httpGet(hostname, path) {
        return new Promise((resolve, reject) => {
            const req = https.get({ hostname, path, headers: { 'Accept': 'application/json', 'User-Agent': 'Kirtos/1.0' } }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 400) {
                        reject(new Error(`HTTP ${res.statusCode}`));
                        return;
                    }
                    resolve(data);
                });
            });
            req.on('error', reject);
            req.setTimeout(8000, () => { req.destroy(); reject(new Error('Request timed out')); });
        });
    }
}

module.exports = new KnowledgeExecutor();
