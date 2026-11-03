import { useQuery } from '@tanstack/react-query';
import { fetchAchievements, fetchProfileStats } from '@/features/profile/api';
import { queryKeys } from '@/lib/queryKeys';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from './useAuth';

export function useAchievements() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const stats = useQuery({
    queryKey: queryKeys.stats(userId),
    queryFn: fetchProfileStats,
    enabled: isSupabaseConfigured && Boolean(userId),
  });
  return useQuery({
    queryKey: [...queryKeys.achievements(userId), stats.dataUpdatedAt],
    queryFn: () => fetchAchievements(userId, stats.data ?? null),
    enabled: isSupabaseConfigured && (!userId || stats.isSuccess),
  });
}
