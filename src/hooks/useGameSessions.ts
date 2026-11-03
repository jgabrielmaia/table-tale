import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSession, deleteSession, fetchSessions, type NewSession } from '@/features/games/api';
import { progressKeys, queryKeys } from '@/lib/queryKeys';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from './useAuth';

export function useGameSessions(gameId?: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.sessions(userId, gameId),
    queryFn: () => fetchSessions(userId!, gameId),
    enabled: isSupabaseConfigured && Boolean(userId),
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['sessions', userId] });
    qc.invalidateQueries({ queryKey: queryKeys.gameStates(userId) });
    progressKeys(userId).forEach((k) => qc.invalidateQueries({ queryKey: k }));
  };

  const create = useMutation({
    mutationFn: (input: NewSession) => {
      if (!userId) throw new Error('Inicia sessão para registar sessões.');
      return createSession(userId, input);
    },
    onSuccess: refreshAll,
  });

  const remove = useMutation({ mutationFn: deleteSession, onSuccess: refreshAll });

  return { sessions: query.data ?? [], query, create, remove };
}
