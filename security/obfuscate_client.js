// © 2025 AMPIQ All rights reserved.
// Production client-side JS obfuscation for security

const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');

const inputCode = fs.readFileSync('../ext/utils.js', 'utf8');
const outputCode = JavaScriptObfuscator.obfuscate(inputCode, {
  compact: true,
  controlFlowFlattening: true,
  deadCodeInjection: true,
  stringArrayEncoding: ['base64'],
}).getObfuscatedCode();

fs.writeFileSync('../ext/utils.obf.js', outputCode);
