/**
 * Pure helpers for scripts/catalogue-import.ts: reading the BoardGameGeek dataset (the TidyTuesday 2022-01-25 files,
 * made from the Kaggle "Board Games" dataset, CC BY 4.0) and turning its rows into catalogue games.
 */

/** Reads CSV text (quoted fields, doubled quotes, line breaks inside quotes) into rows of fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Rows as objects keyed by the header line. */
export function toRecords(rows: string[][]): Record<string, string>[] {
  const [header = [], ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };
/** The dataset keeps HTML entities in names ("Children&#039;s Game"). */
export function decodeEntities(s: string): string {
  return s.replace(/&#(\d+);|&#x([0-9a-f]+);|&([a-z]+);/gi, (m, dec, hex, name) =>
    dec ? String.fromCodePoint(Number(dec)) : hex ? String.fromCodePoint(parseInt(hex, 16)) : ENTITIES[String(name).toLowerCase()] ?? m);
}

/** A Python-style list ("['Economic', \"Children's Game\"]") as its strings. */
export function parseList(value: string): string[] {
  const out: string[] = [];
  for (const m of value.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)) out.push(decodeEntities((m[1] ?? m[2] ?? '').replace(/\\(.)/g, '$1')).trim());
  return out;
}

/** The labels the games table accepts: 1 to 60 characters, up to 30, no repeats. */
export function cleanLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of labels) {
    const label = l.trim();
    if (!label || label.length > 60 || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    out.push(label);
    if (out.length === 30) break;
  }
  return out;
}

const positive = (v: string) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** The same spelling rules as the app: no accents, lower case, words joined by dashes. */
export const slugify = (title: string) =>
  title.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '');
export const titleKey = (title: string) => title.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

export interface CatalogueGame {
  bgg_id: number;
  title: string;
  slug: string;
  description: '';
  min_players: number | null;
  max_players: number | null;
  duration_minutes: number | null;
  min_age: number | null;
  categories: string[];
  mechanics: string[];
  year_published: number | null;
  bgg_rating: number | null;
  bgg_rating_count: number | null;
  bgg_rank: number;
}

/**
 * One game from a `ratings.csv` row and its `details.csv` row. Zero means "unknown" in the dataset, so it becomes null.
 * No description and no picture: both belong to BoardGameGeek and the publishers.
 */
export function toCatalogueGame(rating: Record<string, string>, details: Record<string, string> | undefined): Omit<CatalogueGame, 'slug'> | null {
  const bggId = positive(rating.id ?? '');
  const rank = positive(rating.rank ?? '');
  const title = decodeEntities(rating.name ?? '').trim();
  if (!bggId || !rank || !title || title.length > 80 || !slugify(title)) return null;
  let min = positive(details?.minplayers ?? '');
  let max = positive(details?.maxplayers ?? '');
  if (min && min > 99) min = null;
  if (max && max > 99) max = null;
  if (min && max && max < min) max = min;
  const avg = Number(rating.average);
  const year = Number(rating.year);
  const duration = positive(details?.playingtime ?? '');
  const age = positive(details?.minage ?? '');
  return {
    bgg_id: bggId,
    title,
    description: '',
    min_players: min,
    max_players: max,
    duration_minutes: duration && duration <= 1440 ? duration : null,
    min_age: age && age <= 21 ? age : null,
    categories: cleanLabels(parseList(details?.boardgamecategory ?? '')),
    mechanics: cleanLabels(parseList(details?.boardgamemechanic ?? '')),
    year_published: Number.isInteger(year) && year > 1000 && year <= 2100 ? year : null,
    bgg_rating: Number.isFinite(avg) && avg > 0 && avg <= 10 ? Math.round(avg * 100) / 100 : null,
    bgg_rating_count: positive(rating.users_rated ?? ''),
    bgg_rank: rank,
  };
}

export interface ImportPlan {
  add: CatalogueGame[];
  /** Already in the catalogue under the same BGG id. */
  haveBggId: number;
  /** A game with the same title is there already (added by hand or seeded): left as it is. */
  sameTitle: string[];
}

/**
 * Which of the dataset's games to add: not the ones already there by BGG id, and not a title someone already has.
 * A slug that is taken gets the year, then the BGG id, so links stay readable and unique.
 */
export function planImport(
  games: Omit<CatalogueGame, 'slug'>[],
  existing: { bgg_id: number | null; title: string; slug: string }[],
): ImportPlan {
  const ids = new Set(existing.map((e) => e.bgg_id).filter((n): n is number => n !== null));
  const titles = new Set(existing.map((e) => titleKey(e.title)));
  const slugs = new Set(existing.map((e) => e.slug));
  const plan: ImportPlan = { add: [], haveBggId: 0, sameTitle: [] };
  for (const g of games) {
    if (ids.has(g.bgg_id)) { plan.haveBggId++; continue; }
    if (titles.has(titleKey(g.title))) { plan.sameTitle.push(g.title); continue; }
    const base = slugify(g.title);
    const slug = [base, g.year_published ? `${base}-${g.year_published}` : null, `${base}-${g.bgg_id}`].filter((s): s is string => Boolean(s)).find((s) => !slugs.has(s))!;
    slugs.add(slug);
    titles.add(titleKey(g.title));
    ids.add(g.bgg_id);
    plan.add.push({ ...g, slug });
  }
  return plan;
}
