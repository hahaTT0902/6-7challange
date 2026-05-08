'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-jwt-secret-change-me';
const JWT_EXPIRES_IN = '14d';

function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Express middleware: parse Bearer token, attach req.user = {id, username} on success.
 */
function authOptional(req, _res, next) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice('Bearer '.length).trim();
    const payload = verifyToken(token);
    if (payload && payload.sub) {
      req.user = { id: Number(payload.sub), username: String(payload.username || '') };
    }
  }
  next();
}

/**
 * Express middleware: requires authentication. 401 otherwise.
 */
function authRequired(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    next();
  });
}

module.exports = { signToken, verifyToken, authOptional, authRequired };
