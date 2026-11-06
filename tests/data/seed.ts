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
  { slug: 'table-tale', name: 'Table Tale Lisboa', visibility: 'public', city: 'Lisboa', district: 'Alvalade', country: 'Portugal' },
  { slug: 'tabuleiros-do-porto', name: 'Tabuleiros do Porto', visibility: 'public', city: 'Porto', district: 'Boavista', country: 'Portugal' },
  { slug: 'clube-secreto-braga', name: 'Clube Secreto de Braga', visibility: 'private', city: 'Braga', district: 'Centro', country: 'Portugal' },
];

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
  counter: number;
}

export function baseDb(): Db {
  const gameRows = games.map((g, i) => ({
    id: uuid('8000', i + 1), title: g.title, slug: g.slug, description: g.description, cover_url: null, genre: g.genre,
    min_players: g.min_players, max_players: g.max_players, duration_minutes: g.duration_minutes, complexity: g.complexity,
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
    communities: COMMUNITY_DEFS.map((c, i) => ({ id: uuid('a000', i + 1), description: '', latitude: null, longitude: null, created_by: OWNER.id, created_at: CREATED, updated_at: CREATED, ...c })),
    memberships: [
      ...COMMUNITY_DEFS.map((_, i) => ({ id: uuid('a100', i + 1), user_id: OWNER.id, community_id: uuid('a000', i + 1), role: 'owner', status: 'active', joined_at: CREATED })),
      { id: uuid('a100', 10), user_id: PLAYER.id, community_id: uuid('a000', 1), role: 'member', status: 'active', joined_at: CREATED },
    ],
    communityGames: [
      { id: uuid('a200', 1), community_id: uuid('a000', 1), game_id: gameRows[0]!.id, added_by: OWNER.id, copies: 2, condition: 'good', notes: null, added_at: CREATED },
    ],
    counter: 0,
  };
}
