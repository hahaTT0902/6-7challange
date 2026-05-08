import { useI18n } from '../utils/i18n.jsx';

export default function PermissionNotice({ error, onRetry }) {
  const { t } = useI18n();
  return (
    <div className="card text-center">
      <div className="text-3xl">📷</div>
      <h2 className="mt-2 text-xl font-bold">{t('permission.title')}</h2>
      <p className="mt-2 text-sm text-white/70">{error || t('permission.hint')}</p>
      <button onClick={onRetry} className="btn-neon mt-4">
        {t('permission.allow')}
      </button>
    </div>
  );
}
