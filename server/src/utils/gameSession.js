'use strict';

/**
 * Game session tokens. Issued when a player starts a round, redeemed when
 * they submit a score. They are HMAC-signed, single-use, and bound to a
 * specific user id + minimum elapsed wall-clock time, so a client cannot
 * fabricate arbitrary scores by just POSTing to /api/scores with a bearer
 * token — they must first request a session and wait out the round.
 *
 * Token format: `${base64url(payload)}.${base64url(hmac-sha256(payload))}`
 * Payload: { uid: <userId>, sid: <random hex>, iat: <ms since epoch> }
 */

const crypto = require('crypto');

const SECRET =
  process.env.SCORE_SESSION_SECRET ||
  process.env.JWT_SECRET ||
  'dev-insecure-session-secret-change-me';

// Nominal round length (must match the client GAME_DURATION_MS).
const GAME_DURATION_MS = Number.parseInt(
  process.env.GAME_DURATION_MS || '20000',
  10
);
// Allow tiny clock skew / scheduling jitter on the early side.
const EARLY_TOLERANCE_MS = 1500;
// Token validity window (game + result screen + slow network). Submissions
// after this fail and must restart the round.
const SESSION_TTL_MS = 5 * 60 * 1000;
// Server-side per-second score cap. The scoring rule grants at most 4 pts
// per rep with a ~120ms cooldown (~33 pts/s peak); 50 leaves comfortable
// headroom while still hard-capping any inflated client claim.
const MAX_SCORE_PER_SECOND = Number.parseInt(
  process.env.MAX_SCORE_PER_SECOND || '50',
  10
);
const MAX_TOKEN_SCORE = Math.max(
  0,
  Math.floor((MAX_SCORE_PER_SECOND * GAME_DURATION_MS) / 1000)
);
// Grace allowance applied on top of the last reported tick score when the
// final submission arrives. Covers a few frames of reps that occurred after
// the last tick was sent (e.g. between the last tick and the round-end
// boundary). Keep small enough that a no-tick submission cannot fabricate a
// meaningful score.
const SUBMIT_TICK_SLACK = Math.min(
  Number.parseInt(process.env.SUBMIT_TICK_SLACK || '', 10) || Math.ceil(MAX_SCORE_PER_SECOND * 1.5),
  MAX_TOKEN_SCORE
);
// Reject ticks closer than this together (defends against burst-flooding a
// single window's allowance).
const MIN_TICK_INTERVAL_MS = 200;

// sid -> { uid, iat, expiresAt, lastScore, lastTickAt }
const activeSessions = new Map();

function b64uEncode(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64uDecode(str) {
  let s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

function sign(payloadB64) {
  return b64uEncode(
    crypto.createHmac('sha256', SECRET).update(payloadB64).digest()
  );
}

function pruneExpired(now = Date.now()) {
  for (const [sid, entry] of activeSessions) {
    if (entry.expiresAt <= now) activeSessions.delete(sid);
  }
}

/**
 * Issue a fresh single-use session token for the given user.
 * @param {number} userId
 */
function issueSessionToken(userId) {
  pruneExpired();
  const sid = crypto.randomBytes(16).toString('hex');
  const iat = Date.now();
  const payload = { uid: Number(userId), sid, iat };
  const payloadB64 = b64uEncode(JSON.stringify(payload));
  const sig = sign(payloadB64);
  activeSessions.set(sid, {
    uid: Number(userId),
    iat,
    expiresAt: iat + SESSION_TTL_MS,
    lastScore: 0,
    lastTickAt: iat,
  });
  return {
    token: `${payloadB64}.${sig}`,
    expiresInMs: SESSION_TTL_MS,
    minDurationMs: GAME_DURATION_MS,
    maxScore: MAX_TOKEN_SCORE,
  };
}

/**
 * Decode + verify a token's signature and look up its session entry without
 * consuming it. Returned { ok:true, sid, entry } on success.
 */
function verifyToken(token, userId) {
  if (typeof token !== 'string' || token.indexOf('.') < 0) {
    return { ok: false, error: 'Missing or malformed session token' };
  }
  const dot = token.indexOf('.');
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payloadB64 || !sig) {
    return { ok: false, error: 'Missing or malformed session token' };
  }
  const expected = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: 'Invalid session token' };
  }
  let payload;
  try {
    payload = JSON.parse(b64uDecode(payloadB64).toString('utf8'));
  } catch {
    return { ok: false, error: 'Invalid session token' };
  }
  if (
    !payload ||
    typeof payload.sid !== 'string' ||
    typeof payload.iat !== 'number' ||
    typeof payload.uid !== 'number'
  ) {
    return { ok: false, error: 'Invalid session token' };
  }
  if (Number(payload.uid) !== Number(userId)) {
    return { ok: false, error: 'Session token does not belong to this user' };
  }
  const entry = activeSessions.get(payload.sid);
  if (!entry) {
    return { ok: false, error: 'Session token already used or expired' };
  }
  return { ok: true, sid: payload.sid, entry };
}

/**
 * Record a periodic in-round progress tick. The submitted final score is
 * capped to (lastScore + SUBMIT_TICK_SLACK), so a client that never ticks
 * can never submit a non-trivial score. Each tick must:
 *   - be monotonically non-decreasing in reportedScore
 *   - not exceed the physical max growth (MAX_SCORE_PER_SECOND) since the
 *     previous tick, with a small per-tick floor for the first frames
 *   - not arrive faster than MIN_TICK_INTERVAL_MS apart (anti-burst)
 *
 * On any validation failure the session is *destroyed* so attackers cannot
 * probe limits and then submit anyway.
 *
 * @param {string} token
 * @param {number} userId
 * @param {number} reportedScore
 */
function recordTick(token, userId, reportedScore) {
  const v = verifyToken(token, userId);
  if (!v.ok) return v;
  const { sid, entry } = v;

  if (
    !Number.isFinite(reportedScore) ||
    !Number.isInteger(reportedScore) ||
    reportedScore < 0
  ) {
    activeSessions.delete(sid);
    return { ok: false, error: 'Invalid tick score' };
  }

  const now = Date.now();
  if (now > entry.expiresAt) {
    activeSessions.delete(sid);
    return { ok: false, error: 'Session expired' };
  }
  const sinceStart = now - entry.iat;
  if (sinceStart > GAME_DURATION_MS + EARLY_TOLERANCE_MS) {
    // Round is over; no more ticks accepted (but keep entry alive so the
    // final submit can succeed using the last recorded lastScore).
    return { ok: false, error: 'Round already ended' };
  }
  if (reportedScore < entry.lastScore) {
    activeSessions.delete(sid);
    return { ok: false, error: 'Tick score must be monotonic' };
  }

  const tickInterval = now - entry.lastTickAt;
  if (tickInterval < MIN_TICK_INTERVAL_MS) {
    activeSessions.delete(sid);
    return { ok: false, error: 'Ticks arriving too quickly' };
  }

  const delta = reportedScore - entry.lastScore;
  // Allow physical max growth in this window, plus a small constant for the
  // very first tick (where a few reps may already be banked).
  const maxDelta = Math.ceil((MAX_SCORE_PER_SECOND * (tickInterval + 250)) / 1000) + 4;
  if (delta > maxDelta) {
    activeSessions.delete(sid);
    return { ok: false, error: 'Tick score grew too fast' };
  }

  entry.lastScore = reportedScore;
  entry.lastTickAt = now;
  return { ok: true, lastScore: entry.lastScore };
}

/**
 * Verify and consume a session token. Single-use: on success the sid is
 * removed; subsequent attempts with the same token will fail.
 *
 * @param {string} token
 * @param {number} userId    Authenticated user submitting the score.
 * @param {number} claimedScore
 * @returns {{ ok: true, elapsedMs: number } | { ok: false, error: string }}
 */
function consumeSessionToken(token, userId, claimedScore) {
  const v = verifyToken(token, userId);
  if (!v.ok) return v;
  const { sid, entry } = v;

  // Single-use: delete BEFORE any further checks so a failed attempt cannot
  // be retried with the same token.
  activeSessions.delete(sid);

  const now = Date.now();
  const elapsed = now - entry.iat;
  if (elapsed < GAME_DURATION_MS - EARLY_TOLERANCE_MS) {
    return { ok: false, error: 'Submitted too quickly; play the full round' };
  }
  if (now > entry.expiresAt) {
    return { ok: false, error: 'Session expired; start a new round' };
  }
  const score = Number(claimedScore);
  if (!Number.isFinite(score)) {
    return { ok: false, error: 'Invalid score' };
  }
  if (score > MAX_TOKEN_SCORE) {
    return {
      ok: false,
      error: `Score exceeds per-round cap of ${MAX_TOKEN_SCORE}`,
    };
  }
  // The real cap: a client that didn't tick cannot fabricate a score.
  const liveCap = entry.lastScore + SUBMIT_TICK_SLACK;
  if (score > liveCap) {
    return {
      ok: false,
      error: 'Score does not match in-round progress',
    };
  }
  return { ok: true, elapsedMs: elapsed, lastScore: entry.lastScore };
}

// Periodic GC. unref so it never keeps the event loop alive on shutdown.
const gc = setInterval(() => pruneExpired(), 60 * 1000);
if (typeof gc.unref === 'function') gc.unref();

module.exports = {
  issueSessionToken,
  consumeSessionToken,
  recordTick,
  GAME_DURATION_MS,
  MAX_TOKEN_SCORE,
  MAX_SCORE_PER_SECOND,
  SUBMIT_TICK_SLACK,
};
