import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Button, ButtonLink, Icon, Input } from '@/components/ui';
import { Logo } from '@/components/brand/Logo';
import { Scenery } from '@/components/layout/Scenery';
import { useAuth } from '@/hooks/useAuth';
import { useEnabledProviders } from '@/hooks/useEnabledProviders';
import { useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { isSupabaseConfigured } from '@/lib/supabase';
import { emailSchema, type EmailFormValues } from './schemas';
import { safeNextPath } from './api';
import { OAUTH_PROVIDERS, PROVIDER_NAMES, type OAuthProvider } from './providers';

export function LoginPage({ mode = 'login' }: { mode?: 'login' | 'register' }) {
  const { t } = useI18n();
  const { user, isLoading, signInWithProvider, signInWithMagicLink } = useAuth();
  const enabledProviders = useEnabledProviders();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const next = safeNextPath(from);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<OAuthProvider | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EmailFormValues>({ resolver: zodResolver(emailSchema) });

  if (!isLoading && user) return <Navigate to={next} replace />;

  const isRegister = mode === 'register';
  const enabled = enabledProviders.data;
  const isOff = (p: OAuthProvider) => !isSupabaseConfigured || enabled?.[p] === false;
  const someOff = OAUTH_PROVIDERS.some((p) => enabled?.[p] === false);

  const onEmail = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await signInWithMagicLink(email, next);
      setSentTo(email);
    } catch (e) {
      setFormError(errorMessage(e));
    }
  });

  const onProvider = async (provider: OAuthProvider) => {
    setFormError(null);
    setPending(provider);
    try {
      await signInWithProvider(provider, next);
    } catch (e) {
      setFormError(errorMessage(e));
      setPending(null);
    }
  };

  return (
    <section className="auth-page">
      <Scenery />
      <div className="auth-card">
        <span className="auth-seal"><Logo variant="symbol" height={52} /></span>
        {sentTo ? (
          <div className="auth-confirm" role="status">
            <h1>{t('login.checkMail')}</h1>
            <p>{t('login.sentBefore')}<strong>{sentTo}</strong>{t('login.sentAfter')}</p>
            <p className="muted small">{t('login.spam')}</p>
            <div className="auth-actions">
              <Button variant="ghost" onClick={() => setSentTo(null)}>{t('login.otherEmail')}</Button>
            </div>
          </div>
        ) : (
          <>
            <h1>{isRegister ? t('register.title') : t('login.title')}</h1>
            <p className="muted">{isRegister ? t('register.sub') : t('login.sub')}</p>
            {formError && <p className="field-error mt-3" role="alert">{formError}</p>}
            <div className="auth-form">
              <div className="auth-providers">
                {OAUTH_PROVIDERS.map((p) => (
                  <Button
                    key={p}
                    variant="gold"
                    block
                    onClick={() => void onProvider(p)}
                    loading={pending === p}
                    loadingText={t('login.redirecting')}
                    disabled={isOff(p) || (pending !== null && pending !== p)}
                    icon={<Icon name={p} />}
                  >
                    <span className="auth-btn-label">
                      {t('login.withProvider', { provider: PROVIDER_NAMES[p] })}
                      {enabled?.[p] === false && <small className="auth-off">{t('login.unavailable')}</small>}
                    </span>
                  </Button>
                ))}
              </div>
              {someOff && <p className="muted small" role="note">{t('login.providersNote')}</p>}
              <p className="auth-divider" aria-hidden="true"><span>{t('login.or')}</span></p>
              <form onSubmit={onEmail} noValidate className="grid gap-4">
                <Input
                  label={t('login.email')}
                  type="email"
                  autoComplete="email"
                  placeholder={t('login.emailPlaceholder')}
                  leadingIcon={<Icon name="mail" />}
                  error={errors.email?.message}
                  {...register('email')}
                />
                <Button type="submit" variant="primary" block loading={isSubmitting} loadingText={t('login.sending')} disabled={!isSupabaseConfigured}>
                  {t('login.continue')}
                </Button>
              </form>
              <p className="muted small auth-switch">
                {isRegister ? t('register.haveAccount') : t('login.noAccount')}{' '}
                <Link to={isRegister ? '/login' : '/register'} state={from ? { from } : undefined}>
                  {isRegister ? t('common.signIn') : t('register.cta')}
                </Link>
              </p>
            </div>
          </>
        )}
        <Link className="back-link back-center" to="/games"><Icon name="back" />{t('common.backToGames')}</Link>
      </div>
    </section>
  );
}

export function LoginRequiredNotice({ message }: { message?: string }) {
  const { t } = useI18n();
  const location = useLocation();
  return (
    <div className="notice" role="note">
      <Icon name="user" />
      <p>{message ?? t('login.required')}</p>
      <ButtonLink to="/login" state={{ from: location.pathname }} variant="secondary" size="sm" className="ml-auto">{t('common.signIn')}</ButtonLink>
    </div>
  );
}
