/**
 * The storage path of a public URL we handed out for `bucket`, but only when it sits in `folder` (`<folder>/...`), or
 * null for anything else. Clean-ups go through this, so removing an old file can never touch another folder's files,
 * catalogue files or a path with `..` in it.
 */
export function ownedStoragePath(url: string | null, bucket: string, folder: string): string | null {
  const marker = `/${bucket}/`;
  const at = url?.indexOf(marker) ?? -1;
  if (!url || at < 0) return null;
  const path = decodeURIComponent(url.slice(at + marker.length).split('?')[0] ?? '');
  return path.startsWith(`${folder}/`) && !path.includes('..') ? path : null;
}
