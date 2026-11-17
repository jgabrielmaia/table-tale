import { describe, expect, it } from 'vitest';
import { cleanLabels, decodeEntities, parseCsv, parseList, planImport, slugify, toCatalogueGame, toRecords } from './catalogue-import-lib';

describe('parseCsv', () => {
  it('reads quoted fields with commas, doubled quotes and line breaks', () => {
    const rows = parseCsv('a,b,c\n1,"x, y","say ""hi""\nthere"\r\n2,,z\n');
    expect(rows).toEqual([['a', 'b', 'c'], ['1', 'x, y', 'say "hi"\nthere'], ['2', '', 'z']]);
    expect(toRecords(rows)[0]).toEqual({ a: '1', b: 'x, y', c: 'say "hi"\nthere' });
  });
});

describe('lists and text', () => {
  it('reads python-style lists with either quote', () => {
    expect(parseList(`['Economic', "Children's Game", 'A &amp; B']`)).toEqual(['Economic', "Children's Game", 'A & B']);
    expect(parseList('')).toEqual([]);
  });
  it('decodes entities', () => {
    expect(decodeEntities('Children&#039;s &amp; Co &eacute;')).toBe("Children's & Co &eacute;");
  });
  it('keeps labels the table accepts', () => {
    expect(cleanLabels(['Cards', ' cards ', '', 'x'.repeat(61), 'War'])).toEqual(['Cards', 'War']);
    expect(cleanLabels(Array.from({ length: 40 }, (_, i) => `c${i}`))).toHaveLength(30);
  });
  it('slugs like the app', () => {
    expect(slugify('Pandemic: Legacy – Season 1!')).toBe('pandemic-legacy-season-1');
    expect(slugify('Café Étoile')).toBe('cafe-etoile');
  });
});

const rating = { id: '30549', name: 'Pandemic', year: '2008', rank: '106', average: '7.59', users_rated: '108975' };
const details = { minplayers: '2', maxplayers: '4', playingtime: '45', minage: '8', boardgamecategory: "['Medical']", boardgamemechanic: "['Cooperative Game']" };

describe('toCatalogueGame', () => {
  it('maps a dataset game, without description or picture', () => {
    expect(toCatalogueGame(rating, details)).toEqual({
      bgg_id: 30549, title: 'Pandemic', description: '', min_players: 2, max_players: 4, duration_minutes: 45, min_age: 8,
      categories: ['Medical'], mechanics: ['Cooperative Game'], year_published: 2008, bgg_rating: 7.59, bgg_rating_count: 108975, bgg_rank: 106,
    });
  });
  it('turns zero ("unknown") into null and fixes impossible player counts', () => {
    const g = toCatalogueGame(rating, { ...details, minplayers: '0', maxplayers: '0', playingtime: '0', minage: '0' })!;
    expect(g).toMatchObject({ min_players: null, max_players: null, duration_minutes: null, min_age: null });
    expect(toCatalogueGame(rating, { ...details, minplayers: '5', maxplayers: '3' })).toMatchObject({ min_players: 5, max_players: 5 });
  });
  it('works without a details row and skips unusable rows', () => {
    expect(toCatalogueGame(rating, undefined)).toMatchObject({ min_players: null, categories: [] });
    expect(toCatalogueGame({ ...rating, rank: '0' }, details)).toBeNull();
    expect(toCatalogueGame({ ...rating, name: '' }, details)).toBeNull();
  });
});

describe('planImport', () => {
  const g = (bgg_id: number, title: string, year = 2000) => ({ ...toCatalogueGame({ ...rating, id: String(bgg_id), name: title, year: String(year) }, details)! });
  it('skips games already there by BGG id or by title, and keeps slugs unique', () => {
    const plan = planImport(
      [g(1, 'Dixit'), g(2, 'Uno'), g(3, 'Catan'), g(4, 'Catan', 2015), g(5, 'Catan', 2015)],
      [{ bgg_id: 1, title: 'Dixit', slug: 'dixit' }, { bgg_id: null, title: 'UNO', slug: 'uno' }, { bgg_id: null, title: 'Other', slug: 'catan' }],
    );
    expect(plan.haveBggId).toBe(1);
    expect(plan.sameTitle).toEqual(['Uno', 'Catan', 'Catan']);
    expect(plan.add).toHaveLength(1);
    expect(plan.add[0]).toMatchObject({ bgg_id: 3, slug: 'catan-2000' });
  });
  it('uses the BGG id when the year slug is taken too', () => {
    const plan = planImport([g(9, 'Risk', 1959)], [{ bgg_id: null, title: 'Risk board', slug: 'risk' }, { bgg_id: null, title: 'Risk old', slug: 'risk-1959' }]);
    expect(plan.add[0]!.slug).toBe('risk-9');
  });
});
