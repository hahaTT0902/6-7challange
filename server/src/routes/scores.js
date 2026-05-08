'use strict';

const express = require('express');
const prisma = require('../db');
const { submitScoreSchema } = require('../utils/validation');
const { submitScoreLimiter } = require('../middleware/rateLimit');
const { getClientIp, hashIp } = require('../utils/ipHash');

const router = express.Router();

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

// POST /api/scores
router.post('/', submitScoreLimiter, async (req, res) => {
  let parsed;
  try {
    parsed = submitScoreSchema.parse({
      nickname: typeof req.body?.nickname === 'string' ? req.body.nickname : '',
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
    const created = await prisma.score.create({
      data: {
        nickname: parsed.nickname,
        score: parsed.score,
        userAgent,
        ipHash,
      },
      select: {
        id: true,
        nickname: true,
        score: true,
        createdAt: true,
      },
    });

    const rank = await computeRank(created.score, created.createdAt);

    return res.status(201).json({
      success: true,
      score: created,
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
      select: { id: true, nickname: true, score: true, createdAt: true },
    });
    if (!row) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    const rank = await computeRank(row.score, row.createdAt);
    return res.json({ success: true, score: row, rank });
  } catch (err) {
    console.error('[GET /api/scores/:id/rank] db error:', err);
    return res.status(500).json({ success: false, error: 'Database error' });
  }
});

module.exports = router;
