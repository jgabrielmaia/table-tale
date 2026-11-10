/// <reference types="vite/client" />

/** Release tag baked in at build time (see vite.config.ts). */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_LOCAL_AUTH_BYPASS?: string;
  readonly VITE_LOCAL_AUTH_BYPASS_EMAIL?: string;
  readonly VITE_LOCAL_AUTH_BYPASS_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
