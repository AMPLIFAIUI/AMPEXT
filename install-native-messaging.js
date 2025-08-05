#!/usr/bin/env node
// Native Messaging Host Installer for AMPiQ
// This script installs the native messaging host in the Windows registry

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🔧 AMPiQ Native Messaging Host Installer');
console.log('========================================');

// Get current directory
const currentDir = process.cwd();
const hostPath = path.join(currentDir, 'desktop-ui', 'main.js');
const manifestPath = path.join(currentDir, 'com.ampiq.amp.native.json');

console.log('Current directory:', currentDir);
console.log('Host path:', hostPath);
console.log('Manifest path:', manifestPath);

// Check if files exist
if (!fs.existsSync(hostPath)) {
  console.error('❌ Desktop app file not found:', hostPath);
  process.exit(1);
}

if (!fs.existsSync(manifestPath)) {
  console.error('❌ Manifest file not found:', manifestPath);
  process.exit(1);
}

// Read and update manifest with absolute path
try {
  // Create a .bat wrapper for Windows to execute the Node.js script
  const batPath = path.join(currentDir, 'amp-native-host.bat');
  const batContent = `@echo off\nnode "%~dp0\\desktop-ui\\main.js" --native-host %*`;
  fs.writeFileSync(batPath, batContent);
  console.log('✅ Created Windows batch wrapper:', batPath);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // Update path to the absolute path of the batch file
  manifest.path = batPath;
  
  console.log('📋 Updated manifest:');
  console.log('  Name:', manifest.name);
  console.log('  Path:', manifest.path);
  console.log('  Type:', manifest.type);
  console.log('  Allowed origins:', manifest.allowed_origins);
  
  // Create the NativeMessagingHosts directory
  const nativeHostDir = path.join(process.env.APPDATA, 'Google', 'Chrome', 'User Data', 'NativeMessagingHosts');
  console.log('Creating directory:', nativeHostDir);
  
  if (!fs.existsSync(nativeHostDir)) {
    fs.mkdirSync(nativeHostDir, { recursive: true });
    console.log('✅ Created NativeMessagingHosts directory');
  } else {
    console.log('✅ NativeMessagingHosts directory already exists');
  }
  
  // Copy manifest to Chrome directory
  const chromeManifestPath = path.join(nativeHostDir, 'com.ampiq.amp.native.json');
  fs.writeFileSync(chromeManifestPath, JSON.stringify(manifest, null, 2));
  console.log('✅ Copied manifest to:', chromeManifestPath);
  
  // Register in Windows registry
  const registryKey = 'HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.ampiq.amp.native';
  const registryCommand = `reg add "${registryKey}" /v "Default" /t REG_SZ /d "${chromeManifestPath}" /f`;
  
  console.log('Registering in Windows registry...');
  console.log('Command:', registryCommand);
  
  exec(registryCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Failed to register in registry:', error.message);
      console.error('stderr:', stderr);
      process.exit(1);
    } else {
      console.log('✅ Successfully registered in Windows registry');
      console.log('stdout:', stdout);
      
      // Verify registration
      console.log('\n🔍 Verifying registration...');
      exec(`reg query "${registryKey}" /v "Default"`, (verifyError, verifyStdout, verifyStderr) => {
        if (verifyError) {
          console.error('❌ Verification failed:', verifyError.message);
        } else {
          console.log('✅ Registry verification successful:');
          console.log(verifyStdout.trim());
        }
        
        console.log('\n🎉 Native messaging host installation complete!');
        console.log('===============================================');
        console.log('The native messaging host is now registered and ready to use.');
        console.log('');
        console.log('Next steps:');
        console.log('1. Restart Chrome browser');
        console.log('2. Load the AMP extension');
        console.log('3. Test the connection in the extension popup');
        console.log('');
        console.log('To test the connection, run: node test-native-messaging.js');
      });
    }
  });
  
} catch (error) {
  console.error('❌ Error during installation:', error);
  process.exit(1);
}
