'use strict';

const express = require('express');
const prisma = require('../db');
const { submitScoreSchema } = require('../utils/validation');
const { submitScoreLimiter } = require('../middleware/rateLimit');
const { authOptional } = require('../middleware/auth');
const { getClientIp, hashIp } = require('../utils/ipHash');

const router = express.Router();

const PUBLIC_FIELDS = {
  id: true,
  nickname: true,
  score: true,
  createdAt: true,
  userId: true,
};

/**
 * Compute rank for a given score row.
 * Rank = (count of scores strictly greater) + (count of equal scores with earlier createdAt) + 1
 */
async function computeRank(scoreValue, createdAt) {
  const higher = await prisma.score.count({ where: { score: { gt: scoreValue } } });
  const earlierTies = await prisma.score.count({
    where: { score: scoreValue, createdAt: { lt: createdAt } },
  });
  return higher + earlierTies + 1;
}

/**
 * Hypothetical rank for an arbitrary score (no row yet). Used by the result
 * screen so guests can see where their current score would land before
 * submitting.
 */
async function computeHypotheticalRank(scoreValue) {
  const higher = await prisma.score.count({ where: { score: { gt: scoreValue } } });
  return higher + 1;
}

// GET /api/scores/rank?score=N—public, preview rank for any score.
router.get('/rank', async (req, res) => {
  const score = Number(req.query.score);
  if (!Number.isInteger(score) || score < 0) {
    return res.status(400).json({ success: false, error: 'Invalid score' });
  }
  try {
    const rank = await computeHypotheticalRank(score);
    const total = await prisma.score.count();
    return res.json({ success: true, rank, total });
  } catch (err) {
    console.error('[GET /api/scores/rank] db error:', err);
    return res.status(500).json({ success: false, error: 'Database error' });
  }
});

// POST /api/scores
router.post('/', submitScoreLimiter, authOptional, async (req, res) => {
  // Logged-in users always submit under their account username; the incoming
  // nickname field is ignored to prevent identity spoofing.
  const incomingNickname = typeof req.body?.nickname === 'string' ? req.body.nickname : '';
  const nicknameForValidation = req.user?.username || incomingNickname;

  let parsed;
  try {
    parsed = submitScoreSchema.parse({
      nickname: nicknameForValidation,
      score: Number(req.body?.score),
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid input',
      details: err?.errors?.map((e) => e.message) || [String(err?.message || err)],
    });
  }

  const userAgentRaw = req.headers['user-agent'];
  const userAgent =
    typeof userAgentRaw === 'string' ? userAgentRaw.slice(0, 255) : null;
  const ipHash = hashIp(getClientIp(req));

  try {
    let row;
    if (req.user) {
      // One row per registered user — keep their personal best on the board.
      const existing = await prisma.score.findUnique({ where: { userId: req.user.id } });
      if (existing) {
        if (parsed.score > existing.score) {
          row = await prisma.score.update({
            where: { userId: req.user.id },
            data: {
              nickname: parsed.nickname,
              score: parsed.score,
              userAgent,
              ipHash,
              createdAt: new Date(),
            },
            select: PUBLIC_FIELDS,
          });
        } else {
          // Not a new personal best — keep existing row, just sync nickname.
          row = await prisma.score.update({
            where: { userId: req.user.id },
            data: { nickname: parsed.nickname },
            select: PUBLIC_FIELDS,
          });
        }
      } else {
        row = await prisma.score.create({
          data: {
            nickname: parsed.nickname,
            score: parsed.score,
            userAgent,
            ipHash,
            userId: req.user.id,
          },
          select: PUBLIC_FIELDS,
        });
      }
    } else {
      row = await prisma.score.create({
        data: {
          nickname: parsed.nickname,
          score: parsed.score,
          userAgent,
          ipHash,
        },
        select: PUBLIC_FIELDS,
      });
    }

    const rank = await computeRank(row.score, row.createdAt);

    return res.status(201).json({
      success: true,
      score: {
        id: row.id,
        nickname: row.nickname,
        score: row.score,
        createdAt: row.createdAt,
        verified: !!row.userId,
      },
      rank,
    });
  } catch (err) {
    console.error('[POST /api/scores] db error:', err);
    return res.status(500).json({ success: false, error: 'Database error' });
  }
});

// GET /api/scores/:id/rank
router.get('/:id/rank', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid id' });
  }

  try {
    const row = await prisma.score.findUnique({
      where: { id },
      select: PUBLIC_FIELDS,
    });
    if (!row) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    const rank = await computeRank(row.score, row.createdAt);
    return res.json({
      success: true,
      score: {
        id: row.id,
        nickname: row.nickname,
        score: row.score,
        createdAt: row.createdAt,
        verified: !!row.userId,
      },
      rank,
    });
  } catch (err) {
    console.error('[GET /api/scores/:id/rank] db error:', err);
    return res.status(500).json({ success: false, error: 'Database error' });
  }
});

module.exports = router;
