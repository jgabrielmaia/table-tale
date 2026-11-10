import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { SeasonalIdentityProfile } from '@/components/identity/SeasonalIdentityProfile';
import { Scenery } from '@/components/layout/Scenery';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { fetchActiveSeason, fetchMyIdentities } from '@/features/fate/api';
import { fetchProfile } from '@/features/profile/api';
import { useAuth } from '@/hooks/useAuth';
import { useLore } from '@/hooks/useLore';
import { useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/queryKeys';
import { isSupabaseConfigured } from '@/lib/supabase';
import { usePageSeo } from '@/seo/RouteSeo';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Another player's public page: name, level, faction, bio and Fate card (all public data).
 * Achievements, the session diary and "My games" are private, so they are not shown. Your own id goes to /profile.
 */
export function PlayerPage() {
  const { t } = useI18n();
  const { id = '' } = useParams();
  const { user } = useAuth();
  const valid = UUID.test(id);
  const enabled = isSupabaseConfigured && valid && id !== user?.id;

  const profile = useQuery({ queryKey: queryKeys.player(id), queryFn: () => fetchProfile(id, null), enabled });
  const identities = useQuery({ queryKey: queryKeys.myIdentities(id), queryFn: () => fetchMyIdentities(id), enabled });
  const season = useQuery({ queryKey: queryKeys.activeSeason, queryFn: fetchActiveSeason, enabled });
  const lore = useLore();

  const name = profile.data?.displayName || t('profile.noName');
  usePageSeo({
    title: profile.data ? `${name} | Table Tale` : `${t('player.notFoundTitle')} | Table Tale`,
    description: t('player.seoDescription', { name }),
    path: `/players/${id}`,
    // Player pages are for people, not search engines.
    noindex: true,
  });

  if (user && id === user.id) return <Navigate to="/profile" replace />;

  const notFound = !valid || (profile.isSuccess && !profile.data);
  if (notFound) {
    return (
      <div className="container section">
        <EmptyState headingLevel={2} title={t('player.notFoundTitle')} description={t('player.notFoundText')} action={<Link className="btn btn-primary" to="/communities">{t('player.backToCommunities')}</Link>} />
      </div>
    );
  }
  if (profile.isLoading) return <div className="container section"><LoadingState label={t('profile.loading')} /></div>;
  if (profile.isError || !profile.data) {
    return <div className="container section"><ErrorState message={errorMessage(profile.error)} onRetry={() => void profile.refetch()} /></div>;
  }

  const list = identities.data ?? [];
  const active = list.find((i) => i.isActive) ?? null;
  const history = list.filter((i) => !i.isActive);
  const faction = (lore.data?.factions ?? []).find((f) => f.slug === active?.faction) ?? null;

  return (
    <>
      <div className="profile-banner"><Scenery /></div>
      <div className="container profile">
        <ProfileHeader profile={profile.data} faction={faction} self={false} />
        {identities.isLoading ? (
          <LoadingState variant="lines" count={2} className="my-6" />
        ) : identities.isError ? (
          <ErrorState compact message={errorMessage(identities.error)} onRetry={() => void identities.refetch()} />
        ) : (
          <SeasonalIdentityProfile active={active} history={history} seasonOpen={Boolean(season.data)} self={false} />
        )}
      </div>
    </>
  );
}
