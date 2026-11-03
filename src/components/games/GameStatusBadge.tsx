import { Badge } from '@/components/ui';
import { STATUS_LABELS } from '@/lib/format';
import type { GameStatus } from '@/types/domain';

const TONE = { unplayed: 'neutral', in_progress: 'progress', completed: 'success' } as const;

export function GameStatusBadge({ status, className }: { status: GameStatus; className?: string }) {
  return <Badge tone={TONE[status]} className={className}>{STATUS_LABELS[status]}</Badge>;
}

export const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as GameStatus[]).map((value) => ({ value, label: STATUS_LABELS[value] }));
