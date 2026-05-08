import { LanguageToggle, useI18n } from '../utils/i18n.jsx';

export default function HowItWorks({ onBack }) {
  const { t } = useI18n();
  return (
    <main className="relative mx-auto max-w-2xl px-5 py-10 text-white">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <button onClick={onBack} className="text-white/70 hover:text-white">
        {t('common.back')}
      </button>
      <h1 className="mt-4 text-3xl font-extrabold gradient-text">{t('how.title')}</h1>

      <section className="mt-6 space-y-4 text-white/85 leading-relaxed">
        <p>{t('how.intro')}</p>
        <ol className="list-decimal space-y-2 pl-6">
          <li>{t('how.step1')}</li>
          <li>{t('how.step2')}</li>
          <li>{t('how.step3')}</li>
          <li>{t('how.step4')}</li>
          <li>{t('how.step5')}</li>
          <li>{t('how.step6')}</li>
        </ol>

        <h2 className="mt-8 text-xl font-bold">{t('how.tipsTitle')}</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>{t('how.tip1')}</li>
          <li>{t('how.tip2')}</li>
          <li>{t('how.tip3')}</li>
          <li>{t('how.tip4')}</li>
        </ul>

        <h2 className="mt-8 text-xl font-bold">{t('how.privacyTitle')}</h2>
        <p>{t('how.privacyText')}</p>
      </section>
    </main>
  );
}
