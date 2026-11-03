import { z } from 'zod';
import { t } from '@/i18n';

export const emailSchema = z.object({
  email: z.string().trim().min(1, { error: () => t('auth.val.emailRequired') }).email({ error: () => t('auth.val.emailInvalid') }),
});

export type EmailFormValues = z.infer<typeof emailSchema>;
