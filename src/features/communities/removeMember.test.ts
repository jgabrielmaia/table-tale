import { describe, expect, it } from 'vitest';
import { nameMatches } from './removeMember';

describe('nameMatches', () => {
  it('accepts the exact name, ignoring case and stray spaces', () => {
    expect(nameMatches('Rita Nova', 'Rita Nova')).toBe(true);
    expect(nameMatches('  rita   NOVA ', 'Rita Nova')).toBe(true);
  });

  it('rejects partial, different or empty input', () => {
    expect(nameMatches('Rita', 'Rita Nova')).toBe(false);
    expect(nameMatches('Rita Novak', 'Rita Nova')).toBe(false);
    expect(nameMatches('', 'Rita Nova')).toBe(false);
  });

  it('never matches an empty name', () => {
    expect(nameMatches('', '')).toBe(false);
    expect(nameMatches('   ', '  ')).toBe(false);
  });
});
