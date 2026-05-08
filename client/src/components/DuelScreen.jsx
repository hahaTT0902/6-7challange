import { useCallback, useEffect, useState } from 'react';
import { LanguageToggle, useI18n } from '../utils/i18n.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import {
  createDuel as apiCreate,
  getDuel as apiGet,
  joinDuel as apiJoin,
  submitDuelScore as apiSubmit,
} from '../utils/api.js';
import GameScreen from './GameScreen.jsx';

const CODE_REGEX = /^[A-Z0-9]{4,12}$/;

export default function DuelScreen({ onBack, onLogin }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [duel, setDuel] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState('lobby'); // 'lobby' | 'room' | 'playing'

  // Poll while in a room and not yet done
  useEffect(() => {
    if (phase !== 'room' || !duel?.code) return undefined;
    if (duel.status === 'done') return undefined;
    let cancelled = false;
    const id = setInterval(async () => {
      try {
        const res = await apiGet(duel.code);
        if (!cancelled) setDuel(res.duel);
      } catch {
        /* ignore transient errors during polling */
      }
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [phase, duel?.code, duel?.status]);

  const refresh = useCallback(async () => {
    if (!duel?.code) return;
    try {
      const res = await apiGet(duel.code);
      setDuel(res.duel);
    } catch (err) {
      setError(err?.message || t('duel.notFound'));
    }
  }, [duel?.code, t]);

  async function handleCreate() {
    setError(null);
    setBusy(true);
    try {
      const res = await apiCreate();
      setDuel(res.duel);
      setPhase('room');
    } catch (err) {
      setError(err?.message || t('auth.errFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    setError(null);
    const c = code.trim().toUpperCase();
    if (!CODE_REGEX.test(c)) {
      setError(t('duel.invalidCode'));
      return;
    }
    setBusy(true);
    try {
      const res = await apiJoin(c);
      setDuel(res.duel);
      setPhase('room');
    } catch (err) {
      setError(err?.message || t('duel.notFound'));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitScore(score) {
    if (!duel?.code) return;
    try {
      const res = await apiSubmit(duel.code, score);
      setDuel(res.duel);
    } catch (err) {
      setError(err?.message || t('duel.errSubmit'));
    } finally {
      setPhase('room');
    }
  }

  // --- Not logged in ---
  if (!user) {
    return (
      <main className="relative mx-auto max-w-md px-5 py-10 text-center text-white">
        <div className="absolute right-4 top-4">
          <LanguageToggle />
        </div>
        <button onClick={onBack} className="text-white/70 hover:text-white">
          {t('common.back')}
        </button>
        <h1 className="mt-4 text-2xl font-extrabold gradient-text">{t('duel.title')}</h1>
        <p className="mt-6 text-white/75">{t('duel.requireLogin')}</p>
        <button onClick={onLogin} className="btn-neon mt-6 w-full">
          {t('auth.login')}
        </button>
      </main>
    );
  }

  // --- Playing my round inside the duel: reuse GameScreen ---
  if (phase === 'playing') {
    return (
      <GameScreen
        onFinish={(score) => handleSubmitScore(score)}
        onBack={() => setPhase('room')}
      />
    );
  }

  // --- Lobby (no active duel yet) ---
  if (phase === 'lobby' || !duel) {
    return (
      <main className="relative mx-auto max-w-md px-5 py-10 text-white">
        <div className="absolute right-4 top-4">
          <LanguageToggle />
        </div>
        <button onClick={onBack} className="text-white/70 hover:text-white">
          {t('common.back')}
        </button>
        <h1 className="mt-4 text-2xl font-extrabold gradient-text">{t('duel.title')}</h1>

        <section className="mt-6 space-y-4">
          <button onClick={handleCreate} disabled={busy} className="btn-neon w-full">
            {busy ? t('duel.creating') : t('duel.create')}
          </button>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="text-sm text-white/70">{t('duel.codeLabel')}</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={12}
              placeholder={t('duel.codePlaceholder')}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 font-mono text-lg uppercase tracking-[0.3em] text-white outline-none focus:border-white/40"
            />
            <button onClick={handleJoin} disabled={busy} className="btn-ghost mt-3 w-full">
              {busy ? t('duel.joining') : t('duel.join')}
            </button>
          </div>

          {error && <p className="text-sm text-rose-300">{error}</p>}
        </section>
      </main>
    );
  }

  // --- Active room ---
  const me = user;
  const isCreator = duel.creator?.id === me.id;
  const myPlayed = isCreator ? duel.creatorPlayed : duel.opponentPlayed;
  const myScore = isCreator ? duel.creatorScore : duel.opponentScore;
  const oppPlayed = isCreator ? duel.opponentPlayed : duel.creatorPlayed;
  const oppScore = isCreator ? duel.opponentScore : duel.creatorScore;
  const oppUser = isCreator ? duel.opponent : duel.creator;
  const opponentJoined = !!oppUser;

  let outcomeText = null;
  if (duel.status === 'done' && duel.winner) {
    if (duel.winner === 'tie') outcomeText = t('duel.tie');
    else if ((duel.winner === 'creator' && isCreator) || (duel.winner === 'opponent' && !isCreator))
      outcomeText = t('duel.winYou');
    else outcomeText = t('duel.winOpponent');
  }

  let statusLabel = t('duel.statusPending');
  if (duel.status === 'playing') statusLabel = t('duel.statusPlaying');
  if (duel.status === 'done') statusLabel = t('duel.statusDone');

  return (
    <main className="relative mx-auto max-w-md px-5 py-10 text-white">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <button onClick={onBack} className="text-white/70 hover:text-white">
        {t('common.back')}
      </button>
      <h1 className="mt-4 text-2xl font-extrabold gradient-text">{t('duel.title')}</h1>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
        <div className="text-xs uppercase tracking-widest text-white/55">{t('duel.codeLabel')}</div>
        <div className="mt-1 font-mono text-3xl font-extrabold tracking-[0.4em]">{duel.code}</div>
        <div className="mt-2 text-xs text-white/55">{statusLabel}</div>
        <p className="mt-3 text-sm text-white/70">{t('duel.share')}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <PlayerCard
          title={t('duel.you')}
          name={me.username}
          played={myPlayed}
          score={myScore}
          t={t}
        />
        <PlayerCard
          title={t('duel.opponent')}
          name={opponentJoined ? oppUser.username : t('duel.waitingOpponent')}
          played={oppPlayed}
          score={oppScore}
          waiting={!opponentJoined}
          t={t}
        />
      </div>

      {outcomeText && (
        <div className="mt-4 rounded-2xl border border-white/15 bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-pink-500/20 p-4 text-center text-lg font-bold">
          {outcomeText}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {!myPlayed && opponentJoined && (
          <button onClick={() => setPhase('playing')} className="btn-neon w-full">
            {t('duel.playRound')}
          </button>
        )}
        {!myPlayed && !opponentJoined && (
          <div className="text-center text-sm text-white/60">{t('duel.waitingOpponent')}</div>
        )}
        {myPlayed && !oppPlayed && (
          <div className="text-center text-sm text-white/60">{t('duel.waitingOpponentScore')}</div>
        )}
        <button onClick={refresh} className="btn-ghost w-full">
          {t('duel.refresh')}
        </button>
        <button
          onClick={() => {
            setDuel(null);
            setCode('');
            setError(null);
            setPhase('lobby');
          }}
          className="w-full text-sm text-white/60 hover:text-white"
        >
          {t('duel.leave')}
        </button>
        {error && <p className="text-center text-sm text-rose-300">{error}</p>}
      </div>
    </main>
  );
}

function PlayerCard({ title, name, played, score, waiting, t }) {
  return (
    <div className="card text-center">
      <div className="text-xs uppercase tracking-widest text-white/55">{title}</div>
      <div className="mt-1 truncate text-lg font-bold">{name}</div>
      <div className="mt-3 text-3xl font-black gradient-text">
        {played && score != null ? score : '—'}
      </div>
      <div className="mt-1 text-xs text-white/55">
        {waiting ? '' : played ? t('duel.played') : t('duel.notPlayed')}
      </div>
    </div>
  );
}
