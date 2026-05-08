'use strict';

const crypto = require('crypto');

function hashIp(ip) {
  if (!ip) return null;
  const secret = process.env.IP_HASH_SECRET || 'default-secret-change-me';
  return crypto.createHmac('sha256', secret).update(String(ip)).digest('hex');
}

function getClientIp(req) {
  // Trust proxy must be enabled in app.set('trust proxy', ...) for this to be reliable
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

module.exports = { hashIp, getClientIp };
