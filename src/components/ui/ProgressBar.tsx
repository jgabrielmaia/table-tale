import { cn } from '@/lib/format';

export interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  valueText?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function ProgressBar({ value, max, label, valueText, size = 'md', className }: ProgressBarProps) {
  const safeMax = Math.max(1, max);
  const clamped = Math.min(Math.max(0, value), safeMax);
  const percent = Math.round((clamped / safeMax) * 100);
  return (
    <div
      className={cn(size === 'sm' ? 'medal-progress' : 'xp-bar', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={clamped}
      aria-valuetext={valueText ?? `${percent}%`}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}
