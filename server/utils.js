// © 2025 AMPIQ All rights reserved.
const fs   = require('fs');
const path = require('path');

function loadConfig() {
  const cfgPath = path.resolve(__dirname, '..', 'config.json');
  if (!fs.existsSync(cfgPath)) {
    throw new Error(
      'config.json not found. Copy config.example.json to config.json and customize.'
    );
  }
  return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
}

module.exports = { loadConfig };