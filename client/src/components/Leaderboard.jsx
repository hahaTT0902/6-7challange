import { useEffect, useState, useCallback } from 'react';
import { fetchLeaderboard } from '../utils/api.js';
import { LanguageToggle, useI18n } from '../utils/i18n.jsx';

function formatDate(iso, lang) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(lang === 'zh' ? 'zh-CN' : undefined, {
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
  const { t, lang } = useI18n();
  const [period, setPeriod] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const periods = [
    { value: 'all', label: t('board.all') },
    { value: 'today', label: t('board.today') },
    { value: 'week', label: t('board.week') },
  ];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeaderboard({ period, limit: 100 });
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e?.message || t('result.errFallback'));
    } finally {
      setLoading(false);
    }
  }, [period, t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="relative mx-auto max-w-2xl px-4 py-8 text-white">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-white/70 hover:text-white">{t('common.back')}</button>
        <h1 className="text-2xl font-extrabold gradient-text">{t('board.title')}</h1>
        <button onClick={load} className="text-white/70 hover:text-white" aria-label={t('common.refresh')}>
          ⟳
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        {periods.map((p) => (
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
          <div className="col-span-2">{t('board.col.rank')}</div>
          <div className="col-span-5">{t('board.col.nickname')}</div>
          <div className="col-span-2 text-right">{t('board.col.score')}</div>
          <div className="col-span-3 text-right">{t('board.col.date')}</div>
        </div>
        <div className="divide-y divide-white/5">
          {loading && (
            <div className="px-4 py-6 text-center text-white/60">{t('common.loading')}</div>
          )}
          {!loading && error && (
            <div className="px-4 py-6 text-center text-rose-300">{error}</div>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="px-4 py-6 text-center text-white/60">{t('board.empty')}</div>
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
                  <div className="col-span-3 text-right text-xs text-white/50">{formatDate(it.createdAt, lang)}</div>
                </div>
              );
            })}
        </div>
      </div>

      <p className="mt-4 text-xs text-white/40">{t('board.footer')}</p>
    </main>
  );
}
