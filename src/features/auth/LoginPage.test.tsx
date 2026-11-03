import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const signInWithOAuth = vi.fn();
const settings = vi.hoisted(() => ({ external: { google: true, github: true, facebook: true } as Record<string, boolean> }));

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { auth: { signInWithOAuth: (...a: unknown[]) => signInWithOAuth(...a), linkIdentity: vi.fn() } },
}));
vi.mock('@/lib/env', () => ({
  env: { supabaseUrl: 'https://project.supabase.co', supabaseAnonKey: 'anon', siteUrl: 'http://localhost:5173/table-tale' },
  isSupabaseConfigured: true,
  authCallbackUrl: (next = '/library') => `http://localhost:5173/table-tale/auth/callback?next=${encodeURIComponent(next)}`,
  basePath: '/',
}));

import { I18nProvider } from '@/i18n';
import { applyLang } from '@/i18n/core';
import { AuthContext, type AuthContextValue } from './AuthProvider';
import { LoginPage } from './LoginPage';
import * as api from './api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const auth = (over: Partial<AuthContextValue> = {}): AuthContextValue => ({
  session: null,
  user: null,
  isLoading: false,
  providers: [],
  signInWithProvider: (p, next) => api.signInWithProvider(p, next),
  signInWithMagicLink: vi.fn(),
  linkProvider: vi.fn(),
  signOut: vi.fn(),
  ...over,
});

const renderLogin = (mode: 'login' | 'register' = 'login') =>
  render(
    <I18nProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <AuthContext.Provider value={auth()}>
          <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/fate' } }]}>
            <LoginPage mode={mode} />
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    </I18nProvider>,
  );

beforeEach(() => {
  signInWithOAuth.mockReset().mockResolvedValue({ error: null });
  settings.external = { google: true, github: true, facebook: true };
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ external: settings.external }) })));
});
afterEach(() => {
  vi.unstubAllGlobals();
  applyLang('pt');
});

describe('LoginPage providers', () => {
  it('shows Google, GitHub and Facebook on sign-in and registration', async () => {
    const { unmount } = renderLogin();
    for (const name of ['Google', 'GitHub', 'Facebook']) {
      expect(await screen.findByRole('button', { name: `Continuar com ${name}` })).toBeEnabled();
    }
    unmount();
    renderLogin('register');
    expect(await screen.findByRole('heading', { name: 'Cria a tua conta Table Tale' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar com GitHub' })).toBeInTheDocument();
  });

  it('starts OAuth with the right identifier and preserves the destination', async () => {
    renderLogin();
    await userEvent.click(await screen.findByRole('button', { name: 'Continuar com GitHub' }));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalled());
    const arg = signInWithOAuth.mock.calls[0]?.[0] as { provider: string; options: { redirectTo: string } };
    expect(arg.provider).toBe('github');
    expect(arg.options.redirectTo).toContain('next=%2Ffate');
  });

  it('never redirects to a provider that is switched off and says so in the user language', async () => {
    settings.external = { google: false, github: true, facebook: true };
    renderLogin();
    const google = await screen.findByRole('button', { name: /Continuar com Google/ });
    await waitFor(() => expect(google).toBeDisabled());
    expect(screen.getByText(/indisponível de momento/)).toBeInTheDocument();
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it('explains a disabled provider when the settings could not be read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    applyLang('en');
    renderLogin();
    signInWithOAuth.mockResolvedValue({ error: { message: 'Unsupported provider: provider is not enabled' } });
    await userEvent.click(await screen.findByRole('button', { name: 'Continue with Facebook' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Facebook is not enabled in this application yet.');
  });
});
