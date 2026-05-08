import { useState } from 'react';
import { LanguageToggle, useI18n } from '../utils/i18n.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

const USERNAME_REGEX = /^[A-Za-z0-9_\-\u4e00-\u9fff]+$/;

export default function AuthScreen({ onBack, onSuccess, initialMode = 'login' }) {
  const { t } = useI18n();
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function validate() {
    const u = username.trim();
    if (u.length < 3 || u.length > 20) return t('auth.errLengthUser');
    if (!USERNAME_REGEX.test(u)) return t('auth.errChars');
    if (password.length < 6) return t('auth.errLengthPwd');
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    try {
      const fn = mode === 'login' ? login : register;
      await fn({ username: username.trim(), password });
      onSuccess?.();
    } catch (err) {
      const detail =
        Array.isArray(err?.payload?.details) && err.payload.details.length
          ? err.payload.details.join(', ')
          : err?.message;
      setError(detail || t('auth.errFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative mx-auto max-w-md px-5 py-10 text-white">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <button onClick={onBack} className="text-white/70 hover:text-white">
        {t('common.back')}
      </button>
      <h1 className="mt-4 text-2xl font-extrabold gradient-text">
        {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3 text-left">
        <div>
          <label className="text-sm text-white/70">{t('auth.username')}</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            autoComplete="username"
            placeholder={t('auth.usernamePlaceholder')}
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/40"
          />
        </div>
        <div>
          <label className="text-sm text-white/70">{t('auth.password')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={72}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder={t('auth.passwordPlaceholder')}
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/40"
          />
        </div>

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-neon w-full">
          {submitting
            ? t('auth.submitting')
            : mode === 'login'
              ? t('auth.login')
              : t('auth.register')}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
          className="w-full text-sm text-white/70 hover:text-white"
        >
          {mode === 'login' ? t('auth.switchToRegister') : t('auth.switchToLogin')}
        </button>
      </form>
    </main>
  );
}
