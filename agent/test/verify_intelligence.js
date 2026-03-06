const intelligenceService = require('../src/services/intelligence');
require('dotenv').config({ path: '../.env' });

async function verifyIntelligence() {
  const tests = [
    "What's the system status?",
    "Show me if the system is okay",
    "Stop the web container",
    "Run the cleanup script",
    "How do I use this?"];


  console.log('--- Verifying Intent Parsing ---');

  if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) {
    console.warn('⚠️ No API key found. Tests will use the fallback result.');
  }

  for (const text of tests) {
    console.log(`\nInput: "${text}"`);
    const result = await intelligenceService.parseIntent(text);
    console.log(`Parsed: ${JSON.stringify(result, null, 2)}`);
  }
}

verifyIntelligence().catch(console.error);