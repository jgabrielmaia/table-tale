import { describe, expect, it } from 'vitest';
import { coverPath } from './cover';

const ID = '11111111-1111-1111-1111-111111111111';
const BASE = 'https://abc.supabase.co/storage/v1/object/public/community-covers';

describe('coverPath', () => {
  it('returns the path of a cover uploaded for this community', () => {
    expect(coverPath(`${BASE}/${ID}/cover-1.jpg`, ID)).toBe(`${ID}/cover-1.jpg`);
    expect(coverPath(`${BASE}/${ID}/cover-1.jpg?t=2`, ID)).toBe(`${ID}/cover-1.jpg`);
  });

  it('ignores missing covers, other buckets and other communities', () => {
    expect(coverPath(null, ID)).toBeNull();
    expect(coverPath(`https://abc.supabase.co/storage/v1/object/public/avatars/${ID}/a.png`, ID)).toBeNull();
    expect(coverPath(`${BASE}/22222222-2222-2222-2222-222222222222/cover-1.jpg`, ID)).toBeNull();
    expect(coverPath(`${BASE}/${ID}/../other/cover.jpg`, ID)).toBeNull();
  });
});
