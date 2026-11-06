/**
 * Cria uma comunidade de teste (idempotente) cujo dono é um perfil existente.
 * Usa a service role key: corre só localmente. Requer as migrações de comunidades já aplicadas.
 *
 *   npm run seed:communities            # dono: perfil "Huras"
 *   npm run seed:communities -- "Nome"  # dono: outro perfil (display_name)
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ver .env.example).');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const ownerName = process.argv[2] ?? 'Huras';
const slug = 'huras-board-games';

async function main() {
  const owner = await db.from('profiles').select('id,display_name').ilike('display_name', ownerName).maybeSingle();
  if (owner.error) throw new Error(owner.error.message);
  if (!owner.data) throw new Error(`Perfil "${ownerName}" não encontrado.`);

  const existing = await db.from('communities').select('id').eq('slug', slug).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) {
    console.log(`Comunidade "${slug}" já existe.`);
    return;
  }

  // O trigger tg_community_creator_is_owner cria a ligação de dono.
  const created = await db
    .from('communities')
    .insert({
      slug,
      name: 'Huras Board Games',
      description: 'Comunidade de teste, gerida pelo Huras.',
      visibility: 'public',
      city: 'Porto',
      district: 'Boavista',
      country: 'Portugal',
      latitude: 41.158,
      longitude: -8.629,
      created_by: owner.data.id,
    })
    .select('id')
    .single();
  if (created.error) throw new Error(created.error.message);
  console.log(`✓ Comunidade "${slug}" criada; dono: ${owner.data.display_name}.`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
