import { Fragment, createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { applyLang, getContent, getLang, getLocale, translate, translatePlural, type Lang, type MessageKey, type Params, type PluralKey } from './core';

export interface I18nValue {
  lang: Lang;
  locale: string;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, params?: Params) => string;
  tn: (key: PluralKey, count: number, params?: Params) => string;
  content: ReturnType<typeof getContent>;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLang);
  const setLang = useCallback((next: Lang) => {
    applyLang(next);
    setLangState(next);
  }, []);
  const value = useMemo<I18nValue>(
    () => ({ lang, locale: getLocale(), setLang, t: translate, tn: translatePlural, content: getContent() }),
    [lang, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>.');
  return ctx;
}

/** Remounts the tree when the language changes so every string, date and number is rendered again. */
export function LangBoundary({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  return <Fragment key={lang}>{children}</Fragment>;
}
