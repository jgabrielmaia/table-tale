import type { GameStatus, LibraryGame } from '@/types/domain';

export type PlayersFilter = '' | '1' | '2' | '3-4' | '5+';
export type DurationFilter = '' | 'short' | 'medium' | 'long' | 'epic';

export interface GameFilterValues {
  query: string;
  /** A BGG category or mechanic, exactly as BGG names it. */
  category: string;
  mechanic: string;
  players: PlayersFilter;
  duration: DurationFilter;
  status: '' | GameStatus;
  favoritesOnly: boolean;
}

export const EMPTY_FILTERS: GameFilterValues = {
  query: '',
  category: '',
  mechanic: '',
  players: '',
  duration: '',
  status: '',
  favoritesOnly: false,
};

const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function matchesFilters(game: LibraryGame, f: GameFilterValues): boolean {
  const q = normalize(f.query.trim());
  if (q && !normalize(game.title).includes(q)) return false;
  if (f.category && !game.categories.includes(f.category)) return false;
  if (f.mechanic && !game.mechanics.includes(f.mechanic)) return false;
  if (f.status && game.status !== f.status) return false;
  if (f.favoritesOnly && !game.isFavorite) return false;

  const { minPlayers: min, maxPlayers: max, durationMinutes: d } = game;
  // Unknown players or duration (BGG had no value) never match an active filter.
  if (f.players && (min === null || max === null)) return false;
  if (f.duration && d === null) return false;
  if (min === null || max === null || d === null) return true;
  switch (f.players) {
    case '1': if (min > 1) return false; break;
    case '2': if (min > 2 || max < 2) return false; break;
    case '3-4': if (min > 4 || max < 3) return false; break;
    case '5+': if (max < 5) return false; break;
  }
  switch (f.duration) {
    case 'short': if (d > 30) return false; break;
    case 'medium': if (d <= 30 || d > 60) return false; break;
    case 'long': if (d <= 60 || d > 120) return false; break;
    case 'epic': if (d <= 120) return false; break;
  }
  return true;
}

export const filterGames = <T extends LibraryGame>(games: T[], filters: GameFilterValues): T[] => games.filter((g) => matchesFilters(g, filters));

export const hasActiveFilters = (f: GameFilterValues) =>
  Boolean(f.query || f.category || f.mechanic || f.players || f.duration || f.status || f.favoritesOnly);

const overlap = (a: string[], b: string[]) => a.filter((x) => b.includes(x)).length;

/** Related games ranked by shared BGG categories and mechanics, and similar duration. */
export function relatedGames<T extends { id: string; categories: string[]; mechanics: string[]; durationMinutes: number | null }>(
  game: T,
  all: T[],
  limit = 3,
): T[] {
  return all
    .filter((o) => o.id !== game.id)
    .map((o) => ({
      o,
      score:
        overlap(o.categories, game.categories) * 3 +
        overlap(o.mechanics, game.mechanics) +
        (o.durationMinutes !== null && game.durationMinutes !== null && Math.abs(o.durationMinutes - game.durationMinutes) <= 15 ? 1 : 0),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.o);
}
