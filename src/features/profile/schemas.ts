import { z } from 'zod';
import { t } from '@/i18n';

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, { error: () => t('val.nameMin') }).max(60, { error: () => t('val.nameMax') }),
  bio: z.string().trim().max(280, { error: () => t('val.bioMax') }),
  factionId: z.string().nullable(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
