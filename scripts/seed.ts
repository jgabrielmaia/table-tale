/**
 * Seed repetível (idempotente) da Table Tale.
 * Usa a service role key — corre apenas localmente ou em CI, nunca no browser.
 *
 *   npm run seed
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { coverSvg } from '../src/lib/cover';
import * as data from './seed-data';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = process.env.OWNER_EMAIL?.trim().toLowerCase();

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !OWNER_EMAIL) {
  console.error('Faltam variáveis: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e OWNER_EMAIL (ver .env.example).');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

function check<T>(label: string, result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function main() {
  // Facções
  const factionRows = check(
    'factions',
    await db.from('factions').upsert(data.factions, { onConflict: 'slug' }).select('id, slug'),
  ) as { id: string; slug: string }[];
  const factionId = (slug: string) => factionRows.find((f) => f.slug === slug)?.id ?? null;
  console.log(`✓ ${factionRows.length} facções`);

  // Arcanos e Elementais (expressões de cada facção)
  check('arcanas', await db.from('arcanas').upsert(
    data.arcanas.map((a) => ({ ...a, faction_id: factionId('arcanos') })), { onConflict: 'slug' },
  ));
  check('elementals', await db.from('elementals').upsert(
    data.elementals.map((e) => ({ ...e, faction_id: factionId('elementais') })), { onConflict: 'slug' },
  ));
  console.log(`✓ ${data.arcanas.length} Arcanos, ${data.elementals.length} Elementais`);

  // Capas no Supabase Storage + jogos
  const games = [];
  for (const g of data.games) {
    const svg = coverSvg({ slug: g.slug, title: g.title, tone: g.cover.tone, symbol: g.cover.symbol });
    const path = `${g.slug}.svg`;
    check(`cover ${g.slug}`, await db.storage.from('game-covers').upload(path, new Blob([svg], { type: 'image/svg+xml' }), {
      upsert: true,
      contentType: 'image/svg+xml',
      cacheControl: '86400',
    }));
    const { data: pub } = db.storage.from('game-covers').getPublicUrl(path);
    const { cover: _cover, copies: _copies, ...row } = g;
    games.push({ ...row, cover_url: pub.publicUrl });
  }
  check('games', await db.from('games').upsert(games, { onConflict: 'slug' }));
  console.log(`✓ ${games.length} jogos (com capas no storage)`);

  check('achievements', await db.from('achievements').upsert(data.achievements, { onConflict: 'slug' }));
  check('events', await db.from('events').upsert(data.events, { onConflict: 'slug' }));
  console.log(`✓ ${data.achievements.length} conquistas, ${data.events.length} eventos`);

  // Inventário do dono (aplicado quando a conta existir)
  check('owner_inventory', await db.from('owner_inventory').upsert(
    data.games.map((g) => ({ game_slug: g.slug, copies: g.copies, condition: data.ownerSetup.condition })),
    { onConflict: 'game_slug' },
  ));
  check('app_config', await db.from('app_config').upsert([
    { key: 'owner_email', value: OWNER_EMAIL },
    { key: 'owner_faction_slug', value: data.ownerSetup.factionSlug },
    { key: 'owner_base_xp', value: String(data.ownerSetup.baseExperiencePoints) },
  ], { onConflict: 'key' }));

  // Se o dono já fez login, associa já os jogos; caso contrário, o trigger fá-lo no primeiro login.
  const owner = check('owner lookup', await db.from('profiles').select('id').ilike('email', OWNER_EMAIL!).maybeSingle()) as
    | { id: string }
    | null;
  if (owner) {
    check('claim_owner', await db.rpc('claim_owner', { p_user: owner.id }));
    console.log('✓ Jogos associados ao perfil do dono');
  } else {
    console.log('… O dono ainda não fez login; os jogos serão associados automaticamente no primeiro login.');
  }
  console.log('Seed concluído.');
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
