import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ButtonLink, ErrorState, LoadingState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useFate } from '@/hooks/useFate';
import { useI18n } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { safeNextPath } from './api';
import { callbackErrorKey, readCallbackError } from './providers';

/** OAuth / magic-link landing page (/table-tale/auth/callback). Supabase exchanges the PKCE code on load. */
export function AuthCallbackPage() {
  const { t } = useI18n();
  const { user, isLoading } = useAuth();
  const fate = useFate();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNextPath(params.get('next'));
  const providerError = readCallbackError(window.location.search, window.location.hash);
  const [timedOut, setTimedOut] = useState(false);
  const [exchangeFailed, setExchangeFailed] = useState(false);

  useEffect(() => {
    if (!user || providerError) return;
    // Wait until we know whether this player has ever drawn a card.
    if (!fate.identities.isError && (fate.state === 'loading' || fate.season.isLoading)) return;
    // A first-time player goes straight to discover their destiny.
    const firstTime = !fate.identities.isError && fate.state === 'uninitiated' && fate.canDraw;
    navigate(firstTime ? '/fate' : next, { replace: true });
  }, [user, providerError, next, navigate, fate.state, fate.canDraw, fate.season.isLoading, fate.identities.isError]);

  useEffect(() => {
    if (providerError || user) return;
    const code = params.get('code');
    // Fallback in case automatic detection did not run (e.g. the page was restored from cache).
    if (code && !isLoading) {
      supabase.auth.exchangeCodeForSession(code).catch(() => setExchangeFailed(true));
    }
    const timer = window.setTimeout(() => setTimedOut(true), 12_000);
    return () => window.clearTimeout(timer);
  }, [providerError, user, isLoading, params]);

  if (providerError || timedOut || exchangeFailed) {
    const key = providerError ? callbackErrorKey(providerError.code, providerError.description) : 'auth.cb.expired';
    return (
      <div className="container section">
        <ErrorState title={t('auth.callbackErrorTitle')} message={t(key)} />
        <div className="mt-6 flex justify-center">
          <ButtonLink to={user ? '/profile' : '/login'} state={user ? undefined : { from: next }} variant="primary">
            {user ? t('nav.profile') : t('auth.backToLogin')}
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="container section">
      <h1 className="sr-only">{t('auth.finishing')}</h1>
      <LoadingState label={t('auth.opening')} />
    </div>
  );
}
