import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PlayerAvatar } from '@/components/identity/PlayerAvatar';
import { Badge, Button, ButtonLink, Card, EmptyState, ErrorState, Icon, LoadingState, Select, Tabs, useToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCommunity } from '@/hooks/useCommunities';
import { useGames } from '@/hooks/useGames';
import { useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { CommunityForm } from './CommunityForm';
import { MembershipBadge } from './CommunitiesPage';
import {
  assignableRoles,
  canDeleteCommunity,
  canEditCommunity,
  canLeave,
  canManageLibrary,
  canManageMember,
  canManageMembers,
} from './permissions';
import type { Community, CommunityMember, CommunityRole } from '@/types/domain';

export function CommunityPage() {
  const { slug = '' } = useParams();
  const { t, tn } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const c = useCommunity(slug);
  const [tab, setTab] = useState('overview');

  if (c.community.isLoading) return <div className="container section"><LoadingState /></div>;
  if (c.community.isError) {
    return <div className="container section"><ErrorState message={errorMessage(c.community.error)} onRetry={() => void c.community.refetch()} /></div>;
  }
  const community = c.community.data;
  if (!community) {
    return (
      <div className="container section">
        <EmptyState title={t('communities.notFound')} action={<ButtonLink to="/communities">{t('communities.title')}</ButtonLink>} />
      </div>
    );
  }

  const m = c.membership;
  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      notify(success);
    } catch (e) {
      notify(errorMessage(e), { tone: 'error' });
    }
  };

  const onJoin = async () => {
    try {
      const status = await c.join.mutateAsync();
      notify(status === 'active' ? t('communities.joined') : t('communities.requested'));
    } catch (e) {
      notify(errorMessage(e), { tone: 'error' });
    }
  };

  const leaveAllowed = canLeave(m, c.activeOwners);

  const joinControl = !user ? (
    <ButtonLink to="/login" state={{ from: `/communities/${community.slug}` }} variant="gold">{t('communities.loginToJoin')}</ButtonLink>
  ) : !m ? (
    <Button variant="gold" loading={c.join.isPending} onClick={() => void onJoin()}>
      {community.visibility === 'public' ? t('communities.join') : t('communities.requestJoin')}
    </Button>
  ) : (
    <>
      <MembershipBadge membership={m} />
      {m.status !== 'suspended' && (
        <Button
          variant="ghost"
          loading={c.leave.isPending}
          disabled={!leaveAllowed && m.status === 'active'}
          title={!leaveAllowed ? t('communities.lastOwner') : undefined}
          onClick={() => void run(() => c.leave.mutateAsync(), t('communities.left'))}
        >
          {t('communities.leave')}
        </Button>
      )}
    </>
  );

  const overview = (
    <div className="community-overview">
      <Card title={t('communities.overview.where')} titleId="where-title">
        <p><Icon name="pin" /> {community.district}, {community.city} · {community.country}</p>
        {community.latitude !== null && community.longitude !== null && (
          <p className="muted">{community.latitude}, {community.longitude}</p>
        )}
      </Card>
      <Card title={t('communities.overview.stats')} titleId="stats-title">
        <p>{tn('communities.members', community.memberCount)}</p>
        {c.canSeeContent && <p>{t('communities.overview.games')}: {c.games.data?.length ?? 0}</p>}
      </Card>
    </div>
  );

  const body = !c.canSeeContent ? (
    <p className="notice" role="note">{t('communities.privateNotice')}</p>
  ) : (
    <Tabs
      label={t('communities.tabs')}
      value={tab}
      onChange={setTab}
      items={[
        { id: 'overview', label: t('communities.tab.overview'), content: overview },
        { id: 'members', label: t('communities.tab.members'), content: <MembersPanel community={community} c={c} userId={user?.id ?? null} run={run} /> },
        { id: 'library', label: t('communities.tab.library'), content: <LibraryPanel c={c} run={run} /> },
        ...(canEditCommunity(m)
          ? [{
              id: 'manage',
              label: t('communities.tab.manage'),
              content: (
                <ManagePanel
                  community={community}
                  saving={c.update.isPending}
                  onSave={(values) => run(() => c.update.mutateAsync(values), t('communities.saved'))}
                  onDelete={
                    canDeleteCommunity(m)
                      ? async () => {
                          if (!window.confirm(t('communities.deleteConfirm'))) return;
                          await run(() => c.remove.mutateAsync(), t('communities.deleted'));
                          navigate('/communities');
                        }
                      : undefined
                  }
                />
              ),
            }]
          : []),
      ]}
    />
  );

  return (
    <div className="container section">
      <p className="eyebrow"><Link to="/communities">{t('communities.title')}</Link></p>
      <div className="section-head">
        <div>
          <h1>{community.name}</h1>
          <p className="community-place"><Icon name="pin" /> {community.district}, {community.city} · {community.country}</p>
          {community.description && <p className="muted">{community.description}</p>}
          <Badge tone="accent" icon={<Icon name={community.visibility === 'public' ? 'users' : 'lock'} />}>
            {community.visibility === 'public' ? t('communities.public') : t('communities.private')}
          </Badge>
        </div>
        <div className="section-actions">{joinControl}</div>
      </div>
      {body}
    </div>
  );
}

type Run = (action: () => Promise<unknown>, success: string) => Promise<void>;
type CommunityState = ReturnType<typeof useCommunity>;

function MembersPanel({ community, c, userId, run }: { community: Community; c: CommunityState; userId: string | null; run: Run }) {
  const { t } = useI18n();
  const m = c.membership;
  if (c.members.isLoading) return <LoadingState variant="lines" count={3} />;
  if (c.members.isError) return <ErrorState compact message={errorMessage(c.members.error)} onRetry={() => void c.members.refetch()} />;
  const list = c.members.data ?? [];
  if (!list.length) return <EmptyState compact title={t('communities.membersEmpty')} />;
  const roles = assignableRoles(m);
  const pending = list.filter((x) => x.status === 'pending');
  const rest = list.filter((x) => x.status !== 'pending');

  const row = (x: CommunityMember) => {
    const manage = canManageMember(m, x, userId);
    return (
      <li key={x.id} className="member-card" data-role={x.role}>
        <span className="member-avatar"><PlayerAvatar playerId={x.userId} name={x.displayName} src={x.avatarUrl} size="sm" decorative /></span>
        <span className="member-name">{x.displayName}</span>
        <span className="member-badges">
          <Badge tone={x.role === 'member' ? 'neutral' : 'accent'}>{t(`communities.role.${x.role}`)}</Badge>
          {x.status !== 'active' && <Badge tone="progress">{t(`communities.status.${x.status}`)}</Badge>}
        </span>
        {manage && (
          <span className="member-actions">
            {x.status === 'pending' && (
              <>
                <Button size="sm" variant="teal" onClick={() => void run(() => c.setMember.mutateAsync({ membershipId: x.id, status: 'active' }), t('communities.memberUpdated'))}>{t('communities.approve')}</Button>
                <Button size="sm" variant="ghost" onClick={() => void run(() => c.kick.mutateAsync(x.id), t('communities.memberUpdated'))}>{t('communities.reject')}</Button>
              </>
            )}
            {x.status !== 'pending' && roles.length > 0 && x.status === 'active' && (
              <Select
                label={<span className="sr-only">{t('communities.roleOf', { name: x.displayName })}</span>}
                value={x.role}
                options={[...new Set([x.role, ...roles])].map((r: CommunityRole) => ({ value: r, label: t(`communities.role.${r}`) }))}
                onChange={(e) => void run(() => c.setMember.mutateAsync({ membershipId: x.id, role: e.target.value as CommunityRole }), t('communities.memberUpdated'))}
              />
            )}
            {x.status === 'active' && (
              <Button size="sm" variant="ghost" onClick={() => void run(() => c.setMember.mutateAsync({ membershipId: x.id, status: 'suspended' }), t('communities.memberUpdated'))}>{t('communities.suspend')}</Button>
            )}
            {x.status === 'suspended' && (
              <Button size="sm" variant="ghost" onClick={() => void run(() => c.setMember.mutateAsync({ membershipId: x.id, status: 'active' }), t('communities.memberUpdated'))}>{t('communities.reinstate')}</Button>
            )}
            {x.status !== 'pending' && (
              <Button size="sm" variant="ghost" onClick={() => void run(() => c.kick.mutateAsync(x.id), t('communities.memberUpdated'))}>{t('communities.remove')}</Button>
            )}
          </span>
        )}
        {m?.role === 'owner' && m.status === 'active' && x.status === 'active' && x.userId !== userId && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (!window.confirm(t('communities.transferConfirm', { name: x.displayName }))) return;
              void run(() => c.transfer.mutateAsync(x.userId), t('communities.transferred'));
            }}
          >
            {t('communities.makeOwner')}
          </Button>
        )}
      </li>
    );
  };

  return (
    <div>
      {canManageMembers(m) && pending.length > 0 && (
        <section aria-label={t('communities.status.pending')}>
          <h3>{t('communities.status.pending')}</h3>
          <ul className="member-grid" role="list">{pending.map(row)}</ul>
        </section>
      )}
      <ul className="member-grid" role="list" aria-label={community.name}>{(canManageMembers(m) ? rest : list).map(row)}</ul>
    </div>
  );
}

function LibraryPanel({ c, run }: { c: CommunityState; run: Run }) {
  const { t, tn } = useI18n();
  const { games: catalogue } = useGames();
  const [pick, setPick] = useState('');
  if (c.games.isLoading) return <LoadingState variant="lines" count={3} />;
  if (c.games.isError) return <ErrorState compact message={errorMessage(c.games.error)} onRetry={() => void c.games.refetch()} />;
  const entries = c.games.data ?? [];
  const manage = canManageLibrary(c.membership);
  const inLibrary = new Set(entries.map((e) => e.game.id));
  const options = catalogue.filter((g) => !inLibrary.has(g.id)).map((g) => ({ value: g.id, label: g.title }));

  return (
    <div>
      {manage && (
        <div className="library-add">
          <Select
            label={t('communities.addGameLabel')}
            value={pick}
            options={[{ value: '', label: t('communities.pickGame') }, ...options]}
            onChange={(e) => setPick(e.target.value)}
          />
          <ButtonLink to={`/library/import?community=${c.community.data?.slug ?? ''}`} variant="ghost">{t('bgg.link')}</ButtonLink>
          <Button
            variant="gold"
            disabled={!pick}
            loading={c.addGame.isPending}
            onClick={() => void run(() => c.addGame.mutateAsync(pick), t('communities.memberUpdated')).then(() => setPick(''))}
          >
            {t('communities.addGame')}
          </Button>
        </div>
      )}
      {entries.length === 0 ? (
        <EmptyState compact title={t('communities.libraryEmpty')} />
      ) : (
        <ul className="community-library" role="list">
          {entries.map((e) => (
            <li key={e.id} className="panel library-item">
              <h3><Link to={`/games/${e.game.slug}`}>{e.game.title}</Link></h3>
              <p className="muted">{[...e.game.categories.slice(0, 2), tn('communities.copies', e.copies)].join(' · ')}</p>
              {manage && (
                <Button size="sm" variant="ghost" aria-label={t('communities.removeGame', { title: e.game.title })} icon={<Icon name="trash" />} onClick={() => void run(() => c.removeGame.mutateAsync(e.id), t('communities.memberUpdated'))} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ManagePanel({ community, saving, onSave, onDelete }: { community: Community; saving: boolean; onSave: (v: Parameters<Parameters<typeof CommunityForm>[0]['onSubmit']>[0]) => Promise<void>; onDelete?: () => Promise<void> }) {
  const { t } = useI18n();
  return (
    <div>
      <h2>{t('communities.editTitle')}</h2>
      <CommunityForm
        saving={saving}
        submitLabel={t('communities.save')}
        onSubmit={onSave}
        defaultValues={{
          name: community.name,
          description: community.description,
          visibility: community.visibility,
          city: community.city,
          district: community.district,
          country: community.country,
          latitude: community.latitude === null ? '' : String(community.latitude),
          longitude: community.longitude === null ? '' : String(community.longitude),
        }}
      />
      {onDelete && <Button className="mt-6" variant="ghost" icon={<Icon name="trash" />} onClick={() => void onDelete()}>{t('communities.delete')}</Button>}
    </div>
  );
}
