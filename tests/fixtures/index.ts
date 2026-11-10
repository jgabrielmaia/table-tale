import { test as base, expect } from '@playwright/test';
import { AUTH_STORAGE_KEY } from '../utils/constants';
import { FakeBackend } from '../utils/fakeBackend';
import { PLACES, PLAYER } from '../data/seed';

interface SignInOptions {
  /** Seconds until the seeded access token expires (negative = already expired). */
  expiresIn?: number;
}

type Place = keyof typeof PLACES;

interface Fixtures {
  /** Per-test fake Supabase. Installed automatically, so no test can reach a real backend. */
  backend: FakeBackend;
  /** Starts the next navigation already signed in as the test player. */
  signIn: (options?: SignInOptions) => Promise<void>;
  /**
   * Fakes the browser location for the next navigations. Every test starts with the location refused, the same in
   * every browser, so pages never wait on a real permission prompt.
   */
  locateAt: (place: Place) => Promise<void>;
}

export const test = base.extend<Fixtures>({
  backend: [
    async ({ context }, use) => {
      const backend = new FakeBackend();
      await backend.install(context);
      // Deterministic geolocation: refused unless a test stores a position with `locateAt` (read at call time).
      await context.addInitScript(() => {
        const geo = {
          getCurrentPosition(ok: PositionCallback, fail?: PositionErrorCallback | null) {
            const stored = localStorage.getItem('e2e-geo');
            setTimeout(() => {
              if (stored) {
                const { latitude, longitude } = JSON.parse(stored) as { latitude: number; longitude: number };
                ok({ coords: { latitude, longitude, accuracy: 20, altitude: null, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() } as GeolocationPosition);
              } else {
                fail?.({ code: 1, message: 'User denied Geolocation', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
              }
            }, 10);
          },
          watchPosition: () => 0,
          clearWatch: () => undefined,
        };
        Object.defineProperty(navigator, 'geolocation', { configurable: true, get: () => geo });
      });
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

  locateAt: async ({ context }, use) => {
    await use(async (place) => {
      await context.addInitScript((point) => localStorage.setItem('e2e-geo', JSON.stringify(point)), PLACES[place]);
    });
  },
});

export { expect };
export { PLAYER };
