import type { Arcana } from '@/types/domain';
import { LoreEntityCard } from './LoreEntityCard';

export function ArcanaCard({ arcana }: { arcana: Arcana }) {
  return <LoreEntityCard entity={arcana} kicker="Expressão Arcana" />;
}
