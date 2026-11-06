import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, ButtonLink, Card, EmptyState, ErrorState, Icon, LoadingState, Select, useToast } from '@/components/ui';
import { useGames } from '@/hooks/useGames';
import { useMyCommunities, useMyLibrary } from '@/hooks/useCommunities';
import { genreLabel, useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { MembershipBadge } from './CommunitiesPage';

/** Profile section: the communities the user belongs to. Memberships are independent of the personal library. */
export function MyCommunitiesCard() {
  const { t } = useI18n();
  const { list, isLoading, isError, error, refetch } = useMyCommunities();
  return (
    <Card
      title={t('communities.myTitle')}
      titleId="my-communities-title"
      description={t('communities.myDesc')}
      actions={<ButtonLink to="/communities" variant="secondary" size="sm">{t('communities.discover')}</ButtonLink>}
      className="my-communities"
    >
      {isLoading ? (
        <LoadingState variant="lines" count={2} />
      ) : isError ? (
        <ErrorState compact message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : list.length === 0 ? (
        <EmptyState compact title={t('communities.myEmpty')} />
      ) : (
        <ul className="member-list" role="list">
          {list.map(({ community, membership }) => (
            <li key={community.id} className="member-row">
              <Link to={`/communities/${community.slug}`}>{community.name}</Link>
              <span className="muted">{community.district}, {community.city}</span>
              <MembershipBadge membership={membership} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Profile section: the personal collection (`user_games`), separate from any community library. */
export function MyLibraryCard() {
  const { t, tn } = useI18n();
  const { notify } = useToast();
  const { games: catalogue } = useGames();
  const lib = useMyLibrary();
  const [pick, setPick] = useState('');

  const act = async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch (e) {
      notify(errorMessage(e), { tone: 'error' });
    }
  };

  return (
    <Card title={t('communities.myLibraryTitle')} titleId="my-library-title" description={t('communities.myLibraryDesc')} className="my-library">
      <div className="library-add">
        <Select
          label={t('communities.addGameLabel')}
          value={pick}
          options={[{ value: '', label: t('communities.pickGame') }, ...catalogue.map((g) => ({ value: g.id, label: g.title }))]}
          onChange={(e) => setPick(e.target.value)}
        />
        <Button variant="gold" disabled={!pick} loading={lib.add.isPending} onClick={() => void act(() => lib.add.mutateAsync(pick)).then(() => setPick(''))}>
          {t('communities.myLibraryAdd')}
        </Button>
      </div>
      {lib.isLoading ? (
        <LoadingState variant="lines" count={2} />
      ) : lib.isError ? (
        <ErrorState compact message={errorMessage(lib.error)} onRetry={() => void lib.refetch()} />
      ) : lib.entries.length === 0 ? (
        <EmptyState compact title={t('communities.myLibraryEmpty')} />
      ) : (
        <ul className="community-library" role="list">
          {lib.entries.map((e) => (
            <li key={e.gameId} className="panel library-item">
              <h3><Link to={`/games/${e.game.slug}`}>{e.game.title}</Link></h3>
              <p className="muted">{genreLabel(e.game.genre)} · {tn('communities.copies', e.copies)}</p>
              <Button size="sm" variant="ghost" aria-label={t('communities.myLibraryRemove', { title: e.game.title })} icon={<Icon name="trash" />} onClick={() => void act(() => lib.remove.mutateAsync(e.gameId))} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
