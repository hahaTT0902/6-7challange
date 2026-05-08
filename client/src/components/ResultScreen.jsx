import { useState } from 'react';
import { getRating } from '../utils/scoring.js';
import { submitScore } from '../utils/api.js';
import { shareResult } from '../utils/share.js';
import { LanguageToggle, useI18n } from '../utils/i18n.jsx';
import { SHARE_URL } from '../utils/constants.js';

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
  const { t } = useI18n();
  const rating = getRating(score);
  const [nickname, setNickname] = useState(defaultNickname || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [rank, setRank] = useState(null);
  const [shareNote, setShareNote] = useState('');

  function validateNickname(n) {
    const trimmed = n.trim();
    if (trimmed.length < 2 || trimmed.length > 20) return t('result.errLength');
    if (!NICK_REGEX.test(trimmed)) return t('result.errChars');
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
          ? `: ${e.payload.details.join(', ')}`
          : e?.message
            ? `: ${e.message}`
            : '';
      setSubmitError(t('result.errSubmit', { detail }));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleShare() {
    const text = t('result.shareText', { score, url: SHARE_URL });
    const r = await shareResult(score, text);
    if (r.method === 'clipboard' && r.ok) setShareNote(t('result.shareCopied'));
    else if (r.method === 'share' && r.ok) setShareNote(t('result.shareShared'));
    else if (!r.ok && !r.aborted) setShareNote(t('result.shareUnavailable'));
    setTimeout(() => setShareNote(''), 2000);
  }

  return (
    <main className="relative mx-auto max-w-md px-5 py-10 text-center">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <h1 className="text-2xl font-bold text-white/80">{t('result.timesUp')}</h1>
      <div className="mt-2 text-7xl font-black gradient-text">{score}</div>
      <div className={`mt-2 text-lg font-bold ${rating.color}`}>{t(`rating.${rating.key}`)}</div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="card">
          <div className="text-white/60">{t('result.personalBest')}</div>
          <div className="text-2xl font-bold">{Math.max(bestScore, score)}</div>
        </div>
        <div className="card">
          <div className="text-white/60">{t('result.worldRank')}</div>
          <div className="text-2xl font-bold">{rank ? `#${rank}` : '—'}</div>
        </div>
      </div>

      {!submitted ? (
        <div className="mt-6 text-left">
          <label className="text-sm text-white/70">{t('result.nickname')}</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            placeholder={t('result.namePlaceholder')}
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
            {submitting ? t('result.submitting') : t('result.submit')}
          </button>
        </div>
      ) : (
        <div className="mt-6 text-emerald-300">{t('result.submitted')}</div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-3">
        <button onClick={onPlayAgain} className="btn-ghost">{t('result.playAgain')}</button>
        <button onClick={onLeaderboard} className="btn-ghost">{t('result.viewBoard')}</button>
        <button onClick={handleShare} className="btn-ghost">{t('result.share')}</button>
        {shareNote && <div className="text-xs text-white/60">{shareNote}</div>}
      </div>
    </main>
  );
}
