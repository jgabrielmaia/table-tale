import { cn } from '@/lib/format';
import { LOGOS, type LogoTone, type LogoVariant } from '@/assets/brand';

export interface LogoProps {
  variant: LogoVariant;
  /** ivory on dark backgrounds (default), ink on light ones. */
  tone?: LogoTone;
  /** CSS height; the width follows the artwork's own proportions. */
  height?: number | string;
  /** Set when the surrounding element already names the brand. */
  decorative?: boolean;
  className?: string;
}

/** The single entry point for the Table Tale identity. */
export function Logo({ variant, tone = 'ivory', height, decorative = false, className }: LogoProps) {
  const { src, width, height: h } = LOGOS[variant][tone];
  return (
    <img
      className={cn('logo', `logo--${variant}`, className)}
      src={src}
      width={width}
      height={h}
      alt={decorative ? '' : 'Table Tale'}
      style={height === undefined ? undefined : { height }}
      draggable={false}
    />
  );
}
