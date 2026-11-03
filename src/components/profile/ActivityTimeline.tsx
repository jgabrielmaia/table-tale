import { Link } from 'react-router-dom';
import { BrandSymbol, EmptyState, ButtonLink } from '@/components/ui';
import { formatDate } from '@/lib/format';
import type { ActivityItem } from '@/types/domain';

const SYMBOL: Record<ActivityItem['type'], string> = { session: 'dice', event: 'shield', achievement: 'trophy' };

export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  if (!items.length) {
    return (
      <EmptyState
        compact
        symbol="dice"
        title="Ainda sem atividade"
        description="Escolhe um jogo na biblioteca e regista a tua primeira sessão."
        action={<ButtonLink to="/library" variant="secondary">Ir para a biblioteca</ButtonLink>}
      />
    );
  }
  return (
    <ol className="activity-list">
      {items.map((item) => (
        <li key={item.id} className={`activity-item activity-${item.type}`}>
          <span className="activity-icon"><BrandSymbol name={SYMBOL[item.type]} /></span>
          <div className="min-w-0">
            <p className="activity-title">
              {item.href ? <Link to={item.href}>{item.title}</Link> : item.title}
            </p>
            {item.detail && <p className="activity-detail">{item.detail}</p>}
          </div>
          <time dateTime={item.date} className="activity-date">{formatDate(item.date, { day: 'numeric', month: 'short' })}</time>
        </li>
      ))}
    </ol>
  );
}
