#!/usr/bin/env node
// Debug test for native messaging protocol

const { spawn } = require('child_process');
const path = require('path');

console.log('🔍 Debug Native Messaging Test');
console.log('==============================');

const hostPath = path.join(__dirname, 'desktop-ui', 'main.js');
console.log('Testing host:', hostPath);

// Spawn the native host
const host = spawn('node', [hostPath, '--native-host'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let messageBuffer = Buffer.alloc(0);

// Handle stdout from host
host.stdout.on('data', (data) => {
  console.log('📨 STDOUT raw data:', data);
  console.log('📨 STDOUT as string:', data.toString());
  console.log('📨 STDOUT as hex:', data.toString('hex'));
  
  messageBuffer = Buffer.concat([messageBuffer, data]);
  
  // Try to parse messages
  while (messageBuffer.length >= 4) {
    const messageLength = messageBuffer.readUInt32LE(0);
    console.log('Message length:', messageLength);
    
    if (messageBuffer.length >= 4 + messageLength) {
      const messageData = messageBuffer.slice(4, 4 + messageLength);
      messageBuffer = messageBuffer.slice(4 + messageLength);
      
      try {
        const message = JSON.parse(messageData.toString('utf8'));
        console.log('✅ Received message:', message);
      } catch (error) {
        console.error('❌ Failed to parse message:', error);
      }
    } else {
      break;
    }
  }
});

// Handle stderr
host.stderr.on('data', (data) => {
  console.log('🔧 STDERR:', data.toString());
});

// Handle process exit
host.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
});

// Send a simple ping message
setTimeout(() => {
  console.log('📤 Sending ping...');
  const message = { action: 'ping' };
  const messageStr = JSON.stringify(message);
  const messageBuffer = Buffer.from(messageStr, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(messageBuffer.length, 0);
  
  console.log('📤 Sending length buffer:', lengthBuffer);
  console.log('📤 Sending message buffer:', messageBuffer);
  
  host.stdin.write(lengthBuffer);
  host.stdin.write(messageBuffer);
  console.log('📤 Sent ping message');
}, 3000);

// Cleanup after 8 seconds
setTimeout(() => {
  console.log('🧹 Cleaning up...');
  host.kill();
  process.exit(0);
}, 8000);