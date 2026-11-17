import { supabase } from '@/lib/supabase';
import { AppError, unwrap } from '@/lib/errors';
import { t } from '@/i18n';
import type { GameRow, GameSessionRow, OwnershipCondition, ShelfHighlightRow, UserGameStatusRow } from '@/types/database';
import type { Game, GameOwner, GameSession, GameStatus, GameUserState, ShelfHighlight } from '@/types/domain';
import type { NewGameValues } from './schemas';
import { shrinkErrorMessage, shrinkImage } from '@/lib/image';
import { GAME_COVER_BUCKET, GAME_COVER_TARGET, GAME_COVER_TYPES, ownCoverPath } from './cover';
import type { ShelfEntry } from './shelves';

const LIST_COLUMNS =
  'id,title,slug,description,cover_url,min_players,max_players,duration_minutes,bgg_id,bgg_synced_at,categories,mechanics,' +
  'year_published,min_age,bgg_rating,bgg_rating_count,bgg_rank,bgg_weight,owner_id,cover_credit,cover_credit_url';
const OWNERS = 'user_games(user_id,copy_number,condition,profiles(id,display_name,avatar_url))';
const GAME_SELECT = `${LIST_COLUMNS},${OWNERS}`;
/** The game page also loads the full BGG item (designers, artists, publishers...). */
const GAME_DETAIL_SELECT = `${LIST_COLUMNS},bgg_data,${OWNERS}`;

export type GameQueryRow = Omit<GameRow, 'created_at' | 'updated_at'> & {
  user_games: {
    user_id: string;
    copy_number: number;
    condition: OwnershipCondition;
    profiles: { id: string; display_name: string; avatar_url: string | null } | null;
  }[] | null;
};

export function mapGame(row: GameQueryRow): Game {
  const owners = new Map<string, GameOwner>();
  for (const o of row.user_games ?? []) {
    const existing = owners.get(o.user_id);
    if (existing) existing.copies += 1;
    else
      owners.set(o.user_id, {
        userId: o.user_id,
        displayName: o.profiles?.display_name || t('common.player'),
        avatarUrl: o.profiles?.avatar_url ?? null,
        copies: 1,
        condition: o.condition,
      });
  }
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    coverUrl: row.cover_url,
    minPlayers: row.min_players,
    maxPlayers: row.max_players,
    durationMinutes: row.duration_minutes,
    categories: row.categories ?? [],
    mechanics: row.mechanics ?? [],
    ownerId: row.owner_id ?? null,
    coverCredit: row.cover_credit ?? null,
    coverCreditUrl: row.cover_credit_url ?? null,
    yearPublished: row.year_published,
    minAge: row.min_age,
    bggId: row.bgg_id,
    rating: row.bgg_rating,
    ratingCount: row.bgg_rating_count,
    rank: row.bgg_rank,
    weight: row.bgg_weight,
    bgg: row.bgg_data ?? null,
    owners: [...owners.values()],
  };
}

export const mapSession = (r: GameSessionRow): GameSession => ({
  id: r.id,
  gameId: r.game_id,
  userId: r.user_id,
  playedAt: r.played_at,
  startedAt: r.started_at ?? null,
  endedAt: r.ended_at ?? null,
  durationMinutes: r.duration_minutes,
  playersCount: r.players_count,
  rating: r.rating,
  notes: r.notes,
  createdAt: r.created_at,
});

export async function fetchGames(): Promise<Game[]> {
  const rows = unwrap(await supabase.from('games').select(GAME_SELECT).order('title'), t('games.err.load'));
  return (rows as unknown as GameQueryRow[]).map(mapGame);
}

export async function fetchGameBySlug(slug: string): Promise<Game | null> {
  const row = unwrap(
    await supabase.from('games').select(GAME_DETAIL_SELECT).eq('slug', slug).maybeSingle(),
    t('games.err.game'),
  );
  return row ? mapGame(row as unknown as GameQueryRow) : null;
}

/** Shrinks and uploads a game cover to the player's own folder; returns its public URL and storage path. */
async function uploadGameCover(userId: string, picked: File): Promise<{ url: string; path: string }> {
  if (!GAME_COVER_TYPES[picked.type]) throw new AppError(t('edit.fileType'));
  let file: File;
  try {
    file = await shrinkImage(picked, GAME_COVER_TARGET);
  } catch (e) {
    throw new AppError(shrinkErrorMessage(e));
  }
  const path = `${userId}/game-${Date.now()}.${GAME_COVER_TYPES[file.type]}`;
  unwrap(await supabase.storage.from(GAME_COVER_BUCKET).upload(path, file, { contentType: file.type, upsert: false }), t('newGame.errUpload'));
  return { url: supabase.storage.from(GAME_COVER_BUCKET).getPublicUrl(path).data.publicUrl, path };
}

// A leftover file only costs storage, so a failed clean-up never fails the action.
async function removeGameCover(path: string | null) {
  if (!path) return;
  const { error } = await supabase.storage.from(GAME_COVER_BUCKET).remove([path]);
  if (error) console.warn('game cover clean-up failed', error.message);
}

const gameArgs = (values: NewGameValues, categories: string[], coverUrl: string | null) => ({
  p_title: values.title,
  p_description: values.description,
  p_min_players: values.minPlayers,
  p_max_players: values.maxPlayers,
  p_duration_minutes: values.durationMinutes,
  p_categories: categories,
  p_min_age: values.minAge,
  p_cover_url: coverUrl,
});

/**
 * A game added by hand, without BGG: the database makes the caller its owner and picks a free slug. The cover, if any,
 * is shrunk and uploaded first (and removed again if the game can't be created).
 */
export async function createGame(userId: string, values: NewGameValues, categories: string[], cover: File | null): Promise<{ id: string; slug: string }> {
  const uploaded = cover ? await uploadGameCover(userId, cover) : null;
  const result = await supabase.rpc('create_game', gameArgs(values, categories, uploaded?.url ?? null));
  if (result.error) await removeGameCover(uploaded?.path ?? null);
  if (result.error?.code === '54000') throw new AppError(t('newGame.errLimit'), result.error);
  const rows = unwrap(result, t('newGame.errCreate')) as { game_id: string; slug: string }[] | null;
  const created = rows?.[0];
  if (!created) throw new AppError(t('newGame.errCreate'));
  return { id: created.game_id, slug: created.slug };
}

/**
 * Saves a game the player added by hand. cover: a new File replaces the image, null removes it, undefined keeps it.
 * The player's previous upload is removed once the game points elsewhere.
 */
export async function updateGame(
  userId: string,
  game: Pick<Game, 'id' | 'coverUrl'>,
  values: NewGameValues,
  categories: string[],
  cover: File | null | undefined,
): Promise<void> {
  const uploaded = cover ? await uploadGameCover(userId, cover) : null;
  const coverUrl = cover === undefined ? game.coverUrl : uploaded?.url ?? null;
  const result = await supabase.rpc('update_game', { p_game: game.id, ...gameArgs(values, categories, coverUrl) });
  if (result.error || result.data !== true) await removeGameCover(uploaded?.path ?? null);
  const saved = unwrap(result, t('newGame.errSave')) as boolean | null;
  if (saved !== true) throw new AppError(t('newGame.errNotOwner'));
  if (coverUrl !== game.coverUrl && game.coverUrl) {
    const { data: others } = await supabase.from('games').select('id').eq('cover_url', game.coverUrl).limit(1);
    if (others && others.length === 0) await removeGameCover(ownCoverPath(game.coverUrl, userId));
  }
}

/** Saves the game's categories. Row-level security lets only the game's owner through, which shows as no row updated. */
export async function updateGameCategories(gameId: string, categories: string[]): Promise<void> {
  const rows = unwrap(await supabase.from('games').update({ categories }).eq('id', gameId).select('id'), t('game.categories.errSave')) as { id: string }[] | null;
  if (!rows?.length) throw new AppError(t('game.categories.errNotOwner'));
}

export async function fetchGameStates(userId: string): Promise<GameUserState[]> {
  const rows = unwrap(
    await supabase.from('user_game_status').select('game_id,status,is_favorite').eq('user_id', userId),
    t('games.err.states'),
  ) as Pick<UserGameStatusRow, 'game_id' | 'status' | 'is_favorite'>[];
  return rows.map((r) => ({ gameId: r.game_id, status: r.status, isFavorite: r.is_favorite }));
}

export async function saveGameState(
  userId: string,
  gameId: string,
  patch: { status?: GameStatus; isFavorite?: boolean },
): Promise<GameUserState> {
  const payload: Record<string, unknown> = { user_id: userId, game_id: gameId };
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.isFavorite !== undefined) payload.is_favorite = patch.isFavorite;
  const row = unwrap(
    await supabase
      .from('user_game_status')
      .upsert(payload, { onConflict: 'user_id,game_id' })
      .select('game_id,status,is_favorite')
      .single(),
    t('games.err.save'),
  ) as Pick<UserGameStatusRow, 'game_id' | 'status' | 'is_favorite'>;
  return { gameId: row.game_id, status: row.status, isFavorite: row.is_favorite };
}

export async function fetchSessions(userId: string, gameId?: string): Promise<GameSession[]> {
  let query = supabase.from('game_sessions').select('*').eq('user_id', userId);
  if (gameId) query = query.eq('game_id', gameId);
  const rows = unwrap(
    await query.order('played_at', { ascending: false }).order('created_at', { ascending: false }),
    t('games.err.sessions'),
  ) as GameSessionRow[];
  return rows.map(mapSession);
}

export interface NewSession {
  gameId: string;
  playedAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  durationMinutes?: number | null;
  playersCount?: number | null;
  rating?: number | null;
  notes?: string | null;
}

export async function createSession(userId: string, input: NewSession): Promise<GameSession> {
  const row = unwrap(
    await supabase
      .from('game_sessions')
      .insert({
        user_id: userId,
        game_id: input.gameId,
        played_at: input.playedAt,
        started_at: input.startedAt ?? null,
        ended_at: input.endedAt ?? null,
        duration_minutes: input.durationMinutes ?? null,
        players_count: input.playersCount ?? null,
        rating: input.rating ?? null,
        notes: input.notes?.trim() || null,
      })
      .select('*')
      .single(),
    t('games.err.createSession'),
  ) as GameSessionRow;
  return mapSession(row);
}

export async function deleteSession(sessionId: string): Promise<void> {
  unwrap(await supabase.from('game_sessions').delete().eq('id', sessionId), t('games.err.deleteSession'));
}

// ---- community shelves ---------------------------------------------------------------------------------------------

type ShelfQueryRow = {
  game_id: string;
  copies: number;
  communities: { id: string; slug: string; name: string; city: string; latitude: number | string | null; longitude: number | string | null } | null;
};

/** Every shelf entry the viewer may read (public communities and their own), with the community's location. */
export async function fetchShelfEntries(): Promise<ShelfEntry[]> {
  const rows = unwrap(
    await supabase.from('community_games').select('game_id,copies,communities(id,slug,name,city,latitude,longitude)'),
    t('games.err.load'),
  ) as unknown as ShelfQueryRow[];
  const num = (v: number | string | null) => (v === null ? null : Number(v));
  return rows
    .filter((r) => r.communities)
    .map((r) => ({
      gameId: r.game_id,
      copies: r.copies,
      community: { ...r.communities!, latitude: num(r.communities!.latitude), longitude: num(r.communities!.longitude) },
    }));
}

/** Home page highlights for the current viewer (or a visitor), best first. Ranking and fallbacks live in the database. */
export async function fetchShelfHighlights(limit = 3): Promise<ShelfHighlight[]> {
  const rows = unwrap(await supabase.rpc('shelf_highlights', { p_limit: limit }), t('games.err.load')) as ShelfHighlightRow[] | null;
  return (rows ?? []).map((r) => ({
    gameId: r.game_id,
    source: r.source,
    lastPlayedAt: r.last_played_at,
    players: r.players ?? 0,
    copies: r.copies ?? 0,
  }));
}
