import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEvents, setParticipation } from '@/features/events/api';
import { progressKeys, queryKeys } from '@/lib/queryKeys';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { EventItem } from '@/types/domain';
import { useAuth } from './useAuth';

export function useEvents() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const key = queryKeys.events(userId);

  const query = useQuery({ queryKey: key, queryFn: () => fetchEvents(userId), enabled: isSupabaseConfigured });

  const toggle = useMutation({
    mutationFn: ({ eventId, participate }: { eventId: string; participate: boolean }) => {
      if (!userId) throw new Error('Inicia sessão para participar em eventos.');
      return setParticipation(userId, eventId, participate);
    },
    onMutate: async ({ eventId, participate }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<EventItem[]>(key);
      qc.setQueryData<EventItem[]>(key, (list = []) => list.map((e) => (e.id === eventId ? { ...e, isParticipating: participate } : e)));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      progressKeys(userId).forEach((k) => qc.invalidateQueries({ queryKey: k }));
    },
  });

  return { events: query.data ?? [], query, toggle };
}
