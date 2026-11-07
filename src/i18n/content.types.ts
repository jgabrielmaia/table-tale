import type { CardArtKey } from '@/assets/cards';
import type { FactionLore } from '@/types/domain';

export interface LoreContent {
  intro: { title: string; text: string; note: string };
  premise: string[];
  tension: { intro: string[]; rows: [string, string, string][]; outro: string };
  balance: { lead: string; without: { arcanos: string; elementais: string }; warning: string; closing: string };
  choice: { intro: string; question: string; destiny: string[]; express: string; answer: string };
  neutral: string;
  outro: { title: string; text: string };
  chapters: { id: string; label: string }[];
  timeline: { marker: string; title: string; text: string; symbol: string }[];
}

export type FactionSlug = 'arcanos' | 'elementais';

/** Text that replaces what the database stores for a faction (colours and symbols stay in the database). */
export type FactionLoreText = Partial<Omit<FactionLore, 'color2' | 'latin' | 'visual'>> & {
  visual?: { paletteNames?: string[]; language?: string; feeling?: string };
};

/** Language-dependent editorial content. Missing entries fall back to the database text. */
export interface Content {
  lore: LoreContent;
  cards: Record<CardArtKey, string>;
  /** Short meaning of each card within the Table Tale universe (used on the share poster). */
  cardLore: Record<CardArtKey, string>;
  factionLore: Record<FactionSlug, FactionLoreText>;
  games: Record<string, { description: string }>;
  events: Record<string, { name?: string; description?: string; location?: string }>;
  achievements: Record<string, { name: string; description: string }>;
}
