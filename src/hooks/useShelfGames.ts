import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMyMemberships } from '@/features/communities/api';
import { fetchShelfEntries } from '@/features/games/api';
import { cityOptions, groupShelves, type ShelfScope } from '@/features/games/shelves';
import { queryKeys } from '@/lib/queryKeys';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { GeoPoint } from '@/features/games/shelves';
import { useAuth } from './useAuth';
import { useGames } from './useGames';

/**
 * Games on the shelves in the viewer's reach: communities within `radiusKm` of `origin`,
 * plus every community the viewer is an active member of. One entry per game.
 */
export function useShelfGames({ browserPoint, cityKey, radiusKm }: { browserPoint: GeoPoint | null; cityKey: string | null; radiusKm: number }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const catalogue = useGames();
  const shelves = useQuery({ queryKey: queryKeys.shelves, queryFn: fetchShelfEntries, enabled: isSupabaseConfigured });
  const memberships = useQuery({
    queryKey: queryKeys.myMemberships(userId),
    queryFn: () => fetchMyMemberships(userId!),
    enabled: isSupabaseConfigured && Boolean(userId),
  });

  const myCommunityIds = useMemo(
    () => new Set((memberships.data ?? []).filter((m) => m.status === 'active').map((m) => m.communityId)),
    [memberships.data],
  );
  // Cities come from every shelf entry, whatever the distance, so a refused browser location can fall back to one.
  const cities = useMemo(
    () => cityOptions([...new Map((shelves.data ?? []).map((e) => [e.community.id, e.community])).values()]),
    [shelves.data],
  );
  const city = cityKey ? cities.find((c) => c.key === cityKey) ?? null : null;
  const origin = browserPoint ?? city?.point ?? null;

  const byId = useMemo(() => new Map(catalogue.games.map((g) => [g.id, g])), [catalogue.games]);
  const games = useMemo(() => {
    const scope: ShelfScope = { origin, radiusKm, myCommunityIds };
    return groupShelves(shelves.data ?? [], byId, scope);
  }, [shelves.data, byId, origin, radiusKm, myCommunityIds]);

  return {
    games,
    cities,
    city,
    origin,
    hasMemberships: myCommunityIds.size > 0,
    isLoading: catalogue.isLoading || shelves.isLoading || (Boolean(userId) && memberships.isLoading),
    isError: catalogue.isError || shelves.isError || memberships.isError,
    error: catalogue.error ?? shelves.error ?? memberships.error,
    refetch: () => Promise.all([catalogue.refetch(), shelves.refetch(), memberships.refetch()]),
  };
}
