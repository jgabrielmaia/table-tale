import { describe, expect, it } from 'vitest';
import { callbackErrorKey, isOAuthProvider, providerName, readCallbackError } from './providers';
import { safeNextPath } from './api';

describe('callback errors', () => {
  it('maps denial, expiry, existing accounts and unverified emails to dedicated messages', () => {
    expect(callbackErrorKey('access_denied', 'The user denied access')).toBe('auth.cb.denied');
    expect(callbackErrorKey('bad_oauth_state', null)).toBe('auth.cb.expired');
    expect(callbackErrorKey('flow_state_expired', null)).toBe('auth.cb.expired');
    expect(callbackErrorKey('identity_already_exists', null)).toBe('auth.cb.exists');
    expect(callbackErrorKey('provider_email_needs_verification', null)).toBe('auth.cb.emailVerify');
    expect(callbackErrorKey('server_error', 'Error getting user email from external provider')).toBe('auth.cb.noEmail');
  });

  it('reports a disabled provider and falls back to a generic message', () => {
    expect(callbackErrorKey('validation_failed', 'Unsupported provider: provider is not enabled')).toBe('auth.cb.providerDisabled');
    expect(callbackErrorKey(null, 'something odd')).toBe('auth.cb.generic');
  });

  it('reads the error from the query string or the URL fragment', () => {
    expect(readCallbackError('?error=access_denied&error_description=nope', '')).toEqual({ code: 'access_denied', description: 'nope' });
    expect(readCallbackError('', '#error=server_error&error_code=bad_oauth_callback&error_description=x')).toEqual({ code: 'bad_oauth_callback', description: 'x' });
    expect(readCallbackError('?next=%2Flibrary', '')).toBeNull();
  });
});

describe('providers', () => {
  it('knows the three supported identifiers', () => {
    expect(['google', 'github'].every(isOAuthProvider)).toBe(true);
    expect(isOAuthProvider('facebook')).toBe(false);
    expect(isOAuthProvider('twitter')).toBe(false);
    expect(providerName('github')).toBe('GitHub');
  });
});

describe('post-login destination', () => {
  it('keeps in-app paths and rejects open redirects', () => {
    expect(safeNextPath('/fate')).toBe('/fate');
    expect(safeNextPath('//evil.example')).toBe('/library');
    expect(safeNextPath('https://evil.example')).toBe('/library');
    expect(safeNextPath('/\\evil')).toBe('/library');
    expect(safeNextPath(null)).toBe('/library');
  });
});
