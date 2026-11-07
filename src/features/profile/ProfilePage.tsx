import { useState } from 'react';
import { AchievementCard } from '@/components/profile/AchievementCard';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { Scenery } from '@/components/layout/Scenery';
import { Button, Card, ErrorState, Icon, LoadingState, useToast } from '@/components/ui';
import { useAchievements } from '@/hooks/useAchievements';
import { useAuth } from '@/hooks/useAuth';
import { useFate } from '@/hooks/useFate';
import { SeasonalIdentityProfile } from '@/components/identity/SeasonalIdentityProfile';
import { useLore } from '@/hooks/useLore';
import { useProfile } from '@/hooks/useProfile';
import { errorMessage } from '@/lib/errors';
import { useI18n } from '@/i18n';
import { ProfileEditModal } from './ProfileEditModal';
import { MyCommunitiesCard, MyLibraryCard } from '@/features/communities/ProfileCommunities';
import { OAUTH_PROVIDERS, PROVIDER_NAMES, providerName, type OAuthProvider } from '@/features/auth/providers';

export function ProfilePage() {
  const { t } = useI18n();
  const { providers, linkProvider } = useAuth();
  const { profile, stats, update, providerAvatar } = useProfile();
  const achievements = useAchievements();
  const lore = useLore();
  const fate = useFate();
  const { notify } = useToast();
  const [editing, setEditing] = useState(false);

  if (profile.isLoading) return <div className="container section"><LoadingState label={t('profile.loading')} /></div>;
  if (profile.isError || !profile.data) {
    return (
      <div className="container section">
        <ErrorState
          message={profile.isError ? errorMessage(profile.error) : t('profile.creating')}
          onRetry={() => void profile.refetch()}
        />
      </div>
    );
  }

  const p = profile.data;
  const factions = lore.data?.factions ?? [];
  // The faction comes from this season's card; the player never picks it.
  const faction = factions.find((f) => f.slug === fate.active?.faction) ?? null;
  const achievementList = achievements.data ?? [];
  // Discovered first (newest on top), then the ones still to discover (closest to done first).
  const found = achievementList.filter((a) => a.unlockedAt).sort((a, b) => String(b.unlockedAt).localeCompare(String(a.unlockedAt)));
  const hidden = achievementList.filter((a) => !a.unlockedAt).sort((a, b) => b.progress / b.requirementValue - a.progress / a.requirementValue);
  // GitHub sign-in stays available on the login page, but linking it from the profile is not offered.
  const unlinked = OAUTH_PROVIDERS.filter((pr) => pr !== 'github' && !providers.includes(pr));

  const save = async (values: Parameters<typeof update.mutateAsync>[0]) => {
    try {
      await update.mutateAsync(values);
      notify(t('profile.updated'));
    } catch (e) {
      notify(errorMessage(e), { tone: 'error' });
      throw e;
    }
  };

  const onLink = async (provider: OAuthProvider) => {
    try {
      await linkProvider(provider);
    } catch (e) {
      notify(errorMessage(e), { tone: 'error' });
    }
  };

  return (
    <>
      <div className="profile-banner"><Scenery /></div>
      <div className="container profile">
        <ProfileHeader
          profile={p}
          faction={faction}
          actions={
            <>
              <Button variant="secondary" icon={<Icon name="edit" />} onClick={() => setEditing(true)}>{t('profile.edit')}</Button>
              {unlinked.map((pr) => (
                <Button key={pr} variant="ghost" icon={<Icon name={pr} />} onClick={() => void onLink(pr)}>{t('profile.link', { provider: PROVIDER_NAMES[pr] })}</Button>
              ))}
            </>
          }
        />

        {fate.state !== 'loading' && (
          <SeasonalIdentityProfile active={fate.active} history={fate.history} seasonOpen={Boolean(fate.season.data)} />
        )}

        {stats.isLoading ? (
          <LoadingState variant="lines" count={2} label={t('profile.statsLoading')} className="my-6" />
        ) : stats.isError || !stats.data ? (
          <ErrorState compact message={errorMessage(stats.error)} onRetry={() => void stats.refetch()} />
        ) : (
          <ProfileStats stats={stats.data} achievementsTotal={achievementList.length} />
        )}

        <MyCommunitiesCard />
        <MyLibraryCard />

        <Card title={t('profile.achievements')} titleId="ach-title" description={t('profile.achievementsDesc', { done: stats.data?.achievementsUnlocked ?? 0, total: achievementList.length })} className="achievements">
          {achievements.isLoading ? (
            <LoadingState variant="lines" count={3} />
          ) : achievements.isError ? (
            <ErrorState compact message={errorMessage(achievements.error)} onRetry={() => void achievements.refetch()} />
          ) : (
            <>
              {[
                { key: 'found', title: t('ach.groupFound'), items: found },
                { key: 'hidden', title: t('ach.groupHidden'), items: hidden },
              ].filter((g) => g.items.length).map((g) => (
                <section key={g.key} aria-label={g.title}>
                  <h3 className="medal-group">{g.title} <span>{g.items.length}</span></h3>
                  <ul className="medal-grid" role="list">
                    {g.items.map((a) => <AchievementCard key={a.id} achievement={a} />)}
                  </ul>
                </section>
              ))}
            </>
          )}
        </Card>

        <p className="mt-6 text-sm text-muted">
          {t('profile.loginMethods', { list: providers.length ? providers.map((pr) => (pr === 'email' ? t('profile.methodEmail') : providerName(pr))).join(', ') : '—' })}
        </p>
      </div>

      <ProfileEditModal open={editing} profile={p} saving={update.isPending} providerAvatar={providerAvatar} onClose={() => setEditing(false)} onSave={save} />
    </>
  );
}
