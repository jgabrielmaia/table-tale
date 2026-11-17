import { describe, expect, it } from 'vitest';
import { newGameSchema } from './schemas';

const parse = (input: Record<string, unknown>) => newGameSchema.safeParse({ title: 'Jogo', ...input });
const message = (input: Record<string, unknown>) => {
  const result = parse(input);
  return result.success ? null : result.error.issues[0]?.message;
};

describe('newGameSchema', () => {
  it('only needs a title: everything else is optional and comes out empty', () => {
    const result = newGameSchema.parse({ title: '  Jogo do Café  ' });
    expect(result).toEqual({ title: 'Jogo do Café', description: '', minPlayers: null, maxPlayers: null, durationMinutes: null, minAge: null });
  });

  it('turns the number fields into numbers and trims the description', () => {
    const result = newGameSchema.parse({ title: 'A', description: ' x ', minPlayers: '2', maxPlayers: '4', durationMinutes: '30' });
    expect(result).toMatchObject({ description: 'x', minPlayers: 2, maxPlayers: 4, durationMinutes: 30 });
  });

  it('takes an optional recommended age from 0 to 21', () => {
    expect(newGameSchema.parse({ title: 'A', minAge: '8' }).minAge).toBe(8);
    expect(parse({ minAge: '0' }).success).toBe(true);
    expect(parse({ minAge: '22' }).success).toBe(false);
    expect(parse({ minAge: '-1' }).success).toBe(false);
    expect(parse({ minAge: '7.5' }).success).toBe(false);
  });

  it('refuses a blank or over-long title', () => {
    expect(parse({ title: '   ' }).success).toBe(false);
    expect(parse({ title: 'x'.repeat(81) }).success).toBe(false);
    expect(parse({ title: 'x'.repeat(80) }).success).toBe(true);
  });

  it('keeps players and duration inside the database limits', () => {
    expect(parse({ minPlayers: '0' }).success).toBe(false);
    expect(parse({ maxPlayers: '100' }).success).toBe(false);
    expect(parse({ minPlayers: '1.5' }).success).toBe(false);
    expect(parse({ durationMinutes: '0' }).success).toBe(false);
    expect(parse({ durationMinutes: '1441' }).success).toBe(false);
    expect(parse({ durationMinutes: '1440' }).success).toBe(true);
  });

  it('refuses a maximum below the minimum, but accepts one of them alone', () => {
    expect(message({ minPlayers: '5', maxPlayers: '3' })).toBeTruthy();
    expect(parse({ minPlayers: '3', maxPlayers: '3' }).success).toBe(true);
    expect(parse({ minPlayers: '3' }).success).toBe(true);
    expect(parse({ maxPlayers: '3' }).success).toBe(true);
  });

  it('limits the description to what the database takes', () => {
    expect(parse({ description: 'x'.repeat(2001) }).success).toBe(false);
    expect(parse({ description: 'x'.repeat(2000) }).success).toBe(true);
  });
});
