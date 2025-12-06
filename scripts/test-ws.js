const WebSocket = require('ws');
const url = process.argv[2] || 'ws://127.0.0.1:7100';
const ws = new WebSocket(url);

let settled = false;
const timeout = setTimeout(() => {
  if (!settled) {
    console.error('timeout');
    process.exit(3);
  }
}, 7000);

ws.on('open', () => {
  console.log('open');
  settled = true;
  clearTimeout(timeout);
  ws.close();
  process.exit(0);
});

ws.on('close', () => {
  // ignore
});

ws.on('error', (err) => {
  console.error('error', err && err.message ? err.message : err);
  settled = true;
  clearTimeout(timeout);
  process.exit(2);
});
