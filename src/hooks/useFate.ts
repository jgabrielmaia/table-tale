import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { drawFateCard, fetchActiveIdentities, fetchActiveSeason, fetchMyIdentities, type PlayerIdentity } from '@/features/fate/api';
import { queryKeys } from '@/lib/queryKeys';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

/** UNINITIATED: never drew. INITIATED: card in the active season. ARCHIVED: only past seasons. */
export type PlayerFateState = 'loading' | 'uninitiated' | 'initiated' | 'archived';

export function useFate() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const enabled = isSupabaseConfigured && Boolean(userId);

  const season = useQuery({ queryKey: queryKeys.activeSeason, queryFn: fetchActiveSeason, enabled: isSupabaseConfigured });
  const identities = useQuery({ queryKey: queryKeys.myIdentities(userId), queryFn: () => fetchMyIdentities(userId!), enabled });

  const list = identities.data ?? [];
  const active = list.find((i) => i.isActive) ?? null;
  const history = list.filter((i) => !i.isActive);
  const state: PlayerFateState = identities.isLoading
    ? 'loading'
    : active ? 'initiated' : history.length ? 'archived' : 'uninitiated';

  const draw = useMutation({
    mutationFn: () => drawFateCard(userId!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.myIdentities(userId) });
      void qc.invalidateQueries({ queryKey: queryKeys.activeIdentities });
    },
  });

  // TEMPORARY (dev builds only): owner-only server function that clears this season's card.
  const devReset = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('dev_reset_my_card');
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.myIdentities(userId) });
      void qc.invalidateQueries({ queryKey: queryKeys.activeIdentities });
    },
  });

  return { season, identities, active, history, state, draw, devReset, canDraw: Boolean(season.data) && !active };
}

/** Active-season identities of every player, keyed by player id. Shared cache: one request feeds every avatar. */
export function useActiveIdentities() {
  return useQuery({
    queryKey: queryKeys.activeIdentities,
    queryFn: fetchActiveIdentities,
    enabled: isSupabaseConfigured,
    staleTime: 60_000,
  });
}

/** Active-season identity of any player, or null. */
export function useActiveIdentity(playerId: string | null | undefined): PlayerIdentity | null {
  const query = useActiveIdentities();
  return (playerId && query.data?.[playerId]) || null;
}
