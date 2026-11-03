import { supabase } from '@/lib/supabase';
import { authCallbackUrl } from '@/lib/env';
import { AppError } from '@/lib/errors';

/** Only allow in-app relative paths as post-login destinations (prevents open redirects). */
export function safeNextPath(next: string | null | undefined, fallback = '/library'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  return next;
}

export async function signInWithGoogle(next = '/library') {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: authCallbackUrl(safeNextPath(next)), queryParams: { prompt: 'select_account' } },
  });
  if (error) throw new AppError('Não foi possível iniciar sessão com o Google.', error);
}

export async function signInWithMagicLink(email: string, next = '/library') {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: authCallbackUrl(safeNextPath(next)), shouldCreateUser: true },
  });
  if (error) {
    const rate = /rate|too many/i.test(error.message);
    throw new AppError(rate ? 'Demasiados pedidos. Aguarda um minuto e tenta novamente.' : 'Não foi possível enviar o link de acesso.', error);
  }
}

/** Links Google to the current account (requires "manual linking" enabled in Supabase Auth). */
export async function linkGoogleIdentity() {
  const { error } = await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo: authCallbackUrl('/profile') } });
  if (error) throw new AppError('Não foi possível associar a conta Google.', error);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new AppError('Não foi possível terminar a sessão.', error);
}
