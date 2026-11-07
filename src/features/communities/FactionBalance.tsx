import { useActiveIdentities } from '@/hooks/useFate';
import { useI18n } from '@/i18n';
import type { CommunityMember } from '@/types/domain';
import { countFactions, percentOf } from './factionCounts';

/** Arcanists (purple neon) against Elementals (cyan neon) among the community's active members. */
export function FactionBalance({ members }: { members: CommunityMember[] }) {
  const { t, tn } = useI18n();
  const identities = useActiveIdentities();
  const { arcanos, elementais, undecided, decided, total } = countFactions(members, identities.data ?? {});
  const arcPct = percentOf(arcanos, decided);
  const elePct = decided ? 100 - arcPct : 0;
  const arcName = t('faction.arcanos');
  const eleName = t('faction.elementais');

  return (
    <section className="faction-balance" aria-labelledby="faction-balance-title">
      <div className="faction-balance__head">
        <h2 id="faction-balance-title">{t('communities.balance.title')}</h2>
        <span className="muted">{tn('communities.members', total)}</span>
      </div>

      <div className="faction-balance__legend">
        <span className="fb-label fb-label--arc"><strong>{arcName}</strong> {arcanos} · {arcPct}%</span>
        <span className="fb-label fb-label--ele"><strong>{eleName}</strong> {elementais} · {elePct}%</span>
      </div>

      <div
        className="faction-balance__bar"
        role="img"
        aria-label={decided
          ? t('communities.balance.aria', { arc: arcName, arcN: arcanos, arcP: arcPct, ele: eleName, eleN: elementais, eleP: elePct })
          : t('communities.balance.none')}
      >
        {decided > 0 ? (
          <>
            {arcanos > 0 && <span className="fb-seg fb-seg--arc" style={{ flexGrow: arcanos }} />}
            {elementais > 0 && <span className="fb-seg fb-seg--ele" style={{ flexGrow: elementais }} />}
          </>
        ) : (
          <span className="fb-seg fb-seg--empty" />
        )}
      </div>

      {decided === 0 ? (
        <p className="muted small">{t('communities.balance.none')}</p>
      ) : undecided > 0 ? (
        <p className="muted small">{t('communities.balance.undecided', { n: undecided })}</p>
      ) : null}
    </section>
  );
}
