import type { ReactNode } from 'react';
import { cn } from '@/lib/format';
import { BrandSymbol } from './Icon';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  symbol?: string;
  action?: ReactNode;
  compact?: boolean;
  headingLevel?: 2 | 3;
  className?: string;
}

export function EmptyState({ title, description, symbol = 'compass', action, compact, headingLevel = 3, className }: EmptyStateProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className={cn('empty-state', compact && 'empty-compact', className)}>
      <BrandSymbol name={symbol} className="empty-sym" />
      <Heading>{title}</Heading>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({ title = 'Algo correu mal', message, onRetry, compact }: ErrorStateProps) {
  return (
    <div role="alert">
      <EmptyState
        className="error-state"
        compact={compact}
        symbol="shield"
        title={title}
        description={message}
        action={onRetry && <Button variant="secondary" onClick={onRetry}>Tentar novamente</Button>}
      />
    </div>
  );
}
