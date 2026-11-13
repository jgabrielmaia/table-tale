import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addCommunityCopy,
  addCommunityOwner,
  addCommunityGame,
  addUserGame,
  createCommunity,
  deleteCommunity,
  removeCommunityCover,
  setCommunityCover,
  fetchCommunities,
  fetchCommunityBySlug,
  fetchCommunityGames,
  fetchMembers,
  fetchMyMemberships,
  fetchMyUserGames,
  joinCommunity,
  leaveCommunity,
  removeCommunityCopy,
  removeCommunityOwner,
  removeCommunityGame,
  removeMember,
  removeUserGame,
  transferOwnership,
  setCommunityCopyOwner,
  updateCommunity,
  updateCommunityGameNotes,
  updateMember,
} from '@/features/communities/api';
import { slugify, type CommunityFormValues } from '@/features/communities/schemas';
import { queryKeys } from '@/lib/queryKeys';
import { isSupabaseConfigured } from '@/lib/supabase';
import { t } from '@/i18n';
import type { Community, CommunityGameEntry, CommunityRole, CommunityVisibility, MembershipStatus, MyMembership } from '@/types/domain';
import { useAuth } from './useAuth';

/** The signed-in viewer's memberships (any status); empty when signed out. */
export function useMyMemberships() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: queryKeys.myMemberships(userId),
    queryFn: () => fetchMyMemberships(userId!),
    enabled: isSupabaseConfigured && Boolean(userId),
  });
}

/** Discovery: every community visible to the viewer, plus the viewer's own membership in each. */
export function useCommunities() {
  const { user } = useAuth();
  const catalogue = useQuery({ queryKey: queryKeys.communities, queryFn: fetchCommunities, enabled: isSupabaseConfigured });
  const mine = useMyMemberships();
  const membershipOf = useMemo(() => new Map((mine.data ?? []).map((m) => [m.communityId, m])), [mine.data]);
  return {
    communities: catalogue.data ?? [],
    membershipOf: (id: string): MyMembership | null => membershipOf.get(id) ?? null,
    isLoading: catalogue.isLoading,
    isError: catalogue.isError,
    error: catalogue.error,
    // refetch() ignores `enabled`: signed out, asking for memberships would be refused (anon has no grant).
    refetch: () => Promise.all([catalogue.refetch(), ...(user ? [mine.refetch()] : [])]),
  };
}

/** Communities the viewer belongs to (any status), joined with the community data. */
export function useMyCommunities() {
  const all = useCommunities();
  const mine = useMyMemberships();
  const list = useMemo(
    () =>
      (mine.data ?? [])
        .map((m) => ({ membership: m, community: all.communities.find((c) => c.id === m.communityId) }))
        .filter((x): x is { membership: MyMembership; community: Community } => Boolean(x.community)),
    [mine.data, all.communities],
  );
  return { list, isLoading: all.isLoading || mine.isLoading, isError: all.isError || mine.isError, error: all.error ?? mine.error, refetch: all.refetch };
}

function useInvalidateCommunities() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.communities });
    void qc.invalidateQueries({ queryKey: ['community-members'] });
    void qc.invalidateQueries({ queryKey: ['community-games'] });
    void qc.invalidateQueries({ queryKey: queryKeys.shelves });
    void qc.invalidateQueries({ queryKey: ['my-memberships'] });
  };
}

export function useCreateCommunity() {
  const { user } = useAuth();
  const invalidate = useInvalidateCommunities();
  return useMutation({
    mutationFn: (values: CommunityFormValues) => {
      if (!user) throw new Error(t('auth.needLoginCommunities'));
      // A short random suffix keeps slugs unique without a round trip.
      const slug = `${slugify(values.name)}-${Math.random().toString(36).slice(2, 6)}`;
      return createCommunity(user.id, values, slug);
    },
    onSuccess: invalidate,
  });
}

/** Joins a public community at once, or asks to join a private one (pending until a manager approves). */
export function useJoinCommunity() {
  const { user } = useAuth();
  const invalidate = useInvalidateCommunities();
  return useMutation({
    mutationFn: (community: Pick<Community, 'id' | 'visibility'>): Promise<MembershipStatus> => {
      if (!user) throw new Error(t('auth.needLoginCommunities'));
      return joinCommunity(user.id, community.id, community.visibility);
    },
    onSuccess: invalidate,
  });
}

/** One community page: data, the viewer's membership and every action the UI can take on it. */
export function useCommunity(slug: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const invalidate = useInvalidateCommunities();
  const mine = useMyMemberships();

  const community = useQuery({
    queryKey: queryKeys.community(slug),
    queryFn: () => fetchCommunityBySlug(slug),
    enabled: isSupabaseConfigured,
  });
  const id = community.data?.id ?? null;
  const membership = (mine.data ?? []).find((m) => m.communityId === id) ?? null;
  const canSeeContent = community.data?.visibility === 'public' || membership?.status === 'active';
  // Same rule as can_see_community_shelf(): members always, everyone else only on a public community with a public shelf.
  const canSeeShelf = (community.data?.visibility === 'public' && community.data.shelfVisibility === 'public') || membership?.status === 'active';

  const members = useQuery({
    queryKey: queryKeys.communityMembers(id),
    queryFn: () => fetchMembers(id!),
    // Signed-out visitors have no access to the memberships (only to the count): do not ask.
    enabled: isSupabaseConfigured && Boolean(id) && Boolean(userId) && canSeeContent,
  });
  const games = useQuery({
    queryKey: queryKeys.communityGames(id),
    queryFn: () => fetchCommunityGames(id!),
    enabled: isSupabaseConfigured && Boolean(id) && canSeeShelf,
  });

  const need = () => {
    if (!userId || !id) throw new Error(t('auth.needLoginCommunities'));
    return { userId, id };
  };
  const refresh = { onSuccess: () => { invalidate(); void community.refetch(); } };

  const join = useMutation({
    mutationFn: (): Promise<MembershipStatus> => joinCommunity(need().userId, need().id, community.data!.visibility as CommunityVisibility),
    ...refresh,
  });
  const leave = useMutation({ mutationFn: () => leaveCommunity(need().userId, need().id), ...refresh });
  const update = useMutation({ mutationFn: (values: CommunityFormValues) => updateCommunity(need().id, values), ...refresh });
  const remove = useMutation({ mutationFn: () => deleteCommunity(need().id), ...refresh });
  const setCover = useMutation({ mutationFn: (file: File) => setCommunityCover({ id: need().id, coverUrl: community.data!.coverUrl }, file), ...refresh });
  const removeCover = useMutation({ mutationFn: () => removeCommunityCover({ id: need().id, coverUrl: community.data!.coverUrl }), ...refresh });
  const setMember = useMutation({
    mutationFn: (v: { membershipId: string; role?: CommunityRole; status?: MembershipStatus }) =>
      updateMember(v.membershipId, { ...(v.role ? { role: v.role } : {}), ...(v.status ? { status: v.status } : {}) }),
    ...refresh,
  });
  const kick = useMutation({ mutationFn: (membershipId: string) => removeMember(membershipId), ...refresh });
  const transfer = useMutation({ mutationFn: (newOwnerId: string) => transferOwnership(need().id, newOwnerId), ...refresh });
  const addOwner = useMutation({ mutationFn: (userId: string) => addCommunityOwner(need().id, userId), ...refresh });
  const removeOwner = useMutation({ mutationFn: (userId: string) => removeCommunityOwner(need().id, userId), ...refresh });
  const addGame = useMutation({ mutationFn: (gameId: string) => addCommunityGame(need().userId, need().id, gameId), ...refresh });
  const removeGame = useMutation({ mutationFn: (entryId: string) => removeCommunityGame(entryId), ...refresh });
  const setGameNotes = useMutation({ mutationFn: (v: { entryId: string; notes: string }) => updateCommunityGameNotes(v.entryId, v.notes), ...refresh });
  const addCopy = useMutation({ mutationFn: (v: { entry: CommunityGameEntry; ownerId: string | null }) => addCommunityCopy(v.entry, v.ownerId), ...refresh });
  const setCopyOwner = useMutation({ mutationFn: (v: { copyId: string; ownerId: string | null }) => setCommunityCopyOwner(v.copyId, v.ownerId), ...refresh });
  const removeCopy = useMutation({ mutationFn: (copyId: string) => removeCommunityCopy(copyId), ...refresh });

  const activeOwners = (members.data ?? []).filter((m) => m.role === 'owner' && m.status === 'active').length;

  return { community, membership, members, games, activeOwners, canSeeContent, canSeeShelf, join, leave, update, remove, setCover, removeCover, setMember, kick, transfer, addOwner, removeOwner, addGame, removeGame, setGameNotes, addCopy, setCopyOwner, removeCopy };
}

/** The viewer's personal collection (table `user_games`). */
export function useMyLibrary() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.myUserGames(userId),
    queryFn: () => fetchMyUserGames(userId!),
    enabled: isSupabaseConfigured && Boolean(userId),
  });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.myUserGames(userId) });
    void qc.invalidateQueries({ queryKey: queryKeys.games });
  };
  const add = useMutation({
    mutationFn: (gameId: string) => {
      if (!userId) throw new Error(t('auth.needLoginCommunities'));
      const owned = query.data?.find((e) => e.gameId === gameId)?.copies ?? 0;
      return addUserGame(userId, gameId, owned + 1);
    },
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (gameId: string) => {
      if (!userId) throw new Error(t('auth.needLoginCommunities'));
      return removeUserGame(userId, gameId);
    },
    onSuccess: refresh,
  });
  return { ...query, entries: query.data ?? [], add, remove };
}
