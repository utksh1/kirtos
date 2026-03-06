const fs = require('fs');
const path = require('path');
const { PolicyEngine } = require('../../src/policy/engine');
const Canonicalizer = require('../../src/policy/canonicalizer');
const Mutators = require('./mutators');

const ITERATIONS = process.env.FUZZ_ITERS || 20;
const CORPUS_PATH = path.join(__dirname, 'corpus.txt');

const corpus = fs.readFileSync(CORPUS_PATH, 'utf8').
split('\n').
filter((line) => line.trim()).
map((line) => {
  try {return JSON.parse(line);} catch (e) {return null;}
}).
filter(Boolean);

console.log(`\n--- Starting Kirtos Fuzz Runner (${ITERATIONS} iterations) ---`);

let totalPassed = 0;
let totalDenied = 0;
let totalFailed = 0;

for (let i = 0; i < ITERATIONS; i++) {
  const base = corpus[i % corpus.length];
  const mutated = Mutators.mutate(base);

  try {
    const canonical = Canonicalizer.canonicalize(mutated);
    const decision = PolicyEngine.evaluate(canonical, 'fuzz-session');



    if (canonical.intent && !PolicyEngine.IntentRegistry.get(canonical.intent)) {
      if (decision.allowed) {
        throw new Error(`Invariant Violation: Allowed unknown intent ${canonical.intent}`);
      }
    }


    const trace = Canonicalizer.canonicalizeWithTrace(mutated);
    if (JSON.stringify(mutated).match(/[\u200B-\u200D\uFEFF]/)) {
      if (!trace.transformations.includes('STRIP_INVISIBLE')) {
        throw new Error(`Invariant Violation: Canonicalizer failed to strip invisible char`);
      }
    }

    if (decision.allowed) {
      totalPassed++;
    } else {
      totalDenied++;
    }

  } catch (err) {
    console.error(`\n[!] FUZZ FAILURE at iteration ${i}:`);
    console.error(`Input: ${JSON.stringify(mutated, null, 2)}`);
    console.error(`Error: ${err.message}`);
    console.error(err.stack);
    totalFailed++;
    process.exit(1);
  }
}

console.log(`\n--- Fuzz Suite Complete ---`);
console.log(`Total Passed: ${totalPassed}`);
console.log(`Total Denied: ${totalDenied}`);
console.log(`Total Failed: ${totalFailed}`);

if (totalFailed > 0) process.exit(1);else
process.exit(0);