import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ActivityTimeline } from '@/components/profile/ActivityTimeline';
import { AchievementCard } from '@/components/profile/AchievementCard';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { Scenery } from '@/components/layout/Scenery';
import { Button, Card, ErrorState, Icon, LoadingState, Tabs, useToast } from '@/components/ui';
import { useAchievements } from '@/hooks/useAchievements';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import { useFate } from '@/hooks/useFate';
import { SeasonalIdentityProfile } from '@/components/identity/SeasonalIdentityProfile';
import { useLore } from '@/hooks/useLore';
import { useProfile } from '@/hooks/useProfile';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { localizeEvent, useI18n } from '@/i18n';
import { ProfileEditModal } from './ProfileEditModal';
import { OAUTH_PROVIDERS, PROVIDER_NAMES, providerName, type OAuthProvider } from '@/features/auth/providers';

export function ProfilePage() {
  const { t } = useI18n();
  const { providers, linkProvider } = useAuth();
  const { profile, stats, activity, update, providerAvatar } = useProfile();
  const achievements = useAchievements();
  const { events } = useEvents();
  const lore = useLore();
  const fate = useFate();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState('activity');

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
  const attended = events.filter((e) => e.isParticipating).map(localizeEvent);
  const achievementList = achievements.data ?? [];
  const unlinked = OAUTH_PROVIDERS.filter((pr) => !providers.includes(pr));

  // TEMPORARY (dev builds only): clears this season's card and goes back to the draw.
  const resetCard = async () => {
    try {
      await fate.devReset.mutateAsync();
      navigate('/fate');
    } catch (e) {
      notify(errorMessage(e), { tone: 'error' });
    }
  };

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
          <SeasonalIdentityProfile active={fate.active} history={fate.history} seasonOpen={Boolean(fate.season.data)}
            onDevReset={import.meta.env.DEV ? () => void resetCard() : undefined}
          />
        )}

        {stats.isLoading ? (
          <LoadingState variant="lines" count={2} label={t('profile.statsLoading')} className="my-6" />
        ) : stats.isError || !stats.data ? (
          <ErrorState compact message={errorMessage(stats.error)} onRetry={() => void stats.refetch()} />
        ) : (
          <ProfileStats stats={stats.data} achievementsTotal={achievementList.length} />
        )}

        <Card title={t('profile.diary')} titleId="diary-title" className="mb-6">
          <Tabs
            label={t('profile.tabsLabel')}
            value={tab}
            onChange={setTab}
            items={[
              {
                id: 'activity',
                label: t('profile.tabActivity'),
                content: activity.isLoading ? (
                  <LoadingState variant="lines" count={4} />
                ) : activity.isError ? (
                  <ErrorState compact message={errorMessage(activity.error)} onRetry={() => void activity.refetch()} />
                ) : (
                  <ActivityTimeline items={activity.data ?? []} />
                ),
              },
              {
                id: 'events',
                label: t('profile.tabEvents', { count: attended.length }),
                content: attended.length ? (
                  <ul className="event-list" role="list">
                    {attended.map((e) => (
                      <li key={e.id} className="event attended">
                        <div className="event-date" aria-hidden="true">
                          <span>{new Date(e.eventDate).getDate()}</span>
                          <small>{formatDate(e.eventDate, { month: 'short' }).replace('.', '')}</small>
                        </div>
                        <div className="event-body">
                          <h3>{e.name}</h3>
                          <p className="event-meta"><time dateTime={e.eventDate}>{formatDate(e.eventDate)}</time><span className="event-place"><Icon name="pin" />{e.location}</span></p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">{t('profile.noEventsBefore')}<Link to="/events">{t('nav.events')}</Link>.</p>
                ),
              },
            ]}
          />
        </Card>

        <Card title={t('profile.achievements')} titleId="ach-title" description={t('profile.achievementsDesc', { done: stats.data?.achievementsUnlocked ?? 0, total: achievementList.length })} className="achievements">
          {achievements.isLoading ? (
            <LoadingState variant="lines" count={3} />
          ) : achievements.isError ? (
            <ErrorState compact message={errorMessage(achievements.error)} onRetry={() => void achievements.refetch()} />
          ) : (
            <ul className="medal-grid" role="list">
              {achievementList.map((a) => <AchievementCard key={a.id} achievement={a} />)}
            </ul>
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
