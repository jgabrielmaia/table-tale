import { supabase } from '@/lib/supabase';
import { AppError, unwrap } from '@/lib/errors';
import { t } from '@/i18n';
import type { CommunityGameCopyRow, CommunityGameRow, CommunityMembershipRow, CommunityRow, GameRow, OwnershipCondition, UserGameRow } from '@/types/database';
import type {
  Community,
  CommunityGameCopy,
  CommunityGameEntry,
  CommunityMember,
  CommunityRole,
  CommunityVisibility,
  GameBrief,
  MembershipStatus,
  MyMembership,
  UserGameEntry,
} from '@/types/domain';
import { COVER_BUCKET, COVER_MAX_BYTES, COVER_TYPES, coverPath } from './cover';
import { joinOutcome } from './permissions';
import type { CommunityFormValues } from './schemas';

/** Computed field `public.member_count(communities)`: active members only, readable by anon (the memberships are not). */
type CountEmbed = { member_count: number | null };
const WITH_COUNT = '*,member_count';

const GAME_BRIEF = 'id,title,slug,cover_url,categories,min_players,max_players,duration_minutes';
type GameBriefRow = Pick<GameRow, 'id' | 'title' | 'slug' | 'cover_url' | 'categories' | 'min_players' | 'max_players' | 'duration_minutes'>;

const mapBrief = (g: GameBriefRow): GameBrief => ({
  id: g.id,
  title: g.title,
  slug: g.slug,
  coverUrl: g.cover_url,
  categories: g.categories ?? [],
  minPlayers: g.min_players,
  maxPlayers: g.max_players,
  durationMinutes: g.duration_minutes,
});

export const mapCommunity = (r: CommunityRow & Partial<CountEmbed>): Community => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  description: r.description,
  visibility: r.visibility,
  shelfVisibility: r.shelf_visibility ?? 'public',
  city: r.city,
  district: r.district,
  country: r.country,
  latitude: r.latitude,
  longitude: r.longitude,
  createdBy: r.created_by,
  coverUrl: r.cover_url ?? null,
  memberCount: r.member_count ?? 0,
});

// ---- communities ----------------------------------------------------------------------------------------------------

export async function fetchCommunities(): Promise<Community[]> {
  const rows = unwrap(
    await supabase.from('communities').select(WITH_COUNT).order('name'),
    t('communities.err.load'),
  ) as unknown as (CommunityRow & CountEmbed)[];
  return rows.map(mapCommunity);
}

export async function fetchCommunityBySlug(slug: string): Promise<Community | null> {
  const row = unwrap(
    await supabase.from('communities').select(WITH_COUNT).eq('slug', slug).maybeSingle(),
    t('communities.err.load'),
  ) as unknown as (CommunityRow & CountEmbed) | null;
  return row ? mapCommunity(row) : null;
}

export async function fetchMyMemberships(userId: string): Promise<MyMembership[]> {
  const rows = unwrap(
    await supabase.from('community_memberships').select('community_id,role,status').eq('user_id', userId),
    t('communities.err.load'),
  ) as Pick<CommunityMembershipRow, 'community_id' | 'role' | 'status'>[];
  return rows.map((r) => ({ communityId: r.community_id, role: r.role, status: r.status }));
}

const toPayload = (v: CommunityFormValues) => ({
  name: v.name.trim(),
  description: v.description.trim(),
  visibility: v.visibility,
  shelf_visibility: v.shelfVisibility,
  city: v.city.trim(),
  district: v.district.trim(),
  country: v.country.trim(),
  latitude: v.latitude === '' ? null : Number(v.latitude),
  longitude: v.longitude === '' ? null : Number(v.longitude),
});

export async function createCommunity(userId: string, values: CommunityFormValues, slug: string): Promise<Community> {
  const row = unwrap(
    await supabase.from('communities').insert({ ...toPayload(values), slug, created_by: userId }).select('*').single(),
    t('communities.err.create'),
  ) as CommunityRow;
  return mapCommunity(row);
}

export async function updateCommunity(id: string, values: CommunityFormValues): Promise<void> {
  unwrap(await supabase.from('communities').update(toPayload(values)).eq('id', id), t('communities.err.save'));
}

export async function deleteCommunity(id: string): Promise<void> {
  unwrap(await supabase.from('communities').delete().eq('id', id), t('communities.err.delete'));
}

// ---- cover photo ---------------------------------------------------------------------------------------------------

/** Uploads a new cover, points the community at it, then removes the previous file (best effort). */
export async function setCommunityCover(community: Pick<Community, 'id' | 'coverUrl'>, file: File): Promise<void> {
  const ext = COVER_TYPES[file.type];
  if (!ext) throw new AppError(t('edit.fileType'));
  if (file.size > COVER_MAX_BYTES) throw new AppError(t('communities.cover.errSize'));
  const path = `${community.id}/cover-${Date.now()}.${ext}`;
  unwrap(await supabase.storage.from(COVER_BUCKET).upload(path, file, { contentType: file.type, upsert: false }), t('communities.cover.errUpload'));
  const url = supabase.storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl;
  unwrap(await supabase.from('communities').update({ cover_url: url }).eq('id', community.id), t('communities.cover.errUpload'));
  await removeCoverFile(community.coverUrl, community.id);
}

export async function removeCommunityCover(community: Pick<Community, 'id' | 'coverUrl'>): Promise<void> {
  unwrap(await supabase.from('communities').update({ cover_url: null }).eq('id', community.id), t('communities.cover.errRemove'));
  await removeCoverFile(community.coverUrl, community.id);
}

// A leftover file only costs storage, so a failed clean-up never fails the action.
async function removeCoverFile(url: string | null, communityId: string) {
  const old = coverPath(url, communityId);
  if (!old) return;
  const { error } = await supabase.storage.from(COVER_BUCKET).remove([old]);
  if (error) console.warn('community cover clean-up failed', error.message);
}

// ---- memberships ----------------------------------------------------------------------------------------------------

export async function joinCommunity(userId: string, communityId: string, visibility: CommunityVisibility): Promise<MembershipStatus> {
  const status = joinOutcome(visibility);
  unwrap(
    await supabase.from('community_memberships').insert({ user_id: userId, community_id: communityId, role: 'member', status }),
    t('communities.err.join'),
  );
  return status;
}

export async function leaveCommunity(userId: string, communityId: string): Promise<void> {
  unwrap(
    await supabase.from('community_memberships').delete().eq('user_id', userId).eq('community_id', communityId),
    t('communities.err.leave'),
  );
}

type MemberQueryRow = CommunityMembershipRow & { profiles: { id: string; display_name: string; avatar_url: string | null } | null };

export async function fetchMembers(communityId: string): Promise<CommunityMember[]> {
  const rows = unwrap(
    await supabase
      .from('community_memberships')
      .select('id,user_id,community_id,role,status,joined_at,profiles(id,display_name,avatar_url)')
      .eq('community_id', communityId)
      .order('joined_at'),
    t('communities.err.members'),
  ) as unknown as MemberQueryRow[];
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    displayName: r.profiles?.display_name || t('common.player'),
    avatarUrl: r.profiles?.avatar_url ?? null,
    role: r.role,
    status: r.status,
    joinedAt: r.joined_at,
  }));
}

export async function updateMember(membershipId: string, patch: { role?: CommunityRole; status?: MembershipStatus }): Promise<void> {
  unwrap(await supabase.from('community_memberships').update(patch).eq('id', membershipId), t('communities.err.member'));
}

export async function removeMember(membershipId: string): Promise<void> {
  unwrap(await supabase.from('community_memberships').delete().eq('id', membershipId), t('communities.err.member'));
}

export async function transferOwnership(communityId: string, newOwnerId: string): Promise<void> {
  unwrap(
    await supabase.rpc('transfer_community_ownership', { p_community: communityId, p_new_owner: newOwnerId }),
    t('communities.err.transfer'),
  );
}

/** Adds an active member as a co-owner without changing the existing owners. */
export async function addCommunityOwner(communityId: string, userId: string): Promise<void> {
  unwrap(await supabase.rpc('add_community_owner', { p_community: communityId, p_member: userId }), t('communities.err.owner'));
}

/** Removes co-ownership while preserving the member as an admin. The database protects the last owner. */
export async function removeCommunityOwner(communityId: string, userId: string): Promise<void> {
  unwrap(await supabase.rpc('remove_community_owner', { p_community: communityId, p_member: userId }), t('communities.err.owner'));
}

// ---- community library ----------------------------------------------------------------------------------------------

type CopyQueryRow = Pick<CommunityGameCopyRow, 'id' | 'owner_id' | 'added_at'> & { profiles: { display_name: string } | null };
type CommunityGameQueryRow = Pick<CommunityGameRow, 'id' | 'community_id' | 'copies' | 'condition' | 'notes'> & {
  games: GameBriefRow | null;
  community_game_copies: CopyQueryRow[] | null;
};

const mapCopies = (rows: CopyQueryRow[] | null): CommunityGameCopy[] =>
  [...(rows ?? [])]
    .sort((a, b) => a.added_at.localeCompare(b.added_at) || a.id.localeCompare(b.id))
    .map((k) => ({ id: k.id, ownerId: k.owner_id, ownerName: k.owner_id ? k.profiles?.display_name || t('common.player') : null }));

export async function fetchCommunityGames(communityId: string): Promise<CommunityGameEntry[]> {
  const rows = unwrap(
    await supabase
      .from('community_games')
      .select(`id,community_id,copies,condition,notes,games(${GAME_BRIEF}),community_game_copies(id,owner_id,added_at,profiles(display_name))`)
      .eq('community_id', communityId),
    t('communities.err.library'),
  ) as unknown as CommunityGameQueryRow[];
  return rows
    .filter((r) => r.games)
    .map((r) => ({
      id: r.id,
      communityId: r.community_id,
      copies: r.copies,
      copyList: mapCopies(r.community_game_copies),
      condition: r.condition,
      notes: r.notes,
      game: mapBrief(r.games!),
    }))
    .sort((a, b) => a.game.title.localeCompare(b.game.title));
}

export async function addCommunityGame(userId: string, communityId: string, gameId: string, copies = 1): Promise<void> {
  unwrap(
    await supabase.from('community_games').insert({ community_id: communityId, game_id: gameId, added_by: userId, copies }),
    t('communities.err.addGame'),
  );
}

// Copies and notes belong to this community's shelf; the game itself (title, cover…) is the shared catalogue entry.

export async function updateCommunityGameNotes(entryId: string, notes: string): Promise<void> {
  const value = notes.trim();
  unwrap(await supabase.from('community_games').update({ notes: value || null }).eq('id', entryId), t('communities.err.updateGame'));
}

/** Adds one copy owned by a member, or by the community itself (null). The count on the shelf follows. */
export async function addCommunityCopy(entry: Pick<CommunityGameEntry, 'id' | 'communityId'>, ownerId: string | null): Promise<void> {
  unwrap(
    await supabase.from('community_game_copies').insert({ community_game_id: entry.id, community_id: entry.communityId, owner_id: ownerId }),
    t('communities.err.updateGame'),
  );
}

export async function setCommunityCopyOwner(copyId: string, ownerId: string | null): Promise<void> {
  unwrap(await supabase.from('community_game_copies').update({ owner_id: ownerId }).eq('id', copyId), t('communities.err.updateGame'));
}

/** The last copy can't be removed: remove the game from the shelf instead. */
export async function removeCommunityCopy(copyId: string): Promise<void> {
  unwrap(await supabase.from('community_game_copies').delete().eq('id', copyId), t('communities.err.updateGame'));
}

export async function removeCommunityGame(entryId: string): Promise<void> {
  unwrap(await supabase.from('community_games').delete().eq('id', entryId), t('communities.err.removeGame'));
}

// ---- personal collection --------------------------------------------------------------------------------------------

type UserGameQueryRow = Pick<UserGameRow, 'game_id' | 'copy_number' | 'condition'> & { games: GameBriefRow | null };

export async function fetchMyUserGames(userId: string): Promise<UserGameEntry[]> {
  const rows = unwrap(
    await supabase.from('user_games').select(`game_id,copy_number,condition,games(${GAME_BRIEF})`).eq('user_id', userId),
    t('communities.err.collection'),
  ) as unknown as UserGameQueryRow[];
  const byGame = new Map<string, UserGameEntry>();
  for (const r of rows) {
    if (!r.games) continue;
    const existing = byGame.get(r.game_id);
    if (existing) existing.copies += 1;
    else byGame.set(r.game_id, { gameId: r.game_id, copies: 1, condition: r.condition as OwnershipCondition, game: mapBrief(r.games) });
  }
  return [...byGame.values()].sort((a, b) => a.game.title.localeCompare(b.game.title));
}

/** Adds one more copy of a game to the personal collection. */
export async function addUserGame(userId: string, gameId: string, nextCopyNumber: number): Promise<void> {
  unwrap(
    await supabase.from('user_games').insert({ user_id: userId, game_id: gameId, copy_number: nextCopyNumber }),
    t('communities.err.addGame'),
  );
}

/** Removes the whole game (every copy) from the personal collection. */
export async function removeUserGame(userId: string, gameId: string): Promise<void> {
  unwrap(await supabase.from('user_games').delete().eq('user_id', userId).eq('game_id', gameId), t('communities.err.removeGame'));
}
