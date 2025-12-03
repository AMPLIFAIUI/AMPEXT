#!/usr/bin/env node
// Test script for AMP Native Messaging Host

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing AMP Native Messaging Host...');
console.log('=====================================');

// Test the native messaging host directly
function testNativeHost() {
  console.log('📡 Testing native host communication...');
  
  const hostPath = path.join(__dirname, 'amp-native-host.js');
  console.log('Host path:', hostPath);

  // Spawn the native host process
  const host = spawn('node', [hostPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let messageBuffer = Buffer.alloc(0);
  let testResults = {
    ping: false,
    status: false,
    overflow: false
  };
  
  // Handle messages from host
  host.stdout.on('data', (data) => {
    messageBuffer = Buffer.concat([messageBuffer, data]);
    
    while (messageBuffer.length >= 4) {
      const messageLength = messageBuffer.readUInt32LE(0);
      
      if (messageBuffer.length >= 4 + messageLength) {
        const messageData = messageBuffer.slice(4, 4 + messageLength);
        messageBuffer = messageBuffer.slice(4 + messageLength);
        
        try {
          const message = JSON.parse(messageData.toString('utf8'));
          console.log('📨 Received:', message);
          
          switch (message.type) {
            case 'pong':
              testResults.ping = true;
              console.log('✅ Ping test passed');
              break;
            case 'status':
              testResults.status = true;
              console.log('✅ Status test passed');
              break;
            case 'data_stored':
              testResults.overflow = true;
              console.log('✅ Data storage test passed');
              break;
          }
          
          // Check if all tests passed
          if (testResults.ping && testResults.status && testResults.overflow) {
            console.log('\n🎉 All tests passed! Native messaging host is working correctly.');
            host.kill();
            process.exit(0);
          }
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
    console.log('🔧 Host stderr:', data.toString());
  });
  
  // Handle process exit
  host.on('close', (code) => {
    console.log(`\n📊 Test Results:`);
    console.log(`  Ping: ${testResults.ping ? '✅' : '❌'}`);
    console.log(`  Status: ${testResults.status ? '✅' : '❌'}`);
    console.log(`  Data Storage: ${testResults.overflow ? '✅' : '❌'}`);
    
    if (code !== 0) {
      console.log(`\n❌ Native host process exited with code ${code}`);
    }
  });
  
  // Wait a moment for host to start, then send test messages
  setTimeout(() => {
    console.log('📤 Sending ping test...');
    sendMessage(host, { type: 'ping' });

    setTimeout(() => {
      console.log('📤 Sending status test...');
      sendMessage(host, { type: 'status' });

      setTimeout(() => {
        console.log('📤 Sending data storage test...');
        sendMessage(host, {
          type: 'sendAllMemory',
          chunks: [{
            id: 'test-chunk-1',
            content: 'Test message from native messaging test',
            ai_provider: 'Test',
            timestamp: Date.now(),
            size: 40
          }],
          timestamp: Date.now(),
          totalChunks: 1,
          totalSize: 40
        });
      }, 1000);
    }, 1000);
  }, 2000);
  
  // Timeout after 10 seconds
  setTimeout(() => {
    console.log('\n⏰ Test timeout reached');
    host.kill();
    process.exit(1);
  }, 10000);
}

// Helper function to send messages to native host
function sendMessage(host, message) {
  try {
    const messageStr = JSON.stringify(message);
    const messageBuffer = Buffer.from(messageStr, 'utf8');
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(messageBuffer.length, 0);
    
    host.stdin.write(lengthBuffer);
    host.stdin.write(messageBuffer);
    console.log('📤 Sent:', message);
  } catch (error) {
    console.error('❌ Failed to send message:', error);
  }
}

// Test Chrome extension connection
function testChromeExtension() {
  console.log('\n🌐 Testing Chrome extension connection...');
  console.log('Note: This requires the extension to be loaded in Chrome');
  console.log('Extension ID: hfbonpgnfcddledclfkcfpldkjabelel');
  console.log('Native host: com.ampiq.amp.native');
  
  // Check if manifest exists
  const manifestPath = path.join(process.env.APPDATA, 'Google', 'Chrome', 'User Data', 'NativeMessagingHosts', 'com.ampiq.amp.native.json');
  const fs = require('fs');
  
  if (fs.existsSync(manifestPath)) {
    console.log('✅ Native messaging manifest found');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log('Manifest details:');
    console.log('  Name:', manifest.name);
    console.log('  Path:', manifest.path);
    console.log('  Allowed origins:', manifest.allowed_origins);
  } else {
    console.log('❌ Native messaging manifest not found');
  }
}

// Run the test
testNativeHost();
testChromeExtension();