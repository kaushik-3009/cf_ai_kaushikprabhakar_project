const WebSocket = require('ws');
const ws = new WebSocket('wss://cf-ai-chatbot.kaushik-sp2002.workers.dev/agents/ChatAgent/test-room');
ws.on('open', () => console.log('Connected'));
ws.on('message', data => console.log('Message:', data.toString()));
ws.on('close', (code, reason) => console.log('Closed:', code, reason.toString()));
ws.on('error', err => console.log('Error:', err));
