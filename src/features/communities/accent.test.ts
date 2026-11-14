import { describe, expect, it } from 'vitest';
import { contrast, pickAccent, rgbToHsl } from './accent';

const PAGE_BG: [number, number, number] = [0x0b, 0x1e, 0x2d];

/** RGBA pixels: `count` pixels of each colour, in order. */
const image = (...parts: [r: number, g: number, b: number, count: number][]) =>
  new Uint8ClampedArray(parts.flatMap(([r, g, b, n]) => Array.from({ length: n }, () => [r, g, b, 255]).flat()));

const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

describe('pickAccent', () => {
  it('picks the dominant colourful hue, ignoring greys', () => {
    const accent = pickAccent(image([200, 40, 40, 30], [40, 60, 200, 10], [128, 128, 128, 60]))!;
    const [h] = rgbToHsl(hexToRgb(accent));
    expect(h < 15 || h > 345).toBe(true); // red wins over blue
  });

  it('returns null for a grey or nearly colourless photo', () => {
    expect(pickAccent(image([120, 120, 120, 100]))).toBeNull();
    expect(pickAccent(image([200, 40, 40, 3], [20, 20, 20, 97]))).toBeNull();
  });

  it('keeps every accent readable on the page background', () => {
    for (const rgb of [[20, 20, 160], [90, 30, 140], [10, 110, 40], [230, 200, 20], [200, 40, 40]] as const) {
      const accent = pickAccent(image([...rgb, 50]))!;
      expect(contrast(hexToRgb(accent), PAGE_BG)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('averages hues across the red wrap-around', () => {
    const accent = pickAccent(image([220, 30, 60, 50], [220, 60, 30, 50]))!;
    const [h] = rgbToHsl(hexToRgb(accent));
    expect(h < 20 || h > 340).toBe(true);
  });
});
