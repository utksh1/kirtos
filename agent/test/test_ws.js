const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:3001/ws');

ws.on('open', () => {
  console.log('WS CONNECTION SUCCESSFUL');
  ws.close();
});

ws.on('error', (err) => {
  console.error('WS CONNECTION FAILED:', err.message);
});

setTimeout(() => {
  console.log('Test timed out');
  process.exit(1);
}, 5000);