import { t, tn, type MessageKey } from '@/i18n';
import { relativeDay } from '@/lib/format';
import type { HighlightSource, ShelfHighlight } from '@/types/domain';

/**
 * The section takes its heading from the first highlight: the player's own games come first when there are any, and
 * popular games only fill the slots left. Nothing yet (or a visitor) reads as the public ranking.
 */
export function highlightsSource(list: ShelfHighlight[]): HighlightSource {
  return list[0]?.source ?? 'public';
}

export function highlightsHeading(source: HighlightSource): { eyebrow: MessageKey; title: MessageKey } {
  return {
    eyebrow: source === 'recent' ? 'home.recentEyebrow' : 'home.weekEyebrow',
    title: `home.highlights.${source}`,
  };
}

/** The line under a highlighted game: when the player last played it, or how many people played it lately. */
export function highlightNote(h: ShelfHighlight, today?: string): string | undefined {
  if (h.source === 'recent') return h.lastPlayedAt ? t('home.playedWhen', { when: relativeDay(h.lastPlayedAt, today) }) : undefined;
  if (h.players <= 0) return undefined;
  return tn(h.source === 'community' ? 'home.playedByMembers' : 'home.playedByPlayers', h.players);
}
