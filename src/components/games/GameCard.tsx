import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui';
import { PlayerAvatar } from '@/components/identity/PlayerAvatar';
import { playersLabel } from '@/lib/format';
import type { GameStatus, LibraryGame } from '@/types/domain';
import { GameCover, coverAccent } from './GameCover';
import { GameStatusBadge, STATUS_OPTIONS } from './GameStatusBadge';

export interface GameCardProps {
  game: LibraryGame;
  /** When provided, shows favourite / status controls. */
  onToggleFavorite?: (game: LibraryGame) => void;
  onStatusChange?: (game: LibraryGame, status: GameStatus) => void;
  busy?: boolean;
  compact?: boolean;
  headingLevel?: 2 | 3;
}

export function GameCard({ game, onToggleFavorite, onStatusChange, busy, compact, headingLevel = 3 }: GameCardProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const owner = game.owners[0];
  const copies = game.owners.reduce((sum, o) => sum + o.copies, 0);
  const style = { '--accent': coverAccent(game.slug, game.genre) } as CSSProperties;
  const statusId = `status-${game.id}`;

  return (
    <li className="game-card" style={style}>
      <Link className="game-card-link" to={`/games/${game.slug}`}>
        <div className="game-card-media">
          <GameCover slug={game.slug} title={game.title} genre={game.genre} coverUrl={game.coverUrl} />
          {!compact && <GameStatusBadge status={game.status} />}
          {game.isFavorite && (
            <span className="fav-badge">
              <Icon name="heart" />
              <span className="sr-only">Favorito</span>
            </span>
          )}
        </div>
        <div className="game-card-body">
          <p className="game-card-genre">
            <span className="dot" aria-hidden="true" />
            {game.genre} · {game.complexity}
          </p>
          <Heading className="game-card-title">{game.title}</Heading>
          <ul className="meta-list">
            <li><Icon name="users" />{playersLabel(game.minPlayers, game.maxPlayers)}</li>
            <li><Icon name="clock" />~{game.durationMinutes} min</li>
          </ul>
          {owner && (
            <p className="owner">
              <PlayerAvatar playerId={owner.userId} name={owner.displayName} src={owner.avatarUrl} size="xs" decorative />
              <span>
                <span className="sr-only">Proprietário: </span>
                {owner.displayName}
                {copies > 1 && ` · ${copies} exemplares`}
              </span>
            </p>
          )}
        </div>
      </Link>

      {(onToggleFavorite || onStatusChange) && (
        <div className="game-card-actions">
          {onToggleFavorite && (
            <button
              type="button"
              className="icon-btn fav-toggle"
              aria-pressed={game.isFavorite}
              aria-label={game.isFavorite ? `Remover ${game.title} dos favoritos` : `Adicionar ${game.title} aos favoritos`}
              disabled={busy}
              onClick={() => onToggleFavorite(game)}
            >
              <Icon name="heart" />
            </button>
          )}
          {onStatusChange && (
            <>
              <label className="sr-only" htmlFor={statusId}>Estado de {game.title}</label>
              <select
                id={statusId}
                className="card-status-select"
                value={game.status}
                disabled={busy}
                onChange={(e) => onStatusChange(game, e.target.value as GameStatus)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </>
          )}
        </div>
      )}
    </li>
  );
}
