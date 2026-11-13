import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PlayerAvatar } from '@/components/identity/PlayerAvatar';
import { Badge, BrandSymbol, Button, ButtonLink, EmptyState, ErrorState, Icon, LoadingState, Select, Tabs, useToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCommunity } from '@/hooks/useCommunities';
import { BggCredit } from '@/components/bgg/BggCredit';
import { GameFilters } from '@/components/games/GameFilters';
import { GameGrid } from '@/components/games/GameGrid';
import { EMPTY_FILTERS, filterGames, hasActiveFilters, type GameFilterValues } from '@/features/games/filters';
import { sortShelfGames, type GamesSort } from '@/features/games/shelves';
import { useGameCardActions } from '@/hooks/useGameCardActions';
import { useGames } from '@/hooks/useGames';
import { getLocale, useI18n } from '@/i18n';
import { features } from '@/lib/env';
import { errorMessage } from '@/lib/errors';
import { truncate } from '@/seo/pages';
import { usePageSeo } from '@/seo/RouteSeo';
import { CommunityCoverField } from './CommunityCoverField';
import { CommunityGameEditor } from './CommunityGameEditor';
import { CommunityForm } from './CommunityForm';
import { FactionBalance } from './FactionBalance';
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
import type { Community, CommunityMember, CommunityRole, LibraryGame } from '@/types/domain';

const uniqueSorted = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, getLocale()));

export function CommunityPage() {
  const { slug = '' } = useParams();
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const c = useCommunity(slug);
  const [tab, setTab] = useState('members');
  const loaded = c.community.data;
  const missing = c.community.isSuccess && !loaded;
  usePageSeo({
    title: loaded ? `${loaded.name} | Table Tale` : missing ? `${t('communities.notFound').replace(/\.$/, '')} | Table Tale` : `${t('communities.title')} | Table Tale`,
    description: loaded
      ? truncate(loaded.description || t('communities.seoDescription', { name: loaded.name, city: loaded.city }), 160)
      : t('communities.seoListDescription'),
    path: `/communities/${slug}`,
    // Community pages are not prerendered, so they stay out of search results.
    noindex: true,
  });

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

  const body = !c.canSeeContent ? (
    <p className="notice" role="note">{t('communities.privateNotice')}</p>
  ) : (
    <>
    {c.members.data && <FactionBalance members={c.members.data} />}
    <Tabs
      label={t('communities.tabs')}
      value={tab}
      onChange={setTab}
      items={[
        { id: 'members', label: t('communities.tab.members'), content: <MembersPanel community={community} c={c} userId={user?.id ?? null} run={run} /> },
        { id: 'games', label: t('communities.tab.games'), content: <GamesPanel c={c} run={run} /> },
        ...(canEditCommunity(m)
          ? [{
              id: 'manage',
              label: t('communities.tab.manage'),
              content: (
                <>
                <CommunityCoverField
                  name={community.name}
                  coverUrl={community.coverUrl}
                  uploading={c.setCover.isPending}
                  removing={c.removeCover.isPending}
                  onUpload={(file) => run(() => c.setCover.mutateAsync(file), t('communities.cover.saved'))}
                  onRemove={() => run(() => c.removeCover.mutateAsync(), t('communities.cover.removed'))}
                />
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
                </>
              ),
            }]
          : []),
      ]}
    />
    </>
  );

  return (
    <div className="container section">
      <p className="eyebrow"><Link to="/communities">{t('communities.title')}</Link></p>
      {community.coverUrl && (
        <div className="community-cover community-cover--banner">
          <img src={community.coverUrl} alt={t('communities.cover.alt', { name: community.name })} />
        </div>
      )}
      <div className="section-head">
        <div>
          <h1>{community.name}</h1>
          <p className="community-place"><Icon name="pin" /> {community.district}, {community.city} · {community.country}</p>
          {community.description && <p className="muted">{community.description}</p>}
          <Badge tone="accent" icon={<Icon name={community.visibility === 'public' ? 'users' : 'lock'} />}>
            {community.visibility === 'public' ? t('communities.public') : t('communities.private')}
          </Badge>
        </div>
        <div className="section-actions">
          {joinControl}
        </div>
      </div>
      {body}
    </div>
  );
}

type Run = (action: () => Promise<unknown>, success: string) => Promise<void>;
type CommunityState = ReturnType<typeof useCommunity>;

function MembersPanel({ community, c, userId, run }: { community: Community; c: CommunityState; userId: string | null; run: Run }) {
  const { t, tn } = useI18n();
  const m = c.membership;
  if (!userId) {
    return (
      <EmptyState
        compact
        title={tn('communities.members', community.memberCount)}
        description={t('communities.membersSignedOut')}
        action={<ButtonLink to="/login" state={{ from: `/communities/${community.slug}` }} variant="secondary" size="sm">{t('communities.membersSignIn')}</ButtonLink>}
      />
    );
  }
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
        <span className="member-avatar"><PlayerAvatar playerId={x.userId} name={x.displayName} src={x.avatarUrl} size="lg" decorative /></span>
        {/* Stretched link: the whole card opens the player (your own card opens your profile). */}
        <Link className="member-name" to={x.userId === userId ? '/profile' : `/players/${x.userId}`} aria-label={t('communities.openPlayer', { name: x.displayName })}>{x.displayName}</Link>
        <span className="member-badges">
          <Badge tone={x.role === 'member' ? 'neutral' : 'accent'} className={x.role === 'owner' ? 'role-owner' : undefined} icon={x.role === 'owner' ? <BrandSymbol name="crown" /> : undefined}>{t(`communities.role.${x.role}`)}</Badge>
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

/**
 * The community's games, shown like the Games page (covers, search, filters, sort, favourite and status) but limited to
 * this community's shelf, with its copies on each card. Owners also add games, import from BGG and remove games here.
 */
function GamesPanel({ c, run }: { c: CommunityState; run: Run }) {
  const { t, tn } = useI18n();
  const { user } = useAuth();
  const catalogue = useGames();
  const cardActions = useGameCardActions();
  const [pick, setPick] = useState('');
  const [filters, setFilters] = useState<GameFilterValues>(EMPTY_FILTERS);
  const [sort, setSort] = useState<GamesSort>('title');
  const [editing, setEditing] = useState<string | null>(null);

  const entries = useMemo(() => c.games.data ?? [], [c.games.data]);
  const byGame = useMemo(() => new Map(entries.map((e) => [e.game.id, e])), [entries]);
  const games = useMemo(() => catalogue.games.filter((g) => byGame.has(g.id)), [catalogue.games, byGame]);
  const categories = useMemo(() => uniqueSorted(games.flatMap((g) => g.categories)), [games]);
  const mechanics = useMemo(() => uniqueSorted(games.flatMap((g) => g.mechanics)), [games]);
  const visible = useMemo(() => sortShelfGames(filterGames(games, filters), sort, getLocale()), [games, filters, sort]);

  if (!c.canSeeShelf) return <EmptyState compact title={t('communities.shelfMembersOnly')} />;
  if (c.games.isLoading || catalogue.isLoading) return <LoadingState variant="cards" label={t('games.loading')} />;
  if (c.games.isError || catalogue.isError) {
    return <ErrorState compact message={errorMessage(c.games.error ?? catalogue.error)} onRetry={() => void Promise.all([c.games.refetch(), catalogue.refetch()])} />;
  }
  const manage = canManageLibrary(c.membership);
  const editingEntry = entries.find((e) => e.id === editing) ?? null;
  const owners = (c.members.data ?? []).filter((m) => m.status === 'active');
  const shelfOf = (g: LibraryGame) => {
    const entry = byGame.get(g.id);
    if (!entry) return undefined;
    const names = entry.copyList.map((k) => k.ownerName ?? t('communities.gameEditor.communityOwned'));
    return { copies: entry.copies, owners: [...new Set(names)], notes: entry.notes };
  };
  const saved = t('communities.gameUpdated');
  const options = catalogue.games.filter((g) => !byGame.has(g.id)).map((g) => ({ value: g.id, label: g.title }));
  const reset = () => setFilters(EMPTY_FILTERS);
  const remove = (game: LibraryGame) => {
    const entry = byGame.get(game.id);
    if (entry) void run(() => c.removeGame.mutateAsync(entry.id), t('communities.memberUpdated'));
  };

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
          {features.bgg && <ButtonLink to={`/games/import?community=${c.community.data?.slug ?? ''}`} variant="ghost">{t('bgg.link')}</ButtonLink>}
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
      {games.length === 0 ? (
        <EmptyState compact title={t('communities.libraryEmpty')} />
      ) : (
        <>
          <div className="community-games-head">
            <p className="results-count" aria-live="polite">{tn('games.found', visible.length)}</p>
            <Select
              label={t('games.sort')}
              value={sort}
              onChange={(e) => setSort(e.target.value as GamesSort)}
              options={[
                { value: 'title', label: t('games.sortTitle') },
                { value: 'bgg', label: t('games.sortBgg') },
              ]}
            />
          </div>
          <GameFilters values={filters} categories={categories} mechanics={mechanics} onChange={setFilters} onReset={reset} showPersonalFilters={Boolean(user)} />
          {visible.length === 0 ? (
            <EmptyState
              compact
              title={t('games.noResultsTitle')}
              description={<>{filters.query && <>{t('games.noResultsFor', { query: filters.query })}</>}{t('games.noResultsText')}</>}
              action={hasActiveFilters(filters) && <Button variant="secondary" onClick={reset}>{t('games.clearFilters')}</Button>}
            />
          ) : (
            <GameGrid
              games={visible}
              label={t('games.gamesLabel')}
              {...cardActions}
              shelfOf={shelfOf}
              onEdit={manage ? (g) => setEditing(byGame.get(g.id)?.id ?? null) : undefined}
              onRemove={manage ? remove : undefined}
            />
          )}
          {games.some((g) => g.bggId !== null) && <p className="mt-6 text-center"><BggCredit /></p>}
        </>
      )}
      {manage && (
        <CommunityGameEditor
          entry={editingEntry}
          members={owners}
          busy={c.addCopy.isPending || c.setCopyOwner.isPending || c.removeCopy.isPending || c.setGameNotes.isPending}
          onClose={() => setEditing(null)}
          onAddCopy={(ownerId) => run(() => c.addCopy.mutateAsync({ entry: editingEntry!, ownerId }), saved)}
          onSetOwner={(copyId, ownerId) => run(() => c.setCopyOwner.mutateAsync({ copyId, ownerId }), saved)}
          onRemoveCopy={(copyId) => run(() => c.removeCopy.mutateAsync(copyId), saved)}
          onSaveNotes={(notes) => run(() => c.setGameNotes.mutateAsync({ entryId: editingEntry!.id, notes }), saved)}
        />
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
          shelfVisibility: community.shelfVisibility,
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
