const trimSlash = (value: string) => value.replace(/\/+$/, '');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

/** Router basename derived from Vite's `base` ("/table-tale/" → "/table-tale"). */
export const basePath = trimSlash(import.meta.env.BASE_URL) || '/';

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  /** Public URL of the app, used to build OAuth / magic-link redirect URLs. */
  siteUrl: trimSlash(import.meta.env.VITE_SITE_URL?.trim() || `${window.location.origin}${basePath === '/' ? '' : basePath}`),
} as const;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const authCallbackUrl = (next = '/library') =>
  `${env.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;
