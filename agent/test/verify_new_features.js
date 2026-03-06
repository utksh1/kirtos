




const knowledge = require('../src/executor/knowledge');
const fun = require('../src/executor/fun');
const media = require('../src/executor/media');
const system = require('../src/executor/system');
const { fastClassify } = require('../src/services/fast-classifier');

async function test(label, fn) {
  try {
    const result = await fn();
    console.log(`✅ ${label}:`, JSON.stringify(result, null, 2));
  } catch (err) {
    console.log(`❌ ${label}:`, err.message);
  }
}

async function main() {
  console.log('=== EXECUTOR TESTS ===\n');

  await test('knowledge.search (Wikipedia)', () =>
  knowledge.execute('knowledge.search', { query: 'Node.js' })
  );

  await test('fun.joke', () =>
  fun.execute('fun.joke', { category: 'Programming' })
  );

  await test('query.greet', () =>
  system.execute('query.greet', {})
  );

  await test('media.play_music (list only, no actual play)', () =>
  media.execute('media.list_music', {})
  );

  console.log('\n=== CLASSIFIER TESTS ===\n');

  const classifierTests = [
  'what is JavaScript',
  'tell me about Python',
  'wikipedia Albert Einstein',
  'tell me a joke',
  'make me laugh',
  'good morning',
  'greet me',
  'play music',
  'play song chillhop'];


  for (const input of classifierTests) {
    const result = fastClassify(input);
    if (result) {
      console.log(`✅ "${input}" → ${result.intent} (${result.confidence})`);
    } else {
      console.log(`⚠️ "${input}" → no fast match (will go to AI classifier)`);
    }
  }

  console.log('\n=== DONE ===');
}

main();