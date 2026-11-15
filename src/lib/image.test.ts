import { describe, expect, it } from 'vitest';
import { encodeWithin, fitWithin, ImageTooLargeError, renamed } from './image';

describe('fitWithin', () => {
  it('scales a wide photo down to the maximum width, keeping its ratio', () => {
    expect(fitWithin(4000, 1000, 3000, 3000)).toEqual({ width: 3000, height: 750 });
  });

  it('scales a tall photo down to the maximum height', () => {
    expect(fitWithin(3000, 6000, 3000, 3000)).toEqual({ width: 1500, height: 3000 });
  });

  it('never enlarges a photo that already fits', () => {
    expect(fitWithin(800, 600, 3000, 3000)).toEqual({ width: 800, height: 600 });
  });

  it('keeps at least one pixel on each side', () => {
    expect(fitWithin(10_000, 1, 512, 512)).toEqual({ width: 512, height: 1 });
  });
});

/** A fake encoder: the output size shrinks with quality; `supported` lists the types this "browser" can write. */
const encoder = (sizeAt: (q: number) => number, supported = ['image/webp', 'image/jpeg']) => {
  const calls: Array<[string, number]> = [];
  const encode = async (type: string, quality: number) => {
    calls.push([type, quality]);
    const actual = supported.includes(type) ? type : 'image/png';
    return new Blob([new Uint8Array(sizeAt(quality))], { type: actual });
  };
  return { encode, calls };
};

describe('encodeWithin', () => {
  it('writes WebP at high quality when that already fits', async () => {
    const { encode, calls } = encoder(() => 500);
    const blob = await encodeWithin(encode, 1000);
    expect(blob.type).toBe('image/webp');
    expect(calls).toEqual([['image/webp', 0.85]]);
  });

  it('lowers the quality until the file fits', async () => {
    const { encode, calls } = encoder((q) => Math.round(q * 2000));
    const blob = await encodeWithin(encode, 1300);
    expect(blob.size).toBeLessThanOrEqual(1300);
    expect(calls.map(([, q]) => q)).toEqual([0.85, 0.75, 0.6]);
  });

  it('falls back to JPEG when the browser cannot write WebP', async () => {
    const { encode } = encoder(() => 500, ['image/jpeg']);
    const blob = await encodeWithin(encode, 1000);
    expect(blob.type).toBe('image/jpeg');
  });

  it('gives up when even the lowest quality is too big', async () => {
    const { encode } = encoder(() => 5000);
    await expect(encodeWithin(encode, 1000)).rejects.toBeInstanceOf(ImageTooLargeError);
  });
});

describe('renamed', () => {
  it('swaps the extension for the new type', () => {
    expect(renamed('IMG_2041.HEIC.jpeg', 'image/webp')).toBe('IMG_2041.HEIC.webp');
    expect(renamed('photo', 'image/jpeg')).toBe('photo.jpg');
  });
});
