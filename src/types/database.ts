/** Row shapes of the Supabase/PostgreSQL tables (snake_case, as returned by PostgREST).
 *  Regenerate the full client types with: npx supabase gen types typescript --project-id <ref> */

import type { BggThing } from './bgg';

export type GameStatusRow = 'unplayed' | 'in_progress' | 'completed';
export type OwnershipCondition = 'new' | 'good' | 'worn' | 'damaged';
export type AchievementRequirement = 'sessions' | 'games_played' | 'completed' | 'favorites' | 'events' | 'genres' | 'fate_draw' | 'community_owner';

export interface FactionRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  symbol: string;
  color: string;
  lore: unknown;
  created_at: string;
}

export interface LoreEntityRow {
  id: string;
  faction_id: string | null;
  name: string;
  slug: string;
  description: string;
  long_description: string;
  symbol: string;
  color: string;
  image_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  display_name: string;
  email?: string | null;
  avatar_url: string | null;
  level: number;
  experience_points: number;
  faction_id: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface GameRow {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_url: string | null;
  /** null when BGG does not know the value (BGG sends 0). */
  min_players: number | null;
  max_players: number | null;
  duration_minutes: number | null;
  bgg_id: number | null;
  /** Full BGG item as returned; only selected on the game page. */
  bgg_data?: BggThing | null;
  bgg_synced_at: string | null;
  categories: string[];
  mechanics: string[];
  year_published: number | null;
  min_age: number | null;
  bgg_rating: number | null;
  bgg_rating_count: number | null;
  bgg_rank: number | null;
  bgg_weight: number | null;
  created_at: string;
  updated_at: string;
}

/** Personal collection (table `user_games`, formerly `game_ownerships`). */
export interface UserGameRow {
  id: string;
  game_id: string;
  user_id: string;
  copy_number: number;
  acquired_at: string | null;
  condition: OwnershipCondition;
  notes: string | null;
}

export interface UserGameStatusRow {
  id: string;
  user_id: string;
  game_id: string;
  status: GameStatusRow;
  is_favorite: boolean;
  updated_at: string;
}

export interface GameSessionRow {
  id: string;
  game_id: string;
  user_id: string;
  played_at: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  players_count: number | null;
  rating: number | null;
  notes: string | null;
  created_at: string;
}

export interface EventRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  location: string;
  event_date: string;
  image_url: string | null;
  created_at: string;
}

export interface EventParticipantRow {
  id: string;
  event_id: string;
  user_id: string;
  joined_at: string;
}

export interface AchievementRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: AchievementRequirement;
  requirement_value: number;
}

export interface UserAchievementRow {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface SeasonRow {
  id: string;
  slug: string;
  name: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
}

export interface PlayerCardIdentityRow {
  id: string;
  player_id: string;
  season_id: string;
  card_id: string;
  faction: 'arcanos' | 'elementais';
  selected_at: string;
  is_active: boolean;
}

export interface DrawFateCardRow {
  r_season_id: string;
  r_card_id: string;
  r_faction: 'arcanos' | 'elementais';
  r_selected_at: string;
  r_is_active: boolean;
  r_already_drawn: boolean;
}

export type CommunityVisibility = 'public' | 'private';
export type CommunityRole = 'owner' | 'admin' | 'moderator' | 'member';
export type MembershipStatus = 'pending' | 'active' | 'suspended';

export interface CommunityRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  visibility: CommunityVisibility;
  /** Who sees the shelf (games and copies): everyone, or members only. A private community's shelf is always members-only. */
  shelf_visibility: CommunityVisibility;
  city: string;
  district: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  created_by: string;
  cover_url: string | null;
  /** Vertical position of the cover photo, in percent (0 = top, 100 = bottom). */
  cover_position: number;
  created_at: string;
  updated_at: string;
}

export interface CommunityMembershipRow {
  id: string;
  user_id: string;
  community_id: string;
  role: CommunityRole;
  status: MembershipStatus;
  joined_at: string;
}

export interface CommunityGameRow {
  id: string;
  community_id: string;
  game_id: string;
  added_by: string | null;
  copies: number;
  condition: OwnershipCondition;
  notes: string | null;
  added_at: string;
}

/** One copy of a game on a community shelf. owner_id null: the copy belongs to the community. */
export interface CommunityGameCopyRow {
  id: string;
  community_game_id: string;
  community_id: string;
  owner_id: string | null;
  added_at: string;
}

/** One row of shelf_highlights(): the home page's games, best first. Counts are null for the player's own (recent) games. */
export interface ShelfHighlightRow {
  game_id: string;
  source: 'recent' | 'community' | 'public';
  last_played_at: string | null;
  players: number | null;
  sessions: number | null;
  copies: number | null;
}

export interface ProfileStatsRow {
  sessions: number;
  games_played: number;
  completed: number;
  favorites: number;
  events: number;
  genres: number;
  minutes: number;
  achievements: number;
}
