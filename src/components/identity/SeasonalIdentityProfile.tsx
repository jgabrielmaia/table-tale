import { Button, ButtonLink } from '@/components/ui';
import type { PlayerIdentity } from '@/features/fate/api';
import { cardDescription, getFaction, getFateCard } from '@/features/fate/cards';
import { useI18n } from '@/i18n';
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
  const { t } = useI18n();
  const card = active ? getFateCard(active.cardId) : undefined;
  const faction = card ? getFaction(card.faction) : null;
  const theme = card ? FRAME_THEMES[card.id as CardArtKey] : null;
  const name = profile.displayName || t('common.player');

  return (
    <section className="my-8" aria-labelledby="identity-title">
      <h2 id="identity-title" className="fate-profile-heading">{t('idp.title')}</h2>
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
            <p className="sid__desc">{cardDescription(card.id)}</p>
            <ul className="sid__meta">
              <li>{t('idp.season', { name: active.season?.name ?? t('idp.currentSeason') })}</li>
              <li>{t('idp.discovered', { date: '' })}<time dateTime={active.selectedAt}>{formatDate(active.selectedAt)}</time></li>
            </ul>
            {onDevReset && <Button variant="ghost" size="sm" onClick={onDevReset}>{t('idp.devReset')}</Button>}
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
                {history.length ? t('idp.newSeason') : t('idp.none')}
              </p>
              <ButtonLink to="/fate" variant="gold">{t('idp.cta')}</ButtonLink>
            </>
          ) : (
            <p className="sid__desc">{t('idp.noSeason')}</p>
          )}
        </div>
      )}
      <SeasonHistory items={history} />
    </section>
  );
}
