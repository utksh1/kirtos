const OpenAI = require('openai');
require('dotenv').config();

async function debugOpenRouter() {
  const apiKey = (process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY).trim();
  const baseURL = (process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1').trim();

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
    defaultHeaders: {
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Kirtos Local Agent'
    }
  });

  try {
    const models = [
    'google/gemini-2.0-flash-lite-preview-02-05:free',
    'mistralai/mistral-7b-instruct:free',
    'qwen/qwen-2.5-72b-instruct:free',
    'openrouter/auto'];


    for (const model of models) {
      try {
        console.log(`\nAttempting: ${model}`);
        const response = await client.chat.completions.create({
          model: model,
          messages: [{ role: 'user', content: 'Say hello' }]
        });
        console.log(`Success with ${model}:`, response.choices[0].message.content);
        return;
      } catch (e) {
        console.error(`Failed with ${model}: ${e.status} ${e.message}`);
      }
    }
  } catch (err) {
    console.error('Debug Error:', err.status, err.message);
  }
}

debugOpenRouter();