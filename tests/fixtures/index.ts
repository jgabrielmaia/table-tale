import { test as base, expect } from '@playwright/test';
import { AUTH_STORAGE_KEY } from '../utils/constants';
import { FakeBackend } from '../utils/fakeBackend';
import { PLAYER } from '../data/seed';

interface SignInOptions {
  /** Seconds until the seeded access token expires (negative = already expired). */
  expiresIn?: number;
}

interface Fixtures {
  /** Per-test fake Supabase. Installed automatically, so no test can reach a real backend. */
  backend: FakeBackend;
  /** Starts the next navigation already signed in as the test player. */
  signIn: (options?: SignInOptions) => Promise<void>;
}

export const test = base.extend<Fixtures>({
  backend: [
    async ({ context }, use) => {
      const backend = new FakeBackend();
      await backend.install(context);
      await use(backend);
    },
    { auto: true },
  ],

  signIn: async ({ context, backend }, use) => {
    await use(async (options = {}) => {
      const session = backend.sessionFor(PLAYER.id, options.expiresIn ?? 3600);
      // Seeds once per tab: reloads keep the session, and signing out is not undone by the next navigation.
      await context.addInitScript(
        ({ key, value }) => {
          if (sessionStorage.getItem('e2e-seeded')) return;
          sessionStorage.setItem('e2e-seeded', '1');
          localStorage.setItem(key, JSON.stringify(value));
        },
        { key: AUTH_STORAGE_KEY, value: session },
      );
    });
  },
});

export { expect };
export { PLAYER };
