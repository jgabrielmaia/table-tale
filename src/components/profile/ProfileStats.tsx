import { BrandSymbol } from '@/components/ui';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import type { ProfileStats as Stats } from '@/types/domain';

export interface ProfileStatsProps {
  stats: Stats;
  achievementsTotal: number;
}

export function ProfileStats({ stats, achievementsTotal }: ProfileStatsProps) {
  const items = [
    { symbol: 'dice', value: stats.gamesPlayed, suffix: '', label: t('profile.statGames') },
    { symbol: 'shield', value: stats.eventsAttended, suffix: '', label: t('profile.statEvents') },
    { symbol: 'trophy', value: stats.achievementsUnlocked, suffix: `/${achievementsTotal}`, label: t('profile.statAchievements') },
    { symbol: 'constellation', value: stats.hoursPlayed, suffix: ` ${t('common.hoursShort')}`, label: t('profile.statHours') },
  ];
  return (
    <ul className="stats" role="list" aria-label={t('profile.statsAria')}>
      {items.map((item) => (
        <li key={item.label} className="stat">
          <BrandSymbol name={item.symbol} />
          <span className="stat-value">
            {formatNumber(item.value)}
            {item.suffix && <small>{item.suffix}</small>}
          </span>
          <span className="stat-label">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
