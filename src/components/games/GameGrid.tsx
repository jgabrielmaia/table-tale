import type { GameStatus, LibraryGame } from '@/types/domain';
import { cn } from '@/lib/format';
import { GameCard, type ShelfInfo } from './GameCard';

export interface GameGridProps {
  games: LibraryGame[];
  compact?: boolean;
  onToggleFavorite?: (game: LibraryGame) => void;
  onStatusChange?: (game: LibraryGame, status: GameStatus) => void;
  busyId?: string | null;
  label?: string;
  /** Community page: this shelf's copies, owners and notes per game, and (for managers) edit and remove actions. */
  shelfOf?: (game: LibraryGame) => ShelfInfo | undefined;
  onEdit?: (game: LibraryGame) => void;
  onRemove?: (game: LibraryGame) => void;
  /** A short line per game under its details (home page highlights). */
  noteOf?: (game: LibraryGame) => string | undefined;
}

export function GameGrid({ games, compact, onToggleFavorite, onStatusChange, busyId, label, shelfOf, onEdit, onRemove, noteOf }: GameGridProps) {
  return (
    <ul className={cn('game-grid', compact && 'game-grid-compact')} role="list" aria-label={label}>
      {games.map((g) => (
        <GameCard
          key={g.id}
          game={g}
          compact={compact}
          onToggleFavorite={onToggleFavorite}
          onStatusChange={onStatusChange}
          busy={busyId === g.id}
          shelf={shelfOf?.(g)}
          onEdit={onEdit}
          onRemove={onRemove}
          note={noteOf?.(g)}
        />
      ))}
    </ul>
  );
}
