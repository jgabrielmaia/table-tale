import { BrandSymbol, Icon, ProgressBar } from '@/components/ui';
import { cn, formatDate } from '@/lib/format';
import { localizeAchievement, t } from '@/i18n';
import type { Achievement } from '@/types/domain';

export function AchievementCard({ achievement: raw }: { achievement: Achievement }) {
  const achievement = localizeAchievement(raw);
  const unlocked = Boolean(achievement.unlockedAt);
  return (
    <li className={cn('medal', unlocked && 'unlocked')}>
      <span className="medal-icon"><BrandSymbol name={achievement.icon} /></span>
      <h3>{achievement.name}</h3>
      <p>{achievement.description}</p>
      {unlocked ? (
        <p className="medal-state">
          <Icon name="check" />
          {t('ach.unlocked')} {achievement.unlockedAt && <time dateTime={achievement.unlockedAt}>· {formatDate(achievement.unlockedAt, { day: 'numeric', month: 'short' })}</time>}
        </p>
      ) : (
        <>
          <ProgressBar size="sm" value={achievement.progress} max={achievement.requirementValue} label={t('ach.progressOf', { name: achievement.name })} valueText={t('ach.progressText', { a: achievement.progress, b: achievement.requirementValue })} />
          <p className="medal-state locked"><Icon name="lock" />{achievement.progress} / {achievement.requirementValue}</p>
        </>
      )}
    </li>
  );
}
