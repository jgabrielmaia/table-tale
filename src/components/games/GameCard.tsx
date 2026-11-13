import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { BrandSymbol, Icon } from '@/components/ui';
import { PlayerAvatar } from '@/components/identity/PlayerAvatar';
import { t, tn } from '@/i18n';
import { minutesText, playersText } from '@/lib/format';
import type { GameStatus, LibraryGame } from '@/types/domain';
import { formatKm, type GameShelf, type ShelfGame } from '@/features/games/shelves';
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
  /** On a community page: this shelf's copies, who owns them and its notes (replaces the shelves/owner line). */
  shelf?: ShelfInfo;
  /** On a community page, for its managers: edits this shelf's copies and notes. */
  onEdit?: (game: LibraryGame) => void;
  /** On a community page, for its managers: removes the game from the community. */
  onRemove?: (game: LibraryGame) => void;
  removeLabel?: string;
}

export interface ShelfInfo {
  copies: number;
  /** Distinct owner names, in copy order. */
  owners: string[];
  notes: string | null;
}

export function GameCard({ game, onToggleFavorite, onStatusChange, busy, compact, headingLevel = 3, shelf, onEdit, onRemove, removeLabel }: GameCardProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const shelves = 'shelves' in game ? (game as ShelfGame).shelves : null;
  const owner = game.owners[0];
  const copies = game.owners.reduce((sum, o) => sum + o.copies, 0);
  const style = { '--accent': coverAccent(game.slug) } as CSSProperties;
  const statusId = `status-${game.id}`;

  return (
    <li className="game-card" style={style}>
      <Link className="game-card-link" to={`/games/${game.slug}`}>
        <div className="game-card-media">
          <GameCover slug={game.slug} title={game.title} coverUrl={game.coverUrl} />
          {game.coverUrl && (
            <span className="game-cover-symbol" aria-hidden="true">
              <BrandSymbol name={gameStyle(game.slug).symbol} />
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
          {game.categories.length > 0 && (
            <p className="game-card-categories">
              <span className="dot" aria-hidden="true" />
              {game.categories.slice(0, 2).join(' · ')}
            </p>
          )}
          <Heading className="game-card-title">{game.title}</Heading>
          <ul className="meta-list">
            <li><Icon name="users" />{playersText(game.minPlayers, game.maxPlayers)}</li>
            <li><Icon name="clock" />{minutesText(game.durationMinutes)}</li>
          </ul>
          {shelf ? (
            <div className="game-card-copies">
              <p>{tn('communities.copies', shelf.copies)}</p>
              {shelf.owners.length > 0 && <p className="game-card-copy-owners">{t('communities.copyOwners', { names: shelf.owners.join(', ') })}</p>}
              {shelf.notes && <p className="game-card-notes">{shelf.notes}</p>}
            </div>
          ) : shelves ? (
            <ShelfList shelves={shelves} />
          ) : owner && (
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

      {(onToggleFavorite || onStatusChange || onEdit || onRemove) && (
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
          {onEdit && (
            <button type="button" className="icon-btn game-card-edit" aria-label={t('communities.editGame', { title: game.title })} disabled={busy} onClick={() => onEdit(game)}>
              <Icon name="edit" />
            </button>
          )}
          {onRemove && (
            <button type="button" className="icon-btn game-card-remove" aria-label={removeLabel ?? t('communities.removeGame', { title: game.title })} disabled={busy} onClick={() => onRemove(game)}>
              <Icon name="trash" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}

const MAX_SHELVES = 2;

/** The communities that have the game, closest first; the rest are summarised as "+N". */
function ShelfList({ shelves }: { shelves: GameShelf[] }) {
  const shown = shelves.slice(0, MAX_SHELVES);
  const hidden = shelves.length - shown.length;
  return (
    <ul className="game-card-shelves" aria-label={t('card.shelves')}>
      {shown.map((s) => (
        <li key={s.communityId} className="shelf-chip">
          <Icon name="pin" />
          <span className="shelf-chip-name">{s.name}</span>
          {s.copies > 1 && <span className="shelf-chip-meta">×{s.copies}</span>}
          {s.distanceKm !== null && <span className="shelf-chip-meta">{t('card.km', { km: formatKm(s.distanceKm) })}</span>}
        </li>
      ))}
      {hidden > 0 && <li className="shelf-chip shelf-chip-more">{tn('card.moreShelves', hidden)}</li>}
    </ul>
  );
}
