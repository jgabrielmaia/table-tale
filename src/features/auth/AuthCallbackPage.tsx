import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ButtonLink, ErrorState, LoadingState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { safeNextPath } from './api';

/** OAuth / magic-link landing page (/table-tale/auth/callback). Supabase exchanges the PKCE code on load. */
export function AuthCallbackPage() {
  const { user, isLoading } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNextPath(params.get('next'));
  const providerError = params.get('error_description') || new URLSearchParams(window.location.hash.slice(1)).get('error_description');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, next, navigate]);

  useEffect(() => {
    if (providerError || user) return;
    const code = params.get('code');
    // Fallback in case automatic detection did not run (e.g. the page was restored from cache).
    if (code && !isLoading) {
      supabase.auth.exchangeCodeForSession(code).catch(() => undefined);
    }
    const t = window.setTimeout(() => setTimedOut(true), 12_000);
    return () => window.clearTimeout(t);
  }, [providerError, user, isLoading, params]);

  if (providerError || timedOut) {
    return (
      <div className="container section">
        <ErrorState
          title="Não foi possível concluir o login"
          message={providerError ?? 'O link pode ter expirado ou já ter sido usado. Pede um novo link de acesso.'}
        />
        <div className="mt-6 flex justify-center">
          <ButtonLink to="/login" variant="primary">Voltar ao login</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="container section">
      <h1 className="sr-only">A concluir o login</h1>
      <LoadingState label="A abrir os portões da biblioteca…" />
    </div>
  );
}
