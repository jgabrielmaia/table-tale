import { supabase } from '@/lib/supabase';
import { AppError, unwrap } from '@/lib/errors';
import type { AchievementRow, ProfileRow, ProfileStatsRow, UserAchievementRow } from '@/types/database';
import type { Achievement, Profile, ProfileStats } from '@/types/domain';
import { t } from '@/i18n';

const PROFILE_COLUMNS = 'id,display_name,avatar_url,level,experience_points,faction_id,bio,created_at,updated_at';

const mapProfile = (r: ProfileRow, email: string | null): Profile => ({
  id: r.id,
  displayName: r.display_name,
  email,
  avatarUrl: r.avatar_url,
  level: r.level,
  experiencePoints: r.experience_points,
  factionId: r.faction_id,
  bio: r.bio,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export async function fetchProfile(userId: string, email: string | null): Promise<Profile | null> {
  const row = unwrap(
    await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle(),
    t('profile.err.load'),
  ) as ProfileRow | null;
  return row ? mapProfile(row, email) : null;
}

export interface ProfileUpdate {
  displayName?: string;
  bio?: string;
  avatarUrl?: string | null;
}

export async function updateProfile(userId: string, patch: ProfileUpdate): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.displayName !== undefined) payload.display_name = patch.displayName.trim();
  if (patch.bio !== undefined) payload.bio = patch.bio.trim() || null;
  if (patch.avatarUrl !== undefined) payload.avatar_url = patch.avatarUrl;
  if (!Object.keys(payload).length) return;
  unwrap(await supabase.from('profiles').update(payload).eq('id', userId), t('profile.err.save'));
}

const AVATAR_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
export const AVATAR_MAX_BYTES = 1024 * 1024;

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = AVATAR_TYPES[file.type];
  if (!ext) throw new AppError(t('profile.err.format'));
  if (file.size > AVATAR_MAX_BYTES) throw new AppError(t('profile.err.size'));
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  unwrap(await supabase.storage.from('avatars').upload(path, file, { contentType: file.type, upsert: false }), t('profile.err.upload'));
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

export async function fetchProfileStats(): Promise<ProfileStats> {
  const rows = unwrap(await supabase.rpc('my_profile_stats'), t('profile.err.stats')) as ProfileStatsRow[] | null;
  const r = rows?.[0];
  return {
    sessions: r?.sessions ?? 0,
    gamesPlayed: r?.games_played ?? 0,
    completed: r?.completed ?? 0,
    favorites: r?.favorites ?? 0,
    eventsAttended: r?.events ?? 0,
    genres: r?.genres ?? 0,
    hoursPlayed: Math.round((r?.minutes ?? 0) / 6) / 10,
    achievementsUnlocked: r?.achievements ?? 0,
  };
}

const METRIC_BY_REQUIREMENT: Record<Exclude<AchievementRow['requirement_type'], 'fate_draw'>, keyof ProfileStats> = {
  sessions: 'sessions',
  games_played: 'gamesPlayed',
  completed: 'completed',
  favorites: 'favorites',
  events: 'eventsAttended',
  genres: 'genres',
};

export async function fetchAchievements(userId: string | null, stats: ProfileStats | null): Promise<Achievement[]> {
  const all = unwrap(await supabase.from('achievements').select('*').order('requirement_value'), t('profile.err.achievements')) as AchievementRow[];
  let unlocked: Pick<UserAchievementRow, 'achievement_id' | 'unlocked_at'>[] = [];
  if (userId) {
    unlocked = unwrap(
      await supabase.from('user_achievements').select('achievement_id,unlocked_at').eq('user_id', userId),
      t('profile.err.achievements'),
    ) as typeof unlocked;
  }
  const unlockedAt = new Map(unlocked.map((u) => [u.achievement_id, u.unlocked_at]));
  return all.map((a) => {
    // The Fate Draw has no counter in the stats: it is either revealed or not.
    const current = a.requirement_type === 'fate_draw'
      ? (unlockedAt.has(a.id) ? a.requirement_value : 0)
      : stats ? Number(stats[METRIC_BY_REQUIREMENT[a.requirement_type]]) : 0;
    return {
      id: a.id,
      slug: a.slug,
      name: a.name,
      description: a.description,
      icon: a.icon,
      requirementType: a.requirement_type,
      requirementValue: a.requirement_value,
      unlockedAt: unlockedAt.get(a.id) ?? null,
      progress: Math.min(current, a.requirement_value),
    };
  });
}
