import { createClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from './env';

// Placeholders keep the client constructible when env vars are missing; the UI shows a configuration banner instead.
export const supabase = createClient(
  env.supabaseUrl || 'http://localhost:54321',
  env.supabaseAnonKey || 'missing-anon-key',
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'table-tale-auth',
    },
  },
);

export { isSupabaseConfigured };
