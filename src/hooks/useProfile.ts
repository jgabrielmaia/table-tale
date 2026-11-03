import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { fetchActivity, fetchProfile, fetchProfileStats, updateProfile, uploadAvatar, type ProfileUpdate } from '@/features/profile/api';
import { providerAvatarUrl } from '@/lib/avatar';
import { getLang, t } from '@/i18n';
import { queryKeys } from '@/lib/queryKeys';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from './useAuth';

// One attempt per account per page load, shared by every useProfile() consumer.
const adopted = new Set<string>();

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
  const activity = useQuery({ queryKey: queryKeys.activity(userId, getLang()), queryFn: () => fetchActivity(userId!), enabled });

  const update = useMutation({
    mutationFn: async (input: ProfileUpdate & { avatarFile?: File | null }) => {
      if (!userId) throw new Error(t('auth.sessionExpired'));
      const avatarUrl = input.avatarFile ? await uploadAvatar(userId, input.avatarFile) : input.avatarUrl;
      await updateProfile(userId, { ...input, avatarUrl });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.games });
    },
  });

  const providerAvatar = providerAvatarUrl(user);
  const loaded = profile.data;
  useEffect(() => {
    // Default to the sign-in provider's picture, but never overwrite one the player already has.
    if (!userId || !loaded || loaded.avatarUrl || !providerAvatar || adopted.has(userId)) return;
    adopted.add(userId);
    updateProfile(userId, { avatarUrl: providerAvatar })
      .then(() => {
        void qc.invalidateQueries({ queryKey: queryKeys.profile(userId) });
        void qc.invalidateQueries({ queryKey: queryKeys.games });
      })
      .catch(() => adopted.delete(userId));
  }, [userId, loaded, providerAvatar, qc]);

  return { profile, stats, activity, update, providerAvatar };
}
