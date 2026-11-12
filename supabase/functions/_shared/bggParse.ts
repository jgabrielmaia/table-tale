/**
 * Pure BoardGameGeek XML API2 parsing. No imports and no runtime APIs, so the same file runs in the
 * Supabase Edge Function (Deno) and in vitest (Node).
 *
 * BGG's terms forbid modifying its data: values are kept as returned (decoded from XML, nothing rewritten).
 * The only derived fields are the typed convenience columns built by `toGameColumns`; the full item is kept in `bgg_data`.
 */

// ---- minimal XML reader --------------------------------------------------------------------------------------------

export interface XmlNode {
  tag: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

const codePoint = (n: number, match: string) => (Number.isInteger(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match);

function decodeWith(table: Record<string, string>, value: string): string {
  return value.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body: string) => {
    if (body[1] === 'x' || body[1] === 'X') return codePoint(parseInt(body.slice(2), 16), match);
    if (body.startsWith('#')) return codePoint(parseInt(body.slice(1), 10), match);
    return table[body] ?? match;
  });
}

/** XML entities only (the five predefined ones plus character references). An out-of-range reference is kept as is. */
export const decodeEntities = (value: string) => decodeWith(ENTITIES, value);

// HTML named entities seen in BGG descriptions: Latin-1 (U+00A0 to U+00FF, in order) and common typography.
const LATIN1 =
  'nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest ' +
  'Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig ' +
  'agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml';
const HTML_ENTITIES: Record<string, string> = {
  ...ENTITIES,
  ...Object.fromEntries(LATIN1.split(' ').map((name, i) => [name, String.fromCodePoint(0xa0 + i)])),
  ndash: '\u2013', mdash: '\u2014', lsquo: '\u2018', rsquo: '\u2019', sbquo: '\u201a', ldquo: '\u201c', rdquo: '\u201d', bdquo: '\u201e',
  dagger: '\u2020', Dagger: '\u2021', bull: '\u2022', hellip: '\u2026', permil: '\u2030', prime: '\u2032', Prime: '\u2033',
  lsaquo: '\u2039', rsaquo: '\u203a', euro: '\u20ac', trade: '\u2122', minus: '\u2212', larr: '\u2190', rarr: '\u2192',
  harr: '\u2194', uarr: '\u2191', darr: '\u2193', OElig: '\u0152', oelig: '\u0153', Scaron: '\u0160', scaron: '\u0161',
  Yuml: '\u0178', fnof: '\u0192', circ: '\u02c6', tilde: '\u02dc', ensp: '\u2002', emsp: '\u2003', thinsp: '\u2009',
  zwnj: '\u200c', zwj: '\u200d', lrm: '\u200e', rlm: '\u200f', hearts: '\u2665', spades: '\u2660', clubs: '\u2663', diams: '\u2666',
  star: '\u2606', check: '\u2713',
};

/**
 * BGG escapes descriptions twice: after the XML layer the text still holds HTML references such as `&#10;` (line
 * breaks), `&quot;` or `&mdash;`. This removes that second, HTML layer once, so the text reads as it does on BGG
 * (the words are not changed). Unknown names are kept as is.
 */
export const decodeHtmlEntities = (value: string) => decodeWith(HTML_ENTITIES, value);

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of source.matchAll(/([^\s=/]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[m[1]!] = decodeEntities(m[2] ?? m[3] ?? '');
  return attrs;
}

// comment | CDATA | processing instruction / doctype | closing tag | opening tag | text
const TOKEN =
  /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<\/\s*([^\s>]+)\s*>|<([^\s/>!?]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)/g;

/** Parses a well-formed XML document into a tree (declarations, comments and processing instructions are skipped). */
export function parseXml(xml: string): XmlNode {
  const root: XmlNode = { tag: '#document', attrs: {}, children: [], text: '' };
  const stack: XmlNode[] = [root];
  for (const m of xml.matchAll(TOKEN)) {
    const top = stack[stack.length - 1]!;
    if (m[1] !== undefined) top.text += m[1];
    else if (m[2] !== undefined) {
      if (stack.length > 1 && top.tag === m[2]) stack.pop();
      else throw new Error(`Malformed XML: unexpected </${m[2]}>`);
    } else if (m[3] !== undefined) {
      const node: XmlNode = { tag: m[3], attrs: parseAttrs(m[4] ?? ''), children: [], text: '' };
      top.children.push(node);
      if (m[5] !== '/') stack.push(node);
    } else if (m[6] !== undefined) top.text += decodeEntities(m[6]);
  }
  if (stack.length !== 1) throw new Error('Malformed XML: unclosed element');
  return root;
}

const EMPTY: XmlNode = { tag: '', attrs: {}, children: [], text: '' };
const kids = (n: XmlNode, tag: string) => n.children.filter((c) => c.tag === tag);
const kid = (n: XmlNode, tag: string) => n.children.find((c) => c.tag === tag);
const value = (n: XmlNode | undefined) => n?.attrs.value;

function num(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// ---- BGG shapes ----------------------------------------------------------------------------------------------------

export interface BggSearchResult {
  id: number;
  name: string;
  yearPublished: number | null;
  type: string;
}

export interface BggLink {
  id: number;
  value: string;
}

export interface BggRank {
  id: number;
  name: string;
  friendlyName: string;
  /** "Not Ranked" is kept as returned; a number (as text) otherwise. */
  value: string;
}

/** A BGG `thing` item as returned (zero means "unknown" in BGG's own data and is kept as is in `bgg_data`). */
export interface BggThing {
  id: number;
  type: string;
  name: string;
  alternateNames: string[];
  description: string;
  image: string | null;
  thumbnail: string | null;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  minPlayTime: number | null;
  maxPlayTime: number | null;
  minAge: number | null;
  categories: BggLink[];
  mechanics: BggLink[];
  families: BggLink[];
  designers: BggLink[];
  artists: BggLink[];
  publishers: BggLink[];
  stats: {
    usersRated: number | null;
    average: number | null;
    bayesAverage: number | null;
    averageWeight: number | null;
    numWeights: number | null;
    owned: number | null;
    ranks: BggRank[];
  };
}

const links = (item: XmlNode, type: string): BggLink[] =>
  kids(item, 'link')
    .filter((l) => l.attrs.type === type)
    .map((l) => ({ id: Number(l.attrs.id), value: l.attrs.value ?? '' }));

function itemsOf(xml: string, what: string): XmlNode[] {
  const root = kid(parseXml(xml), 'items');
  if (!root) throw new Error(`Unexpected BGG ${what} response`);
  return kids(root, 'item');
}

const primaryName = (item: XmlNode) => {
  const names = kids(item, 'name');
  return (names.find((n) => n.attrs.type === 'primary') ?? names[0])?.attrs.value ?? '';
};

export function parseSearch(xml: string): BggSearchResult[] {
  return itemsOf(xml, 'search').map((item) => ({
    id: Number(item.attrs.id),
    name: primaryName(item),
    yearPublished: num(value(kid(item, 'yearpublished'))),
    type: item.attrs.type ?? 'boardgame',
  }));
}

export function parseThings(xml: string): BggThing[] {
  return itemsOf(xml, 'thing').map((item): BggThing => {
    const ratings = kid(kid(item, 'statistics') ?? EMPTY, 'ratings') ?? EMPTY;
    const stat = (tag: string) => num(value(kid(ratings, tag)));
    return {
      id: Number(item.attrs.id),
      type: item.attrs.type ?? 'boardgame',
      name: primaryName(item),
      alternateNames: kids(item, 'name').filter((n) => n.attrs.type === 'alternate').map((n) => n.attrs.value ?? ''),
      description: decodeHtmlEntities(kid(item, 'description')?.text ?? '').trim(),
      image: kid(item, 'image')?.text.trim() || null,
      thumbnail: kid(item, 'thumbnail')?.text.trim() || null,
      yearPublished: num(value(kid(item, 'yearpublished'))),
      minPlayers: num(value(kid(item, 'minplayers'))),
      maxPlayers: num(value(kid(item, 'maxplayers'))),
      playingTime: num(value(kid(item, 'playingtime'))),
      minPlayTime: num(value(kid(item, 'minplaytime'))),
      maxPlayTime: num(value(kid(item, 'maxplaytime'))),
      minAge: num(value(kid(item, 'minage'))),
      categories: links(item, 'boardgamecategory'),
      mechanics: links(item, 'boardgamemechanic'),
      families: links(item, 'boardgamefamily'),
      designers: links(item, 'boardgamedesigner'),
      artists: links(item, 'boardgameartist'),
      publishers: links(item, 'boardgamepublisher'),
      stats: {
        usersRated: stat('usersrated'),
        average: stat('average'),
        bayesAverage: stat('bayesaverage'),
        averageWeight: stat('averageweight'),
        numWeights: stat('numweights'),
        owned: stat('owned'),
        ranks: kids(kid(ratings, 'ranks') ?? EMPTY, 'rank').map((r) => ({
          id: Number(r.attrs.id),
          name: r.attrs.name ?? '',
          friendlyName: r.attrs.friendlyname ?? '',
          value: r.attrs.value ?? '',
        })),
      },
    };
  });
}

// ---- mapping to the `games` table ---------------------------------------------------------------------------------

export function slugify(title: string, bggId: number): string {
  const slug = title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `bgg-${bggId}`;
}

/** BGG uses 0 for "unknown"; the typed columns hold null instead. The raw values stay in `bgg_data`. */
const positive = (n: number | null) => (n !== null && n > 0 ? n : null);

export interface GameColumns {
  title: string;
  description: string;
  cover_url: string | null;
  min_players: number | null;
  max_players: number | null;
  duration_minutes: number | null;
  bgg_id: number;
  bgg_data: BggThing;
  bgg_synced_at: string;
  categories: string[];
  mechanics: string[];
  year_published: number | null;
  min_age: number | null;
  bgg_rating: number | null;
  bgg_rating_count: number | null;
  bgg_rank: number | null;
  bgg_weight: number | null;
}

export function toGameColumns(thing: BggThing, syncedAt = new Date().toISOString()): GameColumns {
  const overall = thing.stats.ranks.find((r) => r.name === 'boardgame') ?? thing.stats.ranks[0];
  const rank = overall && /^\d+$/.test(overall.value) ? Number(overall.value) : null;
  const rated = (thing.stats.usersRated ?? 0) > 0;
  return {
    title: thing.name,
    description: thing.description,
    cover_url: thing.image ?? thing.thumbnail,
    min_players: positive(thing.minPlayers),
    max_players: positive(thing.maxPlayers),
    duration_minutes: positive(thing.playingTime) ?? positive(thing.maxPlayTime) ?? positive(thing.minPlayTime),
    bgg_id: thing.id,
    bgg_data: thing,
    bgg_synced_at: syncedAt,
    categories: thing.categories.map((c) => c.value),
    mechanics: thing.mechanics.map((m) => m.value),
    year_published: positive(thing.yearPublished),
    min_age: positive(thing.minAge),
    bgg_rating: rated ? positive(thing.stats.average) : null,
    bgg_rating_count: rated ? thing.stats.usersRated : null,
    bgg_rank: rank,
    bgg_weight: positive(thing.stats.averageWeight),
  };
}
