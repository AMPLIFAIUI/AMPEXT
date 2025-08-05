// © 2025 AMPIQ All rights reserved.
const crypto       = require('crypto');
const { loadConfig } = require('./utils');
const config       = loadConfig();

function validateKey(key) {
  const h = crypto.createHmac('sha256', config.license.secret);
  h.update(config.license.customerId);
  return h.digest('hex') === key;
}

module.exports = function requireLicense(req, res, next) {
  const key = req.headers['x-license-key'] || '';
  if (!validateKey(key)) {
    return res.status(403).json({ error: 'Invalid or missing license key' });
  }
  next();
};