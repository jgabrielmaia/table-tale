import { useToast } from '@/components/ui';
import { useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { statusLabel } from '@/lib/format';
import type { GameStatus, LibraryGame } from '@/types/domain';
import { useAuth } from './useAuth';
import { useUpdateGameState } from './useGames';

/** Favourite and status controls for game cards (signed-in players only), with toasts. Shared by every game grid. */
export function useGameCardActions() {
  const { t } = useI18n();
  const { user } = useAuth();
  const updateState = useUpdateGameState();
  const { notify } = useToast();

  const toggleFavorite = (game: LibraryGame) =>
    updateState.mutate(
      { gameId: game.id, isFavorite: !game.isFavorite },
      {
        onSuccess: () => notify(game.isFavorite ? t('games.favRemoved') : t('games.favAdded'), { icon: 'heart' }),
        onError: (e) => notify(errorMessage(e), { tone: 'error' }),
      },
    );

  const changeStatus = (game: LibraryGame, status: GameStatus) =>
    updateState.mutate(
      { gameId: game.id, status },
      {
        onSuccess: () => notify(`${game.title}: ${statusLabel(status)}`),
        onError: (e) => notify(errorMessage(e), { tone: 'error' }),
      },
    );

  return {
    onToggleFavorite: user ? toggleFavorite : undefined,
    onStatusChange: user ? changeStatus : undefined,
    busyId: updateState.isPending ? updateState.variables?.gameId ?? null : null,
  };
}
