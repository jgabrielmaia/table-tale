import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge, Button, ButtonLink, EmptyState, ErrorState, Icon, Input, LoadingState, Select } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCommunities } from '@/hooks/useCommunities';
import { useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { formatKm } from '@/features/games/shelves';
import type { Community, MyMembership } from '@/types/domain';
import {
  EMPTY_COMMUNITY_FILTERS,
  cityOptions,
  districtOptions,
  filterCommunities,
  hasActiveCommunityFilters,
  type CommunityFilterValues,
} from './filters';

export function CommunitiesPage() {
  const { t, tn } = useI18n();
  const { user } = useAuth();
  const { communities, membershipOf, isLoading, isError, error, refetch } = useCommunities();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<CommunityFilterValues>({
    query: params.get('q') ?? '',
    city: params.get('city') ?? '',
    district: params.get('district') ?? '',
  });

  const cities = useMemo(() => cityOptions(communities), [communities]);
  const districts = useMemo(() => districtOptions(communities, filters.city), [communities, filters.city]);
  const visible = useMemo(() => filterCommunities(communities, filters), [communities, filters]);

  const change = (next: CommunityFilterValues) => {
    setFilters(next);
    const p: Record<string, string> = {};
    if (next.query) p.q = next.query;
    if (next.city) p.city = next.city;
    if (next.district) p.district = next.district;
    setParams(p, { replace: true });
  };

  return (
    <div className="container section">
      <div className="section-head">
        <div>
          <p className="eyebrow">{t('communities.eyebrow')}</p>
          <h1>{t('communities.title')}</h1>
        </div>
        <div className="section-actions">
          {!isLoading && !isError && <p className="results-count" aria-live="polite">{tn('communities.found', visible.length)}</p>}
          {user && <ButtonLink to="/communities/new" variant="gold" icon={<Icon name="plus" />}>{t('communities.create')}</ButtonLink>}
        </div>
      </div>

      <div className="filters filters-communities" role="search">
        <Input
          label={t('communities.search')}
          type="search"
          value={filters.query}
          placeholder={t('communities.searchPlaceholder')}
          leadingIcon={<Icon name="search" />}
          onChange={(e) => change({ ...filters, query: e.target.value })}
        />
        <Select
          label={t('communities.city')}
          value={filters.city}
          options={[{ value: '', label: t('communities.anyCity') }, ...cities.map((c) => ({ value: c, label: c }))]}
          onChange={(e) => change({ ...filters, city: e.target.value, district: '' })}
        />
        <Select
          label={t('communities.district')}
          value={filters.district}
          options={[{ value: '', label: t('communities.anyDistrict') }, ...districts.map((d) => ({ value: d, label: d }))]}
          onChange={(e) => change({ ...filters, district: e.target.value })}
        />
        {hasActiveCommunityFilters(filters) && (
          <Button variant="ghost" onClick={() => change(EMPTY_COMMUNITY_FILTERS)}>{t('communities.clearFilters')}</Button>
        )}
      </div>

      {isLoading ? (
        <LoadingState variant="lines" count={4} />
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          title={t('communities.emptyTitle')}
          description={t('communities.emptyDesc')}
          action={hasActiveCommunityFilters(filters) ? <Button onClick={() => change(EMPTY_COMMUNITY_FILTERS)}>{t('communities.clearFilters')}</Button> : undefined}
        />
      ) : (
        <ul className="community-grid" role="list">
          {visible.map((c) => <CommunityCard key={c.id} community={c} membership={membershipOf(c.id)} />)}
        </ul>
      )}
    </div>
  );
}

export function MembershipBadge({ membership }: { membership: MyMembership | null }) {
  const { t } = useI18n();
  if (!membership) return null;
  if (membership.status === 'pending') return <Badge tone="progress">{t('communities.pendingBadge')}</Badge>;
  if (membership.status === 'suspended') return <Badge tone="neutral">{t('communities.suspendedBadge')}</Badge>;
  return <Badge tone="success">{t(`communities.role.${membership.role}`)}</Badge>;
}

interface CommunityCardProps {
  community: Community;
  membership: MyMembership | null;
  /** Shown next to the place when known (the find-a-community step). */
  distanceKm?: number | null;
  /** An extra control under the card, such as Join. */
  action?: ReactNode;
}

export function CommunityCard({ community: c, membership, distanceKm = null, action }: CommunityCardProps) {
  const { t, tn } = useI18n();
  return (
    <li className={c.coverUrl ? 'panel community-card community-card--cover' : 'panel community-card'}>
      {c.coverUrl && (
        <div className="community-cover community-cover--card">
          {/* Decorative here: the card's title already names the community. */}
          <img src={c.coverUrl} alt="" loading="lazy" />
        </div>
      )}
      <h2><Link to={`/communities/${c.slug}`}>{c.name}</Link></h2>
      <p className="community-place">
        <Icon name="pin" /> {c.district}, {c.city} · {c.country}
        {distanceKm !== null && <> · {t('onboarding.distance', { km: formatKm(distanceKm) })}</>}
      </p>
      {c.description && <p className="muted">{c.description}</p>}
      <div className="community-meta">
        <Badge tone="accent" icon={<Icon name={c.visibility === 'public' ? 'users' : 'lock'} />}>
          {c.visibility === 'public' ? t('communities.public') : t('communities.private')}
        </Badge>
        <span className="muted">{tn('communities.members', c.memberCount)}</span>
        <MembershipBadge membership={membership} />
      </div>
      {action && <div className="community-card__action">{action}</div>}
    </li>
  );
}
