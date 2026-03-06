const WebSocket = require('ws');
const crypto = require('crypto');

const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('open', () => {
  console.log('Connected to Agent');
  const sessionId = crypto.randomUUID();

  const testCases = [
  {
    label: 'Turn 1: Get Status',
    payload: {
      type: 'natural-language',
      session_id: sessionId,
      text: "What's the system status?"
    }
  },
  {
    label: 'Turn 2: Follow-up (Repeat that)',
    payload: {
      type: 'natural-language',
      session_id: sessionId,
      text: "Repeat that."
    }
  },
  {
    label: 'Turn 3: Docker List',
    payload: {
      type: 'natural-language',
      session_id: sessionId,
      text: "List docker containers"
    }
  },
  {
    label: 'Turn 4: Follow-up (Contextual Stop)',
    payload: {
      type: 'natural-language',
      session_id: sessionId,
      text: "Stop the one we just listed"
    }
  }];


  let currentTest = 0;

  const runNext = () => {
    if (currentTest < testCases.length) {
      console.log(`\n--- ${testCases[currentTest].label} ---`);
      console.log(`Input: "${testCases[currentTest].payload.text}"`);
      ws.send(JSON.stringify(testCases[currentTest].payload));
    } else {
      console.log('\nAll tests sent.');
      setTimeout(() => ws.close(), 2000);
    }
  };

  ws.on('message', (data) => {
    const response = JSON.parse(data);
    console.log('Response Intent:', response.intent);
    console.log('Response Reasoning:', response.reasoning);
    console.log('Response Status:', response.status);
    if (response.result) console.log('Result Keys:', Object.keys(response.result));

    currentTest++;
    runNext();
  });

  runNext();
});

ws.on('error', (err) => {
  console.error('WebSocket Error:', err);
});

ws.on('close', () => {
  console.log('Connection closed');
});