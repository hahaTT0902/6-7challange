import { useI18n } from '../utils/i18n.jsx';

export default function ScoreDisplay({ score, timeLeftMs }) {
  const { t } = useI18n();
  const seconds = Math.max(0, Math.ceil(timeLeftMs / 1000));
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="card text-center">
        <div className="text-xs uppercase tracking-widest text-white/60">{t('score.score')}</div>
        <div className="mt-1 text-4xl font-extrabold gradient-text">{score}</div>
      </div>
      <div className="card text-center">
        <div className="text-xs uppercase tracking-widest text-white/60">{t('score.time')}</div>
        <div className="mt-1 text-4xl font-extrabold">{seconds}s</div>
      </div>
    </div>
  );
}
