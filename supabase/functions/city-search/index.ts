// Supabase Edge Function `city-search`: city autocomplete for the community form, backed by API Ninjas' City API.
// Secrets (never in the browser or the repository): API_NINJAS_KEY, optional API_NINJAS_LIMIT (premium plans only).
// SUPABASE_URL and SUPABASE_ANON_KEY are injected by Supabase. See docs/city-search.md.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleCitySearch } from '../_shared/cityHandler.ts';

const auth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const limit = Number(Deno.env.get('API_NINJAS_LIMIT'));

async function authenticate(req: Request) {
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  // The anon key is a valid JWT too, but it has no user: getUser rejects it, so only signed-in users get through.
  const { data, error } = await auth.auth.getUser(jwt);
  return error || !data.user ? null : { id: data.user.id };
}

Deno.serve((req) =>
  handleCitySearch(req, {
    apiKey: Deno.env.get('API_NINJAS_KEY'),
    authenticate,
    limit: Number.isFinite(limit) && limit > 1 ? limit : undefined,
  }),
);
