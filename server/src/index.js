'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');

const { generalLimiter } = require('./middleware/rateLimit');
const scoresRouter = require('./routes/scores');
const leaderboardRouter = require('./routes/leaderboard');
const authRouter = require('./routes/auth');
const duelsRouter = require('./routes/duels');

const app = express();

// Behind Nginx / Cloudflare we trust the first proxy hop for client IP.
app.set('trust proxy', 1);

app.use(helmet());
app.use(express.json({ limit: '10kb' }));

// Optional CORS only when explicitly cross-origin (e.g., dev with vite on :5173)
const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN || '';
const NODE_ENV = process.env.NODE_ENV || 'development';

app.use((req, res, next) => {
  // In production same-origin (served by Nginx) we don't need CORS at all.
  // For dev or alternate origin, allow only the configured public origin.
  const origin = req.headers.origin;
  if (origin && PUBLIC_ORIGIN && origin === PUBLIC_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  } else if (origin && NODE_ENV !== 'production') {
    // Permissive in dev only
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

app.use('/api', generalLimiter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/scores', scoresRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/auth', authRouter);
app.use('/api/duels', duelsRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ success: false, error: 'Internal error' });
});

const PORT = parseInt(process.env.PORT, 10) || 3007;
app.listen(PORT, () => {
  console.log(`67 Challenge API listening on :${PORT} (${NODE_ENV})`);
});
