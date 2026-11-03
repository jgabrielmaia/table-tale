export const XP_PER_LEVEL = 300;

export const LEVEL_TITLES = [
  'Aprendiz de Mesa',
  'Leitor de Runas',
  'Portador de Dados',
  'Guardião de Fichas',
  'Viajante do Véu',
  'Escriba da Mesa',
  'Cartógrafo Arcano',
  'Arquivista das Marés',
  'Mestre do Compasso',
  'Lenda da Mesa',
] as const;

export function levelTitle(level: number): string {
  const index = Math.min(Math.max(level, 1), LEVEL_TITLES.length) - 1;
  return LEVEL_TITLES[index] ?? LEVEL_TITLES[0];
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
