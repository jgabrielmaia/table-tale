import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Button, ButtonLink, Icon, Input } from '@/components/ui';
import { Emblem, Scenery } from '@/components/layout/Brand';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { isSupabaseConfigured } from '@/lib/supabase';
import { emailSchema, type EmailFormValues } from './schemas';
import { safeNextPath } from './api';

export function LoginPage() {
  const { t } = useI18n();
  const { user, isLoading, signInWithGoogle, signInWithMagicLink } = useAuth();
  const location = useLocation();
  const next = safeNextPath((location.state as { from?: string } | null)?.from);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EmailFormValues>({ resolver: zodResolver(emailSchema) });

  if (!isLoading && user) return <Navigate to={next} replace />;

  const onEmail = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await signInWithMagicLink(email, next);
      setSentTo(email);
    } catch (e) {
      setFormError(errorMessage(e));
    }
  });

  const onGoogle = async () => {
    setFormError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle(next);
    } catch (e) {
      setFormError(errorMessage(e));
      setGoogleLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <Scenery />
      <div className="auth-card">
        <span className="auth-seal"><Emblem /></span>
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
            <h1>{t('login.title')}</h1>
            <p className="muted">{t('login.sub')}</p>
            {formError && <p className="field-error mt-3" role="alert">{formError}</p>}
            <div className="auth-form">
              <Button variant="gold" block onClick={onGoogle} loading={googleLoading} loadingText={t('login.redirecting')} disabled={!isSupabaseConfigured} icon={<Icon name="google" />}>
                {t('login.google')}
              </Button>
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
            </div>
          </>
        )}
        <Link className="back-link back-center" to="/library"><Icon name="back" />{t('common.backToLibrary')}</Link>
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
