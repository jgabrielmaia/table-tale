import searchXml from './fixtures/search.xml?raw';
import thingXml from './fixtures/thing.xml?raw';
import { describe, expect, it, vi } from 'vitest';
import { BggError, createBggClient, THING_BATCH } from './bggClient';

const xml = (body: string, status = 200, headers: Record<string, string> = {}) => new Response(body, { status, headers });

function setup(responses: (Response | Error)[], extra: Partial<Parameters<typeof createBggClient>[0]> = {}) {
  let t = 1_000_000;
  const sleeps: number[] = [];
  const queue = [...responses];
  const fetchFn = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    const next = queue.shift();
    if (!next) throw new Error('unexpected extra request');
    if (next instanceof Error) throw next;
    return next;
  });
  const client = createBggClient({
    token: 'secret-token',
    fetchFn: fetchFn as unknown as typeof fetch,
    sleep: async (ms) => { sleeps.push(ms); t += ms; },
    now: () => t,
    ...extra,
  });
  return { client, fetchFn, sleeps, calls: () => fetchFn.mock.calls.map((c) => String(c[0])) };
}

describe('createBggClient', () => {
  it('sends the bearer token to boardgamegeek.com without www', async () => {
    const { client, fetchFn } = setup([xml(searchXml)]);
    const results = await client.search('catan');
    expect(results.map((r) => r.id)).toEqual([13, 27710, 999001]);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(String(url)).toBe('https://boardgamegeek.com/xmlapi2/search?query=catan&type=boardgame');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer secret-token');
  });

  it('encodes the query and validates its length', async () => {
    const { client, calls } = setup([xml(searchXml)]);
    await client.search(' Cities & Knights ');
    expect(calls()[0]).toContain('query=Cities%20%26%20Knights');
    await expect(client.search('a')).rejects.toMatchObject({ code: 'bad_request' });
    await expect(client.search('x'.repeat(101))).rejects.toMatchObject({ code: 'bad_request' });
  });

  it('spaces requests at least minIntervalMs apart', async () => {
    const { client, sleeps } = setup([xml(searchXml), xml(searchXml)], { minIntervalMs: 5000 });
    await client.search('catan');
    expect(sleeps).toEqual([]);
    await client.search('azul');
    expect(sleeps).toEqual([5000]);
  });

  it('caches searches and items', async () => {
    const { client, fetchFn } = setup([xml(searchXml), xml(thingXml)]);
    await client.search('Catan');
    await client.search('catan ');
    expect(await client.things([13])).toHaveLength(1);
    expect(await client.things([13])).toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('retries 503 and 429 with backoff, honouring Retry-After', async () => {
    const { client, fetchFn, sleeps } = setup([xml('', 503), xml('', 429, { 'retry-after': '7' }), xml(searchXml)], { minIntervalMs: 0 });
    await client.search('catan');
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(sleeps).toEqual([2000, 7000]);
  });

  it('retries network failures, then gives up as unavailable', async () => {
    const { client, fetchFn } = setup([new Error('x'), new Error('x'), new Error('x'), new Error('x')], { minIntervalMs: 0 });
    await expect(client.search('catan')).rejects.toMatchObject({ code: 'unavailable' });
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });

  it('reports a persistent 429 as rate_limited', async () => {
    const { client } = setup([xml('', 429), xml('', 429)], { minIntervalMs: 0, maxRetries: 1 });
    await expect(client.search('catan')).rejects.toMatchObject({ code: 'rate_limited', status: 429 });
  });

  it('does not retry an invalid token', async () => {
    const { client, fetchFn } = setup([xml('', 401)]);
    await expect(client.search('catan')).rejects.toBeInstanceOf(BggError);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('flags unreadable answers', async () => {
    const { client } = setup([xml('<html>nope</html>')]);
    await expect(client.search('catan')).rejects.toMatchObject({ code: 'bad_response' });
  });

  it('batches thing requests by 20 ids and keeps the requested order', async () => {
    const ids = Array.from({ length: THING_BATCH + 1 }, (_, i) => i + 1);
    const { client, calls } = setup([xml('<items></items>'), xml('<items></items>')], { minIntervalMs: 0 });
    expect(await client.things(ids)).toEqual([]);
    expect(calls()).toHaveLength(2);
    expect(calls()[0]).toContain(`id=${ids.slice(0, THING_BATCH).join(',')}&stats=1`);
    expect(calls()[1]).toContain('id=21&stats=1');

    const two = setup([xml(thingXml)]);
    const items = await two.client.things([999002, 13, 13]);
    expect(items.map((i) => i.id)).toEqual([999002, 13]);
  });

  it('rejects invalid ids before calling BGG', async () => {
    const { client, fetchFn } = setup([]);
    await expect(client.things([0])).rejects.toMatchObject({ code: 'bad_request' });
    await expect(client.things([1.5])).rejects.toMatchObject({ code: 'bad_request' });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
