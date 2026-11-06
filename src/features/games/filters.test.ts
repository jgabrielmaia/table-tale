import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, filterGames, relatedGames } from './filters';
import type { LibraryGame } from '@/types/domain';

const BGG_NONE = { yearPublished: null, minAge: null, bggId: null, rating: null, ratingCount: null, rank: null, weight: null, bgg: null };

const games: LibraryGame[] = [
  {
    id: 'hitster', title: 'Hitster', slug: 'hitster', description: '', coverUrl: null,
    ...BGG_NONE, categories: ['Card Game', 'Music'], mechanics: ['Hand Management'],
    minPlayers: 2, maxPlayers: 10, durationMinutes: 30, owners: [],
    status: 'unplayed', isFavorite: false,
  },
  {
    id: 'dixit', title: 'Dixit', slug: 'dixit', description: '', coverUrl: null,
    ...BGG_NONE, categories: ['Card Game', 'Party Game'], mechanics: ['Voting', 'Hand Management'],
    minPlayers: 3, maxPlayers: 6, durationMinutes: 30, owners: [],
    status: 'completed', isFavorite: true,
  },
  {
    id: 'cardia', title: 'Duelo por Cardia', slug: 'duelo-por-cardia', description: '', coverUrl: null,
    ...BGG_NONE, categories: ['Fighting'], mechanics: [],
    minPlayers: 2, maxPlayers: 2, durationMinutes: 15, owners: [],
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

  it('filters by BGG category and mechanic', () => {
    expect(filterGames(games, { ...EMPTY_FILTERS, category: 'Card Game' }).map((g) => g.id)).toEqual(['hitster', 'dixit']);
    expect(filterGames(games, { ...EMPTY_FILTERS, category: 'Card Game', mechanic: 'Voting' }).map((g) => g.id)).toEqual(['dixit']);
    expect(filterGames(games, { ...EMPTY_FILTERS, mechanic: 'Dice Rolling' })).toEqual([]);
  });

  it('never matches an active players or duration filter when BGG had no value', () => {
    const unknown = { ...games[0]!, id: 'x', minPlayers: null, maxPlayers: null, durationMinutes: null };
    expect(filterGames([unknown], { ...EMPTY_FILTERS, players: '2' })).toEqual([]);
    expect(filterGames([unknown], { ...EMPTY_FILTERS, duration: 'short' })).toEqual([]);
    expect(filterGames([unknown], EMPTY_FILTERS)).toHaveLength(1);
  });

  it('returns no matches for incompatible filters', () => {
    expect(filterGames(games, { ...EMPTY_FILTERS, players: '1', duration: 'epic' })).toEqual([]);
  });
});

describe('relatedGames', () => {
  it('ranks games sharing BGG categories and mechanics and omits the current game', () => {
    const result = relatedGames(games[1]!, games);
    expect(result.map((g) => g.id)).toEqual(['hitster', 'cardia']); // shared category x3 + mechanic, then only the similar duration
    expect(result).not.toContain(games[1]);
  });
});
