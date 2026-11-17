/**
 * Fills the shared catalogue with the most popular games of a BoardGameGeek dataset, for every community.
 * Service role only: run it by hand, never from the browser.
 *
 *   npm run catalogue:import -- --ratings ratings.csv --details details.csv [--top 500] [--dry-run]
 *
 * The files are the TidyTuesday 2022-01-25 `ratings.csv` and `details.csv` (from the Kaggle "Board Games" dataset,
 * CC BY 4.0, a BoardGameGeek snapshot of February 2021). Only facts are copied: title, players, time, age, year,
 * categories, mechanics and BGG's rank and rating. No descriptions and no pictures.
 * Safe to re-run: games already there (by BGG id or title) are left alone.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { parseCsv, planImport, toCatalogueGame, toRecords } from './catalogue-import-lib';

const args = process.argv.slice(2);
const arg = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const dryRun = args.includes('--dry-run');
const top = Number(arg('--top') ?? 500);
const ratingsFile = arg('--ratings');
const detailsFile = arg('--details');

// The app loads the whole catalogue in one query and the API returns at most 1000 rows.
const APP_LIMIT = 1000;

if (!ratingsFile || !detailsFile || !Number.isInteger(top) || top < 1) {
  console.error('Uso: npm run catalogue:import -- --ratings ratings.csv --details details.csv [--top 500] [--dry-run]');
  process.exit(1);
}
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltam variáveis: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ver .env.example).');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const details = new Map(toRecords(parseCsv(readFileSync(detailsFile!, 'utf8'))).map((d) => [d.id, d]));
  const games = toRecords(parseCsv(readFileSync(ratingsFile!, 'utf8')))
    .map((r) => toCatalogueGame(r, details.get(r.id ?? '')))
    .filter((g): g is NonNullable<typeof g> => g !== null)
    .sort((a, b) => a.bgg_rank - b.bgg_rank)
    .slice(0, top);

  const { data: existing, error } = await db.from('games').select('bgg_id,title,slug').limit(10000);
  if (error) throw new Error(`games: ${error.message}`);
  const plan = planImport(games, existing ?? []);
  const total = (existing?.length ?? 0) + plan.add.length;
  console.log(`${games.length} jogos do dataset (top ${top}); já cá: ${plan.haveBggId} pelo id do BGG, ${plan.sameTitle.length} com o mesmo título; a juntar: ${plan.add.length}.`);
  if (plan.sameTitle.length) console.log(`  mesmo título, ficam como estão: ${plan.sameTitle.slice(0, 10).join(', ')}${plan.sameTitle.length > 10 ? '…' : ''}`);
  if (total > APP_LIMIT) {
    console.error(`O catálogo ficaria com ${total} jogos; a app carrega-o numa só consulta (máximo ${APP_LIMIT}). Usa um --top mais baixo.`);
    process.exit(1);
  }
  if (dryRun) { console.log('[dry-run] nada foi escrito.'); return; }

  for (let i = 0; i < plan.add.length; i += 200) {
    const batch = plan.add.slice(i, i + 200);
    const { error: e } = await db.from('games').insert(batch);
    if (e) throw new Error(`insert (${i}): ${e.message}`);
    console.log(`✓ ${Math.min(i + 200, plan.add.length)}/${plan.add.length}`);
  }
  console.log(`Feito: ${plan.add.length} jogos juntos; catálogo com ${total}.`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
