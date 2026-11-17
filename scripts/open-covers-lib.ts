/**
 * Pure helpers for scripts/open-covers.ts: turning Wikimedia Commons file metadata into a cover credit, and deciding
 * which stored cover URLs are ours to keep.
 */

/** The bits of a Commons `imageinfo` answer the script uses (prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=…). */
export interface CommonsImageInfo {
  thumburl?: string;
  sha1?: string;
  url: string;
  descriptionurl: string;
  extmetadata?: Record<string, { value?: string } | undefined>;
}

/** Licences that let us copy and show the photo with a credit. Anything else is refused. */
const OPEN = /^(public domain|pd|cc0|cc by(-sa)? \d(\.\d)?)/i;

const plain = (html: string | undefined) =>
  (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

export interface OpenCover {
  /** What to download: a ~1200 px thumbnail when Commons offers one, else the original. */
  downloadUrl: string;
  /** "Author · Licence", at most 300 characters (the games.cover_credit check). */
  credit: string;
  /** The file's Commons page, where the full licence terms live. */
  sourceUrl: string;
  /** Changes when the file on Commons changes: used as the ?v= marker so caches pick up a new version. */
  version: string;
}

/** The cover to copy and how to credit it, or an error message when the file's licence is not open. */
export function toOpenCover(info: CommonsImageInfo): OpenCover | { error: string } {
  const meta = info.extmetadata ?? {};
  const licence = plain(meta.LicenseShortName?.value);
  if (!OPEN.test(licence)) return { error: `licence "${licence || 'unknown'}" is not an open licence we accept` };
  const author = plain(meta.Artist?.value) || 'Wikimedia Commons';
  const credit = `${author} · ${licence} · Wikimedia Commons`.slice(0, 300);
  return { downloadUrl: info.thumburl ?? info.url, credit, sourceUrl: info.descriptionurl, version: (info.sha1 ?? '').slice(0, 12) || 'x' };
}

/** True for a cover the script itself copied (catalogue/ in game-covers). */
export const isCatalogueCover = (url: string | null) => Boolean(url && url.includes('/storage/v1/object/public/game-covers/catalogue/'));

/** True for a cover we serve ourselves (Supabase storage); anything else is a hotlink the CSP blocks anyway. */
export const isOwnCover = (url: string | null, supabaseUrl: string) =>
  Boolean(url && url.startsWith(`${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/`));
