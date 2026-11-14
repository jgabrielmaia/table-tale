import { supabase } from '@/lib/supabase';
import { authCallbackUrl, env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { t } from '@/i18n';
import { OAUTH_PROVIDERS, providerName, type EnabledProviders, type OAuthProvider } from './providers';

/** Only allow in-app relative paths as post-login destinations (prevents open redirects). */
export function safeNextPath(next: string | null | undefined, fallback = '/games'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  return next;
}

const NEXT_KEY = 'tt:auth-next';

/**
 * Stores where to go after sign-in, for /auth/callback to pick up. localStorage (not sessionStorage) so a magic link
 * opened in a new tab still finds it. Storage can be unavailable (private mode); then the callback falls back to /games.
 */
export function rememberNextPath(next: string) {
  try {
    localStorage.setItem(NEXT_KEY, safeNextPath(next));
  } catch {
    /* storage unavailable */
  }
}

/** The destination saved by `rememberNextPath`. Always validated, never an external URL. */
export function readNextPath(): string {
  try {
    return safeNextPath(localStorage.getItem(NEXT_KEY));
  } catch {
    return safeNextPath(null);
  }
}

/** Drops the saved destination once it has been used, so a later sign-in doesn't inherit it. */
export function forgetNextPath() {
  try {
    localStorage.removeItem(NEXT_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Public Supabase settings: tells us which OAuth providers are switched on, so a disabled one never reaches the provider. */
export async function fetchEnabledProviders(): Promise<EnabledProviders | null> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;
  try {
    const res = await fetch(`${env.supabaseUrl}/auth/v1/settings`, { headers: { apikey: env.supabaseAnonKey } });
    if (!res.ok) return null;
    const body = (await res.json()) as { external?: Record<string, boolean> };
    return Object.fromEntries(OAUTH_PROVIDERS.map((p) => [p, Boolean(body.external?.[p])]));
  } catch {
    return null;
  }
}

async function assertEnabled(provider: OAuthProvider) {
  const enabled = await fetchEnabledProviders();
  if (enabled && enabled[provider] === false) throw new AppError(t('auth.err.providerDisabled', { provider: providerName(provider) }));
}

const PROVIDER_OPTIONS: Record<OAuthProvider, { scopes?: string; queryParams?: Record<string, string> }> = {
  google: { queryParams: { prompt: 'select_account' } },
  github: { scopes: 'read:user user:email' },
};

const isDisabledError = (message: string) => /not enabled|unsupported provider/i.test(message);

export async function signInWithProvider(provider: OAuthProvider, next = '/games') {
  await assertEnabled(provider);
  rememberNextPath(next);
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: authCallbackUrl(), ...PROVIDER_OPTIONS[provider] },
  });
  if (error) {
    const name = providerName(provider);
    throw new AppError(isDisabledError(error.message) ? t('auth.err.providerDisabled', { provider: name }) : t('auth.err.provider', { provider: name }), error);
  }
}

export async function signInWithMagicLink(email: string, next = '/games') {
  rememberNextPath(next);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: authCallbackUrl(), shouldCreateUser: true },
  });
  if (error) {
    const rate = /rate|too many/i.test(error.message);
    throw new AppError(rate ? t('auth.err.rate') : t('auth.err.magic'), error);
  }
}

/** Links another provider to the signed-in account (requires manual linking enabled in Supabase Auth). */
export async function linkProviderIdentity(provider: OAuthProvider) {
  await assertEnabled(provider);
  rememberNextPath('/profile');
  const { error } = await supabase.auth.linkIdentity({ provider, options: { redirectTo: authCallbackUrl(), ...PROVIDER_OPTIONS[provider] } });
  if (error) throw new AppError(t('auth.err.linkProvider', { provider: providerName(provider) }), error);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new AppError(t('auth.err.signOut'), error);
}
