import type { PlayerIdentity } from '@/features/fate/api';
import { cardTitle, getFaction, getFateCard } from '@/features/fate/cards';
import { formatDate } from '@/lib/format';
import { t } from '@/i18n';

/** Archived seasonal identities. They never affect the current avatar frame. */
export function SeasonHistory({ items }: { items: PlayerIdentity[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-6">
      <h3 className="fate-profile-subheading">{t('idp.history')}</h3>
      <ul className="shist">
        {items.map((i) => {
          const card = getFateCard(i.cardId);
          if (!card) return null;
          return (
            <li className="shist__item" key={i.seasonId}>
              <div className="shist__art"><img src={card.image} alt="" /></div>
              <div>
                <p className="shist__title">{cardTitle(card)}</p>
                <p className="shist__meta">
                  {getFaction(card.faction).name} · {i.season?.name ?? t('idp.pastSeason')} · {t('idp.discovered', { date: formatDate(i.selectedAt) })}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
