#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const IntentRegistry = require('./src/policy/registry');

const command = process.argv[2];
const args = process.argv.slice(3);

if (command === 'registry:dump') {
  const dump = IntentRegistry.dump();
  const outputPath = args[0] || 'registry_dump.json';
  fs.writeFileSync(path.resolve(process.cwd(), outputPath), JSON.stringify(dump, null, 2));
  console.log(`[Kirtos] Registry dumped to ${outputPath}`);
  console.log(`[Kirtos] Fingerprint: ${IntentRegistry.getFingerprint()}`);
} else if (command === 'registry:diff') {
  const fileA = args[0];
  const fileB = args[1];

  if (!fileA || !fileB) {
    console.error('Usage: kirtos registry:diff <old.json> <new.json>');
    process.exit(1);
  }

  const a = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), fileA)));
  const b = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), fileB)));

  console.log(`\n--- Kirtos Registry Diff ---`);


  const aNames = a.intents.map((i) => i.name);
  const bNames = b.intents.map((i) => i.name);

  const added = bNames.filter((n) => !aNames.includes(n));
  const removed = aNames.filter((n) => !bNames.includes(n));

  if (added.length) console.log(`[+] Added Intents: ${added.join(', ')}`);
  if (removed.length) console.log(`[-] Removed Intents: ${removed.join(', ')}`);


  b.intents.forEach((bIntent) => {
    const aIntent = a.intents.find((i) => i.name === bIntent.name);
    if (aIntent) {
      const changes = [];
      if (aIntent.risk !== bIntent.risk) changes.push(`risk: ${aIntent.risk} -> ${bIntent.risk}`);
      if (aIntent.runtime !== bIntent.runtime) changes.push(`runtime: ${aIntent.runtime} -> ${bIntent.runtime}`);
      if (JSON.stringify(aIntent.permissions) !== JSON.stringify(bIntent.permissions)) {
        changes.push(`permissions modified`);
      }
      if (JSON.stringify(aIntent.schema) !== JSON.stringify(bIntent.schema)) {
        changes.push(`schema modified`);
      }

      if (changes.length) {
        console.log(`[~] Modified Intent: ${bIntent.name}`);
        changes.forEach((c) => console.log(`    - ${c}`));
      }
    }
  });


  Object.keys(b.policies).forEach((domain) => {
    const aPol = a.policies[domain];
    const bPol = b.policies[domain];
    if (!aPol) {
      console.log(`[+] New Domain Policy: ${domain}`);
    } else if (JSON.stringify(aPol) !== JSON.stringify(bPol)) {
      console.log(`[~] Modified Policy: ${domain}`);
    }
  });

} else {
  console.log('Usage: kirtos <command>');
  console.log('Available commands:');
  console.log('  registry:dump [output.json]     Write canonical JSON of registry surface');
  console.log('  registry:diff old.json new.json Show what changed in registry surface');
}