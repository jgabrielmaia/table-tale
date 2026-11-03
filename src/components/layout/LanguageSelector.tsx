import { LANGS, useI18n, type Lang } from '@/i18n';
import './language.css';

/** Two-way language switch (Portuguese is the default). The choice is remembered across sessions. */
export function LanguageSelector({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={`lang-switch ${className ?? ''}`} role="group" aria-label={t('lang.label')}>
      {LANGS.map((code: Lang) => (
        <button
          key={code}
          type="button"
          className="lang-switch__btn"
          aria-pressed={lang === code}
          lang={code === 'pt' ? 'pt-PT' : 'en'}
          title={t(code === 'pt' ? 'lang.pt' : 'lang.en')}
          onClick={() => setLang(code)}
        >
          {t(code === 'pt' ? 'lang.ptShort' : 'lang.enShort')}
        </button>
      ))}
    </div>
  );
}
