import { describe, expect, it } from 'vitest';
import { isCatalogueCover, isOwnCover, toOpenCover } from './open-covers-lib';

const info = (licence: string, artist = '<a href="//commons.wikimedia.org/wiki/User:Budew1234">Budew1234</a>') => ({
  url: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Hues_and_Cues.jpg',
  sha1: '0123456789abcdef0123',
  thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Hues_and_Cues.jpg/1200px-Hues_and_Cues.jpg',
  descriptionurl: 'https://commons.wikimedia.org/wiki/File:Hues_and_Cues.jpg',
  extmetadata: { LicenseShortName: { value: licence }, Artist: { value: artist } },
});

describe('toOpenCover', () => {
  it('credits the author and licence and downloads the thumbnail', () => {
    expect(toOpenCover(info('CC BY-SA 4.0'))).toEqual({
      downloadUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Hues_and_Cues.jpg/1200px-Hues_and_Cues.jpg',
      credit: 'Budew1234 · CC BY-SA 4.0 · Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hues_and_Cues.jpg',
      version: '0123456789ab',
    });
  });

  it('accepts public domain, CC0 and CC BY; falls back when the author is missing', () => {
    for (const l of ['Public domain', 'CC0', 'CC BY 2.0']) expect(toOpenCover(info(l))).not.toHaveProperty('error');
    expect(toOpenCover(info('CC0', ''))).toMatchObject({ credit: 'Wikimedia Commons · CC0 · Wikimedia Commons' });
  });

  it('refuses non-free and unknown licences', () => {
    expect(toOpenCover(info('CC BY-NC 2.0'))).toHaveProperty('error');
    expect(toOpenCover(info('Fair use'))).toHaveProperty('error');
    expect(toOpenCover({ url: 'x', descriptionurl: 'y' })).toHaveProperty('error');
  });
});

describe('isCatalogueCover', () => {
  it('recognises the covers this script copied, and nothing else', () => {
    expect(isCatalogueCover('https://abc.supabase.co/storage/v1/object/public/game-covers/catalogue/uno.jpg?v=1')).toBe(true);
    expect(isCatalogueCover('https://abc.supabase.co/storage/v1/object/public/game-covers/11111111-1111-1111-1111-111111111111/g.webp')).toBe(false);
    expect(isCatalogueCover(null)).toBe(false);
  });
});

describe('isOwnCover', () => {
  const base = 'https://abc.supabase.co';
  it('keeps covers served from our storage', () => {
    expect(isOwnCover(`${base}/storage/v1/object/public/game-covers/catalogue/uno.jpg`, `${base}/`)).toBe(true);
  });
  it('treats store hotlinks and empty covers as not ours', () => {
    expect(isOwnCover('https://m.media-amazon.com/images/I/81pqnwgWurL.jpg', base)).toBe(false);
    expect(isOwnCover(null, base)).toBe(false);
  });
});
