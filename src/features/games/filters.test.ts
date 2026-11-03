import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, filterGames, relatedGames } from './filters';
import type { LibraryGame } from '@/types/domain';

const games: LibraryGame[] = [
  {
    id: 'hitster', title: 'Hitster', slug: 'hitster', description: '', coverUrl: null, genre: 'Música',
    minPlayers: 2, maxPlayers: 10, durationMinutes: 30, complexity: 'Leve', owners: [],
    status: 'unplayed', isFavorite: false,
  },
  {
    id: 'dixit', title: 'Dixit', slug: 'dixit', description: '', coverUrl: null, genre: 'Narrativo',
    minPlayers: 3, maxPlayers: 6, durationMinutes: 30, complexity: 'Leve', owners: [],
    status: 'completed', isFavorite: true,
  },
  {
    id: 'cardia', title: 'Duelo por Cardia', slug: 'duelo-por-cardia', description: '', coverUrl: null, genre: 'Duelo',
    minPlayers: 2, maxPlayers: 2, durationMinutes: 15, complexity: 'Leve', owners: [],
    status: 'in_progress', isFavorite: false,
  },
];

describe('filterGames', () => {
  it('matches names without accents and combines filters', () => {
    expect(filterGames(games, { ...EMPTY_FILTERS, query: 'duelo por cardia', players: '2' }).map((g) => g.id)).toEqual(['cardia']);
  });

  it('filters favourites and status', () => {
    expect(filterGames(games, { ...EMPTY_FILTERS, favoritesOnly: true, status: 'completed' }).map((g) => g.id)).toEqual(['dixit']);
  });

  it('returns no matches for incompatible filters', () => {
    expect(filterGames(games, { ...EMPTY_FILTERS, players: '1', duration: 'epic' })).toEqual([]);
  });
});

describe('relatedGames', () => {
  it('ranks same-genre games and omits the current game', () => {
    const result = relatedGames(games[1]!, games);
    expect(result.map((g) => g.id)).toEqual(['hitster', 'cardia']);
    expect(result).not.toContain(games[1]);
  });
});
