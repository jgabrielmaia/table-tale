export const queryKeys = {
  games: ['games'] as const,
  game: (slug: string) => ['games', slug] as const,
  gameStates: (userId: string | null) => ['game-states', userId] as const,
  sessions: (userId: string | null, gameId?: string) => ['sessions', userId, gameId ?? 'all'] as const,
  profile: (userId: string | null) => ['profile', userId] as const,
  /** Another player's public profile (players/:id). */
  player: (playerId: string) => ['player', playerId] as const,
  stats: (userId: string | null) => ['stats', userId] as const,
  achievements: (userId: string | null) => ['achievements', userId] as const,
  events: (userId: string | null) => ['events', userId] as const,
  lore: ['lore'] as const,
  activeSeason: ['season', 'active'] as const,
  myIdentities: (userId: string | null) => ['identities', 'mine', userId] as const,
  activeIdentities: ['identities', 'active'] as const,
  factions: ['factions'] as const,
  communities: ['communities'] as const,
  community: (slug: string) => ['communities', slug] as const,
  communityMembers: (id: string | null) => ['community-members', id] as const,
  communityGames: (id: string | null) => ['community-games', id] as const,
  myMemberships: (userId: string | null) => ['my-memberships', userId] as const,
  myUserGames: (userId: string | null) => ['my-user-games', userId] as const,
  shelves: ['shelves'] as const,
  /** Home page highlights: depend on the viewer's plays and communities. */
  highlights: (userId: string | null) => ['highlights', userId] as const,
};

/** Keys whose data depends on the user's progress (refreshed after any activity change). */
export const progressKeys = (userId: string | null) => [
  queryKeys.profile(userId),
  queryKeys.stats(userId),
  queryKeys.achievements(userId),
  queryKeys.highlights(userId),
];
