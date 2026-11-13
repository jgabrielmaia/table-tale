import { describe, expect, it } from 'vitest';
import { flagOn } from './env';

describe('flagOn', () => {
  it('is on only for "true"', () => {
    expect(flagOn('true')).toBe(true);
    expect(flagOn(' TRUE ')).toBe(true);
  });

  it('is off when unset, empty or anything else', () => {
    for (const value of [undefined, '', 'false', '1', 'yes', 'on']) expect(flagOn(value)).toBe(false);
  });
});
