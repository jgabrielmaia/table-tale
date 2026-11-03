import { describe, expect, it } from 'vitest';
import { sessionSchema } from './schemas';

const parse = (input: Record<string, unknown>) => sessionSchema.safeParse({ playedAt: '2020-01-01', ...input });
const firstMessage = (input: Record<string, unknown>) => {
  const r = parse(input);
  return r.success ? null : r.error.issues[0]?.message;
};

describe('sessionSchema', () => {
  it('treats empty optional numbers as not provided', () => {
    const r = parse({ playersCount: '', durationMinutes: '', rating: '' });
    expect(r.success && r.data).toMatchObject({ playersCount: null, durationMinutes: null, rating: null });
  });

  it('accepts whole numbers inside the limits, as text or number', () => {
    const r = parse({ playersCount: '4', durationMinutes: 45, rating: 5 });
    expect(r.success && r.data).toMatchObject({ playersCount: 4, durationMinutes: 45, rating: 5 });
  });

  it('explains out-of-range values in the user language', () => {
    expect(firstMessage({ playersCount: '0' })).toBe('Jogadores: mínimo 1.');
    expect(firstMessage({ playersCount: '100' })).toBe('Jogadores: máximo 99.');
    expect(firstMessage({ durationMinutes: '1441' })).toBe('Duração: máximo 1440.');
  });

  it('explains non-integers and non-numbers instead of a generic "Invalid input"', () => {
    expect(firstMessage({ playersCount: '2.5' })).toBe('Jogadores tem de ser um número inteiro.');
    expect(firstMessage({ playersCount: 'abc' })).toBe('Jogadores tem de ser um número inteiro.');
  });

  it('rejects future dates', () => {
    expect(firstMessage({ playedAt: '2999-01-01' })).toBe('A data não pode ser no futuro.');
  });
});
