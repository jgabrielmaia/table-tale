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

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const authCallbackUrl = (next = '/library') =>
  `${env.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;
