import type { MessageKey } from '@/i18n';

export const OAUTH_PROVIDERS = ['google', 'github', 'facebook'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

/** Brand names are not translated. */
export const PROVIDER_NAMES: Record<OAuthProvider, string> = { google: 'Google', github: 'GitHub', facebook: 'Facebook' };

export const isOAuthProvider = (value: string): value is OAuthProvider => (OAUTH_PROVIDERS as readonly string[]).includes(value);
export const providerName = (id: string) => (isOAuthProvider(id) ? PROVIDER_NAMES[id] : id);

/** Which providers the Supabase project has switched on (Authentication > Providers). */
export type EnabledProviders = Partial<Record<OAuthProvider, boolean>>;

/** Turns an OAuth callback error into a localized message key (raw provider text is never shown). */
export function callbackErrorKey(code: string | null, description: string | null): MessageKey {
  const text = description ?? '';
  switch (code) {
    case 'access_denied':
      return 'auth.cb.denied';
    case 'identity_already_exists':
    case 'user_already_exists':
    case 'email_exists':
      return 'auth.cb.exists';
    case 'provider_email_needs_verification':
      return 'auth.cb.emailVerify';
    case 'bad_oauth_state':
    case 'bad_oauth_callback':
    case 'flow_state_expired':
    case 'flow_state_not_found':
    case 'otp_expired':
      return 'auth.cb.expired';
    case 'validation_failed':
      return /not enabled|unsupported provider/i.test(text) ? 'auth.cb.providerDisabled' : 'auth.cb.generic';
  }
  if (/error getting user email/i.test(text)) return 'auth.cb.noEmail';
  if (/expired/i.test(text)) return 'auth.cb.expired';
  if (/denied|cancel/i.test(text)) return 'auth.cb.denied';
  if (/not enabled|unsupported provider/i.test(text)) return 'auth.cb.providerDisabled';
  return 'auth.cb.generic';
}

/** Reads `error`, `error_code` and `error_description` from the query string or the URL fragment. */
export function readCallbackError(search: string, hash: string): { code: string | null; description: string | null } | null {
  const q = new URLSearchParams(search);
  const h = new URLSearchParams(hash.replace(/^#/, ''));
  const error = q.get('error') ?? h.get('error');
  const description = q.get('error_description') ?? h.get('error_description');
  if (!error && !description) return null;
  return { code: q.get('error_code') ?? h.get('error_code') ?? error, description };
}
