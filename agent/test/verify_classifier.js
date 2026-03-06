const { fastClassify } = require('../src/services/fast-classifier');

const testCases = [

  { input: 'hello', expect: { intent: 'chat.message', category: 'chat', source: 'fast' } },
  { input: 'Hey there', expect: { intent: 'chat.message', category: 'chat', source: 'fast' } },
  { input: 'good morning', expect: { intent: 'chat.message', category: 'chat', source: 'fast' } },
  { input: 'thanks', expect: { intent: 'chat.message', category: 'chat', source: 'fast' } },
  { input: 'bye', expect: { intent: 'chat.message', category: 'chat', source: 'fast' } },


  { input: 'set volume to 70', expect: { intent: 'system.volume.set', action: 'system.volume.set', category: 'volume', source: 'fast' } },
  { input: 'volume to 50', expect: { intent: 'system.volume.set', category: 'volume', source: 'fast' } },
  { input: 'volume up', expect: { intent: 'system.volume.set', category: 'volume', source: 'fast' } },
  { input: 'increase the volume', expect: { intent: 'system.volume.set', category: 'volume', source: 'fast' } },
  { input: 'mute', expect: { intent: 'system.volume.mute', category: 'volume', source: 'fast' } },
  { input: 'unmute', expect: { intent: 'system.volume.mute', category: 'volume', source: 'fast' } },


  { input: 'set brightness to 80', expect: { intent: 'system.brightness.set', category: 'brightness', source: 'fast' } },
  { input: 'make the screen brighter', expect: { intent: 'system.brightness.set', category: 'brightness', source: 'fast' } },


  { input: 'set timer for 5 minutes', expect: { intent: 'clock.timer.start', category: 'timer', source: 'fast' } },
  { input: 'timer for 30 seconds', expect: { intent: 'clock.timer.start', category: 'timer', source: 'fast' } },
  { input: 'set alarm for 6pm', expect: { intent: 'clock.alarm.set', category: 'alarm', source: 'fast' } },


  { input: 'open terminal', expect: { intent: 'system.app.open', category: 'app', source: 'fast' } },
  { input: 'open spotify', expect: { intent: 'system.app.open', category: 'app', source: 'fast' } },
  { input: 'launch safari', expect: { intent: 'system.app.open', category: 'app', source: 'fast' } },


  { input: 'play lofi beats on youtube', expect: { intent: 'browser.play_youtube', category: 'youtube', source: 'fast' } },
  { input: 'play chill music', expect: { intent: 'browser.play_youtube', category: 'youtube', source: 'fast' } },


  { input: 'what time is it', expect: { intent: 'query.time', category: 'system', source: 'fast' } },
  { input: 'system status', expect: { intent: 'system.status', category: 'system', source: 'fast' } },
  { input: 'uptime', expect: { intent: 'system.uptime', category: 'system', source: 'fast' } },


  { input: 'enable do not disturb', expect: { intent: 'system.focus.set', category: 'focus', source: 'fast' } },
  { input: 'turn off dnd', expect: { intent: 'system.focus.set', category: 'focus', source: 'fast' } },


  { input: 'take a screenshot', expect: { intent: 'screen.capture', category: 'screen', source: 'fast' } },
  { input: 'what is on my screen', expect: { intent: 'screen.capture', category: 'screen', source: 'fast' } },


  { input: 'type hello world', expect: { intent: 'computer.type', category: 'typing', source: 'fast' } },
  { input: 'list docker containers', expect: { intent: 'docker.list', category: 'docker', source: 'fast' } },
  { input: 'help', expect: { intent: 'query.help', category: 'help', source: 'fast' } },


  { input: 'analyze my docker containers and optimize them', expect: null },
  { input: "what's the best way to deploy my app to production", expect: null },
  { input: 'remind me to check the oven when the timer goes off and also set brightness based on time of day', expect: null },
  { input: 'search for mechanical keyboards on amazon', expect: { intent: 'browser.search', category: 'browser', source: 'fast' } },
  { input: 'stop the web container', expect: null }];


console.log('━━━ Fast Classifier Verification ━━━\n');

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = fastClassify(tc.input);

  if (tc.expect === null) {
    if (result === null) {
      console.log(`  ✅ PASS  "${tc.input}"  →  (null → LLM fallback)`);
      passed++;
    } else {
      console.log(`  ❌ FAIL  "${tc.input}"`);
      console.log(`          Expected: null (LLM fallback)`);
      console.log(`          Got:      intent=${result.intent}, category=${result.category}`);
      failed++;
    }
    continue;
  }

  if (!result) {
    console.log(`  ❌ FAIL  "${tc.input}"`);
    console.log(`          Expected: intent=${tc.expect.intent}, Got: null`);
    failed++;
    continue;
  }

  const checks = Object.entries(tc.expect);
  const failures = checks.filter(([key, val]) => result[key] !== val);

  if (failures.length === 0) {
    console.log(`  ✅ PASS  "${tc.input}"  →  ${result.intent} [${result.category}] (${result.confidence})`);
    passed++;
  } else {
    console.log(`  ❌ FAIL  "${tc.input}"`);
    for (const [key, val] of failures) {
      console.log(`          ${key}: expected=${val}, got=${result[key]}`);
    }
    failed++;
  }

  if (result.action !== result.intent) {
    console.log(`  ⚠️  "${tc.input}": action (${result.action}) !== intent (${result.intent})`);
  }
}

console.log(`\n━━━ Results: ${passed} passed, ${failed} failed out of ${testCases.length} ━━━`);
process.exit(failed > 0 ? 1 : 0);