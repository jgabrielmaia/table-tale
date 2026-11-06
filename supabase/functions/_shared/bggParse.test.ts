import searchXml from './fixtures/search.xml?raw';
import thingXml from './fixtures/thing.xml?raw';
import { describe, expect, it } from 'vitest';
import { parseSearch, parseThings, parseXml, slugify, toGameColumns } from './bggParse';

// The fixtures follow the documented XML API2 shape (they are not recordings of live responses: no token existed yet).

describe('parseXml', () => {
  it('decodes entities, CDATA and self-closing tags', () => {
    const root = parseXml('<?xml version="1.0"?><a x="1 &amp; 2"><b/><c><![CDATA[<raw>]]> t &#233;&#x41;</c></a>');
    const a = root.children[0]!;
    expect(a.attrs.x).toBe('1 & 2');
    expect(a.children.map((n) => n.tag)).toEqual(['b', 'c']);
    expect(a.children[1]!.text).toBe('<raw> t éA');
  });

  it('rejects malformed documents', () => {
    expect(() => parseXml('<a><b></a>')).toThrow();
    expect(() => parseXml('<a>')).toThrow();
  });
});

describe('parseSearch', () => {
  const results = parseSearch(searchXml);

  it('returns id, name and year', () => {
    expect(results[0]).toEqual({ id: 13, name: 'CATAN', yearPublished: 1995, type: 'boardgame' });
    expect(results[1]!.name).toBe('Catan: Cities & Knights');
  });

  it('copes with a missing year and falls back to the first name', () => {
    expect(results[2]).toEqual({ id: 999001, name: 'Jogo sem ano', yearPublished: null, type: 'boardgame' });
  });

  it('fails on an unexpected document', () => {
    expect(() => parseSearch('<error message="nope"/>')).toThrow(/search/);
  });
});

describe('parseThings', () => {
  const [catan, obscure] = parseThings(thingXml);

  it('reads the descriptive fields as returned', () => {
    expect(catan).toMatchObject({
      id: 13, name: 'CATAN', yearPublished: 1995, minPlayers: 3, maxPlayers: 4, playingTime: 120, minPlayTime: 60, maxPlayTime: 120, minAge: 10,
    });
    expect(catan!.alternateNames).toEqual(['Die Siedler von Catan', 'Os Colonizadores de Catan']);
    expect(catan!.image).toContain('catan__original');
    expect(catan!.description).toContain('Picture yourself in the era of discoveries:\nafter a long voyage');
    expect(catan!.description).toContain('Trade & build "settlements"');
  });

  it('groups links by type', () => {
    expect(catan!.categories).toEqual([{ id: 1021, value: 'Economic' }, { id: 1026, value: 'Negotiation' }]);
    expect(catan!.mechanics.map((m) => m.value)).toEqual(['Dice Rolling', 'Trading']);
    expect(catan!.designers).toEqual([{ id: 11, value: 'Klaus Teuber' }]);
    expect(catan!.artists[0]!.value).toBe('Volkan Baga');
    expect(catan!.publishers[0]!.value).toBe('KOSMOS');
    expect(catan!.families[0]!.value).toBe('Catan');
  });

  it('reads the statistics', () => {
    expect(catan!.stats).toMatchObject({ usersRated: 120000, average: 7.1, bayesAverage: 6.9, averageWeight: 2.3, numWeights: 9000, owned: 250000 });
    expect(catan!.stats.ranks.map((r) => r.value)).toEqual(['450', 'Not Ranked']);
  });

  it('keeps BGG zeros untouched in the raw item', () => {
    expect(obscure).toMatchObject({ minPlayers: 0, yearPublished: 0, playingTime: 0 });
    expect(obscure!.categories).toEqual([]);
    expect(obscure!.image).toBeNull();
  });
});

describe('toGameColumns', () => {
  const [catan, obscure] = parseThings(thingXml);

  it('maps typed and queryable columns and keeps the full item', () => {
    const c = toGameColumns(catan!, '2026-11-06T00:00:00.000Z');
    expect(c).toMatchObject({
      title: 'CATAN', bgg_id: 13, min_players: 3, max_players: 4, duration_minutes: 120, year_published: 1995, min_age: 10,
      bgg_rating: 7.1, bgg_rating_count: 120000, bgg_rank: 450, bgg_weight: 2.3,
      categories: ['Economic', 'Negotiation'], mechanics: ['Dice Rolling', 'Trading'],
      cover_url: 'https://cf.geekdo-images.com/example-image/catan__original.jpg', bgg_synced_at: '2026-11-06T00:00:00.000Z',
    });
    expect(c.bgg_data).toBe(catan);
  });

  it('turns BGG "unknown" zeros and "Not Ranked" into null, falling back to the thumbnail', () => {
    const c = toGameColumns(obscure!);
    expect(c).toMatchObject({
      min_players: null, max_players: null, duration_minutes: null, year_published: null, min_age: null,
      bgg_rating: null, bgg_rating_count: null, bgg_rank: null, bgg_weight: null, categories: [], mechanics: [],
    });
    expect(c.cover_url).toContain('obscure__thumb');
  });
});

describe('slugify', () => {
  it('produces catalogue-valid kebab-case slugs', () => {
    expect(slugify('Catan: Cities & Knights', 1)).toBe('catan-cities-knights');
    expect(slugify('Jogo Obscuro: A Vingança', 1)).toBe('jogo-obscuro-a-vinganca');
    expect(slugify('日本語', 42)).toBe('bgg-42');
    for (const t of ['7 Wonders', 'Azul', '!!!']) expect(slugify(t, 9)).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});
