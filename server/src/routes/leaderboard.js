'use strict';

const express = require('express');
const prisma = require('../db');

const router = express.Router();

function getPeriodWhere(period) {
  if (period === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { createdAt: { gte: start } };
  }
  if (period === 'week') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    // Move back to Monday (ISO week start). Week starts Monday.
    const day = start.getDay(); // 0=Sun..6=Sat
    const diff = (day + 6) % 7; // days since Monday
    start.setDate(start.getDate() - diff);
    return { createdAt: { gte: start } };
  }
  return {};
}

// GET /api/leaderboard?period=all|today|week&limit=100
router.get('/', async (req, res) => {
  const periodRaw = String(req.query.period || 'all').toLowerCase();
  const period = ['all', 'today', 'week'].includes(periodRaw) ? periodRaw : 'all';

  let limit = parseInt(req.query.limit, 10);
  if (!Number.isInteger(limit) || limit <= 0) limit = 100;
  if (limit > 100) limit = 100;

  try {
    const where = getPeriodWhere(period);
    const rows = await prisma.score.findMany({
      where,
      orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
      take: limit,
      select: { id: true, nickname: true, score: true, createdAt: true, userId: true },
    });

    const items = rows.map((r, idx) => ({
      rank: idx + 1,
      id: r.id,
      nickname: r.nickname,
      score: r.score,
      createdAt: r.createdAt,
      verified: !!r.userId,
    }));

    return res.json({ period, items });
  } catch (err) {
    console.error('[GET /api/leaderboard] db error:', err);
    return res.status(500).json({ success: false, error: 'Database error' });
  }
});

module.exports = router;
