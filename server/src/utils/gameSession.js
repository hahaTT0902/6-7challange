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

// sid -> { uid, iat, expiresAt }
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
  });
  return {
    token: `${payloadB64}.${sig}`,
    expiresInMs: SESSION_TTL_MS,
    minDurationMs: GAME_DURATION_MS,
    maxScore: MAX_TOKEN_SCORE,
  };
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
  // Single-use: delete BEFORE any further checks so a failed attempt cannot
  // be retried with the same token.
  activeSessions.delete(payload.sid);

  const now = Date.now();
  const elapsed = now - entry.iat;
  if (elapsed < GAME_DURATION_MS - EARLY_TOLERANCE_MS) {
    return { ok: false, error: 'Submitted too quickly; play the full round' };
  }
  if (now > entry.expiresAt) {
    return { ok: false, error: 'Session expired; start a new round' };
  }
  if (
    typeof claimedScore === 'number' &&
    Number.isFinite(claimedScore) &&
    claimedScore > MAX_TOKEN_SCORE
  ) {
    return {
      ok: false,
      error: `Score exceeds per-round cap of ${MAX_TOKEN_SCORE}`,
    };
  }
  return { ok: true, elapsedMs: elapsed };
}

// Periodic GC. unref so it never keeps the event loop alive on shutdown.
const gc = setInterval(() => pruneExpired(), 60 * 1000);
if (typeof gc.unref === 'function') gc.unref();

module.exports = {
  issueSessionToken,
  consumeSessionToken,
  GAME_DURATION_MS,
  MAX_TOKEN_SCORE,
  MAX_SCORE_PER_SECOND,
};
