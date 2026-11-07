import { describe, expect, it } from 'vitest';
import { communitySchema, slugify } from './schemas';

const valid = {
  name: 'Table Tale Lisboa',
  description: '',
  visibility: 'public',
  city: 'Lisboa',
  district: 'Alvalade',
  country: 'Portugal',
  latitude: '',
  longitude: '',
};

describe('communitySchema', () => {
  it('accepts a community with a location and no coordinates', () => {
    expect(communitySchema.safeParse(valid).success).toBe(true);
  });

  it.each(['city', 'district', 'country'] as const)('requires %s', (field) => {
    const r = communitySchema.safeParse({ ...valid, [field]: '   ' });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === field)).toBe(true);
  });

  it('accepts coordinates only as a valid pair in range', () => {
    expect(communitySchema.safeParse({ ...valid, latitude: '38.7', longitude: '-9.1' }).success).toBe(true);
    expect(communitySchema.safeParse({ ...valid, latitude: '38.7' }).success).toBe(false);
    expect(communitySchema.safeParse({ ...valid, latitude: '91', longitude: '0' }).success).toBe(false);
    expect(communitySchema.safeParse({ ...valid, latitude: '0', longitude: '181' }).success).toBe(false);
    expect(communitySchema.safeParse({ ...valid, latitude: 'abc', longitude: '0' }).success).toBe(false);
  });

  it('rejects unknown visibility and over-long names', () => {
    expect(communitySchema.safeParse({ ...valid, visibility: 'secret' }).success).toBe(false);
    expect(communitySchema.safeParse({ ...valid, name: 'x'.repeat(81) }).success).toBe(false);
  });
});

describe('slugify', () => {
  it('removes accents and symbols', () => {
    expect(slugify('Clube dos Tabuleiros — São Bento!')).toBe('clube-dos-tabuleiros-sao-bento');
    expect(slugify('***')).toBe('comunidade');
  });
});
