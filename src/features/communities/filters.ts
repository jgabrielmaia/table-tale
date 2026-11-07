import type { Community } from '@/types/domain';

export interface CommunityFilterValues {
  query: string;
  city: string;
  district: string;
}

export const EMPTY_COMMUNITY_FILTERS: CommunityFilterValues = { query: '', city: '', district: '' };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const hasActiveCommunityFilters = (f: CommunityFilterValues) => Boolean(f.query.trim() || f.city || f.district);

export function filterCommunities(list: Community[], f: CommunityFilterValues): Community[] {
  const q = norm(f.query);
  return list.filter(
    (c) =>
      (!q || norm(`${c.name} ${c.description} ${c.city} ${c.district}`).includes(q)) &&
      (!f.city || c.city === f.city) &&
      (!f.district || c.district === f.district),
  );
}

export const cityOptions = (list: Community[]) => [...new Set(list.map((c) => c.city))].sort((a, b) => a.localeCompare(b));

/** Districts, narrowed to the chosen city when there is one. */
export const districtOptions = (list: Community[], city: string) =>
  [...new Set(list.filter((c) => !city || c.city === city).map((c) => c.district))].sort((a, b) => a.localeCompare(b));
