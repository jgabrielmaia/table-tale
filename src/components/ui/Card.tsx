import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/format';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  as?: 'section' | 'article' | 'div' | 'li';
  title?: ReactNode;
  titleId?: string;
  description?: ReactNode;
  actions?: ReactNode;
  accent?: string;
}

/** Brand panel: gradient surface, gold hairline border, optional header. */
export function Card({ as: Tag = 'section', title, titleId, description, actions, accent, className, style, children, ...rest }: CardProps) {
  const cardStyle = accent ? ({ ...style, '--c': accent } as CSSProperties) : style;
  return (
    <Tag className={cn('panel', className)} style={cardStyle} aria-labelledby={title && titleId ? titleId : undefined} {...rest}>
      {(title || actions) && (
        <div className="panel-head">
          <div>
            {title && <h2 id={titleId}>{title}</h2>}
            {description && <p className="muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </Tag>
  );
}
