import { z } from 'zod';
import { t, type MessageKey } from '@/i18n';
import { todayIso } from '@/lib/format';

/** Empty means "not provided". Anything else must be a whole number inside [min, max], with a message in the user's language. */
const optionalInt = (min: number, max: number, labelKey: MessageKey) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((value, ctx) => {
      if (value === undefined || value === '') return null;
      const n = Number(value);
      const label = t(labelKey);
      const fail = (message: string) => {
        ctx.issues.push({ code: 'custom', message, input: value });
        return z.NEVER;
      };
      if (!Number.isInteger(n)) return fail(t('val.int', { label }));
      if (n < min) return fail(t('val.min', { label, min }));
      if (n > max) return fail(t('val.max', { label, max }));
      return n;
    });

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
