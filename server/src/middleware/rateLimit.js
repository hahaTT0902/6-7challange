'use strict';

const rateLimit = require('express-rate-limit');
const { getClientIp, hashIp } = require('../utils/ipHash');

// Same IP hash: max 5 submissions per minute
const submitScoreLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => hashIp(getClientIp(req)) || 'unknown',
  message: { success: false, error: 'Too many submissions, please slow down.' },
});

// General API limiter
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => hashIp(getClientIp(req)) || 'unknown',
});

module.exports = { submitScoreLimiter, generalLimiter };
