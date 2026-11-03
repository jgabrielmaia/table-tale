import { z } from 'zod';

export const emailSchema = z.object({
  email: z.string().trim().min(1, 'Indica o teu e-mail.').email('Este e-mail não parece válido. Ex.: nome@exemplo.pt'),
});

export type EmailFormValues = z.infer<typeof emailSchema>;
