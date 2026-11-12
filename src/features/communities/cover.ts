export const COVER_BUCKET = 'community-covers';
export const COVER_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
export const COVER_MAX_BYTES = 2 * 1024 * 1024;

/**
 * The storage path of a cover we uploaded for this community (`<community id>/cover-....ext`), or null for any other URL,
 * so cleaning up an old cover can never touch another community's files.
 */
export function coverPath(url: string | null, communityId: string): string | null {
  const marker = `/${COVER_BUCKET}/`;
  const at = url?.indexOf(marker) ?? -1;
  if (!url || at < 0) return null;
  const path = decodeURIComponent(url.slice(at + marker.length).split('?')[0] ?? '');
  return path.startsWith(`${communityId}/`) && !path.includes('..') ? path : null;
}
