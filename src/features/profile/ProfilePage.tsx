import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ActivityTimeline } from '@/components/profile/ActivityTimeline';
import { AchievementCard } from '@/components/profile/AchievementCard';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { Scenery } from '@/components/layout/Brand';
import { Button, Card, ErrorState, Icon, LoadingState, Tabs, useToast } from '@/components/ui';
import { useAchievements } from '@/hooks/useAchievements';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import { useLore } from '@/hooks/useLore';
import { useProfile } from '@/hooks/useProfile';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { ProfileEditModal } from './ProfileEditModal';

export function ProfilePage() {
  const { providers, linkGoogle } = useAuth();
  const { profile, stats, activity, update } = useProfile();
  const achievements = useAchievements();
  const { events } = useEvents();
  const lore = useLore();
  const { notify } = useToast();
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState('activity');

  if (profile.isLoading) return <div className="container section"><LoadingState label="A carregar o perfil…" /></div>;
  if (profile.isError || !profile.data) {
    return (
      <div className="container section">
        <ErrorState
          message={profile.isError ? errorMessage(profile.error) : 'O teu perfil ainda está a ser criado. Atualiza a página dentro de instantes.'}
          onRetry={() => void profile.refetch()}
        />
      </div>
    );
  }

  const p = profile.data;
  const factions = lore.data?.factions ?? [];
  const faction = factions.find((f) => f.id === p.factionId) ?? null;
  const attended = events.filter((e) => e.isParticipating);
  const achievementList = achievements.data ?? [];
  const hasGoogle = providers.includes('google');

  const save = async (values: Parameters<typeof update.mutateAsync>[0]) => {
    try {
      await update.mutateAsync(values);
      notify('Perfil atualizado');
    } catch (e) {
      notify(errorMessage(e), { tone: 'error' });
      throw e;
    }
  };

  const onLinkGoogle = async () => {
    try {
      await linkGoogle();
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
              <Button variant="secondary" icon={<Icon name="edit" />} onClick={() => setEditing(true)}>Editar perfil</Button>
              {!hasGoogle && <Button variant="ghost" icon={<Icon name="google" />} onClick={onLinkGoogle}>Associar Google</Button>}
            </>
          }
        />

        {stats.isLoading ? (
          <LoadingState variant="lines" count={2} label="A calcular estatísticas…" className="my-6" />
        ) : stats.isError || !stats.data ? (
          <ErrorState compact message={errorMessage(stats.error)} onRetry={() => void stats.refetch()} />
        ) : (
          <ProfileStats stats={stats.data} achievementsTotal={achievementList.length} />
        )}

        <Card title="O teu diário" titleId="diary-title" className="mb-6">
          <Tabs
            label="Atividades"
            value={tab}
            onChange={setTab}
            items={[
              {
                id: 'activity',
                label: 'Atividade recente',
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
                label: `Eventos (${attended.length})`,
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
                  <p className="muted">Ainda não participaste em eventos. Vê a agenda em <Link to="/events">Eventos</Link>.</p>
                ),
              },
            ]}
          />
        </Card>

        <Card title="Medalhas & conquistas" titleId="ach-title" description={`${stats.data?.achievementsUnlocked ?? 0} de ${achievementList.length} desbloqueadas`} className="achievements">
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
          Métodos de login associados: {providers.length ? providers.map((pr) => (pr === 'email' ? 'E-mail (magic link)' : pr === 'google' ? 'Google' : pr)).join(', ') : '—'}.
        </p>
      </div>

      <ProfileEditModal open={editing} profile={p} factions={factions} saving={update.isPending} onClose={() => setEditing(false)} onSave={save} />
    </>
  );
}
