import { t, type MessageKey } from '@/i18n';

export const XP_PER_LEVEL = 300;

const LEVEL_COUNT = 10;

export function levelTitle(level: number): string {
  const index = Math.min(Math.max(level, 1), LEVEL_COUNT);
  return t(`level.${index}` as MessageKey);
}

/** Mirrors public.recompute_progress(): level = floor(xp / 300) + 1. */
export function levelProgress(experiencePoints: number) {
  const xp = Math.max(0, Math.floor(experiencePoints));
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const into = xp % XP_PER_LEVEL;
  return {
    level,
    into,
    needed: XP_PER_LEVEL,
    percent: Math.round((into / XP_PER_LEVEL) * 100),
    title: levelTitle(level),
    nextTitle: levelTitle(level + 1),
  };
}
