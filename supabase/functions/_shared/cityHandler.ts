/**
 * Request handling of the `city-search` Edge Function, with its dependencies injected (fetch, key, authentication,
 * clock) so it is unit-tested without Deno, Supabase or API Ninjas.
 *
 * Upstream: GET https://api.api-ninjas.com/v1/city?name=<text>  with header `X-Api-Key` (docs: api-ninjas.com/api/city).
 * The free plan answers with ONE city per request (`limit` is premium only) and has a monthly quota, so the handler
 * caches answers, rate-limits each user and only sends `limit` when the operator opts in (secret API_NINJAS_LIMIT).
 *
 * Request  (POST, JSON): { query: string }
 * Response (200):        { results: [{ name, country, latitude, longitude }] }   country is the ISO 3166 alpha-2 code
 * Errors:                { error: { code, message } } with code in bad_request | unauthenticated | rate_limited | unavailable | bad_response
 */
export interface CityHit {
  name: string;
  /** ISO 3166-1 alpha-2 code, upper case. The app turns it into a readable name in the user's language. */
  country: string;
  latitude: number;
  longitude: number;
}

export const MIN_QUERY = 2;
export const MAX_QUERY = 60;
export const MAX_RESULTS = 10;

/** Trims, collapses whitespace and checks length and characters. Returns null when the query is not acceptable. */
export function normaliseQuery(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null;
  const q = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  return q.length >= MIN_QUERY && q.length <= MAX_QUERY ? q : null;
}

/** Keeps well-formed cities only (non-empty name, 2-letter country, coordinates in range), without duplicates. */
export function normaliseCities(payload: unknown, max = MAX_RESULTS): CityHit[] | null {
  if (!Array.isArray(payload)) return null;
  const seen = new Set<string>();
  const out: CityHit[] = [];
  for (const item of payload) {
    if (!item || typeof item !== 'object') continue;
    const { name, country, latitude, longitude } = item as Record<string, unknown>;
    if (typeof name !== 'string' || typeof country !== 'string') continue;
    if (latitude === null || longitude === null || latitude === '' || longitude === '') continue;
    const lat = Number(latitude);
    const lon = Number(longitude);
    const cleanName = name.trim().slice(0, 120);
    const code = country.trim().toUpperCase();
    if (!cleanName || !/^[A-Z]{2}$/.test(code)) continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const key = `${cleanName.toLowerCase()}|${code}|${lat.toFixed(2)}|${lon.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: cleanName, country: code, latitude: lat, longitude: lon });
    if (out.length >= max) break;
  }
  return out;
}

export interface HandlerState {
  cache: Map<string, { at: number; value: CityHit[] }>;
  hits: Map<string, number[]>;
}

export const createState = (): HandlerState => ({ cache: new Map(), hits: new Map() });

export interface CityHandlerDeps {
  /** API Ninjas key (Supabase secret API_NINJAS_KEY). Missing means the feature is not set up. */
  apiKey: string | undefined;
  authenticate(req: Request): Promise<{ id: string } | null>;
  fetchFn?: typeof fetch;
  now?: () => number;
  baseUrl?: string;
  /** Premium plans only: how many cities to request (2-30). Omitted on the free plan. */
  limit?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  /** Uncached lookups allowed per user per minute. */
  perMinute?: number;
  corsOrigin?: string;
  /** Cache and counters; defaults to a state shared by the module (one per isolate in production). */
  state?: HandlerState;
}

const moduleState = createState();
const CACHE_MAX = 300;

export async function handleCitySearch(req: Request, deps: CityHandlerDeps): Promise<Response> {
  const {
    fetchFn = fetch,
    now = Date.now,
    baseUrl = 'https://api.api-ninjas.com/v1/city',
    timeoutMs = 5000,
    cacheTtlMs = 60 * 60_000,
    perMinute = 30,
    corsOrigin = '*',
    state = moduleState,
  } = deps;
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
  if (!user) return fail(401, 'unauthenticated', 'Sign in to search cities');

  let body: { query?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, 'bad_request', 'Invalid JSON body');
  }
  const query = normaliseQuery(body?.query);
  if (!query) return fail(400, 'bad_request', `query must be ${MIN_QUERY}-${MAX_QUERY} characters, without control characters`);

  if (!deps.apiKey) return fail(503, 'unavailable', 'City search is not configured');

  const cacheKey = query.toLowerCase();
  const cached = state.cache.get(cacheKey);
  if (cached && now() - cached.at < cacheTtlMs) return json({ results: cached.value });

  // Only uncached lookups count: they are the ones that spend the monthly quota.
  const recent = (state.hits.get(user.id) ?? []).filter((t) => now() - t < 60_000);
  if (recent.length >= perMinute) return fail(429, 'rate_limited', 'Too many searches, try again in a moment');
  state.hits.set(user.id, [...recent, now()]);

  const params = new URLSearchParams({ name: query });
  if (deps.limit && deps.limit > 1) params.set('limit', String(Math.min(30, Math.floor(deps.limit))));

  let res: Response;
  try {
    res = await fetchFn(`${baseUrl}?${params}`, {
      headers: { 'X-Api-Key': deps.apiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return fail(503, 'unavailable', 'City search is unreachable');
  }

  // Never echo upstream details: a bad key or an exhausted quota is the operator's problem, not the user's.
  if (res.status === 429) return fail(429, 'rate_limited', 'City search is busy, try again later');
  if (res.status === 401 || res.status === 403) {
    console.error('city-search: API Ninjas refused the key or the quota is used up', res.status);
    return fail(503, 'unavailable', 'City search is unavailable');
  }
  if (res.status === 400) return fail(400, 'bad_request', 'That search is not valid');
  if (!res.ok) return fail(res.status >= 500 ? 503 : 502, res.status >= 500 ? 'unavailable' : 'bad_response', 'City search is unavailable');

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    return fail(502, 'bad_response', 'City search answered with something unexpected');
  }
  const results = normaliseCities(payload);
  if (!results) return fail(502, 'bad_response', 'City search answered with something unexpected');

  if (state.cache.size >= CACHE_MAX) state.cache.delete(state.cache.keys().next().value as string);
  state.cache.set(cacheKey, { at: now(), value: results });
  return json({ results });
}
