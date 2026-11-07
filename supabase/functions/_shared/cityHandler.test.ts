import { describe, expect, it, vi } from 'vitest';
import { createState, handleCitySearch, normaliseCities, normaliseQuery, type CityHandlerDeps } from './cityHandler';

const lisbon = { name: 'Lisbon', latitude: 38.7227, longitude: -9.1449, country: 'PT', population: 517802, is_capital: true };

function deps(over: Partial<CityHandlerDeps> & { answer?: () => Response } = {}) {
  const fetchFn = vi.fn(async () => (over.answer ? over.answer() : new Response(JSON.stringify([lisbon]))));
  const d: CityHandlerDeps = {
    apiKey: 'secret-key',
    authenticate: async (req) => (req.headers.get('authorization') === 'Bearer user-jwt' ? { id: 'u1' } : null),
    fetchFn: fetchFn as unknown as typeof fetch,
    now: () => 1_000_000,
    state: createState(),
    ...over,
  };
  return { d, fetchFn };
}

const call = (d: CityHandlerDeps, body: unknown, headers: Record<string, string> = { authorization: 'Bearer user-jwt' }, method = 'POST') =>
  handleCitySearch(new Request('https://x/functions/v1/city-search', { method, headers, body: method === 'POST' ? JSON.stringify(body) : undefined }), d);

describe('normaliseQuery', () => {
  it('trims and collapses whitespace', () => expect(normaliseQuery('  Vila   Nova  ')).toBe('Vila Nova'));
  it('rejects non-strings, too short, too long and control characters', () => {
    expect(normaliseQuery(42)).toBeNull();
    expect(normaliseQuery(' a ')).toBeNull();
    expect(normaliseQuery('x'.repeat(61))).toBeNull();
    expect(normaliseQuery('Porto\u0000')).toBeNull();
    expect(normaliseQuery('Porto\n')).toBeNull();
    expect(normaliseQuery('x'.repeat(60))).toHaveLength(60);
  });
});

describe('normaliseCities', () => {
  it('keeps name, upper-cased country and coordinates only', () => {
    expect(normaliseCities([{ ...lisbon, country: 'pt' }])).toEqual([{ name: 'Lisbon', country: 'PT', latitude: 38.7227, longitude: -9.1449 }]);
  });
  it('drops malformed rows and duplicates', () => {
    const rows = [
      lisbon,
      lisbon,
      { name: '', country: 'PT', latitude: 1, longitude: 1 },
      { name: 'X', country: 'PRT', latitude: 1, longitude: 1 },
      { name: 'Y', country: 'PT', latitude: 91, longitude: 1 },
      { name: 'Z', country: 'PT', latitude: null, longitude: 1 },
      { name: 'W', country: 'PT', latitude: 'abc', longitude: 1 },
      null,
      'nope',
    ];
    expect(normaliseCities(rows)).toHaveLength(1);
  });
  it('caps the number of results and rejects non-arrays', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ name: `City ${i}`, country: 'PT', latitude: i, longitude: i }));
    expect(normaliseCities(many)).toHaveLength(10);
    expect(normaliseCities({ error: 'x' })).toBeNull();
  });
});

describe('city-search handler', () => {
  it('answers CORS preflight without authentication and rejects other methods', async () => {
    const { d } = deps();
    expect((await call(d, null, {}, 'OPTIONS')).status).toBe(200);
    expect((await call(d, null, {}, 'GET')).status).toBe(405);
  });

  it('requires a signed-in user and never calls upstream otherwise', async () => {
    const { d, fetchFn } = deps();
    const res = await call(d, { query: 'Lisbon' }, {});
    expect(res.status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('validates the query before spending quota', async () => {
    const { d, fetchFn } = deps();
    expect((await call(d, { query: 'a' })).status).toBe(400);
    expect((await call(d, { query: 'x'.repeat(200) })).status).toBe(400);
    expect((await call(d, { query: { $ne: 1 } })).status).toBe(400);
    expect((await call(d, {})).status).toBe(400);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('sends the key as a header (never in the URL), encodes the query and returns the normalised shape', async () => {
    const { d, fetchFn } = deps();
    const res = await call(d, { query: 'São  Paulo&limit=30' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ results: [{ name: 'Lisbon', country: 'PT', latitude: 38.7227, longitude: -9.1449 }] });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.api-ninjas.com/v1/city?name=S%C3%A3o+Paulo%26limit%3D30');
    expect(url).not.toContain('secret-key');
    expect((init.headers as Record<string, string>)['X-Api-Key']).toBe('secret-key');
  });

  it('only asks for more than one city when the operator configured a premium limit', async () => {
    const { d, fetchFn } = deps({ limit: 8 });
    await call(d, { query: 'Porto' });
    expect(String((fetchFn.mock.calls[0] as unknown[])[0])).toContain('limit=8');
  });

  it('serves a repeated search from the cache', async () => {
    const { d, fetchFn } = deps();
    await call(d, { query: 'Lisbon' });
    await call(d, { query: ' lisbon ' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('is unavailable (503) without a key, without calling upstream', async () => {
    const { d, fetchFn } = deps({ apiKey: undefined });
    const res = await call(d, { query: 'Lisbon' });
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe('unavailable');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('rate-limits each user on uncached lookups', async () => {
    const { d, fetchFn } = deps({ perMinute: 2 });
    expect((await call(d, { query: 'aa' })).status).toBe(200);
    expect((await call(d, { query: 'bb' })).status).toBe(200);
    const res = await call(d, { query: 'cc' });
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe('rate_limited');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it.each([
    [429, 429, 'rate_limited'],
    [401, 503, 'unavailable'],
    [403, 503, 'unavailable'],
    [400, 400, 'bad_request'],
    [500, 503, 'unavailable'],
    [404, 502, 'bad_response'],
  ])('maps upstream %i to %i %s without leaking details', async (upstream, status, code) => {
    const { d } = deps({ answer: () => new Response(JSON.stringify({ error: 'secret-key quota details' }), { status: upstream }) });
    const res = await call(d, { query: 'Lisbon' });
    expect(res.status).toBe(status);
    const text = await res.text();
    expect(JSON.parse(text).error.code).toBe(code);
    expect(text).not.toContain('quota details');
  });

  it('reports an unreachable upstream, invalid JSON and an unexpected shape', async () => {
    const down = deps();
    down.fetchFn.mockRejectedValueOnce(new Error('network'));
    expect((await call(down.d, { query: 'Lisbon' })).status).toBe(503);
    expect((await call(deps({ answer: () => new Response('<html>') }).d, { query: 'Lisbon' })).status).toBe(502);
    expect((await call(deps({ answer: () => new Response('{"a":1}') }).d, { query: 'Lisbon' })).status).toBe(502);
  });

  it('answers an empty list when nothing matches', async () => {
    const { d } = deps({ answer: () => new Response('[]') });
    const res = await call(d, { query: 'Zzzzz' });
    expect(await res.json()).toEqual({ results: [] });
  });
});
