import { describe, expect, it } from 'vitest';
import { POSTER_FORMATS, POSTER_ORDER } from './formats';

describe('poster formats', () => {
  it('matches the official social media sizes', () => {
    expect(POSTER_FORMATS.story).toMatchObject({ width: 1080, height: 1920 });
    expect(POSTER_FORMATS.feed).toMatchObject({ width: 1080, height: 1350 });
    expect(POSTER_FORMATS.whatsapp.width).toBe(1080);
  });

  it('lists every format exactly once', () => {
    expect([...POSTER_ORDER].sort()).toEqual(Object.keys(POSTER_FORMATS).sort());
  });

  it('keeps portrait orientation and sane JPEG quality', () => {
    for (const spec of Object.values(POSTER_FORMATS)) {
      expect(spec.height).toBeGreaterThan(spec.width);
      expect(spec.quality).toBeGreaterThanOrEqual(0.8);
      expect(spec.quality).toBeLessThanOrEqual(1);
    }
  });
});
