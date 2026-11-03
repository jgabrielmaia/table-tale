import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchGameStates, fetchGames, saveGameState } from '@/features/games/api';
import { progressKeys, queryKeys } from '@/lib/queryKeys';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { GameStatus, GameUserState, LibraryGame } from '@/types/domain';
import { useAuth } from './useAuth';

/** Catalogue merged with the signed-in user's status/favourites. */
export function useGames() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const catalogue = useQuery({ queryKey: queryKeys.games, queryFn: fetchGames, enabled: isSupabaseConfigured });
  const states = useQuery({
    queryKey: queryKeys.gameStates(userId),
    queryFn: () => fetchGameStates(userId!),
    enabled: isSupabaseConfigured && Boolean(userId),
  });

  const games = useMemo<LibraryGame[]>(() => {
    const byGame = new Map((states.data ?? []).map((s) => [s.gameId, s]));
    return (catalogue.data ?? []).map((g) => ({
      ...g,
      status: byGame.get(g.id)?.status ?? 'unplayed',
      isFavorite: byGame.get(g.id)?.isFavorite ?? false,
    }));
  }, [catalogue.data, states.data]);

  return {
    games,
    isLoading: catalogue.isLoading || (Boolean(userId) && states.isLoading),
    isError: catalogue.isError || states.isError,
    error: catalogue.error ?? states.error,
    refetch: () => Promise.all([catalogue.refetch(), states.refetch()]),
  };
}

/** Optimistically updates a game's status and/or favourite flag. */
export function useUpdateGameState() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const key = queryKeys.gameStates(userId);

  return useMutation({
    mutationFn: (vars: { gameId: string; status?: GameStatus; isFavorite?: boolean }) => {
      if (!userId) throw new Error('Inicia sessão para guardar o teu progresso.');
      return saveGameState(userId, vars.gameId, vars);
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<GameUserState[]>(key);
      qc.setQueryData<GameUserState[]>(key, (list = []) => {
        const current = list.find((s) => s.gameId === vars.gameId) ?? { gameId: vars.gameId, status: 'unplayed' as GameStatus, isFavorite: false };
        const next = { ...current, ...(vars.status ? { status: vars.status } : {}), ...(vars.isFavorite !== undefined ? { isFavorite: vars.isFavorite } : {}) };
        return [...list.filter((s) => s.gameId !== vars.gameId), next];
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      progressKeys(userId).forEach((k) => qc.invalidateQueries({ queryKey: k }));
    },
  });
}
