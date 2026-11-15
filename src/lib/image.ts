/**
 * Shrinks photos in the browser before they are uploaded, so players can pick any photo (a phone picture is often
 * 3-5 MB) while what we store and serve stays small. The storage buckets keep their own size limits as a backstop.
 */
import { t } from '@/i18n';

export interface ShrinkTarget {
  /** Largest width and height of the stored image, in px. Photos are scaled down to fit, never up. */
  maxWidth: number;
  maxHeight: number;
  /** The storage bucket's file size limit, in bytes. */
  maxBytes: number;
}

/** The file is not an image the browser can read (corrupt, or a format it cannot decode). */
export class ImageReadError extends Error {}
/** Even at the lowest quality the image does not fit the size limit. */
export class ImageTooLargeError extends Error {}

/** What to tell the player when shrinkImage rejects. */
export const shrinkErrorMessage = (error: unknown) => t(error instanceof ImageTooLargeError ? 'image.err.tooLarge' : 'image.err.read');

/** Scales width × height down to fit inside maxWidth × maxHeight, keeping the ratio. */
export function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

const TYPES = ['image/webp', 'image/jpeg'] as const;
const QUALITIES = [0.85, 0.75, 0.6, 0.45];
const EXTENSIONS: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

type Encode = (type: string, quality: number) => Promise<Blob | null>;

/**
 * Encodes as WebP (or JPEG where the browser cannot write WebP: it then hands back a PNG instead), lowering the
 * quality until the result fits in maxBytes.
 */
export async function encodeWithin(encode: Encode, maxBytes: number): Promise<Blob> {
  for (const type of TYPES) {
    for (const quality of QUALITIES) {
      const blob = await encode(type, quality);
      if (!blob || blob.type !== type) break;
      if (blob.size <= maxBytes) return blob;
    }
  }
  throw new ImageTooLargeError();
}

/** The file name with the extension of the new type. */
export function renamed(name: string, type: string) {
  const ext = EXTENSIONS[type] ?? 'img';
  const dot = name.lastIndexOf('.');
  return `${dot > 0 ? name.slice(0, dot) : name}.${ext}`;
}

/**
 * Returns a photo that fits the target: the original file when it already does (a small PNG keeps its quality and
 * transparency), otherwise a scaled-down WebP/JPEG copy. Rejects with ImageReadError or ImageTooLargeError.
 */
export async function shrinkImage(file: File, target: ShrinkTarget): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageReadError();
  }
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, target.maxWidth, target.maxHeight);
    if (width === bitmap.width && height === bitmap.height && file.size <= target.maxBytes) return file;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ImageReadError();
    ctx.imageSmoothingQuality = 'high';
    const encode: Encode = (type, quality) => {
      // JPEG has no transparency: paint transparent areas white rather than black.
      ctx.clearRect(0, 0, width, height);
      if (type === 'image/jpeg') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(bitmap, 0, 0, width, height);
      return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    };
    const blob = await encodeWithin(encode, target.maxBytes);
    return new File([blob], renamed(file.name, blob.type), { type: blob.type });
  } finally {
    bitmap.close();
  }
}
