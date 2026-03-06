const executor = require('../src/executor');
const IntentRegistry = require('../src/policy/registry');
const constraints = require('../src/policy/constraints');

async function test() {
    console.log('--- Testing Intention Engine Integration ---');

    // 1. Test browser.open (needs network.online)
    console.log('\n[Test 1] browser.open with network check');
    const res1 = await executor.execute('browser', 'browser.open', { url: 'https://google.com' }, { role: 'admin' });
    console.log(`Status: ${res1.status}`);
    if (res1.error) console.log(`Error: ${res1.error.message}`);

    // 2. Test whatsapp.send (needs whatsapp.connected)
    console.log('\n[Test 2] whatsapp.send with connection check');
    const res2 = await executor.execute('whatsapp', 'whatsapp.send', { number: '12345', message: 'Hi' }, { role: 'admin' });
    console.log(`Status: ${res2.status}`);
    if (res2.error) console.log(`Error: ${res2.error.message}`);

    // 3. Test a post-condition (we'll add one to a dummy intent if needed, or just observe behavior)
    // For now, let's add a post-condition to system.status just for testing
    // 3. Test browser.search (needs fail.always - should FAIL)
    console.log('\n[Test 3] browser.search with forced failure');
    const res3 = await executor.execute('browser', 'browser.search', { query: 'test' }, { role: 'admin' });
    console.log(`Status: ${res3.status}`);
    if (res3.error) console.log(`Error: ${res3.error.message}`);

    console.log('\n[Verification Complete]');
}

test().catch(console.error);
