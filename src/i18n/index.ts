import type { Faction, FactionLore } from '@/types/domain';
import { getContent, translate, translatePlural } from './core';
import type { FactionSlug } from './content.types';

export { I18nProvider, LangBoundary, useI18n } from './I18nProvider';
export { LANGS, LOCALES, getContent, getLang, getLocale, type Lang, type MessageKey } from './core';

/** Non-React translation helpers (API errors, schemas, formatters). They read the current language on each call. */
export const t = translate;
export const tn = translatePlural;

export function localizeGame<T extends { slug: string; description: string }>(game: T): T {
  const o = getContent().games[game.slug];
  return o ? { ...game, description: o.description } : game;
}

export function localizeEvent<T extends { slug: string; name: string; description: string; location: string }>(event: T): T {
  const o = getContent().events[event.slug];
  return o ? { ...event, ...o } : event;
}

export function localizeAchievement<T extends { slug: string; name: string; description: string }>(a: T): T {
  const o = getContent().achievements[a.slug];
  return o ? { ...a, ...o } : a;
}

export function localizeFaction(faction: Faction): Faction {
  const slug = faction.slug as FactionSlug;
  const o = getContent().factionLore[slug];
  if (!o) return faction;
  const { visual, ...rest } = o;
  const palette = faction.lore.visual.palette.map(([color, name], i): [string, string] => [color, visual?.paletteNames?.[i] ?? name]);
  const lore: FactionLore = {
    ...faction.lore,
    ...rest,
    visual: { palette, language: visual?.language ?? faction.lore.visual.language, feeling: visual?.feeling ?? faction.lore.visual.feeling },
  };
  return { ...faction, name: t(`faction.${slug}`), lore };
}
