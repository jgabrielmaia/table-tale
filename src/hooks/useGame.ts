import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchGameBySlug } from '@/features/games/api';
import { queryKeys } from '@/lib/queryKeys';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { LibraryGame } from '@/types/domain';
import { useGames } from './useGames';

/** Single game by slug, enriched with the user's state; reuses the library cache when available. */
export function useGame(slug: string) {
  const library = useGames();
  const cached = library.games.find((g) => g.slug === slug);

  const query = useQuery({
    queryKey: queryKeys.game(slug),
    queryFn: () => fetchGameBySlug(slug),
    enabled: isSupabaseConfigured && !cached && !library.isLoading,
  });

  const game = useMemo<LibraryGame | null>(() => {
    if (cached) return cached;
    if (!query.data) return null;
    return { ...query.data, status: 'unplayed', isFavorite: false };
  }, [cached, query.data]);

  return {
    game,
    allGames: library.games,
    isLoading: library.isLoading || (!cached && query.isLoading),
    isError: library.isError || query.isError,
    error: library.error ?? query.error,
    notFound: !library.isLoading && !cached && query.isSuccess && query.data === null,
  };
}
