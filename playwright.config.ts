import { defineConfig, devices } from '@playwright/test';
import { FAKE_SUPABASE_URL } from './tests/utils/constants';

const PORT = Number(process.env.E2E_PORT ?? 5183);
const BASE_PATH = '/table-tale';
const isCI = Boolean(process.env.CI);
// Playwright's WebKit build for Windows needs system libraries (libEGL) that many hosts lack; opt in with E2E_WEBKIT=1.
const webkitEnabled = process.env.E2E_WEBKIT ? process.env.E2E_WEBKIT === '1' : process.platform !== 'win32';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : '50%',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    // Trailing slash matters: relative goto('library') resolves under /table-tale/.
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}${BASE_PATH}/`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
    // Shortens the Fate Draw reveal and removes motion flakiness; the animation itself is not what is under test.
    reducedMotion: 'reduce',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    ...(webkitEnabled ? [{ name: 'webkit', use: { ...devices['Desktop Safari'] } }] : []),
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] }, grep: /@responsive|@smoke/ },
  ],
  // Dedicated server on its own port with a fake Supabase URL: the suite can never touch the real project.
  // Default: production build served by `vite preview` (what users get, and no dev-only re-optimisation reloads).
  // E2E_DEV=1 serves the dev server instead, for quicker iteration on app code.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: process.env.E2E_DEV
          ? `npx vite --port ${PORT} --strictPort`
          : `npx vite build --outDir dist-e2e/table-tale --emptyOutDir && npx vite preview --outDir dist-e2e/table-tale --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}${BASE_PATH}/`,
        reuseExistingServer: !isCI,
        timeout: 240_000,
        env: {
          VITE_SUPABASE_URL: FAKE_SUPABASE_URL,
          VITE_SUPABASE_ANON_KEY: 'e2e-anon-key',
          // The e2e suite covers BGG import, so the flag is on here (production keeps it off until the token exists).
          VITE_FEATURE_BGG: process.env.VITE_FEATURE_BGG ?? 'true',
          VITE_SITE_URL: `http://localhost:${PORT}${BASE_PATH}`,
        },
      },
});
