import { describe, expect, it } from 'vitest';
import { countFactions, percentOf } from './factionCounts';

const ids = {
  a: { faction: 'arcanos' as const },
  b: { faction: 'arcanos' as const },
  c: { faction: 'elementais' as const },
};

describe('countFactions', () => {
  it('counts active members per faction and keeps those without a card apart', () => {
    const members = [
      { userId: 'a', status: 'active' },
      { userId: 'b', status: 'active' },
      { userId: 'c', status: 'active' },
      { userId: 'd', status: 'active' },
    ];
    expect(countFactions(members, ids)).toEqual({ arcanos: 2, elementais: 1, undecided: 1, decided: 3, total: 4 });
  });

  it('ignores pending and suspended members', () => {
    const members = [
      { userId: 'a', status: 'pending' },
      { userId: 'c', status: 'suspended' },
      { userId: 'b', status: 'active' },
    ];
    expect(countFactions(members, ids)).toEqual({ arcanos: 1, elementais: 0, undecided: 0, decided: 1, total: 1 });
  });

  it('handles an empty community', () => {
    expect(countFactions([], {})).toEqual({ arcanos: 0, elementais: 0, undecided: 0, decided: 0, total: 0 });
  });
});

describe('percentOf', () => {
  it('rounds and never divides by zero', () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(0, 0)).toBe(0);
  });
});
