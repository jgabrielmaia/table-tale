export const queryKeys = {
  games: ['games'] as const,
  game: (slug: string) => ['games', slug] as const,
  gameStates: (userId: string | null) => ['game-states', userId] as const,
  sessions: (userId: string | null, gameId?: string) => ['sessions', userId, gameId ?? 'all'] as const,
  profile: (userId: string | null) => ['profile', userId] as const,
  stats: (userId: string | null) => ['stats', userId] as const,
  achievements: (userId: string | null) => ['achievements', userId] as const,
  activity: (userId: string | null) => ['activity', userId] as const,
  events: (userId: string | null) => ['events', userId] as const,
  lore: ['lore'] as const,
  activeSeason: ['season', 'active'] as const,
  myIdentities: (userId: string | null) => ['identities', 'mine', userId] as const,
  activeIdentities: ['identities', 'active'] as const,
  factions: ['factions'] as const,
};

/** Keys whose data depends on the user's progress (refreshed after any activity change). */
export const progressKeys = (userId: string | null) => [
  queryKeys.profile(userId),
  queryKeys.stats(userId),
  queryKeys.achievements(userId),
  queryKeys.activity(userId),
];
