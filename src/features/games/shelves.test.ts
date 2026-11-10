import { describe, expect, it } from 'vitest';
import type { LibraryGame } from '@/types/domain';
import { cityOptions, distanceKm, groupShelves, shelfCommunities, sortShelfGames, type ShelfCommunity, type ShelfEntry, type ShelfScope } from './shelves';

const BGG_NONE = { yearPublished: null, minAge: null, bggId: null, rating: null, ratingCount: null, rank: null, weight: null, bgg: null };
const game = (id: string, title: string, rating: number | null = null): LibraryGame => ({
  id, title, slug: id, description: '', coverUrl: null, ...BGG_NONE, rating,
  categories: [], mechanics: [], minPlayers: 2, maxPlayers: 4, durationMinutes: 30, owners: [],
  status: 'unplayed', isFavorite: false,
});

// Porto centre, a club ~3 km away, Braga (~50 km), Lisbon (~275 km) and a community without coordinates.
const PORTO = { lat: 41.1579, lng: -8.6291 };
const community = (id: string, city: string, latitude: number | null, longitude: number | null): ShelfCommunity => ({
  id, slug: id, name: id.toUpperCase(), city, latitude, longitude,
});
const porto = community('porto', 'Porto', 41.1496, -8.6110);
const gaia = community('gaia', 'Vila Nova de Gaia', 41.1239, -8.6118);
const braga = community('braga', 'Braga', 41.5454, -8.4265);
const lisbon = community('lisbon', 'Lisboa', 38.7223, -9.1393);
const nowhere = community('nowhere', 'Porto', null, null);

const games = new Map([game('catan', 'Catan', 7.1), game('dixit', 'Dixit', 7.5), game('azul', 'Azul', null)].map((g) => [g.id, g]));
const entries: ShelfEntry[] = [
  { community: porto, gameId: 'catan', copies: 1 },
  { community: gaia, gameId: 'catan', copies: 2 },
  { community: braga, gameId: 'dixit', copies: 1 },
  { community: lisbon, gameId: 'azul', copies: 1 },
  { community: nowhere, gameId: 'azul', copies: 1 },
  { community: porto, gameId: 'missing-from-catalogue', copies: 1 },
];
const scope = (over: Partial<ShelfScope> = {}): ShelfScope => ({ origin: PORTO, radiusKm: 20, myCommunityIds: new Set(), ...over });

describe('distanceKm', () => {
  it('measures great-circle distances', () => {
    expect(distanceKm(PORTO, PORTO)).toBe(0);
    expect(distanceKm(PORTO, { lat: braga.latitude!, lng: braga.longitude! })).toBeCloseTo(46.3, 0);
    expect(distanceKm(PORTO, { lat: lisbon.latitude!, lng: lisbon.longitude! })).toBeGreaterThan(270);
  });
});

describe('groupShelves', () => {
  it('keeps one card per game with every in-radius community, closest first', () => {
    const result = groupShelves(entries, games, scope());
    expect(result.map((g) => g.id)).toEqual(['catan']);
    expect(result[0]!.shelves.map((s) => [s.communityId, s.copies])).toEqual([['porto', 1], ['gaia', 2]]);
    expect(result[0]!.nearestKm).toBeCloseTo(1.7, 0);
  });

  it('widens with the radius', () => {
    expect(groupShelves(entries, games, scope({ radiusKm: 50 })).map((g) => g.id).sort()).toEqual(['catan', 'dixit']);
  });

  it('always includes the viewer’s own communities, even far away or without coordinates', () => {
    const result = groupShelves(entries, games, scope({ myCommunityIds: new Set(['lisbon', 'nowhere']) }));
    const azul = result.find((g) => g.id === 'azul')!;
    expect(azul.shelves.map((s) => [s.communityId, s.isMine])).toEqual([['lisbon', true], ['nowhere', true]]);
    expect(azul.shelves[1]!.distanceKm).toBeNull();
  });

  it('without a location shows only the viewer’s own communities', () => {
    expect(groupShelves(entries, games, scope({ origin: null })).map((g) => g.id)).toEqual([]);
    const mine = groupShelves(entries, games, scope({ origin: null, myCommunityIds: new Set(['gaia']) }));
    expect(mine.map((g) => [g.id, g.nearestKm])).toEqual([['catan', null]]);
  });

  it('adds up copies of the same game listed twice on one shelf', () => {
    const doubled = [...entries, { community: porto, gameId: 'catan', copies: 3 }];
    expect(groupShelves(doubled, games, scope())[0]!.shelves[0]!.copies).toBe(4);
  });
});

describe('sortShelfGames', () => {
  const all = groupShelves(entries, games, scope({ radiusKm: 400 }));

  it('sorts by title, distance or BGG rating, unknowns last', () => {
    expect(sortShelfGames(all, 'title').map((g) => g.id)).toEqual(['azul', 'catan', 'dixit']);
    expect(sortShelfGames(all, 'nearest').map((g) => g.id)).toEqual(['catan', 'dixit', 'azul']);
    expect(sortShelfGames(all, 'bgg').map((g) => g.id)).toEqual(['dixit', 'catan', 'azul']);
  });

  it('lists the communities present on the cards', () => {
    expect(shelfCommunities(all).map((c) => c.id)).toEqual(['braga', 'gaia', 'lisbon', 'porto']);
  });
});

describe('cityOptions', () => {
  it('groups communities by city, centred on them, skipping ones without coordinates', () => {
    const options = cityOptions([porto, nowhere, braga, { ...gaia, city: 'porto ' }]);
    expect(options.map((o) => o.label)).toEqual(['Braga', 'Porto']);
    expect(options[1]!.point.lat).toBeCloseTo((porto.latitude! + gaia.latitude!) / 2, 6);
  });
});
