import type { CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GameCover, coverAccent } from '@/components/games/GameCover';
import { GameGrid } from '@/components/games/GameGrid';
import { GameSessionForm } from '@/components/games/GameSessionForm';
import { GameTimer, type TimedSession } from '@/components/games/GameTimer';
import { statusOptions } from '@/components/games/GameStatusBadge';
import { Badge, BrandSymbol, Button, Card, EmptyState, ErrorState, Icon, LoadingState, useToast } from '@/components/ui';
import { PlayerAvatar } from '@/components/identity/PlayerAvatar';
import { LoginRequiredNotice } from '@/features/auth/LoginPage';
import { useAuth } from '@/hooks/useAuth';
import { useGame } from '@/hooks/useGame';
import { useGameSessions } from '@/hooks/useGameSessions';
import { useUpdateGameState } from '@/hooks/useGames';
import { complexityLabel, genreLabel, getLang, localizeGame, useI18n } from '@/i18n';
import { gameSeo, NOT_FOUND_SEO } from '@/seo/pages';
import { usePageSeo } from '@/seo/RouteSeo';
import { gameStyle } from '@/lib/cover';
import { errorMessage } from '@/lib/errors';
import { statusLabel, formatDate, playersLabel, todayIso } from '@/lib/format';
import type { GameStatus } from '@/types/domain';
import { relatedGames } from './filters';
import type { SessionFormValues } from './schemas';

export function GameDetailPage() {
  const { t, tn } = useI18n();
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const { game: rawGame, allGames, isLoading, isError, error, notFound } = useGame(slug);
  const game = rawGame ? localizeGame(rawGame) : rawGame;
  const lang = getLang();
  usePageSeo(game
    ? {
        ...gameSeo({ title: game.title, genre: genreLabel(game.genre), minPlayers: game.minPlayers, maxPlayers: game.maxPlayers, durationMinutes: game.durationMinutes, complexity: complexityLabel(game.complexity), description: game.description }, lang),
        path: `/games/${game.slug}`,
      }
    : { title: NOT_FOUND_SEO.title[lang], description: NOT_FOUND_SEO.description[lang], path: `/games/${slug}`, noindex: !isLoading });
  const { sessions, query: sessionsQuery, create, remove } = useGameSessions(game?.id);
  const updateState = useUpdateGameState();
  const { notify } = useToast();

  if (isLoading) return <div className="container section"><LoadingState label={t('game.loading')} /></div>;
  if (isError) return <div className="container section"><ErrorState message={errorMessage(error)} /></div>;
  if (notFound || !game) {
    return (
      <div className="container section">
        <EmptyState headingLevel={2} title={t('game.notFoundTitle')} description={t('game.notFoundText')} action={<Link className="btn btn-primary" to="/library">{t('common.backToLibrary')}</Link>} />
      </div>
    );
  }

  const related = relatedGames(game, allGames);
  const copies = game.owners.reduce((sum, o) => sum + o.copies, 0);
  const style = { '--accent': coverAccent(game.slug, game.genre) } as CSSProperties;
  const timeFormatter = new Intl.DateTimeFormat(getLang() === 'pt' ? 'pt-PT' : 'en-GB', { hour: '2-digit', minute: '2-digit' });

  const setStatus = (status: GameStatus) =>
    updateState.mutate(
      { gameId: game.id, status },
      { onSuccess: () => notify(t('game.statusUpdated', { status: statusLabel(status) })), onError: (e) => notify(errorMessage(e), { tone: 'error' }) },
    );

  const toggleFavorite = () =>
    updateState.mutate(
      { gameId: game.id, isFavorite: !game.isFavorite },
      {
        onSuccess: () => notify(game.isFavorite ? t('library.favRemoved') : t('library.favAdded'), { icon: 'heart' }),
        onError: (e) => notify(errorMessage(e), { tone: 'error' }),
      },
    );

  const markPlayedToday = () =>
    create.mutate(
      { gameId: game.id, playedAt: todayIso(), durationMinutes: game.durationMinutes },
      {
        onSuccess: () => {
          if (game.status === 'unplayed') updateState.mutate({ gameId: game.id, status: 'in_progress' });
          notify(t('game.playedToday'));
        },
        onError: (e) => notify(errorMessage(e), { tone: 'error' }),
      },
    );

  const submitSession = async (values: SessionFormValues) => {
    try {
      await create.mutateAsync({ gameId: game.id, ...values });
      if (game.status === 'unplayed') updateState.mutate({ gameId: game.id, status: 'in_progress' });
      notify(t('game.sessionSaved'));
    } catch (e) {
      notify(errorMessage(e), { tone: 'error' });
      throw e;
    }
  };

  const submitTimedSession = async ({ startedAt, endedAt, durationMinutes }: TimedSession) => {
    try {
      await create.mutateAsync({
        gameId: game.id,
        playedAt: new Date(startedAt).toLocaleDateString('sv-SE'),
        startedAt,
        endedAt,
        durationMinutes,
      });
      if (game.status === 'unplayed') updateState.mutate({ gameId: game.id, status: 'in_progress' });
      notify(t('game.sessionSaved'));
    } catch (e) {
      notify(errorMessage(e), { tone: 'error' });
      throw e;
    }
  };

  return (
    <>
      <div className="detail-backdrop" style={style}>
        <div className="container section">
          <Link className="back-link" to="/library"><Icon name="back" />{t('common.backToLibrary')}</Link>
          <article className="detail-grid" aria-labelledby="game-title">
            <figure className="detail-media">
              <GameCover slug={game.slug} title={game.title} genre={game.genre} coverUrl={game.coverUrl} loading="eager" />
              <figcaption>
                <Badge tone="accent" color={coverAccent(game.slug, game.genre)} icon={<BrandSymbol name={gameStyle(game.slug, game.genre).symbol} />}>{genreLabel(game.genre)}</Badge>
              </figcaption>
            </figure>
            <div className="detail-info">
              <p className="eyebrow">{genreLabel(game.genre)} · {complexityLabel(game.complexity)}</p>
              <h1 id="game-title">{game.title}</h1>
              <p className="lead">{game.description}</p>
              <dl className="facts">
                <div><dt>{t('game.players')}</dt><dd>{playersLabel(game.minPlayers, game.maxPlayers)}</dd></div>
                <div><dt>{t('game.avgDuration')}</dt><dd>{t('common.minutesApprox', { n: game.durationMinutes })}</dd></div>
                <div><dt>{t('game.complexity')}</dt><dd>{complexityLabel(game.complexity)}</dd></div>
                <div>
                  <dt>{t('game.owner')}</dt>
                  <dd>
                    {game.owners.length ? (
                      game.owners.map((o) => (
                        <span key={o.userId} className="inline-flex items-center gap-2">
                          <PlayerAvatar playerId={o.userId} name={o.displayName} src={o.avatarUrl} size="xs" decorative />
                          {o.displayName}
                        </span>
                      ))
                    ) : (
                      t('game.noOwner')
                    )}
                  </dd>
                </div>
                <div><dt>{t('game.copies')}</dt><dd>{copies || '—'}</dd></div>
                <div><dt>{t('game.condition')}</dt><dd>{game.owners[0] ? t(`condition.${game.owners[0].condition}`) : '—'}</dd></div>
              </dl>

              {user ? (
                <>
                  <fieldset className="status-group">
                    <legend>{t('game.statusLegend')}</legend>
                    <div className="segmented">
                      {statusOptions().map((o) => (
                        <label key={o.value} className="segment">
                          <input type="radio" name="status" value={o.value} checked={game.status === o.value} onChange={() => setStatus(o.value)} />
                          <span>{o.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="detail-actions">
                    <Button variant="primary" onClick={markPlayedToday} loading={create.isPending} icon={<Icon name="check" />}>
                      {t('game.markToday')}
                    </Button>
                    <Button variant="secondary" className="btn-fav" aria-pressed={game.isFavorite} onClick={toggleFavorite} icon={<Icon name="heart" />}>
                      {game.isFavorite ? t('game.inFavorites') : t('game.addFavorites')}
                    </Button>
                  </div>
                  <GameTimer userId={user.id} gameId={game.id} onComplete={submitTimedSession} />
                </>
              ) : (
                <LoginRequiredNotice message={t('game.loginNotice')} />
              )}
            </div>
          </article>
        </div>
      </div>

      <div className="container section detail-lower">
        <Card className="sessions" title={t('game.diaryTitle')} titleId="sessions-title" description={t('game.diaryDesc')}>
          {user ? (
            <>
              <GameSessionForm defaultDuration={game.durationMinutes} onSubmit={submitSession} />
              {sessionsQuery.isLoading ? (
                <LoadingState variant="lines" count={4} label={t('game.loadingSessions')} />
              ) : sessionsQuery.isError ? (
                <ErrorState compact message={errorMessage(sessionsQuery.error)} onRetry={() => void sessionsQuery.refetch()} />
              ) : sessions.length ? (
                <ol className="session-list">
                  {sessions.map((s) => (
                    <li key={s.id} className="session-item">
                      <div className="session-date"><Icon name="calendar" /><time dateTime={s.playedAt}>{formatDate(s.playedAt)}</time></div>
                      {s.startedAt && s.endedAt && (
                        <p className="session-times">
                          <time dateTime={s.startedAt}>{t('game.startedAt', { time: timeFormatter.format(new Date(s.startedAt)) })}</time>
                          <time dateTime={s.endedAt}>{t('game.endedAt', { time: timeFormatter.format(new Date(s.endedAt)) })}</time>
                        </p>
                      )}
                      <p className="session-people">
                        {s.playersCount && <><Icon name="users" />{tn('common.players', s.playersCount)}</>}
                        {s.durationMinutes && <><Icon name="clock" />{t('common.minutes', { n: s.durationMinutes })}</>}
                        {s.rating && <span className="session-rating" aria-label={t('game.rating', { n: s.rating })}>{'★'.repeat(s.rating)}<span aria-hidden="true" className="opacity-30">{'★'.repeat(5 - s.rating)}</span></span>}
                      </p>
                      {s.notes && <p className="session-notes">{s.notes}</p>}
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={t('game.removeSession', { date: formatDate(s.playedAt) })}
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(s.id, { onSuccess: () => notify(t('game.sessionRemoved'), { icon: 'trash' }), onError: (e) => notify(errorMessage(e), { tone: 'error' }) })}
                      >
                        <Icon name="trash" />
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState compact symbol="scroll" title={t('game.noSessionsTitle')} description={t('game.noSessionsText')} />
              )}
            </>
          ) : (
            <EmptyState compact symbol="lock" title={t('game.diaryPrivate')} description={t('game.diaryPrivateText')} action={<Link className="btn btn-primary" to="/login" state={{ from: `/games/${game.slug}` }}>{t('common.signIn')}</Link>} />
          )}
        </Card>

        <section className="recs" aria-labelledby="recs-title">
          <h2 id="recs-title">{t('game.related')}</h2>
          {related.length ? <GameGrid games={related} compact label={t('game.related')} /> : <p className="muted">{t('game.noRelated')}</p>}
        </section>
      </div>
    </>
  );
}
