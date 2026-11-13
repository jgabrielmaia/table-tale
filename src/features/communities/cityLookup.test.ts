import { describe, expect, it } from 'vitest';
import { cleanCityQuery, countryName, describeHit, formatCoordinate, toLocationFields } from './cityLookup';
import { communitySchema } from './schemas';

const porto = { name: 'Porto', country: 'PT', latitude: 41.15791234, longitude: -8.62911 };

describe('cleanCityQuery', () => {
  it('trims, collapses spaces and enforces the length limits', () => {
    expect(cleanCityQuery('  Vila   Real ')).toBe('Vila Real');
    expect(cleanCityQuery('a')).toBeNull();
    expect(cleanCityQuery('')).toBeNull();
    expect(cleanCityQuery('x'.repeat(61))).toBeNull();
  });
});

describe('countryName', () => {
  it('turns the ISO code into a readable name in the given language', () => {
    expect(countryName('PT', 'en-GB')).toBe('Portugal');
    expect(countryName('ES', 'pt-PT')).toBe('Espanha');
    expect(countryName('us', 'en-GB')).toBe('United States');
    expect(countryName('DE', 'pt-PT')).toBe('Alemanha');
  });
  it('falls back to the code for unknown or invalid input', () => {
    expect(countryName('ZZ', 'en-GB')).toBe('ZZ');
    expect(countryName('', 'en-GB')).toBe('');
    expect(countryName('PT', 'not a locale')).toBe('PT');
  });
});

describe('toLocationFields', () => {
  it('fills city, country and coordinates as form strings, leaving the district alone', () => {
    const fields = toLocationFields(porto, 'pt-PT');
    expect(fields).toEqual({ city: 'Porto', country: 'Portugal', latitude: '41.1579', longitude: '-8.6291' });
    expect(fields).not.toHaveProperty('district');
  });
  it('produces values the community schema accepts (coordinates come as a pair)', () => {
    const parsed = communitySchema.safeParse({ name: 'Clube', description: '', visibility: 'public', shelfVisibility: 'public', district: 'Boavista', ...toLocationFields(porto, 'en-GB') });
    expect(parsed.success).toBe(true);
  });
  it('formats coordinates without trailing noise', () => {
    expect(formatCoordinate(40)).toBe('40');
    expect(formatCoordinate(-0.00004)).toBe('0');
    expect(formatCoordinate(38.7227)).toBe('38.7227');
  });
  it('describes a hit with country and coordinates', () => {
    expect(describeHit(porto, 'en-GB')).toBe('Portugal · 41.1579, -8.6291');
  });
});
