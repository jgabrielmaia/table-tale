/**
 * BoardGameGeek XML API2 client for the Edge Function. Server-side only: it holds the bearer token.
 * Kept free of Deno-only APIs (fetch, timers and the clock are injectable) so it is unit-tested in vitest.
 *
 * Follows BGG's rules: every request carries `Authorization: Bearer <token>`, goes to boardgamegeek.com (no `www`),
 * is spaced out (about 5 s apart), `thing` takes at most 20 ids, and 429/5xx answers are retried with backoff.
 * Responses are cached in memory per isolate, so repeating a search or opening a game again costs no BGG request.
 */
import { parseSearch, parseThings, type BggSearchResult, type BggThing } from './bggParse.ts';

export type BggErrorCode = 'bad_request' | 'unauthorized' | 'rate_limited' | 'unavailable' | 'bad_response';

export class BggError extends Error {
  constructor(public code: BggErrorCode, message: string, public status?: number) {
    super(message);
    this.name = 'BggError';
  }
}

export const THING_BATCH = 20;
const RETRYABLE = new Set([202, 429, 500, 502, 503, 504]);

export interface BggClientOptions {
  token: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /** Minimum gap between two BGG requests. */
  minIntervalMs?: number;
  /** Retries after the first attempt, with exponential backoff from `backoffMs`. */
  maxRetries?: number;
  backoffMs?: number;
  /** Give up on a single BGG request after this long (a hung request would block the queue for everyone). */
  timeoutMs?: number;
  /** A Retry-After longer than this is not waited for: the caller gets rate_limited straight away. */
  maxRetryAfterMs?: number;
  searchTtlMs?: number;
  thingTtlMs?: number;
}

export interface BggClient {
  search(query: string): Promise<BggSearchResult[]>;
  /** Items for the given ids, in the requested order (ids BGG does not know are omitted). */
  things(ids: number[]): Promise<BggThing[]>;
}

export function createBggClient(options: BggClientOptions): BggClient {
  const {
    token,
    baseUrl = 'https://boardgamegeek.com',
    fetchFn = fetch,
    sleep = (ms) => new Promise<void>((r) => setTimeout(r, ms)),
    now = Date.now,
    minIntervalMs = 5000,
    maxRetries = 3,
    backoffMs = 2000,
    timeoutMs = 20_000,
    maxRetryAfterMs = 15_000,
    searchTtlMs = 10 * 60_000,
    thingTtlMs = 60 * 60_000,
  } = options;

  const searchCache = new Map<string, { at: number; value: BggSearchResult[] }>();
  const thingCache = new Map<number, { at: number; value: BggThing }>();
  let lastRequestAt = Number.NEGATIVE_INFINITY;
  let queue: Promise<unknown> = Promise.resolve();

  async function attempt(path: string): Promise<string> {
    for (let n = 0; ; n++) {
      const wait = lastRequestAt + minIntervalMs - now();
      if (wait > 0) await sleep(wait);
      lastRequestAt = now();
      let res: Response;
      try {
        res = await fetchFn(`${baseUrl}${path}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/xml' },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        if (n >= maxRetries) throw new BggError('unavailable', 'BGG is unreachable');
        await sleep(backoffMs * 2 ** n);
        continue;
      }
      if (res.status === 401 || res.status === 403) throw new BggError('unauthorized', 'BGG rejected the API token', res.status);
      if (res.ok && res.status !== 202) return res.text();
      if (RETRYABLE.has(res.status) && n < maxRetries) {
        const retryAfterMs = Number(res.headers.get('retry-after')) * 1000;
        const delay = Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? retryAfterMs : backoffMs * 2 ** n;
        if (delay <= maxRetryAfterMs) {
          await sleep(delay);
          continue;
        }
      }
      throw new BggError(res.status === 429 ? 'rate_limited' : 'unavailable', `BGG answered ${res.status}`, res.status);
    }
  }

  /** Requests are serialised so the spacing holds even when several callers arrive together. */
  const request = (path: string): Promise<string> => {
    const run = queue.then(() => attempt(path));
    queue = run.catch(() => undefined);
    return run;
  };

  const parse = <T>(fn: (xml: string) => T, xml: string): T => {
    try {
      return fn(xml);
    } catch {
      throw new BggError('bad_response', 'BGG sent a response that could not be read');
    }
  };

  return {
    async search(query) {
      const q = query.trim();
      if (q.length < 2 || q.length > 100) throw new BggError('bad_request', 'The search needs 2 to 100 characters');
      const key = q.toLowerCase();
      const hit = searchCache.get(key);
      if (hit && now() - hit.at < searchTtlMs) return hit.value;
      const value = parse(parseSearch, await request(`/xmlapi2/search?query=${encodeURIComponent(q)}&type=boardgame`));
      searchCache.set(key, { at: now(), value });
      return value;
    },

    async things(ids) {
      const unique = [...new Set(ids)];
      if (unique.some((id) => !Number.isInteger(id) || id <= 0)) throw new BggError('bad_request', 'Invalid BGG id');
      const missing = unique.filter((id) => {
        const hit = thingCache.get(id);
        return !hit || now() - hit.at >= thingTtlMs;
      });
      for (let i = 0; i < missing.length; i += THING_BATCH) {
        const batch = missing.slice(i, i + THING_BATCH);
        const items = parse(parseThings, await request(`/xmlapi2/thing?id=${batch.join(',')}&stats=1`));
        for (const item of items) thingCache.set(item.id, { at: now(), value: item });
      }
      return unique.flatMap((id) => {
        const hit = thingCache.get(id);
        return hit ? [hit.value] : [];
      });
    },
  };
}
