import { contentEn } from './content.en';
import { contentPt } from './content.pt';
import { en } from './messages.en';
import { pt, type MessageKey } from './messages.pt';

export type Lang = 'pt' | 'en';
export type { MessageKey };

export const LANGS: readonly Lang[] = ['pt', 'en'];
export const LOCALES: Record<Lang, string> = { pt: 'pt-PT', en: 'en-GB' };
export const DEFAULT_LANG: Lang = 'pt';

const STORAGE_KEY = 'table-tale-lang';
const CATALOGS: Record<Lang, Record<MessageKey, string>> = { pt, en };
const CONTENT = { pt: contentPt, en: contentEn } as const;

export type PluralKey = { [K in MessageKey]: K extends `${infer B}.one` ? B : never }[MessageKey];

function readStored(): Lang {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'pt' || v === 'en' ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

let current: Lang = typeof window === 'undefined' ? DEFAULT_LANG : readStored();

export const getLang = () => current;
export const getLocale = () => LOCALES[current];
export const getContent = () => CONTENT[current];

/** Only the UI language preference is stored locally; it never carries account data. */
export function applyLang(lang: Lang) {
  current = lang;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts for the session only.
  }
  document.documentElement.lang = LOCALES[lang];
}

export type Params = Record<string, string | number>;

const interpolate = (text: string, params?: Params) =>
  params ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : text;

export function translate(key: MessageKey, params?: Params): string {
  return interpolate(CATALOGS[current][key] ?? pt[key] ?? key, params);
}

export function translatePlural(key: PluralKey, count: number, params?: Params): string {
  const rule = new Intl.PluralRules(LOCALES[current]).select(count);
  const k = (`${key}.${rule === 'one' ? 'one' : 'other'}`) as MessageKey;
  return translate(k, { count, ...params });
}

if (typeof document !== 'undefined') document.documentElement.lang = LOCALES[current];
