import { useState } from 'react';
import { getRating } from '../utils/scoring.js';
import { submitScore } from '../utils/api.js';
import { shareResult } from '../utils/share.js';

const NICK_REGEX = /^[A-Za-z0-9 _\-\u4e00-\u9fff]+$/;

export default function ResultScreen({
  score,
  bestScore,
  defaultNickname,
  onPlayAgain,
  onLeaderboard,
  onSubmitted,
  onSaveNickname,
}) {
  const rating = getRating(score);
  const [nickname, setNickname] = useState(defaultNickname || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [rank, setRank] = useState(null);
  const [shareNote, setShareNote] = useState('');

  function validateNickname(n) {
    const t = n.trim();
    if (t.length < 2 || t.length > 20) return 'Nickname must be 2–20 characters';
    if (!NICK_REGEX.test(t)) return 'Only letters, digits, Chinese, space, _ and - allowed';
    return null;
  }

  async function handleSubmit() {
    setSubmitError(null);
    const err = validateNickname(nickname);
    if (err) {
      setSubmitError(err);
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitScore({ nickname: nickname.trim(), score });
      setSubmitted(true);
      setRank(res?.rank ?? null);
      onSaveNickname?.(nickname.trim());
      onSubmitted?.(res?.score?.id ?? null);
    } catch (e) {
      console.error(e);
      const detail =
        Array.isArray(e?.payload?.details) && e.payload.details.length
          ? e.payload.details.join(', ')
          : e?.message;
      setSubmitError(
        `Score saved locally, but failed to submit online${detail ? `: ${detail}` : '.'} Please try again.`
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleShare() {
    const r = await shareResult(score);
    if (r.method === 'clipboard' && r.ok) setShareNote('Copied to clipboard!');
    else if (r.method === 'share' && r.ok) setShareNote('Shared!');
    else if (!r.ok && !r.aborted) setShareNote('Share unavailable.');
    setTimeout(() => setShareNote(''), 2000);
  }

  return (
    <main className="mx-auto max-w-md px-5 py-10 text-center">
      <h1 className="text-2xl font-bold text-white/80">Time's up!</h1>
      <div className="mt-2 text-7xl font-black gradient-text">{score}</div>
      <div className={`mt-2 text-lg font-bold ${rating.color}`}>{rating.label}</div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="card">
          <div className="text-white/60">Personal best</div>
          <div className="text-2xl font-bold">{Math.max(bestScore, score)}</div>
        </div>
        <div className="card">
          <div className="text-white/60">World rank</div>
          <div className="text-2xl font-bold">{rank ? `#${rank}` : '—'}</div>
        </div>
      </div>

      {!submitted ? (
        <div className="mt-6 text-left">
          <label className="text-sm text-white/70">Nickname</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            placeholder="Your name"
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/40"
          />
          {submitError && (
            <p className="mt-2 text-sm text-rose-300">{submitError}</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-neon mt-3 w-full"
          >
            {submitting ? 'Submitting…' : 'Submit Score'}
          </button>
        </div>
      ) : (
        <div className="mt-6 text-emerald-300">Score submitted! 🎉</div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-3">
        <button onClick={onPlayAgain} className="btn-ghost">Play Again</button>
        <button onClick={onLeaderboard} className="btn-ghost">View Leaderboard</button>
        <button onClick={handleShare} className="btn-ghost">Copy / Share</button>
        {shareNote && <div className="text-xs text-white/60">{shareNote}</div>}
      </div>
    </main>
  );
}
