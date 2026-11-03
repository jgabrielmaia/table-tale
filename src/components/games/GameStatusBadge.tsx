import { Badge } from '@/components/ui';
import { statusLabel } from '@/lib/format';
import type { GameStatus } from '@/types/domain';

const TONE = { unplayed: 'neutral', in_progress: 'progress', completed: 'success' } as const;

export function GameStatusBadge({ status, className }: { status: GameStatus; className?: string }) {
  return <Badge tone={TONE[status]} className={className}>{statusLabel(status)}</Badge>;
}

export const statusOptions = () =>
  (['unplayed', 'in_progress', 'completed'] as GameStatus[]).map((value) => ({ value, label: statusLabel(value) }));
