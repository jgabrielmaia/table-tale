import type { CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GameCover, coverAccent } from '@/components/games/GameCover';
import { GameGrid } from '@/components/games/GameGrid';
import { GameSessionForm } from '@/components/games/GameSessionForm';
import { STATUS_OPTIONS } from '@/components/games/GameStatusBadge';
import { Badge, BrandSymbol, Button, Card, EmptyState, ErrorState, Icon, LoadingState, useToast } from '@/components/ui';
import { PlayerAvatar } from '@/components/identity/PlayerAvatar';
import { LoginRequiredNotice } from '@/features/auth/LoginPage';
import { useAuth } from '@/hooks/useAuth';
import { useGame } from '@/hooks/useGame';
import { useGameSessions } from '@/hooks/useGameSessions';
import { useUpdateGameState } from '@/hooks/useGames';
import { gameStyle } from '@/lib/cover';
import { errorMessage } from '@/lib/errors';
import { STATUS_LABELS, formatDate, playersLabel, todayIso } from '@/lib/format';
import type { GameStatus } from '@/types/domain';
import { relatedGames } from './filters';
import type { SessionFormValues } from './schemas';

const CONDITION_LABELS = { new: 'Novo', good: 'Bom estado', worn: 'Usado', damaged: 'Danificado' } as const;

export function GameDetailPage() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const { game, allGames, isLoading, isError, error, notFound } = useGame(slug);
  const { sessions, query: sessionsQuery, create, remove } = useGameSessions(game?.id);
  const updateState = useUpdateGameState();
  const { notify } = useToast();

  if (isLoading) return <div className="container section"><LoadingState label="A carregar o jogo…" /></div>;
  if (isError) return <div className="container section"><ErrorState message={errorMessage(error)} /></div>;
  if (notFound || !game) {
    return (
      <div className="container section">
        <EmptyState headingLevel={2} title="Este jogo não consta da estante" description="O jogo pode ter sido removido ou o endereço está incorreto." action={<Link className="btn btn-primary" to="/library">Voltar à biblioteca</Link>} />
      </div>
    );
  }

  const related = relatedGames(game, allGames);
  const copies = game.owners.reduce((sum, o) => sum + o.copies, 0);
  const style = { '--accent': coverAccent(game.slug, game.genre) } as CSSProperties;

  const setStatus = (status: GameStatus) =>
    updateState.mutate(
      { gameId: game.id, status },
      { onSuccess: () => notify(`Estado atualizado: ${STATUS_LABELS[status]}`), onError: (e) => notify(errorMessage(e), { tone: 'error' }) },
    );

  const toggleFavorite = () =>
    updateState.mutate(
      { gameId: game.id, isFavorite: !game.isFavorite },
      {
        onSuccess: () => notify(game.isFavorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos', { icon: 'heart' }),
        onError: (e) => notify(errorMessage(e), { tone: 'error' }),
      },
    );

  const markPlayedToday = () =>
    create.mutate(
      { gameId: game.id, playedAt: todayIso(), durationMinutes: game.durationMinutes },
      {
        onSuccess: () => {
          if (game.status === 'unplayed') updateState.mutate({ gameId: game.id, status: 'in_progress' });
          notify('Sessão de hoje registada');
        },
        onError: (e) => notify(errorMessage(e), { tone: 'error' }),
      },
    );

  const submitSession = async (values: SessionFormValues) => {
    try {
      await create.mutateAsync({ gameId: game.id, ...values });
      if (game.status === 'unplayed') updateState.mutate({ gameId: game.id, status: 'in_progress' });
      notify('Sessão registada no diário');
    } catch (e) {
      notify(errorMessage(e), { tone: 'error' });
      throw e;
    }
  };

  return (
    <>
      <div className="detail-backdrop" style={style}>
        <div className="container section">
          <Link className="back-link" to="/library"><Icon name="back" />Voltar à biblioteca</Link>
          <article className="detail-grid" aria-labelledby="game-title">
            <figure className="detail-media">
              <GameCover slug={game.slug} title={game.title} genre={game.genre} coverUrl={game.coverUrl} loading="eager" />
              <figcaption>
                <Badge tone="accent" color={coverAccent(game.slug, game.genre)} icon={<BrandSymbol name={gameStyle(game.slug, game.genre).symbol} />}>{game.genre}</Badge>
              </figcaption>
            </figure>
            <div className="detail-info">
              <p className="eyebrow">{game.genre} · {game.complexity}</p>
              <h1 id="game-title">{game.title}</h1>
              <p className="lead">{game.description}</p>
              <dl className="facts">
                <div><dt>Jogadores</dt><dd>{playersLabel(game.minPlayers, game.maxPlayers)}</dd></div>
                <div><dt>Duração média</dt><dd>~{game.durationMinutes} min</dd></div>
                <div><dt>Complexidade</dt><dd>{game.complexity}</dd></div>
                <div>
                  <dt>Proprietário</dt>
                  <dd>
                    {game.owners.length ? (
                      game.owners.map((o) => (
                        <span key={o.userId} className="inline-flex items-center gap-2">
                          <PlayerAvatar playerId={o.userId} name={o.displayName} src={o.avatarUrl} size="xs" decorative />
                          {o.displayName}
                        </span>
                      ))
                    ) : (
                      'Sem proprietário'
                    )}
                  </dd>
                </div>
                <div><dt>Exemplares</dt><dd>{copies || '—'}</dd></div>
                <div><dt>Conservação</dt><dd>{game.owners[0] ? CONDITION_LABELS[game.owners[0].condition] : '—'}</dd></div>
              </dl>

              {user ? (
                <>
                  <fieldset className="status-group">
                    <legend>Estado de jogo</legend>
                    <div className="segmented">
                      {STATUS_OPTIONS.map((o) => (
                        <label key={o.value} className="segment">
                          <input type="radio" name="status" value={o.value} checked={game.status === o.value} onChange={() => setStatus(o.value)} />
                          <span>{o.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="detail-actions">
                    <Button variant="primary" onClick={markPlayedToday} loading={create.isPending} icon={<Icon name="check" />}>
                      Marcar como jogado hoje
                    </Button>
                    <Button variant="secondary" className="btn-fav" aria-pressed={game.isFavorite} onClick={toggleFavorite} icon={<Icon name="heart" />}>
                      {game.isFavorite ? 'Nos favoritos' : 'Adicionar aos favoritos'}
                    </Button>
                  </div>
                </>
              ) : (
                <LoginRequiredNotice message="Entra para alterar o estado, marcar favoritos e registar sessões." />
              )}
            </div>
          </article>
        </div>
      </div>

      <div className="container section detail-lower">
        <Card className="sessions" title="Diário de sessões" titleId="sessions-title" description="Cada partida registada acrescenta uma página à tua história.">
          {user ? (
            <>
              <GameSessionForm defaultDuration={game.durationMinutes} onSubmit={submitSession} />
              {sessionsQuery.isLoading ? (
                <LoadingState variant="lines" count={4} label="A carregar sessões…" />
              ) : sessionsQuery.isError ? (
                <ErrorState compact message={errorMessage(sessionsQuery.error)} onRetry={() => void sessionsQuery.refetch()} />
              ) : sessions.length ? (
                <ol className="session-list">
                  {sessions.map((s) => (
                    <li key={s.id} className="session-item">
                      <div className="session-date"><Icon name="calendar" /><time dateTime={s.playedAt}>{formatDate(s.playedAt)}</time></div>
                      <p className="session-people">
                        {s.playersCount && <><Icon name="users" />{s.playersCount} jogadores</>}
                        {s.durationMinutes && <><Icon name="clock" />{s.durationMinutes} min</>}
                        {s.rating && <span className="session-rating" aria-label={`Avaliação: ${s.rating} de 5`}>{'★'.repeat(s.rating)}<span aria-hidden="true" className="opacity-30">{'★'.repeat(5 - s.rating)}</span></span>}
                      </p>
                      {s.notes && <p className="session-notes">{s.notes}</p>}
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Remover sessão de ${formatDate(s.playedAt)}`}
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(s.id, { onSuccess: () => notify('Sessão removida', { icon: 'trash' }), onError: (e) => notify(errorMessage(e), { tone: 'error' }) })}
                      >
                        <Icon name="trash" />
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState compact symbol="scroll" title="Ainda não há sessões registadas" description="Este jogo espera pela sua primeira história. Regista uma sessão acima ou marca-o como jogado." />
              )}
            </>
          ) : (
            <EmptyState compact symbol="lock" title="O diário é pessoal" description="Inicia sessão para registar e consultar as tuas sessões." action={<Link className="btn btn-primary" to="/login" state={{ from: `/games/${game.slug}` }}>Entrar</Link>} />
          )}
        </Card>

        <section className="recs" aria-labelledby="recs-title">
          <h2 id="recs-title">Jogos relacionados</h2>
          {related.length ? <GameGrid games={related} compact label="Jogos relacionados" /> : <p className="muted">Ainda não há recomendações para este jogo.</p>}
        </section>
      </div>
    </>
  );
}
