import { describe, expect, it } from 'vitest';
import { hasActiveCommunity, nearbyCommunities } from './nearby';
import type { Community, MyMembership } from '@/types/domain';

const c = (id: string, name: string, latitude: number | null, longitude: number | null): Community => ({
  id, slug: id, name, description: '', visibility: 'public', shelfVisibility: 'public', city: 'X', district: 'Y', country: 'Portugal',
  latitude, longitude, createdBy: 'u', coverUrl: null, coverPosition: 50, memberCount: 1,
});

const lisboa = c('lx', 'Table Tale Lisboa', 38.7495, -9.1438);
const porto = c('po', 'Tabuleiros do Porto', 41.1597, -8.6476);
const nowhere = c('nw', 'Algures', null, null);
const all = [porto, nowhere, lisboa];
const nearLisboa = { lat: 38.7223, lng: -9.1393 };
const ids = (xs: { community: Community }[]) => xs.map((x) => x.community.id);

describe('nearbyCommunities', () => {
  it('without a location lists every community by name, with no distance', () => {
    const out = nearbyCommunities(all, null, 20);
    expect(ids(out)).toEqual(['nw', 'lx', 'po']);
    expect(out.every((x) => x.distanceKm === null)).toBe(true);
  });

  it('with a location keeps only communities within the radius, closest first', () => {
    const out = nearbyCommunities(all, nearLisboa, 20);
    expect(ids(out)).toEqual(['lx']);
    expect(out[0]!.distanceKm).toBeGreaterThan(2);
    expect(out[0]!.distanceKm).toBeLessThan(4);
    expect(ids(nearbyCommunities(all, nearLisboa, 500))).toEqual(['lx', 'po']);
  });

  it('keeps communities the viewer belongs to, even far away or without coordinates', () => {
    const mine: MyMembership = { communityId: 'nw', role: 'member', status: 'pending' };
    const out = nearbyCommunities(all, nearLisboa, 20, (id) => (id === 'nw' ? mine : null));
    expect(ids(out)).toEqual(['lx', 'nw']);
  });
});

describe('hasActiveCommunity', () => {
  it('counts only active memberships', () => {
    expect(hasActiveCommunity(undefined)).toBe(false);
    expect(hasActiveCommunity([{ communityId: 'a', role: 'member', status: 'pending' }])).toBe(false);
    expect(hasActiveCommunity([{ communityId: 'a', role: 'member', status: 'suspended' }, { communityId: 'b', role: 'member', status: 'active' }])).toBe(true);
  });
});
