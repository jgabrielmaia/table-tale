import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { BrandSymbol, Icon } from '@/components/ui';
import { PlayerAvatar } from '@/components/identity/PlayerAvatar';
import { complexityLabel, genreLabel, t, tn } from '@/i18n';
import { playersLabel } from '@/lib/format';
import type { GameStatus, LibraryGame } from '@/types/domain';
import { gameStyle } from '@/lib/cover';
import { GameCover, coverAccent } from './GameCover';
import { GameStatusBadge, statusOptions } from './GameStatusBadge';

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
          {game.coverUrl && (
            <span className="game-cover-symbol" aria-hidden="true">
              <BrandSymbol name={gameStyle(game.slug, game.genre).symbol} />
            </span>
          )}
          {!compact && <GameStatusBadge status={game.status} />}
          {game.isFavorite && (
            <span className="fav-badge">
              <Icon name="heart" />
              <span className="sr-only">{t('card.favorite')}</span>
            </span>
          )}
        </div>
        <div className="game-card-body">
          <p className="game-card-genre">
            <span className="dot" aria-hidden="true" />
            {genreLabel(game.genre)} · {complexityLabel(game.complexity)}
          </p>
          <Heading className="game-card-title">{game.title}</Heading>
          <ul className="meta-list">
            <li><Icon name="users" />{playersLabel(game.minPlayers, game.maxPlayers)}</li>
            <li><Icon name="clock" />{t('common.minutesApprox', { n: game.durationMinutes })}</li>
          </ul>
          {owner && (
            <p className="owner">
              <PlayerAvatar playerId={owner.userId} name={owner.displayName} src={owner.avatarUrl} size="xs" decorative />
              <span>
                <span className="sr-only">{t('card.owner')}</span>
                {owner.displayName}
                {copies > 1 && ` · ${tn('card.copies', copies)}`}
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
              aria-label={game.isFavorite ? t('card.favRemove', { title: game.title }) : t('card.favAdd', { title: game.title })}
              disabled={busy}
              onClick={() => onToggleFavorite(game)}
            >
              <Icon name="heart" />
            </button>
          )}
          {onStatusChange && (
            <>
              <label className="sr-only" htmlFor={statusId}>{t('card.statusOf', { title: game.title })}</label>
              <select
                id={statusId}
                className="card-status-select"
                value={game.status}
                disabled={busy}
                onChange={(e) => onStatusChange(game, e.target.value as GameStatus)}
              >
                {statusOptions().map((o) => (
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
