import { useState, type CSSProperties } from 'react';
import { cn, initials } from '@/lib/format';
import { t } from '@/i18n';

export type AvatarSize = 'xs' | 'sm' | 'lg' | 'xl';

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  color?: string;
  decorative?: boolean;
  className?: string;
}

/** Image avatar with initials fallback (also used when the image fails to load). */
export function Avatar({ name, src, size = 'sm', color, decorative, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const style = color ? ({ '--avatar': color } as CSSProperties) : undefined;
  const label = decorative ? undefined : t('avatar.of', { name });
  return (
    <span
      className={cn('avatar', `avatar-${size}`, 'overflow-hidden', className)}
      style={style}
      role={decorative ? undefined : 'img'}
      aria-label={label}
      aria-hidden={decorative || undefined}
    >
      {src && !failed ? (
        <img src={src} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
