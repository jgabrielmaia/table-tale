import { supabase } from '@/lib/supabase';
import { AppError, unwrap } from '@/lib/errors';
import type { DrawFateCardRow, PlayerCardIdentityRow, SeasonRow } from '@/types/database';
import type { FactionId } from './cards';

export interface Season {
  id: string;
  slug: string;
  name: string;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
}

export interface PlayerIdentity {
  playerId: string;
  seasonId: string;
  cardId: string;
  faction: FactionId;
  selectedAt: string;
  /** True only while the identity's season is the active one. */
  isActive: boolean;
  season?: Season;
}

const mapSeason = (r: SeasonRow): Season => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  isActive: r.is_active,
});

export async function fetchActiveSeason(): Promise<Season | null> {
  const row = unwrap(
    await supabase.from('seasons').select('*').eq('is_active', true).maybeSingle(),
    'Could not load the current season',
  ) as SeasonRow | null;
  return row ? mapSeason(row) : null;
}

type IdentityWithSeason = PlayerCardIdentityRow & { seasons: SeasonRow | SeasonRow[] | null };

/** The signed-in player's identities, newest first (active season first when present). */
export async function fetchMyIdentities(userId: string): Promise<PlayerIdentity[]> {
  const rows = unwrap(
    await supabase
      .from('player_card_identities')
      .select('*,seasons(*)')
      .eq('player_id', userId)
      .order('selected_at', { ascending: false }),
    'Could not load your identity',
  ) as IdentityWithSeason[];
  return rows.map((r) => {
    const season = Array.isArray(r.seasons) ? r.seasons[0] : r.seasons;
    return {
      playerId: r.player_id,
      seasonId: r.season_id,
      cardId: r.card_id,
      faction: r.faction,
      selectedAt: r.selected_at,
      isActive: r.is_active && Boolean(season?.is_active),
      season: season ? mapSeason(season) : undefined,
    };
  });
}

/** Active-season identities of every player, keyed by player id (drives avatar frames platform-wide). */
export async function fetchActiveIdentities(): Promise<Record<string, PlayerIdentity>> {
  const rows = unwrap(
    await supabase.from('active_player_identities').select('player_id,season_id,card_id,faction,selected_at'),
    'Could not load player identities',
  ) as Pick<PlayerCardIdentityRow, 'player_id' | 'season_id' | 'card_id' | 'faction' | 'selected_at'>[];
  return Object.fromEntries(
    rows.map((r) => [
      r.player_id,
      { playerId: r.player_id, seasonId: r.season_id, cardId: r.card_id, faction: r.faction, selectedAt: r.selected_at, isActive: true } satisfies PlayerIdentity,
    ]),
  );
}

export interface DrawResult {
  identity: PlayerIdentity;
  alreadyDrawn: boolean;
}

/** Asks the server to assign (or return) this season's card. The client never chooses the card. */
export async function drawFateCard(userId: string): Promise<DrawResult> {
  const { data, error } = await supabase.rpc('draw_fate_card');
  if (error) {
    if (error.hint === 'no_active_season') throw new AppError('No season is open right now. Please come back soon.');
    throw new AppError('The draw could not be completed. Please try again.');
  }
  const r = (data as DrawFateCardRow[] | null)?.[0];
  if (!r) throw new AppError('The draw could not be completed. Please try again.');
  return {
    alreadyDrawn: r.r_already_drawn,
    identity: { playerId: userId, seasonId: r.r_season_id, cardId: r.r_card_id, faction: r.r_faction, selectedAt: r.r_selected_at, isActive: r.r_is_active },
  };
}
