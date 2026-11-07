import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import { t, type MessageKey } from '@/i18n';
import { mapGame, type GameQueryRow } from '@/features/games/api';
import type { BggSearchResult, BggThing } from '@/types/bgg';
import type { GameRow } from '@/types/database';
import type { Game } from '@/types/domain';

/** The BGG token lives in the `bgg` Edge Function only; the browser just calls that function with the user's session. */
export interface BggSearchHit extends BggSearchResult {
  /** Slug of the catalogue game imported from this BGG entry, if any. */
  gameSlug: string | null;
}

const ERROR_KEYS: Record<string, MessageKey> = {
  unauthenticated: 'bgg.err.unauthenticated',
  bad_request: 'bgg.err.badRequest',
  not_found: 'bgg.err.notFound',
  bgg_unauthorized: 'bgg.err.notAuthorised',
  rate_limited: 'bgg.err.rateLimited',
  unavailable: 'bgg.err.unavailable',
  bad_response: 'bgg.err.unavailable',
};

async function callBgg<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('bgg', { body });
  if (!error) return data as T;
  let code = 'unavailable';
  const response = (error as { context?: unknown }).context;
  if (response instanceof Response) {
    try {
      code = (await response.json())?.error?.code ?? code;
    } catch {
      /* not JSON: keep the generic code */
    }
  }
  throw new AppError(t(ERROR_KEYS[code] ?? 'bgg.err.unavailable'), error);
}

export async function searchBgg(query: string): Promise<BggSearchHit[]> {
  return (await callBgg<{ results: BggSearchHit[] }>({ action: 'search', query })).results;
}

export async function previewBgg(id: number): Promise<{ thing: BggThing; gameSlug: string | null }> {
  return callBgg({ action: 'preview', id });
}

/** Imports (or refreshes) the game in the shared catalogue and returns it. Adding it to a library is a separate step. */
export async function importBgg(id: number): Promise<Game> {
  const { game } = await callBgg<{ game: GameRow }>({ action: 'import', id });
  return mapGame({ ...game, user_games: [] } as GameQueryRow);
}
