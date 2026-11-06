/// <reference types="vite/client" />

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
