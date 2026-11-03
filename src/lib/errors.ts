import { t, type MessageKey } from '@/i18n';

export class AppError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'AppError';
  }
}

interface PostgrestLikeError {
  message: string;
  code?: string;
}

const FRIENDLY: Record<string, MessageKey> = {
  '23505': 'err.duplicate',
  '23514': 'err.validation',
  '42501': 'err.forbidden',
  PGRST116: 'err.notFound',
};

/** Throws a friendly AppError when a Supabase call fails; otherwise returns its data. */
export function unwrap<T>(result: { data: T; error: PostgrestLikeError | null }, context: string): T {
  if (result.error) {
    const key = result.error.code ? FRIENDLY[result.error.code] : undefined;
    const friendly = key ? t(key) : result.error.message;
    throw new AppError(`${context}: ${friendly}`, result.error);
  }
  return result.data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return t('common.unexpectedError');
}
