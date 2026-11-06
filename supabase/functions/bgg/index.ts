// Supabase Edge Function `bgg`: search BoardGameGeek and import games into the catalogue.
// Secrets (never in the browser or the repository): BGG_API_TOKEN. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by Supabase.
// See docs/bgg-integration.md.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createBggClient } from '../_shared/bggClient.ts';
import { handleBgg, type GameRecord, type GameStore } from '../_shared/bggHandler.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const token = Deno.env.get('BGG_API_TOKEN');
const client = token ? createBggClient({ token }) : null;

const fail = (what: string, error: { message: string } | null) => {
  throw new Error(`${what}: ${error?.message ?? 'no data'}`);
};

const store: GameStore = {
  async findByBggIds(ids) {
    if (!ids.length) return [];
    const { data, error } = await admin.from('games').select('bgg_id,slug').in('bgg_id', ids);
    if (error) fail('findByBggIds', error);
    return (data ?? []) as { bgg_id: number; slug: string }[];
  },
  async findByBggId(id) {
    const { data, error } = await admin.from('games').select('*').eq('bgg_id', id).maybeSingle();
    if (error) fail('findByBggId', error);
    return (data as GameRecord | null) ?? null;
  },
  async slugTaken(slug) {
    const { data, error } = await admin.from('games').select('id').eq('slug', slug).maybeSingle();
    if (error) fail('slugTaken', error);
    return Boolean(data);
  },
  async insert(row) {
    const { data, error } = await admin.from('games').insert(row).select('*').single();
    if (error || !data) fail('insert', error);
    return data as GameRecord;
  },
  async update(id, row) {
    const { data, error } = await admin.from('games').update(row).eq('id', id).select('*').single();
    if (error || !data) fail('update', error);
    return data as GameRecord;
  },
};

async function authenticate(req: Request) {
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  // The anon key is a valid JWT too, but it has no user: getUser rejects it, so only signed-in users get through.
  const { data, error } = await admin.auth.getUser(jwt);
  return error || !data.user ? null : { id: data.user.id };
}

Deno.serve((req) => handleBgg(req, { client, store, authenticate }));
