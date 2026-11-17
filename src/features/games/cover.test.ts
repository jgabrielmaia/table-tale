import { describe, expect, it } from 'vitest';
import { findTitleMatch, ownCoverPath } from './cover';

describe('ownCoverPath', () => {
  const me = '11111111-1111-1111-1111-111111111111';
  it("returns the storage path of the player's own upload", () => {
    expect(ownCoverPath(`https://x.supabase.co/storage/v1/object/public/game-covers/${me}/game-1.webp`, me)).toBe(`${me}/game-1.webp`);
  });
  it('refuses catalogue covers, other folders, path tricks and other URLs', () => {
    expect(ownCoverPath('https://x.supabase.co/storage/v1/object/public/game-covers/catalogue/uno.jpg?v=1', me)).toBeNull();
    expect(ownCoverPath('https://x.supabase.co/storage/v1/object/public/game-covers/22222222-2222-2222-2222-222222222222/a.webp', me)).toBeNull();
    expect(ownCoverPath(`https://x.supabase.co/storage/v1/object/public/game-covers/${me}/../x.webp`, me)).toBeNull();
    expect(ownCoverPath('https://elsewhere.example/a.jpg', me)).toBeNull();
    expect(ownCoverPath(null, me)).toBeNull();
  });
});

describe('findTitleMatch', () => {
  const games = [{ id: '1', title: 'Cores com Dicas' }, { id: '2', title: 'Uno' }];
  it('finds a catalogue game with the same name, ignoring case, accents and spacing', () => {
    expect(findTitleMatch('  cóRES   com dicas ', games)?.id).toBe('1');
  });
  it('finds nothing for a new name, a blank one, or the game being edited', () => {
    expect(findTitleMatch('Unos', games)).toBeNull();
    expect(findTitleMatch('  ', games)).toBeNull();
    expect(findTitleMatch('Uno', games, '2')).toBeNull();
  });
});
