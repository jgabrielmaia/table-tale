import type { ShrinkTarget } from '@/lib/image';

/** Covers of games added by hand live under `<user id>/...`; `catalogue/...` holds the openly licensed ones (service role). */
export const GAME_COVER_BUCKET = 'game-covers';
export const GAME_COVER_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
/** Covers are shrunk in the browser to fit this before upload; 2 MB is the bucket limit. */
export const GAME_COVER_TARGET: ShrinkTarget = { maxWidth: 1600, maxHeight: 1600, maxBytes: 2 * 1024 * 1024 };

/**
 * The storage path of a cover this player uploaded (`<user id>/...`), or null for any other URL, so replacing a cover
 * never deletes a catalogue cover or someone else's file.
 */
export function ownCoverPath(url: string | null, userId: string): string | null {
  const marker = `/${GAME_COVER_BUCKET}/`;
  const at = url?.indexOf(marker) ?? -1;
  if (!url || at < 0) return null;
  const path = decodeURIComponent(url.slice(at + marker.length).split('?')[0] ?? '');
  return path.startsWith(`${userId}/`) && !path.includes('..') ? path : null;
}

/** Same name ignoring case, accents and spacing. */
const titleKey = (title: string) => title.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** The catalogue game already called this (other than the one being edited), so the form can offer it instead of a duplicate. */
export function findTitleMatch<G extends { id: string; title: string }>(title: string, games: G[], exceptId?: string): G | null {
  const key = titleKey(title);
  if (!key) return null;
  return games.find((g) => g.id !== exceptId && titleKey(g.title) === key) ?? null;
}
