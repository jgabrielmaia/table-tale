import { useQuery } from '@tanstack/react-query';
import { fetchEnabledProviders } from '@/features/auth/api';
import { isSupabaseConfigured } from '@/lib/supabase';

/** `data` is null when the project settings cannot be read; buttons then stay enabled and errors are handled on click. */
export function useEnabledProviders() {
  return useQuery({
    queryKey: ['auth', 'providers'] as const,
    queryFn: fetchEnabledProviders,
    enabled: isSupabaseConfigured,
    staleTime: 5 * 60_000,
  });
}
