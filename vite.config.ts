import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// The app is served from https://jgabrielmaia.com/table-tale, so every asset is prefixed with /table-tale/.
export default defineConfig({
  base: '/table-tale/',
  plugins: [react(), tailwindcss()],
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
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
