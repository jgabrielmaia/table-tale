import type { BggThing } from './bgg';
import type { AchievementRequirement, GameStatusRow, OwnershipCondition } from './database';

export type GameStatus = GameStatusRow;

export interface FactionLore {
  member: string;
  color2: string;
  motto: string;
  latin: string;
  latinMeaning: string;
  priorities: string;
  keywords: string[];
  worldview: string[];
  values: [string, string][];
  personality: string[];
  tensions: [string, string][];
  principle: string;
  chooseIf: string[];
  visual: { palette: [string, string][]; language: string; feeling: string };
}

export interface Faction {
  id: string;
  name: string;
  slug: string;
  description: string;
  symbol: string;
  color: string;
  lore: FactionLore;
}

export interface LoreEntity {
  id: string;
  factionId: string | null;
  name: string;
  slug: string;
  description: string;
  longDescription: string;
  symbol: string;
  color: string;
  imageUrl: string | null;
}

export type Arcana = LoreEntity;
export type Elemental = LoreEntity;

export interface LoreLink {
  arcanaId: string;
  elementalId: string;
  relation: 'tension' | 'affinity' | 'complement';
  description: string;
}

export interface GameOwner {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  copies: number;
  condition: OwnershipCondition;
}

export interface Game {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverUrl: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  durationMinutes: number | null;
  /** BoardGameGeek categories and mechanics, shown as BGG returns them. */
  categories: string[];
  mechanics: string[];
  yearPublished: number | null;
  minAge: number | null;
  bggId: number | null;
  rating: number | null;
  ratingCount: number | null;
  rank: number | null;
  /** BGG "weight" (1-5 average complexity votes). */
  weight: number | null;
  /** Full BGG item; only loaded by the game page. */
  bgg: BggThing | null;
  owners: GameOwner[];
}

export interface GameUserState {
  gameId: string;
  status: GameStatus;
  isFavorite: boolean;
}

export interface LibraryGame extends Game {
  status: GameStatus;
  isFavorite: boolean;
}

/** Where a home page highlight comes from: the player's own plays, their communities, or public communities. */
export type HighlightSource = 'recent' | 'community' | 'public';

export interface ShelfHighlight {
  gameId: string;
  source: HighlightSource;
  /** 'YYYY-MM-DD', for recent games. */
  lastPlayedAt: string | null;
  /** Distinct members who played it lately, for popular games. */
  players: number;
  copies: number;
}

export interface GameSession {
  id: string;
  gameId: string;
  userId: string;
  playedAt: string;
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number | null;
  playersCount: number | null;
  rating: number | null;
  notes: string | null;
  createdAt: string;
}

export interface Profile {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  level: number;
  experiencePoints: number;
  factionId: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileStats {
  sessions: number;
  gamesPlayed: number;
  completed: number;
  favorites: number;
  eventsAttended: number;
  genres: number;
  hoursPlayed: number;
  achievementsUnlocked: number;
}

export interface EventItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  location: string;
  eventDate: string;
  imageUrl: string | null;
  isParticipating: boolean;
}

export interface Achievement {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  requirementType: AchievementRequirement;
  requirementValue: number;
  unlockedAt: string | null;
  progress: number;
}

export interface ActivityItem {
  id: string;
  type: 'session' | 'event' | 'achievement';
  date: string;
  title: string;
  detail?: string;
  href?: string;
}

export type CommunityVisibility = 'public' | 'private';
export type CommunityRole = 'owner' | 'admin' | 'moderator' | 'member';
export type MembershipStatus = 'pending' | 'active' | 'suspended';

export interface Community {
  id: string;
  slug: string;
  name: string;
  description: string;
  visibility: CommunityVisibility;
  shelfVisibility: CommunityVisibility;
  city: string;
  district: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  createdBy: string;
  /** Cover photo uploaded by an owner or admin; null shows the branded fallback. */
  coverUrl: string | null;
  /** Vertical position of the cover photo, in percent (0 = top, 100 = bottom). */
  coverPosition: number;
  memberCount: number;
}

/** The signed-in user's relation to a community (absent when not a participant). */
export interface MyMembership {
  communityId: string;
  role: CommunityRole;
  status: MembershipStatus;
}

export interface CommunityMember {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: CommunityRole;
  status: MembershipStatus;
  joinedAt: string;
}

export type GameBrief = Pick<Game, 'id' | 'title' | 'slug' | 'coverUrl' | 'categories' | 'minPlayers' | 'maxPlayers' | 'durationMinutes'>;

/** One copy on a community shelf and who owns it (null: the community itself). */
export interface CommunityGameCopy {
  id: string;
  ownerId: string | null;
  ownerName: string | null;
}

export interface CommunityGameEntry {
  id: string;
  communityId: string;
  copies: number;
  /** One per copy, oldest first. */
  copyList: CommunityGameCopy[];
  condition: OwnershipCondition;
  notes: string | null;
  game: GameBrief;
}

/** One game in the user's personal collection (copies grouped). */
export interface UserGameEntry {
  gameId: string;
  copies: number;
  condition: OwnershipCondition;
  game: GameBrief;
}
