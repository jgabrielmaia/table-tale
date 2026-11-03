import { z } from 'zod';
import { todayIso } from '@/lib/format';

const optionalInt = (min: number, max: number, label: string) =>
  z
    .union([z.literal(''), z.coerce.number().int(`${label} tem de ser um número inteiro.`).min(min, `${label}: mínimo ${min}.`).max(max, `${label}: máximo ${max}.`)])
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v));

export const sessionSchema = z.object({
  playedAt: z
    .string()
    .min(1, 'Indica a data da sessão.')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')
    .refine((v) => v <= todayIso(), 'A data não pode ser no futuro.'),
  durationMinutes: optionalInt(1, 1440, 'Duração'),
  playersCount: optionalInt(1, 99, 'Jogadores'),
  rating: optionalInt(1, 5, 'Avaliação'),
  notes: z.string().max(1000, 'As notas não podem exceder 1000 caracteres.').optional().default(''),
});

export type SessionFormInput = z.input<typeof sessionSchema>;
export type SessionFormValues = z.output<typeof sessionSchema>;
