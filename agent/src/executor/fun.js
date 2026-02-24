const https = require('https');

// Built-in fallback jokes in case the API is unreachable
const FALLBACK_JOKES = [
    "Why do programmers prefer dark mode? Because light attracts bugs.",
    "There are only 10 types of people in the world: those who understand binary and those who don't.",
    "A SQL query walks into a bar, walks up to two tables, and asks... 'Can I join you?'",
    "Why was the JavaScript developer sad? Because he didn't Node how to Express himself.",
    "!false — it's funny because it's true.",
    "A programmer's wife tells him: 'Go to the store and buy a loaf of bread. If they have eggs, buy a dozen.' He comes home with 12 loaves of bread.",
    "What's a programmer's favorite hangout place? Foo Bar.",
    "Why do Java developers wear glasses? Because they can't C#.",
    "How many programmers does it take to change a light bulb? None. That's a hardware problem.",
    "What's the object-oriented way to become wealthy? Inheritance."
];

class FunExecutor {
    async execute(intent, params) {
        switch (intent) {
            case 'fun.joke':
                return await this._getJoke(params.category);
            default:
                throw new Error(`FunExecutor: Unsupported intent "${intent}"`);
        }
    }

    /**
     * Fetches a joke from the JokeAPI, falls back to built-in jokes.
     * API: https://v2.jokeapi.dev/
     */
    async _getJoke(category = 'Programming') {
        try {
            const joke = await this._fetchFromApi(category);
            return {
                status: 'success',
                joke,
                source: 'jokeapi'
            };
        } catch (_) {
            // Fallback to built-in jokes
            const joke = FALLBACK_JOKES[Math.floor(Math.random() * FALLBACK_JOKES.length)];
            return {
                status: 'success',
                joke,
                source: 'builtin'
            };
        }
    }

    _fetchFromApi(category) {
        return new Promise((resolve, reject) => {
            const safeCat = ['Programming', 'Misc', 'Pun', 'Dark'].includes(category) ? category : 'Programming';
            const options = {
                hostname: 'v2.jokeapi.dev',
                path: `/joke/${safeCat}?type=single&safe-mode`,
                headers: { 'Accept': 'application/json' }
            };

            const req = https.get(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.error || !json.joke) {
                            reject(new Error('No joke returned'));
                            return;
                        }
                        resolve(json.joke);
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', reject);
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Joke API timeout'));
            });
        });
    }
}

module.exports = new FunExecutor();
