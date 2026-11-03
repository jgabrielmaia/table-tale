import { useId, type CSSProperties } from 'react';
import { ButtonLink } from '@/components/ui';
import { BrandSymbol } from '@/components/ui';
import { SeasonHistory } from '@/components/identity/SeasonHistory';
import type { PlayerIdentity } from '@/features/fate/api';
import { FATE_CARDS, cardDescription, getFaction, getFateCard, type FateCardData, type FactionId } from '@/features/fate/cards';
import { useI18n } from '@/i18n';
import './lore-cards.css';

function LoreCardTile({ card, mine }: { card: FateCardData; mine?: boolean }) {
  const { t } = useI18n();
  return (
    <li className={`lore-cardtile${mine ? ' lore-cardtile--mine' : ''}`} style={{ '--c': card.glow } as CSSProperties}>
      <div className="lore-cardtile__art">
        <img src={card.image} alt={card.numeral ? `${card.numeral} — ${card.title}` : card.title} loading="lazy" />
      </div>
      <div className="lore-cardtile__body">
        {mine && <p className="lore-cardtile__badge">{t('lore.yourCard')}</p>}
        <p className="lore-kicker">{getFaction(card.faction).name}{card.numeral ? ` · ${card.numeral}` : ''}</p>
        <h4>{card.title}</h4>
        <p>{cardDescription(card.id)}</p>
      </div>
    </li>
  );
}

interface LoreCollectionProps {
  active: PlayerIdentity;
  history: PlayerIdentity[];
}

/** Unlocked once the player has revealed this season's card: the whole collection, with their own highlighted. */
export function LoreCollection({ active, history }: LoreCollectionProps) {
  const { t } = useI18n();
  const headingId = useId();
  const mineCard = getFateCard(active.cardId);
  const groups: FactionId[] = ['arcanos', 'elementais'];
  return (
    <div className="lore-collection" aria-labelledby={headingId}>
      <h3 id={headingId} className="sub-title">{t('lore.collectionTitle')}</h3>
      <p className="section-intro">{t('lore.cardsIntro')}</p>
      {mineCard && (
        <ul className="lore-cardgrid lore-cardgrid--mine" role="list">
          <LoreCardTile card={mineCard} mine />
        </ul>
      )}
      <p className="muted">{t('lore.collectionIntro')}</p>
      {groups.map((id) => (
        <section key={id} aria-label={t(id === 'arcanos' ? 'lore.arcanosCards' : 'lore.elementaisCards')}>
          <h4 className="lore-group-title">{t(id === 'arcanos' ? 'lore.arcanosCards' : 'lore.elementaisCards')}</h4>
          <ul className="lore-cardgrid" role="list">
            {FATE_CARDS.filter((c) => c.faction === id).map((c) => (
              <LoreCardTile key={c.id} card={c} mine={c.id === active.cardId} />
            ))}
          </ul>
        </section>
      ))}
      <SeasonHistory items={history} />
    </div>
  );
}

/** Shown until the player completes THE FATE DRAW: no card is revealed, only a way in. */
export function LoreLocked({ history }: { history: PlayerIdentity[] }) {
  const { t } = useI18n();
  return (
    <div className="lore-locked">
      <span className="lore-locked__icon"><BrandSymbol name="key" /></span>
      <h3>{t('lore.lockedTitle')}</h3>
      <p>{t('lore.lockedText')}</p>
      <ButtonLink to="/fate" variant="gold">{t('lore.lockedCta')}</ButtonLink>
      {history.length > 0 && (
        <>
          <p className="muted">{t('lore.lockedPast')}</p>
          <SeasonHistory items={history} />
        </>
      )}
    </div>
  );
}
