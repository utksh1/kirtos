const OpenAI = require('openai');
const IntentRegistry = require('../policy/registry');
const { fastClassify } = require('./fast-classifier');
const fs = require('fs');
const config = require('../config');

class IntelligenceService {
  constructor() {
    this.doAgentUrl = config.DO_AGENT_URL;
    this.doAgentKey = config.DO_AGENT_KEY;
    this.doClient = null;

    if (this.doAgentUrl) {
      console.log(`IntelligenceService: DigitalOcean Agent @ ${this.doAgentUrl}`);
      const doBaseURL = this.doAgentUrl.endsWith('/') ? `${this.doAgentUrl}api/v1` : `${this.doAgentUrl}/api/v1`;
      this.doClient = new OpenAI({ apiKey: this.doAgentKey, baseURL: doBaseURL });
    }

    const apiKey = config.OPENROUTER_API_KEY || config.OPENAI_API_KEY;
    const baseURL = config.OPENAI_BASE_URL || (config.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : undefined);

    this.client = null;
    if (apiKey) {
      console.log('IntelligenceService: Fallback client ready');
      this.client = new OpenAI({
        apiKey,
        baseURL,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Kirtos Local Agent'
        }
      });
    }

    this.model = config.INTENT_MODEL;

    if (!this.doClient && !this.client) {
      throw new Error('IntelligenceService Initialization Failed: No valid provider configured (DigitalOcean, OpenAI, or OpenRouter). Check your .env file.');
    }
  }

  async parseIntent(text, history = [], currentState = {}) {

    const fastResult = fastClassify(text);
    if (fastResult) {
      console.log(`[Fast] "${text}" → ${fastResult.intent}`);
      return {
        plan: [fastResult],
        reasoning: this._deRobotize(fastResult.reasoning || "Okay, let's do that.", text),
        source: 'fast-classifier'
      };
    }


    const nlpResult = await this._nlpClassify(text, history);
    if (nlpResult && nlpResult.confidence > 0.6) {
      console.log(`[NLP] "${text}" → ${nlpResult.intent} (${(nlpResult.confidence * 100).toFixed(0)}%)`);
      let params = this._extractParamsFromText(text, nlpResult.intent);

      return {
        plan: [{
          intent: nlpResult.intent,
          params,
          confidence: nlpResult.confidence
        }],
        reasoning: this._deRobotize("I've understood your request.", text),
        source: 'local-nlp'
      };
    }

    if (!this.client && !this.doClient) {
      return {
        plan: [{
          intent: 'query.help',
          params: {},
          confidence: 0.1
        }],
        reasoning: 'Intelligence service not configured. Please check your API keys.'
      };
    }

    const allIntents = IntentRegistry.getAll();
    const availableIntents = Object.keys(allIntents).map((name) => {
      const def = allIntents[name];
      const params = {};
      if (def.schema && def.schema.shape) {
        Object.keys(def.schema.shape).forEach((key) => {
          const field = def.schema.shape[key];
          params[key] = (field.description || 'string/number') + (field._def?.defaultValue !== undefined ? ` (default: ${field._def.defaultValue})` : '');
        });
      }
      return { name, description: name.split('.').join(' '), parameters: params };
    });

    const systemPrompt = `
You are the Intent Parser for Kirtos, a macOS local-first agent.
Your job is to translate human natural language into a list of structured JSON intents (The "Plan").

AVAILABLE INTENTS:
${JSON.stringify(availableIntents, null, 2)}

CURRENT SESSION STATE (DETERMINISTIC ENTITIES):
${JSON.stringify(currentState, null, 2)}

CONTEXT AWARENESS:
- You have access to the conversation history.
- Use history and the "CURRENT SESSION STATE" to resolve pronouns like "it", "them", "that", "him", "her".
- **Rule**: If a pronoun like "him" is used, preference MUST be given to the "last_contact" in the current state.
- **Rule**: If "it" refers to an app, use "last_app" from the current state.

STRATEGY:
- If the user asks for multiple things ("Set volume to 50 and then open Safari"), return a LIST of intents in order.
- If the user is just chatting or greeting you, respond warmly in the 'reasoning' field. 
- CRITICAL: NEVER use robotic templates like "Okay, let's do that." or "Understood." for greetings or chat.
- Always provide a "reasoning" field as your ACTUAL RESPONSE to the user for the whole plan.

OUTPUT FORMAT (JSON ONLY):
{
  "plan": [
    {
      "intent": "string",
      "params": {},
      "confidence": 0.95
    }
  ],
  "reasoning": "Your direct, friendly response to the user"
}
`;

    const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((item) => ({
      role: item.role,
      content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content)
    })),
    { role: 'user', content: text }];


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

      if (!result.plan) {
        result.plan = [{
          intent: result.intent,
          params: result.params,
          confidence: result.confidence
        }];
      }

      result.source = 'llm';

      result.plan.forEach((step) => {
        if (step.params) {
          Object.keys(step.params).forEach((key) => {
            const val = step.params[key];
            if (val && typeof val === 'object' && !Array.isArray(val)) {
              step.params[key] = val[key] || val.text || val.content || val.value || JSON.stringify(val);
            }
          });
        }
      });

      console.log(`[Intelligence] Plan Generated from LLM:`, JSON.stringify(result, null, 2));
      result.reasoning = this._deRobotize(result.reasoning, text);
      console.log(`[Intelligence] User Response (reasoning): "${result.reasoning}"`);
      return result;

    } catch (err) {
      console.error('IntelligenceService Error:', err);
      return {
        plan: [{
          intent: 'chat.message',
          params: {},
          confidence: 0
        }],
        reasoning: `I'm having trouble retrieving that. (Error: ${err.message})`,
        source: 'error'
      };
    }
  }

  _deRobotize(reasoning, originalText) {
    const reason = reasoning || "";
    const genericRobotic = /^(okay|ok|doing\s+that|let'?s\s+do\s+that|understood|confirmed|got\s+it|sure|all\s+right|fine|understood)\b[.!]*$/i;

    if (genericRobotic.test(reason.trim()) || reason.toLowerCase().trim() === originalText.toLowerCase().trim()) {
      const lowerInput = originalText.toLowerCase();
      if (lowerInput.match(/^(hi+|hello+|hey+|yo+|sup+|hola+|hii+|namaste|pranam)\b/i)) {
        return "Hello! How can I assist you today?";
      } else if (lowerInput.includes('how are you')) {
        return "I'm doing great, thank you! Ready to help with your Mac.";
      } else if (lowerInput.includes('play') || lowerInput.includes('youtube')) {
        return "Sure! I am getting that ready for you.";
      } else if (lowerInput.includes('open') || lowerInput.includes('app')) {
        return "Understood. I am opening that for you now.";
      } else {
        return "I'm on it! Let's get that done.";
      }
    }
    return reason;
  }

  async askKnowledge(query) {
    if (!this.client && !this.doClient) return "I'm sorry, my knowledge base is currently offline.";

    console.log(`[Intelligence] Querying central LLM for knowledge: "${query}"`);
    const systemPrompt = "You are a highly intelligent knowledge assistant. Provide a clear, accurate, and concise summary (3-4 sentences) about the topic provided. Be factual and helpful.";

    try {
      const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }];


      let response;
      if (this.doClient) {
        response = await this.doClient.chat.completions.create({
          model: 'default',
          messages,
          temperature: 0.3
        });
      } else {
        response = await this.client.chat.completions.create({
          model: this.model,
          messages,
          temperature: 0.3
        });
      }

      return response.choices[0].message.content.trim();
    } catch (err) {
      console.error('askKnowledge Error:', err);
      throw err;
    }
  }

  async _nlpClassify(text, history = []) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch('http://127.0.0.1:5050/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          history: history.slice(-2)
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!resp.ok) return null;
      return await resp.json();
    } catch (err) {
      return null;
    }
  }

  async submitCorrection(text, intent) {
    try {
      await fetch('http://127.0.0.1:5050/add_correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, intent })
      });
    } catch (err) {
      console.error('Correction submission failed:', err);
    }
  }

  _extractParamsFromText(text, intent) {
    const lower = text.toLowerCase().trim();

    if (intent === 'whatsapp.send') {
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
      return { name: app };
    }

    if (intent === 'knowledge.search') {
      const q = lower.
      replace(/^(?:what is|who is|tell me about|explain|define|search wikipedia for|wikipedia)\s+/i, '').
      replace(/\?$/, '').trim();
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

    if (intent === 'knowledge.define') {
      const word = lower.replace(/^(?:define|meaning\s+of|definition\s+of)\s+/i, '').replace(/[?.]/g, '').trim();
      return { word: word || text };
    }

    if (intent === 'knowledge.weather') {
      const city = lower.replace(/^(?:weather|what(?:'s|\s+is)\s+the\s+weather)\s+(?:in|for|at)?\s*/i, '').replace(/[?.]/g, '').trim();
      return { city: city || 'Mumbai' };
    }

    if (intent === 'knowledge.currency') {
      const m = lower.match(/(\d+(?:\.\d+)?)\s*([a-z]{3})\s+(?:to|in)\s+([a-z]{3})/i);
      if (m) return { amount: parseFloat(m[1]), from: m[2].toUpperCase(), to: m[3].toUpperCase() };
      return { amount: 1, from: 'USD', to: 'INR' };
    }

    return {};
  }

  async summarizeOutcome(originalText, intent, result, reasoning, params = {}) {
    if (intent === 'screen.capture' && result.status === 'success' && result.path) {
      return await this.analyzeImage(result.path, `User asked: "${originalText}". Describe what you see in this screenshot relevant to their request.`);
    }

    const reason = reasoning || "";
    const lowerReason = reason.toLowerCase().trim();

    if (intent === 'chat.message') {
      const reply = reason || params?.text || result?.message || "I'm here to help!";
      const genericRobotic = /^(okay|ok|doing\s+that|let'?s\s+do\s+that|understood|confirmed|got\s+it)\b/i;

      const isEcho = reply.toLowerCase().trim() === originalText.toLowerCase().trim();
      const isRobotic = genericRobotic.test(reply);

      if (isEcho || isRobotic) {
        const lowerInput = originalText.toLowerCase();
        if (lowerInput.match(/^(hi+|hello+|hey+|yo+|sup+|hola+|hii+|namaste|pranam)\b/i)) return "Hello! How can I assist you today?";
        if (lowerInput.includes('how are you')) return "I'm doing great, thank you! Ready to help with your Mac.";
        if (lowerInput.includes('who are you')) return "I am Kirtos, your AI assistant.";
        if (lowerInput.match(/^(wtf+|wow|lol+)/i)) return "Haha, yeah! Need anything else?";
        return "I'm here and ready to help!";
      }
      return reply;
    }
    const fallbackMessage = result?.message || (result?.error ? `Error: ${result.error}` : 'Command executed.');
    if (!this.client && !this.doClient) return fallbackMessage;

    const systemPrompt = `
You are Kirtos, a voice assistant. Summarize what just happened in ONE short sentence.
INPUT:
- User said: "${originalText}"
- Intent: "${intent}"
- Result: ${JSON.stringify(result)}

STRICT RULES:
1. MAX 20 words. Be concise and conversational.
2. NEVER include URLs, file paths, or technical IDs.
3. NEVER say "successfully" — be natural.
4. IF THERE IS AN ERROR: Explain it clearly and ASK A QUESTION to help the user fix it.
5. If it worked, just confirm the action: "Message sent to Mom."
6. Reply with ONLY the summary sentence/question, nothing else.
`;
    try {
      const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Summarize the outcome of: "${originalText}"` }];


      let response;
      if (this.doClient) {
        response = await this.doClient.chat.completions.create({ model: 'default', messages });
      } else if (this.client) {
        response = await this.client.chat.completions.create({ model: this.model, messages });
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
        { type: 'image_url', image_url: { url: dataUrl } }]

      }];


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