import { describe, expect, it } from 'vitest';
import { EMPTY_COMMUNITY_FILTERS, cityOptions, districtOptions, filterCommunities } from './filters';
import type { Community } from '@/types/domain';

const c = (id: string, name: string, city: string, district: string): Community => ({
  id, slug: id, name, description: '', visibility: 'public', shelfVisibility: 'public', city, district, country: 'Portugal',
  latitude: null, longitude: null, createdBy: 'u', coverUrl: null, coverPosition: 50, memberCount: 1,
});

const list = [
  c('a', 'Table Tale Lisboa', 'Lisboa', 'Alvalade'),
  c('b', 'Tabuleiros do Porto', 'Porto', 'Boavista'),
  c('c', 'Jogos de Lisboa Oriental', 'Lisboa', 'Marvila'),
];

describe('filterCommunities', () => {
  it('searches name, city and district ignoring accents and case', () => {
    expect(filterCommunities(list, { ...EMPTY_COMMUNITY_FILTERS, query: 'BOAVISTA' }).map((x) => x.id)).toEqual(['b']);
    expect(filterCommunities(list, { ...EMPTY_COMMUNITY_FILTERS, query: 'lisboa' }).map((x) => x.id)).toEqual(['a', 'c']);
  });

  it('filters by city and district together', () => {
    expect(filterCommunities(list, { query: '', city: 'Lisboa', district: 'Marvila' }).map((x) => x.id)).toEqual(['c']);
    expect(filterCommunities(list, { query: '', city: 'Porto', district: 'Marvila' })).toEqual([]);
  });

  it('builds sorted city options and narrows districts to the chosen city', () => {
    expect(cityOptions(list)).toEqual(['Lisboa', 'Porto']);
    expect(districtOptions(list, '')).toEqual(['Alvalade', 'Boavista', 'Marvila']);
    expect(districtOptions(list, 'Lisboa')).toEqual(['Alvalade', 'Marvila']);
  });
});
