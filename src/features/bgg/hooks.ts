import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addCommunityGame, addUserGame, fetchMyUserGames } from '@/features/communities/api';
import { useAuth } from '@/hooks/useAuth';
import { AppError } from '@/lib/errors';
import { queryKeys } from '@/lib/queryKeys';
import { isSupabaseConfigured } from '@/lib/supabase';
import { t } from '@/i18n';
import { importBgg, previewBgg, searchBgg } from './api';

export type ImportTarget = { kind: 'personal' } | { kind: 'community'; id: string };
export type ImportOutcome = 'added' | 'already';

export const bggKeys = {
  search: (query: string) => ['bgg', 'search', query] as const,
  preview: (id: number | null) => ['bgg', 'preview', id] as const,
};

export function useBggSearch(query: string) {
  return useQuery({
    queryKey: bggKeys.search(query),
    queryFn: () => searchBgg(query),
    enabled: isSupabaseConfigured && query.trim().length >= 2,
    staleTime: 10 * 60_000,
    retry: false,
  });
}

export function useBggPreview(id: number | null) {
  return useQuery({
    queryKey: bggKeys.preview(id),
    queryFn: () => previewBgg(id!),
    enabled: isSupabaseConfigured && id !== null,
    staleTime: 10 * 60_000,
    retry: false,
  });
}

/** Imports a BGG game into the catalogue and adds it to the personal collection or to a community library. */
export function useBggImport() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bggId, target }: { bggId: number; target: ImportTarget }): Promise<{ title: string; slug: string; outcome: ImportOutcome }> => {
      if (!user) throw new AppError(t('auth.needLoginCommunities'));
      const game = await importBgg(bggId);
      if (target.kind === 'personal') {
        const mine = await fetchMyUserGames(user.id);
        if (mine.some((e) => e.gameId === game.id)) return { title: game.title, slug: game.slug, outcome: 'already' };
        await addUserGame(user.id, game.id, 1);
        return { title: game.title, slug: game.slug, outcome: 'added' };
      }
      try {
        await addCommunityGame(user.id, target.id, game.id);
      } catch (e) {
        // unique (community, game): the library already has it
        if (e instanceof AppError && (e.cause as { code?: string } | undefined)?.code === '23505') return { title: game.title, slug: game.slug, outcome: 'already' };
        throw e;
      }
      return { title: game.title, slug: game.slug, outcome: 'added' };
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.games });
      void qc.invalidateQueries({ queryKey: ['my-user-games'] });
      void qc.invalidateQueries({ queryKey: ['community-games'] });
      void qc.invalidateQueries({ queryKey: queryKeys.shelves });
      void qc.invalidateQueries({ queryKey: ['bgg', 'search'] });
    },
  });
}
