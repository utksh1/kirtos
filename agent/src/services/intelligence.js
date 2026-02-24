const OpenAI = require('openai');
const { Intents } = require('../policy/intents');
const { fastClassify } = require('./fast-classifier');
const fs = require('fs');
require('dotenv').config({ override: true });

class IntelligenceService {
    constructor() {
        this.doAgentUrl = process.env.DO_AGENT_URL;
        this.doAgentKey = process.env.DO_AGENT_KEY;
        this.doClient = null;

        if (this.doAgentUrl && this.doAgentKey) {
            console.log(`IntelligenceService: DigitalOcean Agent @ ${this.doAgentUrl}`);
            const doBaseURL = this.doAgentUrl.endsWith('/') ? `${this.doAgentUrl}api/v1` : `${this.doAgentUrl}/api/v1`;
            this.doClient = new OpenAI({ apiKey: this.doAgentKey, baseURL: doBaseURL });
        }

        const rawKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
        const apiKey = rawKey ? rawKey.trim() : null;

        const rawBaseUrl = process.env.OPENAI_BASE_URL ||
            (process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : undefined);
        const baseURL = rawBaseUrl ? rawBaseUrl.trim() : undefined;

        this.client = null;
        if (apiKey) {
            console.log('IntelligenceService: Fallback client ready');
            this.client = new OpenAI({
                apiKey,
                baseURL,
                defaultHeaders: {
                    'HTTP-Referer': 'http://localhost:5173',
                    'X-Title': 'Kirtos Local Agent',
                }
            });
        }

        const rawModel = process.env.INTENT_MODEL || 'google/gemini-2.0-flash-lite-preview-02-05:free';
        this.model = rawModel.trim();
    }

    async parseIntent(text, history = []) {
        // 1. Try regex-based fast classifier first (~1ms)
        const fastResult = fastClassify(text);
        if (fastResult) {
            console.log(`[Fast] "${text}" → ${fastResult.intent}`);
            return fastResult;
        }

        // 2. Try local NLP classifier (~5ms, offline)
        const nlpResult = await this._nlpClassify(text);
        if (nlpResult && nlpResult.confidence > 0.03) {
            console.log(`[NLP] "${text}" → ${nlpResult.intent} (${(nlpResult.confidence * 100).toFixed(0)}%)`);
            return {
                intent: nlpResult.intent,
                params: this._extractParamsFromText(text, nlpResult.intent),
                confidence: nlpResult.confidence,
                reasoning: `NLP classified as ${nlpResult.intent}`,
                source: 'nlp'
            };
        }

        if (!this.client) {
            return {
                intent: 'query.help',
                params: {},
                confidence: 0.1,
                error: 'Intelligence service not configured'
            };
        }

        const availableIntents = Object.keys(Intents).map(name => {
            const def = Intents[name];
            const params = {};
            if (def.schema && def.schema.shape) {
                Object.keys(def.schema.shape).forEach(key => {
                    const field = def.schema.shape[key];
                    params[key] = field.description || 'string/number';
                });
            }
            return { name, description: name.split('.').join(' '), parameters: params };
        });

        const systemPrompt = `
You are the Intent Parser for Kirtos, a macOS local-first agent.
Your job is to translate human natural language into a single structured JSON intent.

AVAILABLE INTENTS:
${JSON.stringify(availableIntents, null, 2)}

CONTEXT AWARENESS:
- You have access to the conversation history.
- Use history to resolve pronouns like "it", "them", "that".

RULES:
1. ONLY respond with valid JSON.
2. Select the MOST LIKELY intent.
3. If no intent fits well, return intent "query.help".
4. If a request is ambiguous, lacks details, or is incomplete (e.g., "play something", "open it"), use "chat.message" and use the "reasoning" field to ask the user for clarification.
5. If it's a social greeting or small talk, use "chat.message".
6. Assign a confidence score between 0.0 and 1.0.

OUTPUT FORMAT (JSON ONLY):
{
  "intent": "string",
  "params": {},
  "confidence": 0.95,
  "reasoning": "A short, natural response to speak to the user (e.g. 'Setting a timer for 5 minutes')"
}

STRATEGY:
- "set a timer for 5 minutes" -> intent: "clock.timer.start", params: { "duration_seconds": 300, "label": "Timer" }
- "remind me to check the oven at 6pm" -> intent: "clock.alarm.set", params: { "time": "18:00", "label": "Check the oven" }
- "turn up the volume" -> intent: "system.volume.set", params: { "level": 70 }
- "mute the sound" -> intent: "system.volume.mute", params: { "enabled": true }
- "make the screen brighter" -> intent: "system.brightness.set", params: { "level": 0.8 }
- "What is on my screen" -> intent: "screen.capture"
- "Type hello" -> intent: "computer.type", params: { "text": "hello" }
- "Open terminal" -> intent: "system.app.open", params: { "app": "Terminal" }
- "enable do not disturb" -> intent: "system.focus.set", params: { "mode": "Do Not Disturb", "enabled": true }
- "play shape of you on youtube" -> intent: "browser.play_youtube", params: { "query": "shape of you" }
- "play some lofi music" -> intent: "browser.play_youtube", params: { "query": "lofi music" }
- "search for mechanical keyboards on amazon" -> intent: "browser.search", params: { "query": "mechanical keyboards", "engine": "amazon" }
- "look up the meaning of kirtos on google" -> intent: "browser.search", params: { "query": "meaning of kirtos", "engine": "google" }
- "open flipkart and play something" -> intent: "browser.search", params: { "query": "random", "engine": "flipkart" }
- "open Amazon and open on the 200 day" -> intent: "browser.search", params: { "query": "200 day", "engine": "amazon" }
- "what is JavaScript" -> intent: "knowledge.search", params: { "query": "JavaScript" }
- "tell me about Python" -> intent: "knowledge.search", params: { "query": "Python" }
- "tell me a joke" -> intent: "fun.joke", params: { "category": "Programming" }
- "play music" -> intent: "media.play_music", params: { "query": "" }
- "connect whatsapp" -> intent: "whatsapp.connect", params: {}
- "send whatsapp to 919876543210 hello" -> intent: "whatsapp.send", params: { "number": "919876543210", "message": "hello" }
- "send message to Utkarsh on whatsapp hi there" -> intent: "whatsapp.send", params: { "number": "Utkarsh", "message": "hi there" }
- "read whatsapp messages" -> intent: "whatsapp.read", params: { "limit": 10 }
- "can you read my whatsapp messages" -> intent: "whatsapp.read", params: { "limit": 10 }
- "whatsapp status" -> intent: "whatsapp.status", params: {}
`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.map(item => ({
                role: item.role,
                content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content)
            })),
            { role: 'user', content: text }
        ];

        let response;
        try {
            if (this.doClient) {
                response = await this.doClient.chat.completions.create({ model: 'default', messages });
            } else if (this.client) {
                response = await this.client.chat.completions.create({ model: this.model, messages });
            }

            const { content } = response.choices[0].message;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
            result.source = 'llm';
            return result;

        } catch (err) {
            console.error('IntelligenceService Error:', err);
            return {
                intent: 'chat.message',
                params: {},
                confidence: 0,
                reasoning: `I'm having trouble retrieving that. (Error: ${err.message})`
            };
        }
    }

    /**
     * Call the local Python NLP classifier server.
     * Returns null if the server is unreachable.
     */
    async _nlpClassify(text) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 500); // 500ms max
            const resp = await fetch('http://127.0.0.1:5050/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
                signal: controller.signal
            });
            clearTimeout(timeout);
            if (!resp.ok) return null;
            return await resp.json();
        } catch {
            return null; // Server not running — silently fall through to LLM
        }
    }

    /**
     * Extract basic params from text based on the predicted intent.
     * The NLP model only predicts intent, not params — this fills them in.
     */
    _extractParamsFromText(text, intent) {
        const lower = text.toLowerCase().trim();

        if (intent === 'whatsapp.send') {
            // Try to extract "to <name> ... <message>"
            const m = lower.match(/(?:to\s+)?([\w\s]+?)\s+(?:on\s+)?(?:whatsapp|wa|whatapp|watsapp)\s+(?:that\s+|saying\s+)?(.+)/i);
            if (m) return { number: m[1].trim(), message: m[2].trim() };
            return { number: '', message: text };
        }

        if (intent === 'browser.search') {
            const q = lower.replace(/^(?:search|google|look up|find)\s+(?:for\s+)?/i, '').trim();
            return { query: q || text, engine: 'google' };
        }

        if (intent === 'browser.open') {
            const url = lower.replace(/^(?:open|go to|visit|navigate to|browse to)\s+/i, '').trim();
            return { url };
        }

        if (intent === 'browser.play_youtube') {
            const q = lower.replace(/^(?:play|watch)\s+/i, '').replace(/\s*(?:on\s+)?youtube\s*/i, '').trim();
            return { query: q };
        }

        if (intent === 'system.volume.set') {
            const m = lower.match(/(\d+)/);
            return { level: m ? parseInt(m[1]) : 50 };
        }

        if (intent === 'system.brightness.set') {
            const m = lower.match(/(\d+)/);
            return { level: m ? parseInt(m[1]) : 50 };
        }

        if (intent === 'system.app.open' || intent === 'device.open_app') {
            const app = lower.replace(/^(?:open|launch|start)\s+(?:the\s+)?(?:app\s+)?/i, '').trim();
            return { app };
        }

        if (intent === 'knowledge.search') {
            const q = lower
                .replace(/^(?:what is|who is|tell me about|explain|define|search wikipedia for|wikipedia)\s+/i, '')
                .replace(/\?$/, '').trim();
            return { query: q || text };
        }

        if (intent === 'communication.send_message') {
            const m = lower.match(/(?:to\s+)?(\w[\w\s]*?)\s+(?:saying\s+|that\s+)?(.+)/i);
            if (m) return { to: m[1].trim(), message: m[2].trim() };
            return { to: '', message: text };
        }

        if (intent === 'chat.message') {
            return { text };
        }

        if (intent === 'shell.exec') {
            const cmd = lower.replace(/^(?:run|execute)\s+(?:command\s+)?/i, '').replace(/\s+in\s+(?:the\s+)?terminal\s*$/i, '').trim();
            return { command: cmd };
        }

        return {};
    }

    async summarizeOutcome(originalText, intent, result, reasoning, params = {}) {
        if (intent === 'screen.capture' && result.status === 'success' && result.path) {
            return await this.analyzeImage(result.path, `User asked: "${originalText}". Describe what you see in this screenshot relevant to their request.`);
        }

        const fallbackMessage = result.message || (result.error ? `Error: ${result.error}` : 'Command executed.');

        // For chat messages, the actual reply is in params.text (from LLM),
        // reasoning is just meta-info like "Answering a question"
        if (intent === 'chat.message') return params?.text || reasoning || result.message || "Hi there!";
        if (!this.client) return fallbackMessage;

        const systemPrompt = `
You are Kirtos, a voice assistant. Summarize what just happened in ONE short sentence.
INPUT:
- User said: "${originalText}"
- Intent: "${intent}"
- Result: ${JSON.stringify(result)}

STRICT RULES:
1. MAX 15 words. Be concise and conversational, like a friend talking.
2. NEVER include URLs, file paths, port numbers, or technical IDs.
3. NEVER say "successfully" or "in your default browser" — be casual.
4. Good examples: "YouTube is open", "Volume set to 50%", "Message sent to Utkarsh", "Here are your messages"
5. Bad examples: "YouTube was opened successfully in your default browser, loading https://..." — TOO LONG.
6. If error, say what went wrong briefly: "Couldn't connect to WhatsApp, try again"
7. Reply with ONLY the summary sentence, nothing else.
`;
        try {
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Summarize the outcome of: "${originalText}"` }
            ];

            let response;
            if (this.doClient) {
                response = await this.doClient.chat.completions.create({
                    model: 'default',
                    messages
                });
            } else if (this.client) {
                response = await this.client.chat.completions.create({
                    model: this.model,
                    messages
                });
            }
            return response.choices[0].message.content;
        } catch (err) {
            console.error('Summarize Error:', err);
            return fallbackMessage;
        }
    }

    async analyzeImage(imagePath, prompt) {
        try {
            const imageBuffer = fs.readFileSync(imagePath);
            const base64Image = imageBuffer.toString('base64');
            const dataUrl = `data:image/png;base64,${base64Image}`;

            const messages = [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: dataUrl } }
                    ]
                }
            ];

            let response;
            if (this.doClient) {
                response = await this.doClient.chat.completions.create({ model: 'default', messages });
            } else {
                response = await this.client.chat.completions.create({ model: this.model, messages });
            }

            return response.choices[0].message.content;
        } catch (err) {
            console.error('Vision Analysis Error:', err);
            return "I took a screenshot, but I couldn't analyze it due to an error.";
        }
    }
}

module.exports = new IntelligenceService();
