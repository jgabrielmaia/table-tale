import { z } from 'zod';
import { t, type MessageKey } from '@/i18n';
import { todayIso } from '@/lib/format';

const optionalInt = (min: number, max: number, labelKey: MessageKey) =>
  z
    .union([
      z.literal(''),
      z.coerce
        .number()
        .int({ error: () => t('val.int', { label: t(labelKey) }) })
        .min(min, { error: () => t('val.min', { label: t(labelKey), min }) })
        .max(max, { error: () => t('val.max', { label: t(labelKey), max }) }),
    ])
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v));

export const sessionSchema = z.object({
  playedAt: z
    .string()
    .min(1, { error: () => t('val.dateRequired') })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: () => t('val.dateInvalid') })
    .refine((v) => v <= todayIso(), { error: () => t('val.dateFuture') }),
  durationMinutes: optionalInt(1, 1440, 'val.durationLabel'),
  playersCount: optionalInt(1, 99, 'val.playersLabel'),
  rating: optionalInt(1, 5, 'val.ratingLabel'),
  notes: z.string().max(1000, { error: () => t('val.notesMax') }).optional().default(''),
});

export type SessionFormInput = z.input<typeof sessionSchema>;
export type SessionFormValues = z.output<typeof sessionSchema>;
