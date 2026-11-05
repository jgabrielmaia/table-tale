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
  genre: string;
  minPlayers: number;
  maxPlayers: number;
  durationMinutes: number;
  complexity: string;
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
