import { useEffect, useState } from 'react';

/**
 * Community accent: one colour taken from the cover photo, tuned to stay readable on the dark page.
 * Only the community page uses it (glow under the cover, eyebrow, active tab, panel borders); the brand stays put.
 */

/** Page background (--azul-profundo) the accent must stay readable on. */
const PAGE_BG: Rgb = [0x0b, 0x1e, 0x2d];
/** WCAG AA for normal text, both for accent text on the page and for dark text on an accent fill. */
const MIN_CONTRAST = 4.5;
const HUE_BINS = 12;
/** Below this share of colourful pixels the photo is too grey or muddy: keep the default theme. */
const MIN_COLOURFUL_SHARE = 0.08;

type Rgb = [number, number, number];

export function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [h * 60, s, l];
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255)) as Rgb;
}

const luminance = (rgb: Rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

const toHex = (rgb: Rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/**
 * Picks the dominant colourful hue of an image (RGBA pixels, as from a canvas) and returns it as a readable accent,
 * or null when the photo has too little colour to theme the page with.
 */
export function pickAccent(pixels: Uint8ClampedArray): string | null {
  const bins = Array.from({ length: HUE_BINS }, () => ({ weight: 0, x: 0, y: 0, s: 0 }));
  let total = 0;
  let colourful = 0;
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3]! < 128) continue; // transparent
    total++;
    const [h, s, l] = rgbToHsl([pixels[i]!, pixels[i + 1]!, pixels[i + 2]!]);
    // Greys, near-blacks and near-whites say nothing about the photo's palette.
    if (s < 0.25 || l < 0.12 || l > 0.92) continue;
    colourful++;
    const weight = s * (1 - Math.abs(l - 0.5)); // vivid mid-tones count most
    const bin = bins[Math.floor(h / (360 / HUE_BINS)) % HUE_BINS]!;
    bin.weight += weight;
    // Average hue as a vector, so 350° and 10° average to red, not cyan.
    bin.x += Math.cos((h * Math.PI) / 180) * weight;
    bin.y += Math.sin((h * Math.PI) / 180) * weight;
    bin.s += s * weight;
  }
  if (!total || colourful / total < MIN_COLOURFUL_SHARE) return null;
  const best = bins.reduce((a, b) => (b.weight > a.weight ? b : a));
  const hue = ((Math.atan2(best.y, best.x) * 180) / Math.PI + 360) % 360;
  const saturation = Math.min(0.85, Math.max(0.5, best.s / best.weight));
  // Start at a readable lightness and brighten until it passes AA on the page (blues and purples need more).
  for (let l = 0.62; l <= 0.86; l += 0.02) {
    const rgb = hslToRgb(hue, saturation, l);
    if (contrast(rgb, PAGE_BG) >= MIN_CONTRAST) return toHex(rgb);
  }
  return toHex(hslToRgb(hue, saturation, 0.86));
}

/** Loads the cover (CORS) into a small canvas and picks its accent. Null when it cannot be read. */
export async function accentFromImage(url: string): Promise<string | null> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.src = url;
  try {
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 32;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return pickAccent(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
  } catch {
    return null; // no CORS headers, broken file, …: keep the default theme
  }
}

/** The accent of a community's cover, once it has been read; null while loading, without a cover, or without colour. */
export function useCoverAccent(url: string | null | undefined): string | null {
  const [result, setResult] = useState<{ url: string; accent: string | null } | null>(null);
  useEffect(() => {
    if (!url) return;
    let live = true;
    void accentFromImage(url).then((accent) => { if (live) setResult({ url, accent }); });
    return () => { live = false; };
  }, [url]);
  return url && result?.url === url ? result.accent : null;
}
