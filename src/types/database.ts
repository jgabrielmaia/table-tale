/** Row shapes of the Supabase/PostgreSQL tables (snake_case, as returned by PostgREST).
 *  Regenerate the full client types with: npx supabase gen types typescript --project-id <ref> */

export type GameStatusRow = 'unplayed' | 'in_progress' | 'completed';
export type OwnershipCondition = 'new' | 'good' | 'worn' | 'damaged';
export type AchievementRequirement = 'sessions' | 'games_played' | 'completed' | 'favorites' | 'events' | 'genres';

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
  genre: string;
  min_players: number;
  max_players: number;
  duration_minutes: number;
  complexity: string;
  created_at: string;
  updated_at: string;
}

export interface GameOwnershipRow {
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
