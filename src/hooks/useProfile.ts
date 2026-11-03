import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchActivity, fetchProfile, fetchProfileStats, updateProfile, uploadAvatar, type ProfileUpdate } from '@/features/profile/api';
import { queryKeys } from '@/lib/queryKeys';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from './useAuth';

export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const enabled = isSupabaseConfigured && Boolean(userId);

  const profile = useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: () => fetchProfile(userId!, user?.email ?? null),
    enabled,
  });
  const stats = useQuery({ queryKey: queryKeys.stats(userId), queryFn: fetchProfileStats, enabled });
  const activity = useQuery({ queryKey: queryKeys.activity(userId), queryFn: () => fetchActivity(userId!), enabled });

  const update = useMutation({
    mutationFn: async (input: ProfileUpdate & { avatarFile?: File | null }) => {
      if (!userId) throw new Error('Sessão expirada.');
      const avatarUrl = input.avatarFile ? await uploadAvatar(userId, input.avatarFile) : input.avatarUrl;
      await updateProfile(userId, { ...input, avatarUrl });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.games });
    },
  });

  return { profile, stats, activity, update };
}
