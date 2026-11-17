/**
 * Copies openly licensed game covers from Wikimedia Commons into our storage and credits them (issue #68).
 * Uses the service role key — run it locally or in CI, never in the browser. Safe to re-run.
 *
 *   npm run covers              # copy the covers listed in seed-data (openCover)
 *   npm run covers -- --dry-run # only show what would change
 *
 * For each seed game with `openCover`, it fetches the file's licence and author from Commons (open licences only),
 * downloads a ~1200 px copy, uploads it to `game-covers/catalogue/<slug>.<ext>` and sets cover_url, cover_credit and
 * cover_credit_url. Seed games without an open cover whose cover_url still points at a store website (blocked by the
 * site's CSP, and not ours to reuse) get cover_url cleared, so the illustrated cover shows without a failed request.
 * Covers someone uploaded in the app (a game's owner, under their own folder) are never replaced, and a cover already at
 * the current Commons version is skipped.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { games } from './seed-data';
import { isCatalogueCover, isOwnCover, toOpenCover, type CommonsImageInfo } from './open-covers-lib';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const BUCKET = 'game-covers';
// Wikimedia asks automated clients to identify themselves.
const USER_AGENT = 'TableTaleCovers/1.0 (https://github.com/jgabrielmaia/table-tale)';
const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltam variáveis: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ver .env.example).');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function commonsInfo(file: string): Promise<CommonsImageInfo> {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', titles: file, prop: 'imageinfo', iiprop: 'url|extmetadata|sha1', iiurlwidth: '1200',
  }).toString();
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Commons respondeu ${res.status}`);
  const body = (await res.json()) as { query?: { pages?: { missing?: boolean; imageinfo?: CommonsImageInfo[] }[] } };
  const info = body.query?.pages?.[0]?.imageinfo?.[0];
  if (!info) throw new Error(`${file} não existe no Commons`);
  return info;
}

async function main() {
  const { data: rows, error } = await db.from('games').select('slug,cover_url').in('slug', games.map((g) => g.slug));
  if (error) throw new Error(`games: ${error.message}`);
  const current = new Map((rows ?? []).map((r) => [r.slug as string, r.cover_url as string | null]));
  let copied = 0, cleared = 0, failed = 0;

  for (const g of games) {
    if (!current.has(g.slug)) {
      console.log(`- ${g.slug}: não está no catálogo (corre primeiro npm run seed)`);
      continue;
    }
    const coverUrl = current.get(g.slug) ?? null;

    if (!g.openCover) {
      if (coverUrl && !isOwnCover(coverUrl, SUPABASE_URL!)) {
        console.log(`~ ${g.slug}: sem imagem aberta; limpa a capa de loja ${new URL(coverUrl).hostname}`);
        if (!DRY_RUN) {
          const { error: e } = await db.from('games').update({ cover_url: null, cover_credit: null, cover_credit_url: null }).eq('slug', g.slug);
          if (e) throw new Error(`${g.slug}: ${e.message}`);
        }
        cleared += 1;
      }
      continue;
    }

    if (isOwnCover(coverUrl, SUPABASE_URL!) && !isCatalogueCover(coverUrl)) {
      console.log(`- ${g.slug}: tem uma capa enviada na app; fica como está`);
      continue;
    }
    try {
      const cover = toOpenCover(await commonsInfo(g.openCover));
      if ('error' in cover) throw new Error(cover.error);
      if (isCatalogueCover(coverUrl) && coverUrl!.endsWith(`?v=${cover.version}`)) {
        console.log(`= ${g.slug}: já tem a versão atual`);
        continue;
      }
      console.log(`✓ ${g.slug}: ${g.openCover} — ${cover.credit}`);
      if (DRY_RUN) { copied += 1; continue; }

      const image = await fetch(cover.downloadUrl, { headers: { 'User-Agent': USER_AGENT } });
      if (!image.ok) throw new Error(`download ${image.status}`);
      const type = (image.headers.get('content-type') ?? '').split(';')[0]!.trim();
      const ext = EXTENSIONS[type];
      if (!ext) throw new Error(`tipo de imagem inesperado: ${type || 'desconhecido'}`);
      const bytes = new Uint8Array(await image.arrayBuffer());
      const path = `catalogue/${g.slug}.${ext}`;
      const { error: upErr } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: type, upsert: true });
      if (upErr) throw new Error(`upload: ${upErr.message}`);
      // A version marker, so browsers and the CDN pick up a replaced file under the same path.
      const publicUrl = `${db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}?v=${cover.version}`;
      const { error: e } = await db.from('games')
        .update({ cover_url: publicUrl, cover_credit: cover.credit, cover_credit_url: cover.sourceUrl })
        .eq('slug', g.slug);
      if (e) throw new Error(e.message);
      copied += 1;
    } catch (e) {
      failed += 1;
      console.error(`✗ ${g.slug}: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(`${DRY_RUN ? '[dry-run] ' : ''}${copied} capas abertas, ${cleared} capas de loja limpas, ${failed} falhas`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
