/**
 * Local auth bypass (development only, easy to remove: delete this file and its use in AuthProvider).
 *
 * Skips the OAuth / magic-link flow by signing in a real, pre-created dev account with email + password, so the
 * session is a genuine Supabase JWT and RLS / authorization keep working unchanged.
 *
 * Enabled only when ALL hold (fail closed otherwise):
 *  - Vite dev build (`import.meta.env.DEV`; production bundles drop this branch at build time, credentials included)
 *  - page is served from localhost / 127.0.0.1 / [::1] (checked from the real location, never from query/headers)
 *  - VITE_LOCAL_AUTH_BYPASS=true and dev account credentials are configured
 */
export interface LocalBypassConfig {
  email: string;
  password: string;
}

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export function resolveLocalBypass(hostname: string = window.location.hostname): LocalBypassConfig | null {
  if (!import.meta.env.DEV) return null;
  if (!LOCAL_HOSTS.includes(hostname)) return null;
  if (import.meta.env.VITE_LOCAL_AUTH_BYPASS !== 'true') return null;
  const email = import.meta.env.VITE_LOCAL_AUTH_BYPASS_EMAIL?.trim();
  const password = import.meta.env.VITE_LOCAL_AUTH_BYPASS_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}
