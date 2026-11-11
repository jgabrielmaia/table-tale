import { communityPoint, distanceKm, type GeoPoint } from '@/features/games/shelves';
import type { Community, MyMembership } from '@/types/domain';

export interface NearbyCommunity {
  community: Community;
  /** null when the viewer has no location or the community has no coordinates. */
  distanceKm: number | null;
}

/**
 * Communities for the "find a community" step. With a location, only those within `radiusKm`, closest first;
 * without one, every community by name. Communities the viewer already belongs to are always kept, so a fresh
 * join stays on screen.
 */
export function nearbyCommunities(
  communities: Community[],
  origin: GeoPoint | null,
  radiusKm: number,
  membershipOf: (id: string) => MyMembership | null = () => null,
  locale?: string,
): NearbyCommunity[] {
  const byName = (a: NearbyCommunity, b: NearbyCommunity) => a.community.name.localeCompare(b.community.name, locale);
  const measured = communities.map((community) => {
    const point = communityPoint(community);
    return { community, distanceKm: origin && point ? distanceKm(origin, point) : null };
  });
  if (!origin) return measured.sort(byName);
  return measured
    .filter((x) => (x.distanceKm !== null && x.distanceKm <= radiusKm) || membershipOf(x.community.id) !== null)
    .sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null && a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      if (a.distanceKm === null && b.distanceKm !== null) return 1;
      if (a.distanceKm !== null && b.distanceKm === null) return -1;
      return byName(a, b);
    });
}

/** Whether the viewer is an active member of at least one community (pending requests do not count). */
export const hasActiveCommunity = (memberships: MyMembership[] | undefined) => (memberships ?? []).some((m) => m.status === 'active');
