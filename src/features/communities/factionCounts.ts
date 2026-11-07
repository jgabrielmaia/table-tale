import type { FactionId } from '@/features/fate/cards';

export interface FactionCounts {
  arcanos: number;
  elementais: number;
  /** Active members who have not revealed a card yet, so belong to no faction. */
  undecided: number;
  /** Arcanos + Elementais: the base the percentages are computed on. */
  decided: number;
  /** Every active member. */
  total: number;
}

/** Counts active members per faction. Pending and suspended members do not count. */
export function countFactions(
  members: { userId: string; status: string }[],
  identities: Record<string, { faction: FactionId }>,
): FactionCounts {
  let arcanos = 0;
  let elementais = 0;
  let undecided = 0;
  for (const m of members) {
    if (m.status !== 'active') continue;
    const faction = identities[m.userId]?.faction;
    if (faction === 'arcanos') arcanos++;
    else if (faction === 'elementais') elementais++;
    else undecided++;
  }
  const decided = arcanos + elementais;
  return { arcanos, elementais, undecided, decided, total: decided + undecided };
}

/** Whole-number percentage of `part` within `whole`; 0 when there is nothing to divide. */
export const percentOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
