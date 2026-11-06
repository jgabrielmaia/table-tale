import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveLocalBypass } from './localBypass';

const enable = () => {
  vi.stubEnv('VITE_LOCAL_AUTH_BYPASS', 'true');
  vi.stubEnv('VITE_LOCAL_AUTH_BYPASS_EMAIL', 'dev@example.com');
  vi.stubEnv('VITE_LOCAL_AUTH_BYPASS_PASSWORD', 'pw');
};

afterEach(() => vi.unstubAllEnvs());

describe('resolveLocalBypass', () => {
  it('is enabled on localhost in dev when configured', () => {
    enable();
    expect(resolveLocalBypass('localhost')).toEqual({ email: 'dev@example.com', password: 'pw' });
  });
  it('is disabled for non-local hosts even when the flag is on', () => {
    enable();
    expect(resolveLocalBypass('jgabrielmaia.com')).toBeNull();
    expect(resolveLocalBypass('localhost.evil.com')).toBeNull();
  });
  it('is disabled when the flag is off or credentials are missing', () => {
    enable();
    vi.stubEnv('VITE_LOCAL_AUTH_BYPASS', 'false');
    expect(resolveLocalBypass('localhost')).toBeNull();
    enable();
    vi.stubEnv('VITE_LOCAL_AUTH_BYPASS_PASSWORD', '');
    expect(resolveLocalBypass('localhost')).toBeNull();
  });
  it('is disabled outside dev builds', () => {
    enable();
    vi.stubEnv('DEV', false);
    expect(resolveLocalBypass('localhost')).toBeNull();
  });
});
