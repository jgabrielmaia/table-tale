import { BrandSymbol, Icon, ProgressBar } from '@/components/ui';
import { cn, formatDate } from '@/lib/format';
import type { Achievement } from '@/types/domain';

export function AchievementCard({ achievement }: { achievement: Achievement }) {
  const unlocked = Boolean(achievement.unlockedAt);
  return (
    <li className={cn('medal', unlocked && 'unlocked')}>
      <span className="medal-icon"><BrandSymbol name={achievement.icon} /></span>
      <h3>{achievement.name}</h3>
      <p>{achievement.description}</p>
      {unlocked ? (
        <p className="medal-state">
          <Icon name="check" />
          Desbloqueada {achievement.unlockedAt && <time dateTime={achievement.unlockedAt}>· {formatDate(achievement.unlockedAt, { day: 'numeric', month: 'short' })}</time>}
        </p>
      ) : (
        <>
          <ProgressBar size="sm" value={achievement.progress} max={achievement.requirementValue} label={`Progresso de ${achievement.name}`} valueText={`${achievement.progress} de ${achievement.requirementValue}`} />
          <p className="medal-state locked"><Icon name="lock" />{achievement.progress} / {achievement.requirementValue}</p>
        </>
      )}
    </li>
  );
}
