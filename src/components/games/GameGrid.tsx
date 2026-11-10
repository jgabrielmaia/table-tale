import type { GameStatus, LibraryGame } from '@/types/domain';
import { cn } from '@/lib/format';
import { GameCard } from './GameCard';

export interface GameGridProps {
  games: LibraryGame[];
  compact?: boolean;
  onToggleFavorite?: (game: LibraryGame) => void;
  onStatusChange?: (game: LibraryGame, status: GameStatus) => void;
  busyId?: string | null;
  label?: string;
  /** Community page: copies per game, and (for owners) a remove action. */
  copiesOf?: (game: LibraryGame) => number | undefined;
  onRemove?: (game: LibraryGame) => void;
}

export function GameGrid({ games, compact, onToggleFavorite, onStatusChange, busyId, label, copiesOf, onRemove }: GameGridProps) {
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
          copies={copiesOf?.(g)}
          onRemove={onRemove}
        />
      ))}
    </ul>
  );
}
