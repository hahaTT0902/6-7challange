import { motion } from 'framer-motion';
import { LanguageToggle, useI18n } from '../utils/i18n.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

export default function LandingPage({
  onStart,
  onLeaderboard,
  onHowItWorks,
  onLogin,
  onRegister,
  onDuel,
}) {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const features = [
    { key: 'timer', icon: '⏱️' },
    { key: 'camera', icon: '🎥' },
    { key: 'board', icon: '🏆' },
  ];
  return (
    <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center px-5 py-12 text-center">
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        {user ? (
          <>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">
              {t('auth.welcome', { name: user.username })}
            </span>
            <button
              onClick={logout}
              className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-white/85 backdrop-blur transition hover:bg-white/15"
            >
              {t('auth.logout')}
            </button>
          </>
        ) : (
          <button
            onClick={onLogin}
            className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-white/85 backdrop-blur transition hover:bg-white/15"
          >
            {t('auth.login')}
          </button>
        )}
        <LanguageToggle />
      </div>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-5xl font-extrabold leading-tight gradient-text sm:text-6xl"
      >
        {t('app.brand')}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="mt-4 text-lg text-white/80 sm:text-xl"
      >
        {t('landing.tagline')}
      </motion.p>

      <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        <button onClick={onStart} className="btn-neon col-span-1 sm:col-span-2">
          {t('landing.start')}
        </button>
        <button onClick={onDuel} className="btn-ghost col-span-1 sm:col-span-2">
          {user ? t('landing.duel') : t('landing.loginCta')}
        </button>
        <button onClick={onLeaderboard} className="btn-ghost">
          {t('landing.leaderboard')}
        </button>
        <button onClick={onHowItWorks} className="btn-ghost">
          {t('landing.how')}
        </button>
        {!user && (
          <button onClick={onRegister} className="btn-ghost col-span-1 sm:col-span-2">
            {t('auth.register')}
          </button>
        )}
      </div>

      <p className="mt-6 max-w-md text-sm text-white/60">{t('landing.privacy')}</p>

      <section className="mt-12 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        {features.map((f) => (
          <motion.div key={f.key} whileHover={{ y: -4 }} className="card text-left">
            <div className="text-3xl">{f.icon}</div>
            <h3 className="mt-3 text-lg font-bold">{t(`landing.feature.${f.key}.title`)}</h3>
            <p className="mt-1 text-sm text-white/70">{t(`landing.feature.${f.key}.desc`)}</p>
          </motion.div>
        ))}
      </section>

      <section className="mt-12 w-full text-left">
        <h2 className="text-xl font-bold">{t('landing.howTitle')}</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-6 text-white/80">
          <li>{t('landing.how1')}</li>
          <li>{t('landing.how2')}</li>
          <li>{t('landing.how3')}</li>
          <li>{t('landing.how4')}</li>
        </ol>
      </section>

      <footer className="mt-16 text-xs text-white/40">{t('landing.footer')}</footer>
    </main>
  );
}
