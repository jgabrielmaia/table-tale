import { describe, expect, it } from 'vitest';
import { addCategory, CATEGORIES_MAX, CATEGORY_MAX_LENGTH, removeCategory, sameCategories, suggestCategories } from './categories';

describe('addCategory', () => {
  it('adds a trimmed label with single spaces at the end of the list', () => {
    expect(addCategory(['Card Game'], '  Party   Game ')).toEqual({ list: ['Card Game', 'Party Game'] });
  });

  it('refuses blanks, over-long labels and duplicates (ignoring case and accents) without changing the list', () => {
    const list = ['Card Game', 'Estratégia'];
    expect(addCategory(list, '   ')).toEqual({ list, problem: 'empty' });
    expect(addCategory(list, 'x'.repeat(CATEGORY_MAX_LENGTH + 1))).toEqual({ list, problem: 'tooLong' });
    expect(addCategory(list, 'card  GAME')).toEqual({ list, problem: 'duplicate' });
    expect(addCategory(list, 'estrategia')).toEqual({ list, problem: 'duplicate' });
    expect(addCategory(list, 'x'.repeat(CATEGORY_MAX_LENGTH)).problem).toBeUndefined();
  });

  it('stops at the limit the database enforces', () => {
    const full = Array.from({ length: CATEGORIES_MAX }, (_, i) => `c${i}`);
    expect(addCategory(full, 'one more')).toEqual({ list: full, problem: 'tooMany' });
  });
});

describe('removeCategory, sameCategories', () => {
  it('removes one label and compares lists in order', () => {
    expect(removeCategory(['A', 'B', 'C'], 'B')).toEqual(['A', 'C']);
    expect(sameCategories(['A', 'B'], ['A', 'B'])).toBe(true);
    expect(sameCategories(['A', 'B'], ['B', 'A'])).toBe(false);
    expect(sameCategories(['A'], ['A', 'B'])).toBe(false);
  });
});

describe('suggestCategories', () => {
  it("lists other games' categories not yet on this game, once each and sorted", () => {
    const all = [['Card Game', 'Party'], ['party', 'Dice'], ['Card Game']];
    expect(suggestCategories(all, ['Card Game'])).toEqual(['Dice', 'Party']);
  });
});
