const https = require('https');


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
"What's the object-oriented way to become wealthy? Inheritance."];


const FALLBACK_QUOTES = [
{ content: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
{ content: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
{ content: "Stay hungry, stay foolish.", author: "Steve Jobs" },
{ content: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
{ content: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
{ content: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
{ content: "Be the change you wish to see in the world.", author: "Mahatma Gandhi" },
{ content: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" }];


const FALLBACK_FACTS = [
"Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that was still edible.",
"Octopuses have three hearts and blue blood.",
"A group of flamingos is called a 'flamboyance'.",
"Bananas are berries, but strawberries aren't.",
"The shortest war in history lasted 38 minutes — between Britain and Zanzibar in 1896.",
"There are more possible iterations of a game of chess than atoms in the known universe.",
"Venus is the only planet that spins clockwise.",
"An astronaut's footprint on the Moon can last for millions of years."];


class FunExecutor {
  async execute(intent, params) {
    switch (intent) {
      case 'fun.joke':
        return await this._getJoke(params.category);
      case 'fun.quote':
        return await this._getQuote();
      case 'fun.fact':
        return await this._getFact();
      default:
        throw new Error(`FunExecutor: Unsupported intent "${intent}"`);
    }
  }



  async _getJoke(category = 'Programming') {
    try {
      const joke = await this._fetchFromApi(category);
      return { status: 'success', joke, source: 'jokeapi' };
    } catch (_) {
      const joke = FALLBACK_JOKES[Math.floor(Math.random() * FALLBACK_JOKES.length)];
      return { status: 'success', joke, source: 'builtin' };
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
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error || !json.joke) {reject(new Error('No joke returned'));return;}
            resolve(json.joke);
          } catch (e) {reject(e);}
        });
      });
      req.on('error', reject);
      req.setTimeout(5000, () => {req.destroy();reject(new Error('Joke API timeout'));});
    });
  }



  async _getQuote() {
    try {
      const data = await this._httpGet('api.quotable.io', '/random');
      const json = JSON.parse(data);
      if (!json.content) throw new Error('Empty response');
      return {
        status: 'success',
        quote: json.content,
        author: json.author || 'Unknown',
        message: `"${json.content}" — ${json.author || 'Unknown'}`,
        source: 'quotable'
      };
    } catch (_) {
      const q = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
      return {
        status: 'success',
        quote: q.content,
        author: q.author,
        message: `"${q.content}" — ${q.author}`,
        source: 'builtin'
      };
    }
  }



  async _getFact() {
    try {
      const data = await this._httpGet('uselessfacts.jsph.pl', '/api/v2/facts/random?language=en');
      const json = JSON.parse(data);
      if (!json.text) throw new Error('Empty response');
      return {
        status: 'success',
        fact: json.text,
        message: json.text,
        source: 'uselessfacts'
      };
    } catch (_) {
      const fact = FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)];
      return {
        status: 'success',
        fact,
        message: fact,
        source: 'builtin'
      };
    }
  }



  _httpGet(hostname, path) {
    return new Promise((resolve, reject) => {
      const req = https.get({ hostname, path, headers: { 'Accept': 'application/json', 'User-Agent': 'Kirtos/1.0' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 400) {reject(new Error(`HTTP ${res.statusCode}`));return;}
          resolve(data);
        });
      });
      req.on('error', reject);
      req.setTimeout(5000, () => {req.destroy();reject(new Error('Request timed out'));});
    });
  }
}

module.exports = new FunExecutor();