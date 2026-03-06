const WebSocket = require('ws');
const crypto = require('crypto');

const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('open', () => {
  console.log('Connected to Agent');

  const testCases = [
  {
    label: 'System Status (Structured)',
    payload: {
      type: 'intent',
      session_id: crypto.randomUUID(),
      intent: 'system.status',
      params: {}
    }
  },
  {
    label: 'Docker Status (Structured)',
    payload: {
      type: 'intent',
      session_id: crypto.randomUUID(),
      intent: 'docker.status',
      params: {}
    }
  }];


  let currentTest = 0;

  const runNext = () => {
    if (currentTest < testCases.length) {
      console.log(`\nRunning Test: ${testCases[currentTest].label}`);
      ws.send(JSON.stringify(testCases[currentTest].payload));
    } else {
      console.log('\nAll tests sent.');
      setTimeout(() => ws.close(), 2000);
    }
  };

  ws.on('message', (data) => {
    const response = JSON.parse(data);
    console.log('Response:', JSON.stringify(response, null, 2));
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