import { BrandSymbol } from '@/components/ui';
import type { ProfileStats as Stats } from '@/types/domain';

export interface ProfileStatsProps {
  stats: Stats;
  achievementsTotal: number;
}

export function ProfileStats({ stats, achievementsTotal }: ProfileStatsProps) {
  const items = [
    { symbol: 'dice', value: stats.gamesPlayed, suffix: '', label: 'Jogos jogados' },
    { symbol: 'shield', value: stats.eventsAttended, suffix: '', label: 'Eventos frequentados' },
    { symbol: 'trophy', value: stats.achievementsUnlocked, suffix: `/${achievementsTotal}`, label: 'Conquistas desbloqueadas' },
    { symbol: 'constellation', value: stats.hoursPlayed, suffix: ' h', label: 'Horas de jogo' },
  ];
  return (
    <ul className="stats" role="list" aria-label="Estatísticas">
      {items.map((item) => (
        <li key={item.label} className="stat">
          <BrandSymbol name={item.symbol} />
          <span className="stat-value">
            {item.value.toLocaleString('pt-PT')}
            {item.suffix && <small>{item.suffix}</small>}
          </span>
          <span className="stat-label">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
