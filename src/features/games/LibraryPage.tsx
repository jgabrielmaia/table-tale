import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GameFilters } from '@/components/games/GameFilters';
import { GameGrid } from '@/components/games/GameGrid';
import { Button, EmptyState, ErrorState, LoadingState, useToast } from '@/components/ui';
import { LoginRequiredNotice } from '@/features/auth/LoginPage';
import { useAuth } from '@/hooks/useAuth';
import { useGames, useUpdateGameState } from '@/hooks/useGames';
import { errorMessage } from '@/lib/errors';
import { STATUS_LABELS } from '@/lib/format';
import type { GameStatus, LibraryGame } from '@/types/domain';
import { EMPTY_FILTERS, filterGames, hasActiveFilters, type GameFilterValues } from './filters';

export function LibraryPage() {
  const { user } = useAuth();
  const { games, isLoading, isError, error, refetch } = useGames();
  const updateState = useUpdateGameState();
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<GameFilterValues>({ ...EMPTY_FILTERS, query: params.get('q') ?? '' });

  const genres = useMemo(() => [...new Set(games.map((g) => g.genre))].sort((a, b) => a.localeCompare(b, 'pt')), [games]);
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
        onSuccess: () => notify(game.isFavorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos', { icon: 'heart' }),
        onError: (e) => notify(errorMessage(e), { tone: 'error' }),
      },
    );

  const changeStatus = (game: LibraryGame, status: GameStatus) =>
    updateState.mutate(
      { gameId: game.id, status },
      {
        onSuccess: () => notify(`${game.title}: ${STATUS_LABELS[status]}`),
        onError: (e) => notify(errorMessage(e), { tone: 'error' }),
      },
    );

  return (
    <div className="container section">
      <div className="section-head">
        <div>
          <p className="eyebrow">A estante da comunidade</p>
          <h1>Biblioteca</h1>
        </div>
        {!isLoading && !isError && (
          <p className="results-count" aria-live="polite">
            {visible.length === 1 ? '1 jogo encontrado' : `${visible.length} jogos encontrados`}
          </p>
        )}
      </div>

      {!user && <LoginRequiredNotice message="Entra para marcar favoritos, alterar estados e registar sessões." />}

      <GameFilters values={filters} genres={genres} onChange={changeFilters} onReset={reset} showPersonalFilters={Boolean(user)} />

      {isLoading ? (
        <LoadingState variant="cards" label="A carregar a coleção…" />
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : !games.length ? (
        <EmptyState title="A estante está vazia" description="Ainda não existem jogos na biblioteca. Corre o seed da base de dados para carregar a coleção inicial." />
      ) : !visible.length ? (
        <EmptyState
          title="Nenhum jogo encontrado nesta estante"
          description={
            <>
              {filters.query && <>Não encontrámos nada para «{filters.query}». </>}
              Nenhum caminho encontrado com estes filtros. Experimenta outra pesquisa ou limpa os filtros.
            </>
          }
          action={hasActiveFilters(filters) && <Button variant="secondary" onClick={reset}>Limpar filtros</Button>}
        />
      ) : (
        <GameGrid
          games={visible}
          label="Jogos"
          onToggleFavorite={user ? toggleFavorite : undefined}
          onStatusChange={user ? changeStatus : undefined}
          busyId={updateState.isPending ? updateState.variables?.gameId : null}
        />
      )}

      <p className="mt-10 text-center text-sm text-muted">
        Queres conhecer o universo por trás da mesa? <Link to="/lore">Arcanos &amp; Elementais</Link>
      </p>
    </div>
  );
}
