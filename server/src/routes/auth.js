'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');

const prisma = require('../db');
const { signToken, authRequired } = require('../middleware/auth');
const { getClientIp, hashIp } = require('../utils/ipHash');

const router = express.Router();

const USERNAME_REGEX = /^[A-Za-z0-9_\-\u4e00-\u9fff]+$/;

const credentialsSchema = z.object({
  username: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length >= 3 && s.length <= 20, {
      message: 'Username must be 3-20 characters',
    })
    .refine((s) => USERNAME_REGEX.test(s), {
      message: 'Username contains invalid characters',
    }),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password too long'),
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => hashIp(getClientIp(req)) || 'unknown',
  message: { success: false, error: 'Too many auth attempts, please slow down.' },
});

function publicUser(u) {
  return { id: u.id, username: u.username, createdAt: u.createdAt };
}

router.post('/register', authLimiter, async (req, res) => {
  let parsed;
  try {
    parsed = credentialsSchema.parse({
      username: typeof req.body?.username === 'string' ? req.body.username : '',
      password: typeof req.body?.password === 'string' ? req.body.password : '',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid input',
      details: err?.errors?.map((e) => e.message) || [String(err?.message || err)],
    });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { username: parsed.username } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Username already taken' });
    }
    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const user = await prisma.user.create({
      data: { username: parsed.username, passwordHash },
      select: { id: true, username: true, createdAt: true },
    });
    const token = signToken(user);
    return res.status(201).json({ success: true, token, user: publicUser(user) });
  } catch (err) {
    console.error('[POST /api/auth/register] db error:', err);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  let parsed;
  try {
    parsed = credentialsSchema.parse({
      username: typeof req.body?.username === 'string' ? req.body.username : '',
      password: typeof req.body?.password === 'string' ? req.body.password : '',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid input',
      details: err?.errors?.map((e) => e.message) || [String(err?.message || err)],
    });
  }

  try {
    const user = await prisma.user.findUnique({ where: { username: parsed.username } });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
    const ok = await bcrypt.compare(parsed.password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
    const token = signToken(user);
    return res.json({ success: true, token, user: publicUser(user) });
  } catch (err) {
    console.error('[POST /api/auth/login] db error:', err);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
});

router.get('/me', authRequired, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    return res.json({ success: true, user: publicUser(user) });
  } catch (err) {
    console.error('[GET /api/auth/me] db error:', err);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
});

module.exports = router;
