import { z } from 'zod';
import { t } from '@/i18n';

const optionalCoord = (min: number, max: number) =>
  z.string().trim().refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max), { error: () => t('val.coordinate') });

export const communitySchema = z
  .object({
    name: z.string().trim().min(2, { error: () => t('val.nameMin') }).max(80, { error: () => t('val.communityNameMax') }),
    description: z.string().trim().max(500, { error: () => t('val.descriptionMax') }),
    visibility: z.enum(['public', 'private']),
    shelfVisibility: z.enum(['public', 'private']),
    city: z.string().trim().min(1, { error: () => t('val.cityRequired') }),
    district: z.string().trim().min(1, { error: () => t('val.districtRequired') }),
    country: z.string().trim().min(1, { error: () => t('val.countryRequired') }),
    latitude: optionalCoord(-90, 90),
    longitude: optionalCoord(-180, 180),
  })
  .refine((v) => (v.latitude === '') === (v.longitude === ''), { path: ['longitude'], error: () => t('val.coordinatePair') });

export type CommunityFormValues = z.infer<typeof communitySchema>;

/** URL-safe slug from a name; the caller appends a suffix when it must be unique. */
export function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'comunidade';
}
