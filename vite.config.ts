import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { execSync } from 'node:child_process';
import pkg from './package.json' with { type: 'json' };

/** The release tag shown under the logo: the nearest tag on this commit's history, else the newest tag, else package.json. */
function appVersion(): string {
  const git = (cmd: string) => {
    try {
      return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().split(/\r?\n/)[0] ?? '';
    } catch {
      return '';
    }
  };
  return git('git describe --tags --abbrev=0') || git('git tag --sort=-v:refname') || `v${pkg.version}`;
}

// The app is served from https://jgabrielmaia.com/table-tale, so every asset is prefixed with /table-tale/.
export default defineConfig({
  base: '/table-tale/',
  plugins: [react(), tailwindcss()],
  define: { __APP_VERSION__: JSON.stringify(appVersion()) },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173 },
  // Output under dist/table-tale so the folder can be uploaded as-is (public_html/table-tale or Vercel "dist").
  build: { outDir: 'dist/table-tale', emptyOutDir: true, sourcemap: false },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/**/*.test.ts'],
  },
});
