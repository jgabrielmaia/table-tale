/**
 * Deterministic data for the fake backend. Games, factions and achievements come from the project's own seed file,
 * so the suite exercises the real catalogue text; everything else (users, events, season) is fixed here.
 */
import { achievements, factions, games } from '../../scripts/seed-data';

export const PLAYER = {
  id: '00000000-0000-4000-8000-0000000000a1',
  email: 'ana.teste@example.test',
  displayName: 'Ana Teste',
};

export const OWNER = {
  id: '00000000-0000-4000-8000-0000000000b2',
  email: 'dono@example.test',
  displayName: 'Dono da Estante',
};

export type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const uuid = (kind: string, n: number) => `00000000-0000-4000-${kind}-${String(n).padStart(12, '0')}`;
const CREATED = '2026-01-01T10:00:00.000Z';

export const SEASON = { id: uuid('9000', 1), slug: 'season-1', name: 'Season 1', starts_at: CREATED, ends_at: null, is_active: true };

export const EVENT_DEFS = [
  { slug: 'noite-passada', name: 'Noite Passada', location: 'Lisboa · Sala A', event_date: '2020-03-14T19:00:00.000Z', description: 'Um encontro que já aconteceu.' },
  { slug: 'torneio-futuro', name: 'Torneio Futuro', location: 'Porto · Sala B', event_date: '2099-10-12T15:00:00.000Z', description: 'Torneio amigável marcado para o futuro.' },
  { slug: 'noite-cooperativa', name: 'Noite Cooperativa', location: 'Braga · Sala C', event_date: '2099-11-21T20:00:00.000Z', description: 'Jogos cooperativos com equipas mistas.' },
];

export const COMMUNITY_DEFS = [
  { slug: 'table-tale', name: 'Table Tale Lisboa', visibility: 'public', city: 'Lisboa', district: 'Alvalade', country: 'Portugal', latitude: 38.7495, longitude: -9.1438 },
  { slug: 'tabuleiros-do-porto', name: 'Tabuleiros do Porto', visibility: 'public', city: 'Porto', district: 'Boavista', country: 'Portugal', latitude: 41.1597, longitude: -8.6476 },
  { slug: 'clube-secreto-braga', name: 'Clube Secreto de Braga', visibility: 'private', city: 'Braga', district: 'Centro', country: 'Portugal', latitude: 41.5503, longitude: -8.4201 },
];

/** Places the viewer can stand in (browser location), each a few km from one community and far from the others. */
export const PLACES = {
  /** ~3 km from Table Tale Lisboa. */
  lisboa: { latitude: 38.7223, longitude: -9.1393 },
  /** ~1.5 km from Tabuleiros do Porto; Lisboa is ~275 km away. */
  porto: { latitude: 41.1579, longitude: -8.6291 },
  /** Next to the private Braga club: its shelf is invisible to non-members. */
  braga: { latitude: 41.5454, longitude: -8.4265 },
} as const;

/** What each shelf holds (game slugs → copies). Lisboa has the whole catalogue, so filter counts match the catalogue. */
export const SHELVES: Record<string, Record<string, number>> = {
  'table-tale': {}, // filled below with every game
  'tabuleiros-do-porto': { dixit: 1, coup: 3, vaalbara: 1 },
  'clube-secreto-braga': { uno: 1 },
};

export interface Db {
  profiles: Row[];
  games: Row[];
  ownerships: Row[];
  gameStatus: Row[];
  sessions: Row[];
  events: Row[];
  participants: Row[];
  achievements: Row[];
  userAchievements: Row[];
  seasons: Row[];
  identities: Row[];
  factions: Row[];
  communities: Row[];
  memberships: Row[];
  communityGames: Row[];
  /** One row per shelf copy. Filled lazily from communityGames[].copies (owned by added_by) the first time a shelf is read. */
  communityGameCopies: Row[];
  counter: number;
}

export function baseDb(): Db {
  const gameRows = games.map((g, i) => ({
    id: uuid('8000', i + 1), title: g.title, slug: g.slug, description: g.description, cover_url: null,
    categories: g.categories, mechanics: g.mechanics, bgg_id: null, bgg_data: null, bgg_synced_at: null, year_published: null, min_age: null,
    bgg_rating: null, bgg_rating_count: null, bgg_rank: null, bgg_weight: null,
    min_players: g.min_players, max_players: g.max_players, duration_minutes: g.duration_minutes,
  }));
  const ownerships = games.flatMap((g, i) =>
    Array.from({ length: g.copies }, (_, c) => ({ user_id: OWNER.id, game_id: gameRows[i]!.id, copy_number: c + 1, condition: 'good' })),
  );
  return {
    profiles: [
      { id: PLAYER.id, display_name: PLAYER.displayName, avatar_url: null, level: 1, experience_points: 0, faction_id: null, bio: null, created_at: CREATED, updated_at: CREATED },
      { id: OWNER.id, display_name: OWNER.displayName, avatar_url: null, level: 1, experience_points: 0, faction_id: null, bio: null, created_at: CREATED, updated_at: CREATED },
    ],
    games: gameRows,
    ownerships,
    gameStatus: [],
    sessions: [],
    events: EVENT_DEFS.map((e, i) => ({ id: uuid('7000', i + 1), ...e, image_url: null, created_at: CREATED })),
    participants: [],
    achievements: achievements.map((a, i) => ({ id: uuid('6000', i + 1), ...a })),
    userAchievements: [],
    seasons: [{ ...SEASON }],
    identities: [],
    factions: factions.map((f, i) => ({ id: uuid('5000', i + 1), slug: f.slug, name: f.name, description: f.description, symbol: f.symbol, color: f.color, lore: f.lore, created_at: CREATED })),
    communities: COMMUNITY_DEFS.map((c, i) => ({ id: uuid('a000', i + 1), description: '', created_by: OWNER.id, cover_url: null, cover_position: 50, shelf_visibility: 'public', created_at: CREATED, updated_at: CREATED, ...c })),
    // The player starts in no community: new accounts are no longer added to one automatically (backend.joinCommunity).
    memberships: [
      ...COMMUNITY_DEFS.map((_, i) => ({ id: uuid('a100', i + 1), user_id: OWNER.id, community_id: uuid('a000', i + 1), role: 'owner', status: 'active', joined_at: CREATED })),
    ],
    communityGames: COMMUNITY_DEFS.flatMap((c, ci) => {
      // Lisboa holds every game with the owner's copies; the others hold what SHELVES lists.
      // Ids start at 10001 so they never collide with the ids the fake backend generates for new rows (101, 102...).
      const shelf = c.slug === 'table-tale' ? Object.fromEntries(games.map((g) => [g.slug, g.copies])) : SHELVES[c.slug]!;
      return Object.entries(shelf).map(([slug, copies], gi) => ({
        id: uuid('a200', (ci + 1) * 10_000 + gi + 1), community_id: uuid('a000', ci + 1), game_id: gameRows.find((g) => g.slug === slug)!.id,
        added_by: OWNER.id, copies, condition: 'good', notes: null, added_at: CREATED,
      }));
    }),
    communityGameCopies: [],
    counter: 0,
  };
}
