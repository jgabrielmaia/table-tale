import searchXml from './fixtures/search.xml?raw';
import thingXml from './fixtures/thing.xml?raw';
import { describe, expect, it, vi } from 'vitest';
import { BggError, createBggClient } from './bggClient';
import { handleBgg, normaliseQuery, type CachedSearch, type GameRecord, type GameStore, type HandlerDeps } from './bggHandler';

const NOW = Date.parse('2026-11-06T12:00:00Z');

function deps(over: Partial<HandlerDeps> & { existing?: GameRecord[]; xml?: string[] } = {}) {
  const rows: GameRecord[] = [...(over.existing ?? [])];
  const answers = [...(over.xml ?? [])];
  const fetchFn = vi.fn(async () => new Response(answers.shift() ?? '<items/>'));
  const store: GameStore = {
    findByBggIds: async (ids) => rows.filter((r) => ids.includes(r.bgg_id!)).map((r) => ({ bgg_id: r.bgg_id!, slug: r.slug })),
    findByBggId: async (id) => rows.find((r) => r.bgg_id === id) ?? null,
    slugTaken: async (slug) => rows.some((r) => r.slug === slug),
    insert: vi.fn(async (row) => {
      const rec = { ...row, id: `id-${rows.length + 1}` } as unknown as GameRecord;
      rows.push(rec);
      return rec;
    }),
    update: vi.fn(async (id, row) => Object.assign(rows.find((r) => r.id === id)!, row)),
  };
  const d: HandlerDeps = {
    client: createBggClient({ token: 't', fetchFn: fetchFn as unknown as typeof fetch, sleep: async () => {}, now: () => NOW, minIntervalMs: 0 }),
    store,
    authenticate: async (req) => (req.headers.get('authorization') === 'Bearer user-jwt' ? { id: 'u1' } : null),
    now: () => NOW,
    ...over,
  };
  return { d, rows, store, fetchFn };
}

const call = (d: HandlerDeps, body: unknown, headers: Record<string, string> = { authorization: 'Bearer user-jwt' }, method = 'POST') =>
  handleBgg(new Request('https://x/functions/v1/bgg', { method, headers, body: method === 'POST' ? JSON.stringify(body) : undefined }), d);

describe('bgg handler', () => {
  it('answers CORS preflight without authentication', async () => {
    const { d } = deps();
    const res = await call(d, null, {}, 'OPTIONS');
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-headers')).toContain('authorization');
  });

  it('rejects anonymous callers before any BGG request', async () => {
    const { d, fetchFn } = deps();
    expect((await call(d, { action: 'search', query: 'catan' }, {})).status).toBe(401);
    expect((await call(d, { action: 'search', query: 'catan' }, { authorization: 'Bearer anon-key' })).status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('rejects non-POST methods and malformed input', async () => {
    const { d } = deps();
    expect((await call(d, null, { authorization: 'Bearer user-jwt' }, 'GET')).status).toBe(405);
    expect((await call(d, { action: 'nope' })).status).toBe(400);
    expect((await call(d, { action: 'search' })).status).toBe(400);
    expect((await call(d, { action: 'preview', id: 'x' })).status).toBe(400);
    expect((await call(d, { action: 'import', id: -3 })).status).toBe(400);
  });

  it('searches and marks games already in the catalogue', async () => {
    const { d } = deps({ xml: [searchXml], existing: [{ id: 'g1', slug: 'catan', bgg_id: 13, bgg_synced_at: null }] });
    const res = await call(d, { action: 'search', query: 'catan' });
    const { results } = await res.json();
    expect(results[0]).toMatchObject({ id: 13, name: 'CATAN', gameSlug: 'catan' });
    expect(results[1]).toMatchObject({ id: 27710, gameSlug: null });
  });

  describe('search cache', () => {
    const memoryCache = (entries: Record<string, CachedSearch> = {}) => ({
      entries,
      get: vi.fn(async (q: string) => entries[q] ?? null),
      put: vi.fn(async (q: string, results: CachedSearch['results']) => {
        entries[q] = { results, fetchedAt: new Date(NOW).toISOString() };
      }),
    });

    it('normalises the query into the cache key', () => {
      expect(normaliseQuery('  CATAN   Seafarers ')).toBe('catan seafarers');
      expect(normaliseQuery('x'.repeat(300))).toHaveLength(200);
    });

    it('stores a BGG answer and serves the same search from the cache for a week, with fresh catalogue slugs', async () => {
      const cache = memoryCache();
      const { d, fetchFn, rows } = deps({ xml: [searchXml], searchCache: cache });
      await call(d, { action: 'search', query: 'Catan' });
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(cache.put).toHaveBeenCalledWith('catan', expect.any(Array));

      rows.push({ id: 'g1', slug: 'catan', bgg_id: 13, bgg_synced_at: null });
      const res = await call(d, { action: 'search', query: '  CATAN ' });
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect((await res.json()).results[0]).toMatchObject({ id: 13, gameSlug: 'catan' });
    });

    it('asks BGG again once the cached search is a week old', async () => {
      const stale = new Date(NOW - 8 * 24 * 60 * 60 * 1000).toISOString();
      const cache = memoryCache({ catan: { results: [], fetchedAt: stale } });
      const { d, fetchFn } = deps({ xml: [searchXml], searchCache: cache });
      const { results } = await (await call(d, { action: 'search', query: 'catan' })).json();
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(results.length).toBeGreaterThan(0);
    });

    it('still searches when the cache fails, and rejects a blank query', async () => {
      const cache = { get: vi.fn(async () => { throw new Error('db down'); }), put: vi.fn(async () => { throw new Error('db down'); }) };
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { d, fetchFn } = deps({ xml: [searchXml], searchCache: cache });
      expect((await call(d, { action: 'search', query: 'catan' })).status).toBe(200);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect((await call(d, { action: 'search', query: '   ' })).status).toBe(400);
      error.mockRestore();
    });
  });

  it('previews the full BGG item without writing', async () => {
    const { d, store } = deps({ xml: [thingXml] });
    const { thing, gameSlug } = await (await call(d, { action: 'preview', id: 13 })).json();
    expect(thing.stats.averageWeight).toBe(2.3);
    expect(gameSlug).toBeNull();
    expect(store.insert).not.toHaveBeenCalled();
  });

  it('imports a new game with a slug from its title', async () => {
    const { d, store } = deps({ xml: [thingXml] });
    const res = await call(d, { action: 'import', id: 13 });
    expect(res.status).toBe(201);
    const { game } = await res.json();
    expect(game).toMatchObject({ slug: 'catan', bgg_id: 13, categories: ['Economic', 'Negotiation'], bgg_rank: 450, bgg_synced_at: '2026-11-06T12:00:00.000Z' });
    expect(game).not.toHaveProperty('genre');
    expect(store.insert).toHaveBeenCalledTimes(1);
  });

  it('suffixes the slug with the BGG id when it is taken by another game', async () => {
    const { d } = deps({ xml: [thingXml], existing: [{ id: 'g9', slug: 'catan', bgg_id: null, bgg_synced_at: null }] });
    expect((await (await call(d, { action: 'import', id: 13 })).json()).game.slug).toBe('catan-13');
  });

  it('serves a recently synced game without calling BGG, and refreshes a stale one keeping its slug', async () => {
    const fresh = { id: 'g1', slug: 'catan', bgg_id: 13, bgg_synced_at: new Date(NOW - 60_000).toISOString() };
    const a = deps({ existing: [fresh] });
    expect((await (await call(a.d, { action: 'import', id: 13 })).json()).game.id).toBe('g1');
    expect(a.fetchFn).not.toHaveBeenCalled();

    const stale = { id: 'g1', slug: 'my-catan', bgg_id: 13, bgg_synced_at: new Date(NOW - 30 * 86_400_000).toISOString() };
    const b = deps({ existing: [stale], xml: [thingXml] });
    const { game } = await (await call(b.d, { action: 'import', id: 13 })).json();
    expect(game).toMatchObject({ id: 'g1', slug: 'my-catan', title: 'CATAN' });
    expect(b.store.update).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when BGG does not know the id', async () => {
    const { d } = deps({ xml: ['<items></items>'] });
    expect((await call(d, { action: 'import', id: 5 })).status).toBe(404);
  });

  it('reports a missing token as 503 and an upstream auth failure without leaking details', async () => {
    const noToken = deps({ client: null });
    const r1 = await call(noToken.d, { action: 'search', query: 'catan' });
    expect(r1.status).toBe(503);

    const bad = deps({ client: { search: async () => { throw new BggError('unauthorized', 'BGG rejected the API token', 401); }, things: async () => [] } });
    const r2 = await call(bad.d, { action: 'search', query: 'catan' });
    expect(r2.status).toBe(502);
    expect(await r2.json()).toEqual({ error: { code: 'bgg_unauthorized', message: 'The BoardGameGeek integration is not authorised' } });
  });

  it('maps throttling to 429', async () => {
    const { d } = deps({ client: { search: async () => { throw new BggError('rate_limited', 'slow down', 429); }, things: async () => [] } });
    expect((await call(d, { action: 'search', query: 'catan' })).status).toBe(429);
  });
});
