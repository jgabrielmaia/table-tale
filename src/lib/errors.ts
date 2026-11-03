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

const FRIENDLY: Record<string, string> = {
  '23505': 'Este registo já existe.',
  '23514': 'Algum valor não cumpre as regras de validação.',
  '42501': 'Não tens permissão para esta ação.',
  PGRST116: 'Não encontrado.',
};

/** Throws a friendly AppError when a Supabase call fails; otherwise returns its data. */
export function unwrap<T>(result: { data: T; error: PostgrestLikeError | null }, context: string): T {
  if (result.error) {
    const friendly = (result.error.code && FRIENDLY[result.error.code]) || result.error.message;
    throw new AppError(`${context}: ${friendly}`, result.error);
  }
  return result.data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Ocorreu um erro inesperado.';
}
