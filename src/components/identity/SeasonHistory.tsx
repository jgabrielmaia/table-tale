import type { PlayerIdentity } from '@/features/fate/api';
import { FACTIONS, getFateCard } from '@/features/fate/cards';
import { formatDate } from '@/lib/format';

/** Archived seasonal identities. They never affect the current avatar frame. */
export function SeasonHistory({ items }: { items: PlayerIdentity[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-6">
      <h3 className="fate-profile-subheading">Season history</h3>
      <ul className="shist">
        {items.map((i) => {
          const card = getFateCard(i.cardId);
          if (!card) return null;
          return (
            <li className="shist__item" key={i.seasonId}>
              <div className="shist__art"><img src={card.image} alt="" /></div>
              <div>
                <p className="shist__title">{card.title}</p>
                <p className="shist__meta">
                  {FACTIONS[card.faction].name} · {i.season?.name ?? 'Past season'} · Discovered {formatDate(i.selectedAt)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
