import { describe, expect, it } from 'vitest';
import { FATE_CARDS } from '@/features/fate/cards';
import { FRAME_THEMES, compactTitle } from './frameThemes';

describe('frame themes', () => {
  it('gives every card its own frame', () => {
    const keys = FATE_CARDS.map((c) => {
      const t = FRAME_THEMES[c.id];
      return `${t.ornament}|${t.a}|${t.b}`;
    });
    expect(new Set(keys).size).toBe(FATE_CARDS.length);
  });

  it('keeps full titles intact and only shortens leading "The"', () => {
    expect(compactTitle('The High Priestess')).toBe('High Priestess');
    expect(compactTitle('Temperance')).toBe('Temperance');
  });
});
