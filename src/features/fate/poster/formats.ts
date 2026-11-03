import type { MessageKey } from '@/i18n';

export type PosterFormat = 'story' | 'feed' | 'whatsapp';

export interface PosterFormatSpec {
  width: number;
  height: number;
  /** JPEG quality: balances sharpness against upload size. */
  quality: number;
  labelKey: MessageKey;
}

export const POSTER_FORMATS: Record<PosterFormat, PosterFormatSpec> = {
  story: { width: 1080, height: 1920, quality: 0.9, labelKey: 'poster.format.story' },
  feed: { width: 1080, height: 1350, quality: 0.9, labelKey: 'poster.format.feed' },
  whatsapp: { width: 1080, height: 1440, quality: 0.86, labelKey: 'poster.format.whatsapp' },
};

export const POSTER_ORDER: PosterFormat[] = ['story', 'feed', 'whatsapp'];
