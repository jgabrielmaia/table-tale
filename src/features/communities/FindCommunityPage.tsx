import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, ButtonLink, EmptyState, ErrorState, Icon, LoadingState, Select, useToast } from '@/components/ui';
import { useCommunities, useJoinCommunity, useMyMemberships } from '@/hooks/useCommunities';
import { useViewerLocation } from '@/hooks/useViewerLocation';
import { cityOptions, RADIUS_OPTIONS_KM } from '@/features/games/shelves';
import { getLocale, useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import type { Community } from '@/types/domain';
import { CommunityCard } from './CommunitiesPage';
import { hasActiveCommunity, nearbyCommunities } from './nearby';

/**
 * Onboarding step after the Fate Draw: new players belong to no community until they pick one here.
 * Reuses the communities list (cards, membership badges) and the Games page's location and radius.
 */
export function FindCommunityPage() {
  const { t, tn } = useI18n();
  const { notify } = useToast();
  const { communities, membershipOf, isLoading, isError, error, refetch } = useCommunities();
  const mine = useMyMemberships();
  const join = useJoinCommunity();
  const location = useViewerLocation();

  const cities = useMemo(() => cityOptions(communities), [communities]);
  const city = location.cityKey ? cities.find((c) => c.key === location.cityKey) ?? null : null;
  const origin = location.browserPoint ?? city?.point ?? null;
  const list = useMemo(
    () => nearbyCommunities(communities, origin, location.radiusKm, membershipOf, getLocale()),
    [communities, origin, location.radiusKm, membershipOf],
  );

  const member = hasActiveCommunity(mine.data);
  const pending = !member && (mine.data ?? []).some((m) => m.status === 'pending');
  const locating = location.status === 'locating' || location.status === 'idle';
  const needsCity = location.status === 'denied' || location.status === 'unavailable';

  const onJoin = async (community: Community) => {
    try {
      const status = await join.mutateAsync(community);
      notify(status === 'active' ? t('communities.joined') : t('communities.requested'));
    } catch (e) {
      notify(errorMessage(e), { tone: 'error' });
    }
  };

  return (
    <div className="container section">
      <div className="section-head">
        <div>
          <p className="eyebrow">{t('onboarding.eyebrow')}</p>
          <h1>{t('onboarding.title')}</h1>
          <p className="muted onboarding-lead">{t('onboarding.lead')}</p>
        </div>
      </div>

      <section className="filters games-reach" aria-label={t('onboarding.reachAria')}>
        <div className="games-reach-where" aria-live="polite">
          <p className="text-sm">
            <Icon name="pin" />{' '}
            {location.status === 'browser'
              ? t('games.whereBrowser')
              : location.status === 'city' && city
                ? t('games.whereCity', { city: city.label })
                : locating
                  ? t('games.whereLocating')
                  : t('onboarding.whereUnknown')}
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
        {origin && (
          <Select
            label={t('games.radius')}
            value={String(location.radiusKm)}
            onChange={(e) => location.setRadius(Number(e.target.value))}
            options={RADIUS_OPTIONS_KM.map((km) => ({ value: String(km), label: t('games.radiusKm', { km }) }))}
          />
        )}
      </section>

      {(member || pending) && (
        <div className="notice onboarding-notice" role="status">
          <p>{member ? t('onboarding.joinedNotice') : t('onboarding.pendingNotice')}</p>
          {member && <ButtonLink to="/games" variant="gold" size="sm">{t('onboarding.continue')}</ButtonLink>}
        </div>
      )}

      {isLoading ? (
        <LoadingState variant="lines" count={4} />
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          title={t('onboarding.emptyTitle', { km: location.radiusKm })}
          description={t('onboarding.emptyDesc')}
          action={<ButtonLink to="/communities" variant="secondary">{t('onboarding.seeAll')}</ButtonLink>}
        />
      ) : (
        <>
          <p className="results-count" aria-live="polite">
            {origin ? tn('onboarding.near', list.length, { km: location.radiusKm }) : tn('communities.found', list.length)}
          </p>
          <ul className="community-grid" role="list" aria-label={t('onboarding.listLabel')}>
            {list.map(({ community, distanceKm }) => {
              const membership = membershipOf(community.id);
              const isPublic = community.visibility === 'public';
              return (
                <CommunityCard
                  key={community.id}
                  community={community}
                  membership={membership}
                  distanceKm={distanceKm}
                  action={
                    !membership && (
                      <Button
                        size="sm"
                        variant={isPublic ? 'gold' : 'secondary'}
                        aria-label={t(isPublic ? 'onboarding.joinNamed' : 'onboarding.requestNamed', { name: community.name })}
                        loading={join.isPending && join.variables?.id === community.id}
                        disabled={join.isPending}
                        onClick={() => void onJoin(community)}
                      >
                        {isPublic ? t('communities.join') : t('communities.requestJoin')}
                      </Button>
                    )
                  }
                />
              );
            })}
          </ul>
        </>
      )}

      <div className="onboarding-footer">
        <p className="muted">
          {t('onboarding.createHint')} <Link to="/communities/new">{t('communities.create')}</Link>
        </p>
        <div className="section-actions">
          <ButtonLink to="/communities" variant="ghost">{t('onboarding.seeAll')}</ButtonLink>
          {!member && <ButtonLink to="/profile" variant="ghost">{t('onboarding.skip')}</ButtonLink>}
        </div>
      </div>
    </div>
  );
}
