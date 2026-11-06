/**
 * Request handling of the `bgg` Edge Function, with its dependencies injected (BGG client, game store, authentication)
 * so it can be unit-tested without Deno, Supabase or BGG.
 *
 * Actions (POST, JSON body):
 *   { action: 'search', query }   -> { results: [{ id, name, yearPublished, type, gameSlug }] }
 *   { action: 'preview', id }     -> { thing, gameSlug }      full BGG item, nothing written
 *   { action: 'import', id }      -> { game }                 upserts the catalogue row by bgg_id and returns it
 * Adding the game to a personal or community library is done by the app afterwards, under the user's own row-level security.
 */
import { BggError, type BggClient } from './bggClient.ts';
import { slugify, toGameColumns, type GameColumns } from './bggParse.ts';

export interface GameRecord {
  id: string;
  slug: string;
  bgg_id: number | null;
  bgg_synced_at: string | null;
  [column: string]: unknown;
}

export interface GameStore {
  findByBggIds(ids: number[]): Promise<{ bgg_id: number; slug: string }[]>;
  findByBggId(id: number): Promise<GameRecord | null>;
  slugTaken(slug: string): Promise<boolean>;
  insert(row: GameColumns & { slug: string }): Promise<GameRecord>;
  update(id: string, row: GameColumns): Promise<GameRecord>;
}

export interface HandlerDeps {
  client: BggClient | null;
  store: GameStore;
  /** Returns the signed-in user for the request's JWT, or null (anonymous key, expired or missing token). */
  authenticate(req: Request): Promise<{ id: string } | null>;
  now?: () => number;
  /** Imported games younger than this are served from the catalogue without calling BGG. */
  freshMs?: number;
  corsOrigin?: string;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function handleBgg(req: Request, deps: HandlerDeps): Promise<Response> {
  const { store, now = Date.now, freshMs = WEEK_MS, corsOrigin = '*' } = deps;
  const cors = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  const fail = (status: number, code: string, message: string) => json({ error: { code, message } }, status);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST');

  const user = await deps.authenticate(req);
  if (!user) return fail(401, 'unauthenticated', 'Sign in to use the BoardGameGeek integration');

  let body: { action?: unknown; query?: unknown; id?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, 'bad_request', 'Invalid JSON body');
  }

  const client = deps.client;
  const needClient = (): BggClient => {
    if (!client) throw new BggError('unavailable', 'The BGG token is not configured');
    return client;
  };
  const id = Number(body.id);

  try {
    switch (body.action) {
      case 'search': {
        if (typeof body.query !== 'string') return fail(400, 'bad_request', 'query is required');
        const results = (await needClient().search(body.query)).slice(0, 25);
        const known = new Map((await store.findByBggIds(results.map((r) => r.id))).map((g) => [g.bgg_id, g.slug]));
        return json({ results: results.map((r) => ({ ...r, gameSlug: known.get(r.id) ?? null })) });
      }

      case 'preview': {
        if (!Number.isInteger(id) || id <= 0) return fail(400, 'bad_request', 'id must be a positive integer');
        const [thing] = await needClient().things([id]);
        if (!thing) return fail(404, 'not_found', 'BGG has no such game');
        const existing = await store.findByBggId(id);
        return json({ thing, gameSlug: existing?.slug ?? null });
      }

      case 'import': {
        if (!Number.isInteger(id) || id <= 0) return fail(400, 'bad_request', 'id must be a positive integer');
        const existing = await store.findByBggId(id);
        const syncedAt = existing?.bgg_synced_at ? Date.parse(existing.bgg_synced_at) : NaN;
        if (existing && Number.isFinite(syncedAt) && now() - syncedAt < freshMs) return json({ game: existing });

        const [thing] = await needClient().things([id]);
        if (!thing) return fail(404, 'not_found', 'BGG has no such game');
        const columns = toGameColumns(thing, new Date(now()).toISOString());
        if (existing) return json({ game: await store.update(existing.id, columns) });

        let slug = slugify(columns.title, id);
        if (await store.slugTaken(slug)) slug = `${slug}-${id}`;
        return json({ game: await store.insert({ ...columns, slug }) }, 201);
      }

      default:
        return fail(400, 'bad_request', 'Unknown action');
    }
  } catch (e) {
    if (e instanceof BggError) {
      const status = e.code === 'bad_request' ? 400 : e.code === 'rate_limited' ? 429 : e.code === 'unauthorized' ? 502 : e.code === 'bad_response' ? 502 : 503;
      // Never echo upstream details: an invalid token is the operator's problem, not the user's.
      return fail(status, e.code === 'unauthorized' ? 'bgg_unauthorized' : e.code, e.code === 'unauthorized' ? 'The BoardGameGeek integration is not authorised' : e.message);
    }
    console.error('bgg function error', e instanceof Error ? e.message : e);
    return fail(500, 'internal', 'Unexpected error');
  }
}
