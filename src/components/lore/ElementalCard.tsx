import type { Elemental } from '@/types/domain';
import { LoreEntityCard } from './LoreEntityCard';

export function ElementalCard({ elemental }: { elemental: Elemental }) {
  return <LoreEntityCard entity={elemental} kicker="Força natural" />;
}
