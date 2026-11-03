import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/format';

export type BadgeTone = 'neutral' | 'progress' | 'success' | 'accent';

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'status-unplayed',
  progress: 'status-em-progresso',
  success: 'status-concluido',
  accent: 'chip',
};

export interface BadgeProps {
  tone?: BadgeTone;
  color?: string;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', color, icon, className, children }: BadgeProps) {
  const style = color ? ({ '--c': color } as CSSProperties) : undefined;
  return (
    <span className={cn(tone === 'accent' ? 'chip' : 'status-badge', TONE_CLASS[tone], className)} style={style}>
      {icon}
      {children}
    </span>
  );
}
