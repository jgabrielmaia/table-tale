import { cn } from '@/lib/format';

export interface LoadingStateProps {
  label?: string;
  variant?: 'spinner' | 'cards' | 'lines';
  count?: number;
  className?: string;
}

/** Accessible loading placeholder (announced once via aria-live, skeletons hidden from AT). */
export function LoadingState({ label = 'A carregar…', variant = 'spinner', count = 6, className }: LoadingStateProps) {
  if (variant === 'cards') {
    return (
      <div className={className} aria-busy="true">
        <p className="sr-only" role="status">{label}</p>
        <ul className="game-grid" role="list" aria-hidden="true">
          {Array.from({ length: count }, (_, i) => (
            <li key={i} className="game-card skeleton">
              <div className="game-card-media sk-block" />
              <div className="game-card-body">
                <span className="sk-line w40" />
                <span className="sk-line w80 tall" />
                <span className="sk-line w60" />
                <span className="sk-line w50" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (variant === 'lines') {
    return (
      <div className={cn('grid gap-2', className)} aria-busy="true">
        <p className="sr-only" role="status">{label}</p>
        {Array.from({ length: count }, (_, i) => (
          <span key={i} className={cn('sk-line', i % 3 === 0 ? 'w80' : i % 3 === 1 ? 'w60' : 'w50')} aria-hidden="true" />
        ))}
      </div>
    );
  }
  return (
    <div className={cn('flex items-center justify-center gap-3 py-12 text-muted', className)} role="status" aria-live="polite">
      <span className="spinner spinner-gold" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
