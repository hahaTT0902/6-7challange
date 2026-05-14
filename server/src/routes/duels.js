'use strict';

const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');

const prisma = require('../db');
const { authRequired } = require('../middleware/auth');
const { MAX_ALLOWED_SCORE } = require('../utils/validation');
const { consumeSessionToken } = require('../utils/gameSession');

const router = express.Router();

// Friendly room code (no easily-confused chars)
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateCode(length = 6) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

const scoreSchema = z.object({
  score: z.number().int().min(0).max(MAX_ALLOWED_SCORE),
});

function publicDuel(d) {
  if (!d) return null;
  return {
    id: d.id,
    code: d.code,
    status: d.status,
    creator: d.creator ? { id: d.creator.id, username: d.creator.username } : null,
    creatorScore: d.creatorPlayed ? d.creatorScore : null,
    creatorPlayed: !!d.creatorPlayed,
    opponent: d.opponent ? { id: d.opponent.id, username: d.opponent.username } : null,
    opponentScore: d.opponentPlayed ? d.opponentScore : null,
    opponentPlayed: !!d.opponentPlayed,
    createdAt: d.createdAt,
    finishedAt: d.finishedAt,
    winner:
      d.status === 'done' && d.creatorScore != null && d.opponentScore != null
        ? d.creatorScore === d.opponentScore
          ? 'tie'
          : d.creatorScore > d.opponentScore
            ? 'creator'
            : 'opponent'
        : null,
  };
}

const duelInclude = {
  creator: { select: { id: true, username: true } },
  opponent: { select: { id: true, username: true } },
};

// POST /api/duels  — create a new duel; returns code
router.post('/', authRequired, async (req, res) => {
  try {
    // Try a few times in unlikely event of collision
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateCode(6);
      const exists = await prisma.duel.findUnique({ where: { code } });
      if (exists) continue;
      const duel = await prisma.duel.create({
        data: {
          code,
          creatorId: req.user.id,
          status: 'pending',
        },
        include: duelInclude,
      });
      return res.status(201).json({ success: true, duel: publicDuel(duel) });
    }
    return res.status(500).json({ success: false, error: 'Could not allocate code' });
  } catch (err) {
    console.error('[POST /api/duels] db error:', err);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// GET /api/duels/:code
router.get('/:code', authRequired, async (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code)) {
    return res.status(400).json({ success: false, error: 'Invalid code' });
  }
  try {
    const duel = await prisma.duel.findUnique({ where: { code }, include: duelInclude });
    if (!duel) return res.status(404).json({ success: false, error: 'Duel not found' });
    return res.json({ success: true, duel: publicDuel(duel) });
  } catch (err) {
    console.error('[GET /api/duels/:code] db error:', err);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// POST /api/duels/:code/join
router.post('/:code/join', authRequired, async (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code)) {
    return res.status(400).json({ success: false, error: 'Invalid code' });
  }
  try {
    const duel = await prisma.duel.findUnique({ where: { code }, include: duelInclude });
    if (!duel) return res.status(404).json({ success: false, error: 'Duel not found' });
    if (duel.creatorId === req.user.id) {
      // Creator cannot join own duel as opponent — just return current state.
      return res.json({ success: true, duel: publicDuel(duel) });
    }
    if (duel.opponentId && duel.opponentId !== req.user.id) {
      return res.status(409).json({ success: false, error: 'Duel already has an opponent' });
    }
    const updated = await prisma.duel.update({
      where: { code },
      data: {
        opponentId: req.user.id,
        status: duel.status === 'pending' ? 'playing' : duel.status,
      },
      include: duelInclude,
    });
    return res.json({ success: true, duel: publicDuel(updated) });
  } catch (err) {
    console.error('[POST /api/duels/:code/join] db error:', err);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// POST /api/duels/:code/score  body: { score }
router.post('/:code/score', authRequired, async (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code)) {
    return res.status(400).json({ success: false, error: 'Invalid code' });
  }
  let parsed;
  try {
    parsed = scoreSchema.parse({ score: Number(req.body?.score) });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid input',
      details: err?.errors?.map((e) => e.message) || [String(err?.message || err)],
    });
  }
  // Same anti-tamper check as POST /api/scores: a duel round must originate
  // from a server-issued single-use token, played out for the full duration.
  const sessionResult = consumeSessionToken(
    req.body?.sessionToken,
    req.user.id,
    parsed.score
  );
  if (!sessionResult.ok) {
    return res.status(400).json({
      success: false,
      error: sessionResult.error,
      code: 'invalid_session',
    });
  }
  try {
    const duel = await prisma.duel.findUnique({ where: { code } });
    if (!duel) return res.status(404).json({ success: false, error: 'Duel not found' });

    const isCreator = duel.creatorId === req.user.id;
    const isOpponent = duel.opponentId === req.user.id;
    if (!isCreator && !isOpponent) {
      return res.status(403).json({ success: false, error: 'Not a participant' });
    }
    if (isCreator && duel.creatorPlayed) {
      return res.status(409).json({ success: false, error: 'You have already submitted your score' });
    }
    if (isOpponent && duel.opponentPlayed) {
      return res.status(409).json({ success: false, error: 'You have already submitted your score' });
    }

    const data = {};
    if (isCreator) {
      data.creatorScore = parsed.score;
      data.creatorPlayed = true;
    } else {
      data.opponentScore = parsed.score;
      data.opponentPlayed = true;
    }

    // Determine new status
    const bothPlayed =
      (isCreator ? true : duel.creatorPlayed) &&
      (isOpponent ? true : duel.opponentPlayed);
    if (bothPlayed) {
      data.status = 'done';
      data.finishedAt = new Date();
    } else if (duel.status === 'pending') {
      data.status = 'playing';
    }

    const updated = await prisma.duel.update({
      where: { code },
      data,
      include: duelInclude,
    });
    return res.json({ success: true, duel: publicDuel(updated) });
  } catch (err) {
    console.error('[POST /api/duels/:code/score] db error:', err);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// GET /api/duels  — list current user's recent duels
router.get('/', authRequired, async (req, res) => {
  try {
    const duels = await prisma.duel.findMany({
      where: {
        OR: [{ creatorId: req.user.id }, { opponentId: req.user.id }],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: duelInclude,
    });
    return res.json({ success: true, items: duels.map(publicDuel) });
  } catch (err) {
    console.error('[GET /api/duels] db error:', err);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
});

module.exports = router;
