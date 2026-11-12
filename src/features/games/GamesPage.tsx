import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GameFilters } from '@/components/games/GameFilters';
import { GameGrid } from '@/components/games/GameGrid';
import { BggCredit } from '@/components/bgg/BggCredit';
import { Button, ButtonLink, EmptyState, ErrorState, Icon, LoadingState, Select } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMyMemberships } from '@/hooks/useCommunities';
import { useGameCardActions } from '@/hooks/useGameCardActions';
import { useShelfGames } from '@/hooks/useShelfGames';
import { useViewerLocation } from '@/hooks/useViewerLocation';
import { getLocale, useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { EMPTY_FILTERS, filterGames, hasActiveFilters, type GameFilterValues } from './filters';
import { RADIUS_OPTIONS_KM, shelfCommunities, sortShelfGames, type GamesSort } from './shelves';

const uniqueSorted = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, getLocale()));

export function GamesPage() {
  const { t, tn } = useI18n();
  const { user } = useAuth();
  const cardActions = useGameCardActions();
  const mine = useMyMemberships();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<GameFilterValues>({ ...EMPTY_FILTERS, query: params.get('q') ?? '' });
  const [communityId, setCommunityId] = useState('');
  const [sort, setSort] = useState<GamesSort>('title');

  const location = useViewerLocation();
  const { games, cities, city, origin, hasMemberships, isLoading, isError, error, refetch } = useShelfGames(location);

  const categories = useMemo(() => uniqueSorted(games.flatMap((g) => g.categories)), [games]);
  const mechanics = useMemo(() => uniqueSorted(games.flatMap((g) => g.mechanics)), [games]);
  const inView = useMemo(() => shelfCommunities(games), [games]);
  const visible = useMemo(() => {
    const filtered = filterGames(games, filters).filter((g) => !communityId || g.shelves.some((s) => s.communityId === communityId));
    return sortShelfGames(filtered, sort, getLocale());
  }, [games, filters, communityId, sort]);

  const changeFilters = (next: GameFilterValues) => {
    setFilters(next);
    setParams(next.query ? { q: next.query } : {}, { replace: true });
  };
  const reset = () => {
    changeFilters(EMPTY_FILTERS);
    setCommunityId('');
  };

  const locating = location.status === 'locating' || location.status === 'idle';
  const needsCity = location.status === 'denied' || location.status === 'unavailable';

  return (
    <div className="container section">
      <div className="section-head">
        <div>
          <p className="eyebrow">{t('games.eyebrow')}</p>
          <h1>{t('games.title')}</h1>
        </div>
        {!isLoading && !isError && (
          <p className="results-count" aria-live="polite">
            {tn('games.found', visible.length)}
          </p>
        )}
      </div>

      {user && mine.isSuccess && !hasMemberships && (
        <section className="panel no-community" aria-labelledby="no-community-title">
          <div>
            <h2 id="no-community-title">{t('games.noCommunityTitle')}</h2>
            <p className="muted">{mine.data.some((m) => m.status === 'pending') ? t('games.pendingCommunityDesc') : t('games.noCommunityDesc')}</p>
          </div>
          <ButtonLink to="/find-community" variant="gold" size="sm">{t('communities.findMine')}</ButtonLink>
        </section>
      )}

      <section className="filters games-reach" aria-label={t('games.reachAria')}>
        <div className="games-reach-where" aria-live="polite">
          <p className="text-sm">
            <Icon name="pin" />{' '}
            {location.status === 'browser'
              ? t('games.whereBrowser')
              : location.status === 'city' && city
                ? t('games.whereCity', { city: city.label })
                : locating
                  ? t('games.whereLocating')
                  : t('games.whereUnknown')}
          </p>
          {location.status !== 'browser' && !locating && (
            <Button variant="secondary" size="sm" onClick={location.locate}>{t('games.useMyLocation')}</Button>
          )}
        </div>
        {(needsCity || location.status === 'city') && cities.length > 0 && (
          <Select
            label={t('games.city')}
            value={city?.key ?? ''}
            onChange={(e) => e.target.value && location.chooseCity(e.target.value)}
            options={[{ value: '', label: t('games.cityPick') }, ...cities.map((c) => ({ value: c.key, label: c.label }))]}
          />
        )}
        <Select
          label={t('games.radius')}
          value={String(location.radiusKm)}
          onChange={(e) => location.setRadius(Number(e.target.value))}
          options={RADIUS_OPTIONS_KM.map((km) => ({ value: String(km), label: t('games.radiusKm', { km }) }))}
        />
        <Select
          label={t('games.community')}
          value={communityId}
          onChange={(e) => setCommunityId(e.target.value)}
          options={[{ value: '', label: t('filters.all') }, ...inView.map((c) => ({ value: c.id, label: c.name }))]}
        />
        <Select
          label={t('games.sort')}
          value={sort}
          onChange={(e) => setSort(e.target.value as GamesSort)}
          options={[
            { value: 'title', label: t('games.sortTitle') },
            { value: 'nearest', label: t('games.sortNearest') },
            { value: 'bgg', label: t('games.sortBgg') },
          ]}
        />
      </section>

      <GameFilters values={filters} categories={categories} mechanics={mechanics} onChange={changeFilters} onReset={reset} showPersonalFilters={Boolean(user)} />

      {isLoading ? (
        <LoadingState variant="cards" label={t('games.loading')} />
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : !games.length ? (
        <EmptyState
          title={t('games.emptyTitle')}
          description={origin ? t('games.emptyNearby', { km: location.radiusKm }) : hasMemberships ? t('games.emptyMine') : t('games.emptyNoLocation')}
          action={<ButtonLink to="/communities" variant="secondary">{t('games.findCommunity')}</ButtonLink>}
        />
      ) : !visible.length ? (
        <EmptyState
          title={t('games.noResultsTitle')}
          description={
            <>
              {filters.query && <>{t('games.noResultsFor', { query: filters.query })}</>}
              {t('games.noResultsText')}
            </>
          }
          action={(hasActiveFilters(filters) || communityId) && <Button variant="secondary" onClick={reset}>{t('games.clearFilters')}</Button>}
        />
      ) : (
        <GameGrid
          games={visible}
          label={t('games.gamesLabel')}
          {...cardActions}
        />
      )}

      {games.some((g) => g.bggId !== null) && <p className="mt-6 text-center"><BggCredit /></p>}

      <p className="mt-10 text-center text-sm text-muted">
        {t('games.loreCta')} <Link to="/lore">{t('nav.lore')}</Link>
      </p>
    </div>
  );
}
