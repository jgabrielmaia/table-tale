import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GameFilters } from '@/components/games/GameFilters';
import { GameGrid } from '@/components/games/GameGrid';
import { Button, EmptyState, ErrorState, LoadingState, useToast } from '@/components/ui';
import { LoginRequiredNotice } from '@/features/auth/LoginPage';
import { useAuth } from '@/hooks/useAuth';
import { useGames, useUpdateGameState } from '@/hooks/useGames';
import { genreLabel, getLocale, useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { statusLabel } from '@/lib/format';
import type { GameStatus, LibraryGame } from '@/types/domain';
import { EMPTY_FILTERS, filterGames, hasActiveFilters, type GameFilterValues } from './filters';

export function LibraryPage() {
  const { t, tn } = useI18n();
  const { user } = useAuth();
  const { games, isLoading, isError, error, refetch } = useGames();
  const updateState = useUpdateGameState();
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<GameFilterValues>({ ...EMPTY_FILTERS, query: params.get('q') ?? '' });

  const genres = useMemo(() => [...new Set(games.map((g) => g.genre))].sort((a, b) => genreLabel(a).localeCompare(genreLabel(b), getLocale())), [games]);
  const visible = useMemo(() => filterGames(games, filters), [games, filters]);

  const changeFilters = (next: GameFilterValues) => {
    setFilters(next);
    setParams(next.query ? { q: next.query } : {}, { replace: true });
  };
  const reset = () => changeFilters(EMPTY_FILTERS);

  const toggleFavorite = (game: LibraryGame) =>
    updateState.mutate(
      { gameId: game.id, isFavorite: !game.isFavorite },
      {
        onSuccess: () => notify(game.isFavorite ? t('library.favRemoved') : t('library.favAdded'), { icon: 'heart' }),
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

  return (
    <div className="container section">
      <div className="section-head">
        <div>
          <p className="eyebrow">{t('library.eyebrow')}</p>
          <h1>{t('library.title')}</h1>
        </div>
        {!isLoading && !isError && (
          <p className="results-count" aria-live="polite">
            {tn('library.found', visible.length)}
          </p>
        )}
      </div>

      {!user && <LoginRequiredNotice message={t('library.loginNotice')} />}

      <GameFilters values={filters} genres={genres} onChange={changeFilters} onReset={reset} showPersonalFilters={Boolean(user)} />

      {isLoading ? (
        <LoadingState variant="cards" label={t('library.loading')} />
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : !games.length ? (
        <EmptyState title={t('library.emptyTitle')} description={t('library.emptyText')} />
      ) : !visible.length ? (
        <EmptyState
          title={t('library.noResultsTitle')}
          description={
            <>
              {filters.query && <>{t('library.noResultsFor', { query: filters.query })}</>}
              {t('library.noResultsText')}
            </>
          }
          action={hasActiveFilters(filters) && <Button variant="secondary" onClick={reset}>{t('library.clearFilters')}</Button>}
        />
      ) : (
        <GameGrid
          games={visible}
          label={t('library.gamesLabel')}
          onToggleFavorite={user ? toggleFavorite : undefined}
          onStatusChange={user ? changeStatus : undefined}
          busyId={updateState.isPending ? updateState.variables?.gameId : null}
        />
      )}

      <p className="mt-10 text-center text-sm text-muted">
        {t('library.loreCta')} <Link to="/lore">{t('nav.lore')}</Link>
      </p>
    </div>
  );
}
