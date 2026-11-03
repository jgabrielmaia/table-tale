import { z } from 'zod';

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres.').max(60, 'Máximo de 60 caracteres.'),
  bio: z.string().trim().max(280, 'Máximo de 280 caracteres.'),
  factionId: z.string().nullable(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
