const trimSlash = (value: string) => value.replace(/\/+$/, '');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

/** Router basename derived from Vite's `base` ("/table-tale/" → "/table-tale"). */
export const basePath = trimSlash(import.meta.env.BASE_URL) || '/';
const runtimeSiteUrl = `${window.location.origin}${basePath === '/' ? '' : basePath}`;
const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  /** Public URL of the app, used to build OAuth / magic-link redirect URLs. */
  siteUrl: isLocalhost ? runtimeSiteUrl : trimSlash(import.meta.env.VITE_SITE_URL?.trim() || runtimeSiteUrl),
} as const;

/** A feature flag is on only when its variable is exactly "true"; unset or anything else means off. */
export const flagOn = (value: string | undefined) => value?.trim().toLowerCase() === 'true';

/**
 * Build-time feature flags (Vite inlines them, so changing one needs a rebuild and redeploy).
 * - bgg: BoardGameGeek search and import (/games/import and the "Import from BGG" links). Off until BGG approves
 *   the API token; games already imported keep showing their BGG data and credit either way.
 */
export const features = {
  bgg: flagOn(import.meta.env.VITE_FEATURE_BGG),
} as const;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const authCallbackUrl = (next = '/games') =>
  `${env.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;
