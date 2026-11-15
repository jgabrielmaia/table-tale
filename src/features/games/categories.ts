/** Editing a game's categories: a short list of labels, kept clean before it is saved (the database refuses anything else). */

/** The database's own limits (`games_categories_valid`). */
export const CATEGORY_MAX_LENGTH = 60;
export const CATEGORIES_MAX = 30;

export type CategoryProblem = 'empty' | 'tooLong' | 'duplicate' | 'tooMany';

/** Same label ignoring case and accents, so "party" and "Party" are one category. */
const key = (label: string) => label.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Adds a label to the list: trimmed, inner spaces collapsed. Returns the list unchanged, with the reason, when it can't be added. */
export function addCategory(list: string[], raw: string): { list: string[]; problem?: CategoryProblem } {
  const label = raw.trim().replace(/\s+/g, ' ');
  if (!label) return { list, problem: 'empty' };
  if (label.length > CATEGORY_MAX_LENGTH) return { list, problem: 'tooLong' };
  if (list.some((c) => key(c) === key(label))) return { list, problem: 'duplicate' };
  if (list.length >= CATEGORIES_MAX) return { list, problem: 'tooMany' };
  return { list: [...list, label] };
}

export const removeCategory = (list: string[], label: string) => list.filter((c) => c !== label);

export const sameCategories = (a: string[], b: string[]) => a.length === b.length && a.every((c, i) => c === b[i]);

/** Categories used by other games and not yet on this one, for suggestions while typing. */
export function suggestCategories(all: string[][], current: string[]): string[] {
  const taken = new Set(current.map(key));
  const seen = new Map<string, string>();
  for (const label of all.flat()) if (!taken.has(key(label)) && !seen.has(key(label))) seen.set(key(label), label);
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
