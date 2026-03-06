const { fastClassify } = require('../src/services/fast-classifier');


const PREFIXES = [
"", "can you ", "can you please ", "could you ", "could you please ",
"would you ", "will you ", "hey kirtos ", "hi kirtos ", "kirtos ",
"please ", "i want to ", "i need to ", "just ", "quickly ",
"yo kirtos ", "kirtos agent ", "kirtos can you ", "please kirtos ", "hey ",
"can you please please please ", "hey kirtos quickly ", "yo "];


const SUFFIXES = [
"", " please", " now", " quickly", " for me", " asap",
" immediately", " right away", " thanks", " if you can", " right now"];


const INTENT_TEMPLATES = [
{
  intent: "whatsapp.send",
  templates: ["send a msg to {name} on wa saying {text}", "message {name} on whatsapp {text}", "whatsapp {name} {text}", "send whatsapp to {name} {text}"],
  params: {
    name: ["Utkarsh", "Vaibhav", "Mom", "Dad", "919876543210", "Bro", "Sister", "Friend", "Boss", "Alice"],
    text: ["hello", "how are you", "i am late", "see you soon", "call me back", "good morning", "happy birthday", "did you eat", "where are you", "ok"]
  },
  validator: (params, expected) => params.number && params.message
},
{
  intent: "media.stop",
  templates: ["stop the music", "pause the video", "stop playback", "kill the music", "pause YouTube", "close spotify", "stop the audio", "pause it", "stop that now", "end the playback"],
  params: {}
},
{
  intent: "system.volume.set",
  templates: ["set volume to {level}", "volume {level}", "make it louder", "turn down the sound", "increase the volume", "volume up", "make it softer", "decrease volume", "volume down", "turn it up", "turn it down"],
  params: {
    level: ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100"]
  },
  validator: (params, expected) => params.level !== undefined
},
{
  intent: "knowledge.define",
  templates: ["define {word}", "what is the meaning of {word}", "what does {word} mean", "meaning of {word}", "definition of {word}", "lookup {word}", "tell me about {word}", "explain {word}", "describe {word}"],
  params: {
    word: ["gravity", "entropy", "love", "ai", "machine learning", "life", "black hole", "universe", "react", "node"]
  },
  validator: (params, expected) => params.word !== undefined
},
{
  intent: "knowledge.weather",
  templates: ["weather in {city}", "how is the weather in {city}", "what is the temperature in {city}", "weather forecast for {city}", "is it raining in {city}", "how hot is it in {city}"],
  params: {
    city: ["London", "New York", "Delhi", "Mumbai", "Tokyo", "Paris", "Berlin", "Sydney", "Dubai", "Moscow"]
  },
  validator: (params, expected) => params.city !== undefined
},
{
  intent: "browser.open",
  templates: ["open {site}", "go to {site}", "visit {site}", "browse to {site}"],
  params: {
    site: ["google.com", "youtube.com", "github.com", "reddit.com", "wikipedia.org", "amazon.in", "facebook.com", "twitter.com", "vercel.app", "localhost:3000"]
  },
  validator: (params, expected) => params.url !== undefined
},
{
  intent: "knowledge.math",
  templates: ["calculate {expr}", "solve {expr}", "what is {expr}", "how much is {expr}", "{expr} = "],
  params: {
    expr: ["2+2", "100/5", "50*3", "10^2", "15 + 25 - 10", "100 x 2"]
  },
  validator: (params, expected) => params.expression !== undefined
},
{
  intent: "query.time",
  templates: ["what is the time", "current time", "time now", "get clock", "the time please"],
  params: {}
},
{
  intent: "system.battery",
  templates: ["battery level", "battery status", "how much battery is left", "battery percentage", "check battery"],
  params: {}
}];


function generatePrompts(count) {
  const prompts = [];
  const seen = new Set();

  for (const item of INTENT_TEMPLATES) {
    for (const template of item.templates) {
      for (const prefix of PREFIXES) {
        for (const suffix of SUFFIXES) {
          let text = template;
          let targetParams = {};

          if (template.includes("{name}")) {
            const val = item.params.name[Math.floor(Math.random() * item.params.name.length)];
            text = text.replace("{name}", val);
            targetParams.name = val;
          }
          if (template.includes("{text}")) {
            const val = item.params.text[Math.floor(Math.random() * item.params.text.length)];
            text = text.replace("{text}", val);
            targetParams.text = val;
          }
          if (template.includes("{level}")) {
            const val = item.params.level[Math.floor(Math.random() * item.params.level.length)];
            text = text.replace("{level}", val);
            targetParams.level = val;
          }
          if (template.includes("{word}")) {
            const val = item.params.word[Math.floor(Math.random() * item.params.word.length)];
            text = text.replace("{word}", val);
            targetParams.word = val;
          }
          if (template.includes("{city}")) {
            const val = item.params.city[Math.floor(Math.random() * item.params.city.length)];
            text = text.replace("{city}", val);
            targetParams.city = val;
          }
          if (template.includes("{site}")) {
            const val = item.params.site[Math.floor(Math.random() * item.params.site.length)];
            text = text.replace("{site}", val);
            targetParams.site = val;
          }
          if (template.includes("{expr}")) {
            const val = item.params.expr[Math.floor(Math.random() * item.params.expr.length)];
            text = text.replace("{expr}", val);
            targetParams.expr = val;
          }

          const full = (prefix + text + suffix).trim();
          if (!seen.has(full)) {
            prompts.push({ text: full, expected: item.intent, validator: item.validator });
            seen.add(full);
          }
        }
      }
    }
  }

  return prompts.sort(() => Math.random() - 0.5).slice(0, count);
}

const TOTAL_PROMPTS = 10000;
console.log(`🚀 Generating ${TOTAL_PROMPTS} random prompts...`);
const testCases = generatePrompts(TOTAL_PROMPTS);

console.log(`🧪 Testing ${testCases.length} prompts against Fast Classifier...`);

let passed = 0;
let paramFailures = 0;
const failures = [];

const startTime = Date.now();

for (const tc of testCases) {
  try {
    const result = fastClassify(tc.text);
    if (result && result.intent === tc.expected) {
      if (tc.validator) {
        if (tc.validator(result.params, tc.expected)) {
          passed++;
        } else {
          paramFailures++;
          failures.push({
            input: tc.text,
            expected: tc.expected,
            actual: result.intent,
            error: 'Parameter extraction failed',
            params: result.params
          });
        }
      } else {
        passed++;
      }
    } else {
      failures.push({
        input: tc.text,
        expected: tc.expected,
        actual: result ? result.intent : 'null',
        params: result ? result.params : null
      });
    }
  } catch (e) {
    failures.push({
      input: tc.text,
      expected: tc.expected,
      actual: 'CRASH',
      error: e.message
    });
  }
}

const duration = Date.now() - startTime;

console.log(`\n=== Stress Test Results (Phase 2: Intent + Extraction) ===`);
console.log(`Total: ${testCases.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failures.length}`);
console.log(`  - Wrong Intent: ${failures.length - paramFailures}`);
console.log(`  - Extraction Errors: ${paramFailures}`);
console.log(`Accuracy: ${(passed / testCases.length * 100).toFixed(2)}%`);
console.log(`Duration: ${duration}ms (${(duration / testCases.length).toFixed(2)}ms/prompt)`);

if (failures.length > 0) {
  console.log(`\n--- Sample Failures (First 15) ---`);
  failures.slice(0, 15).forEach((f) => {
    console.log(`Prompt: "${f.input}"`);
    console.log(`  Expected: ${f.expected}`);
    console.log(`  Actual:   ${f.actual}`);
    if (f.error) console.log(`  Error:    ${f.error}`);
    if (f.params) console.log(`  Params:   ${JSON.stringify(f.params)}`);
    console.log('------------------------');
  });
} else {
  console.log(`\n✨ Perfect! Agent is Bulletproof.`);
}