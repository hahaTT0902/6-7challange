import { useEffect, useState, useCallback } from 'react';
import { fetchLeaderboard } from '../utils/api.js';

const PERIODS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
];

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function Leaderboard({ onBack, highlightId }) {
  const [period, setPeriod] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeaderboard({ period, limit: 100 });
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e?.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 text-white">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-white/70 hover:text-white">← Back</button>
        <h1 className="text-2xl font-extrabold gradient-text">Leaderboard</h1>
        <button onClick={load} className="text-white/70 hover:text-white" aria-label="Refresh">
          ⟳
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${
              period === p.value
                ? 'border-white/40 bg-white/15 font-bold'
                : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs uppercase tracking-wider text-white/50">
          <div className="col-span-2">Rank</div>
          <div className="col-span-5">Nickname</div>
          <div className="col-span-2 text-right">Score</div>
          <div className="col-span-3 text-right">Date</div>
        </div>
        <div className="divide-y divide-white/5">
          {loading && (
            <div className="px-4 py-6 text-center text-white/60">Loading…</div>
          )}
          {!loading && error && (
            <div className="px-4 py-6 text-center text-rose-300">{error}</div>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="px-4 py-6 text-center text-white/60">No scores yet — be the first!</div>
          )}
          {!loading &&
            !error &&
            items.map((it) => {
              const isMe = highlightId && it.id === highlightId;
              return (
                <div
                  key={it.id}
                  className={`grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm ${
                    isMe ? 'bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-pink-500/20' : ''
                  }`}
                >
                  <div className="col-span-2 font-bold text-white/80">#{it.rank}</div>
                  {/* React auto-escapes text content -> safe against XSS */}
                  <div className="col-span-5 truncate">{it.nickname}</div>
                  <div className="col-span-2 text-right font-bold gradient-text">{it.score}</div>
                  <div className="col-span-3 text-right text-xs text-white/50">{formatDate(it.createdAt)}</div>
                </div>
              );
            })}
        </div>
      </div>

      <p className="mt-4 text-xs text-white/40">
        Top 100 scores. Order: highest score first, ties broken by earliest submission.
      </p>
    </main>
  );
}
