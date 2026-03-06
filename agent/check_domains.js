const path = require('path');
const fs = require('fs');

const domainsDir = path.join(__dirname, 'src/policy/registry/domains');
const files = fs.readdirSync(domainsDir).filter((f) => f.endsWith('.js'));
console.log('Domain files:', files.join(', '));

for (const file of files) {
  try {
    const d = require(path.join(domainsDir, file));
    const executors = d.domainPolicy && d.domainPolicy.allowedExecutors ? d.domainPolicy.allowedExecutors : ['*'];
    const intents = Object.entries(d.intents || {});
    for (const [key, def] of intents) {
      if (!executors.includes('*') && !executors.includes(def.runtime)) {
        console.log('VIOLATION:', d.name + '.' + key, 'runtime=' + def.runtime, 'allowed=' + executors.join(','));
      }
    }
    console.log('OK:', file, '(' + intents.length + ' intents)');
  } catch (e) {
    console.log('LOAD ERROR:', file, e.message);
  }
}

console.log('\nNow testing full registry load...');
try {
  const registry = require('./src/policy/registry');
  console.log('Registry loaded! Intents:', Object.keys(registry.getAll()).length);
  console.log('chat.message:', !!registry.get('chat.message'));
  console.log('device.open_app:', !!registry.get('device.open_app'));
  console.log('system.app.open:', !!registry.get('system.app.open'));
} catch (e) {
  console.log('REGISTRY FAILED:', e.message);
}

process.exit(0);