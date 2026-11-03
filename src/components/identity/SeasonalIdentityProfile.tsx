import { Button, ButtonLink } from '@/components/ui';
import type { PlayerIdentity } from '@/features/fate/api';
import { FACTIONS, getFateCard } from '@/features/fate/cards';
import { formatDate } from '@/lib/format';
import type { Profile } from '@/types/domain';
import { PlayerAvatar } from './PlayerAvatar';
import { SeasonHistory } from './SeasonHistory';
import type { CSSProperties } from 'react';
import { FRAME_THEMES } from './frameThemes';
import type { CardArtKey } from '@/assets/cards';

interface SeasonalIdentityProfileProps {
  profile: Profile;
  active: PlayerIdentity | null;
  history: PlayerIdentity[];
  seasonOpen: boolean;
  /** TEMPORARY: dev builds only. */
  onDevReset?: () => void;
}

export function SeasonalIdentityProfile({ profile, active, history, seasonOpen, onDevReset }: SeasonalIdentityProfileProps) {
  const card = active ? getFateCard(active.cardId) : undefined;
  const faction = card ? FACTIONS[card.faction] : null;
  const theme = card ? FRAME_THEMES[card.id as CardArtKey] : null;
  const name = profile.displayName || 'Jogador';

  return (
    <section className="my-8" aria-labelledby="identity-title">
      <h2 id="identity-title" className="fate-profile-heading">My Table Tale Identity</h2>
      {card && faction && theme && active ? (
        <div className="sid" data-has-card="true" style={{ '--a': theme.a } as CSSProperties}>
          <div className="sid__card"><img src={card.image} alt={card.numeral ? `${card.numeral} — ${card.title}` : card.title} /></div>
          <div className="sid__body">
            <div className="sid__who">
              <PlayerAvatar playerId={profile.id} name={name} src={profile.avatarUrl} size="xl" decorative />
              <div>
                <h3 className="sid__title">{card.title}</h3>
                <p className="sid__faction">{faction.name}</p>
              </div>
            </div>
            <p className="sid__motto">{faction.motto}</p>
            <p className="sid__desc">{card.description}</p>
            <ul className="sid__meta">
              <li>Active season: <strong>{active.season?.name ?? 'Current season'}</strong></li>
              <li>Discovered on <time dateTime={active.selectedAt}>{formatDate(active.selectedAt)}</time></li>
            </ul>
            {onDevReset && <Button variant="ghost" size="sm" onClick={onDevReset}>Choose again (temporary)</Button>}
          </div>
        </div>
      ) : (
        <div className="sid sid__empty">
          <div className="sid__who">
            <PlayerAvatar playerId={profile.id} name={name} src={profile.avatarUrl} size="xl" decorative />
          </div>
          {seasonOpen ? (
            <>
              <p className="sid__desc">
                {history.length
                  ? 'A new season has begun. Your previous card is kept in your history; draw your next one to earn a new frame.'
                  : 'You have not drawn a card this season. One player, one card, one season.'}
              </p>
              <ButtonLink to="/fate" variant="gold">Discover your fate</ButtonLink>
            </>
          ) : (
            <p className="sid__desc">No season is open right now. Your next draw will be available when the next season begins.</p>
          )}
        </div>
      )}
      <SeasonHistory items={history} />
    </section>
  );
}
