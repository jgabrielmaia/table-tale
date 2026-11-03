import { useQuery } from '@tanstack/react-query';
import { fetchLore } from '@/features/lore/api';
import { queryKeys } from '@/lib/queryKeys';
import { isSupabaseConfigured } from '@/lib/supabase';

export function useLore() {
  return useQuery({ queryKey: queryKeys.lore, queryFn: fetchLore, enabled: isSupabaseConfigured, staleTime: 30 * 60_000 });
}
