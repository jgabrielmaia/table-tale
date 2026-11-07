import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import { t, type MessageKey } from '@/i18n';

/**
 * City lookup through the `city-search` Edge Function. The API Ninjas key lives in that function's secrets only;
 * the browser sends the typed text and the user's session, and gets back a small normalised list.
 */
export interface CityHit {
  name: string;
  /** ISO 3166-1 alpha-2 code. */
  country: string;
  latitude: number;
  longitude: number;
}

export interface LocationFields {
  city: string;
  country: string;
  latitude: string;
  longitude: string;
}

export const MIN_CITY_QUERY = 2;
export const MAX_CITY_QUERY = 60;

/** Same rules as the function (trim, collapse spaces, length), so the browser does not send what would be refused. */
export function cleanCityQuery(raw: string): string | null {
  const q = raw.replace(/\s+/g, ' ').trim();
  return q.length >= MIN_CITY_QUERY && q.length <= MAX_CITY_QUERY ? q : null;
}

/** "PT" -> "Portugal" / "Portugal" in the app language. Falls back to the code when the runtime does not know it. */
export function countryName(code: string, locale: string): string {
  const upper = code.trim().toUpperCase();
  // ZZ is CLDR's "unknown region": show the code rather than a placeholder like "Unknown Region".
  if (upper === 'ZZ') return upper;
  try {
    const name = new Intl.DisplayNames([locale], { type: 'region', fallback: 'none' }).of(upper);
    return name || upper;
  } catch {
    return upper;
  }
}

/** Coordinates as the form stores them: decimal degrees with at most 4 decimals (about 10 m). */
export function formatCoordinate(value: number): string {
  return String(Math.round(value * 1e4) / 1e4);
}

/** What a picked city writes into the form. `district` is not provided by the API and is left to the user. */
export function toLocationFields(hit: CityHit, locale: string): LocationFields {
  return {
    city: hit.name,
    country: countryName(hit.country, locale),
    latitude: formatCoordinate(hit.latitude),
    longitude: formatCoordinate(hit.longitude),
  };
}

/** Secondary line of a result: country name plus the coordinates the pick will fill in. */
export function describeHit(hit: CityHit, locale: string): string {
  return `${countryName(hit.country, locale)} · ${formatCoordinate(hit.latitude)}, ${formatCoordinate(hit.longitude)}`;
}

const ERROR_KEYS: Record<string, MessageKey> = {
  rate_limited: 'communities.citySearch.err.rateLimited',
  unauthenticated: 'communities.citySearch.err.unauthenticated',
};

export async function searchCities(query: string, signal?: AbortSignal): Promise<CityHit[]> {
  const { data, error } = await supabase.functions.invoke('city-search', { body: { query }, ...(signal ? { signal } : {}) });
  if (!error) {
    const results = (data as { results?: unknown } | null)?.results;
    if (!Array.isArray(results)) throw new AppError(t('communities.citySearch.err.unavailable'));
    return results as CityHit[];
  }
  let code = 'unavailable';
  const response = (error as { context?: unknown }).context;
  if (response instanceof Response) {
    try {
      code = (await response.json())?.error?.code ?? code;
    } catch {
      /* not JSON: keep the generic code */
    }
  }
  throw new AppError(t(ERROR_KEYS[code] ?? 'communities.citySearch.err.unavailable'), error);
}
