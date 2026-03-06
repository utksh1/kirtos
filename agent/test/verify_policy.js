const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3001/ws');

function send(ws, payload) {
  return new Promise((resolve) => {
    ws.send(JSON.stringify(payload));
    ws.once('message', (data) => {
      resolve(JSON.parse(data));
    });
  });
}

ws.on('open', async () => {
  console.log('Connected to Kirtos');

  const testCases = [
  {
    name: 'Safe Intent (system.status)',
    payload: { session_id: '1', intent: 'system.status', params: {} },
    expected: { status: 'success', decision: { allowed: true, execution_profile: 'safe' } }
  },
  {
    name: 'Restricted Intent (docker.list)',
    payload: { session_id: '2', intent: 'docker.list', params: {} },
    expected: { status: 'success', decision: { allowed: true, execution_profile: 'restricted' } }
  },
  {
    name: 'Dangerous Intent (docker.stop) -> Confirmation Required',
    payload: { session_id: '3', intent: 'docker.stop', params: { container: 'my-container' } },
    expected: { status: 'success', decision: { allowed: true, requires_confirmation: true, execution_profile: 'restricted' } }
    // Note: docker.stop risk is medium (restricted) but permissions docker.control requires confirmation. 





  },
  {
    name: 'Critical Intent (shell.exec) -> Dangerous Profile',
    payload: { session_id: '4', intent: 'shell.exec', params: { command: 'ls' } },
    expected: { status: 'success', decision: { allowed: true, execution_profile: 'dangerous', requires_confirmation: true } }
  },
  {
    name: 'Invalid Intent Name',
    payload: { session_id: '5', intent: 'hack.system', params: {} },
    expected: { status: 'denied', error: 'Unknown intent: hack.system' }
  },
  {
    name: 'Invalid Parameters',
    payload: { session_id: '6', intent: 'file.read', params: {} },
    expected: { status: 'denied' }
  }];


  for (const test of testCases) {
    console.log(`\nRunning Test: ${test.name}`);
    const result = await send(ws, test.payload);
    console.log('Result:', JSON.stringify(result, null, 2));


    if (result.status === test.expected.status) {
      if (test.expected.decision) {
        if (result.decision.execution_profile === test.expected.decision.execution_profile &&
        result.decision.requires_confirmation === test.expected.decision.requires_confirmation) {
          console.log('✅ PASS');
        } else {
          console.log('❌ FAIL (Decision mismatch)');
        }
      } else {
        console.log('✅ PASS');
      }
    } else {
      console.log('❌ FAIL (Status mismatch)');
    }
  }

  ws.close();
  process.exit(0);
});