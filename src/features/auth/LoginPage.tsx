import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Button, ButtonLink, Icon, Input } from '@/components/ui';
import { Emblem, Scenery } from '@/components/layout/Brand';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/lib/errors';
import { isSupabaseConfigured } from '@/lib/supabase';
import { emailSchema, type EmailFormValues } from './schemas';
import { safeNextPath } from './api';

export function LoginPage() {
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
            <h1>Verifica o teu correio</h1>
            <p>Enviámos um link de acesso para <strong>{sentTo}</strong>. Abre-o neste dispositivo para entrar.</p>
            <p className="muted small">Não recebeste? Verifica o spam ou tenta novamente dentro de um minuto.</p>
            <div className="auth-actions">
              <Button variant="ghost" onClick={() => setSentTo(null)}>Usar outro e-mail</Button>
            </div>
          </div>
        ) : (
          <>
            <h1>Entrar na Table Tale</h1>
            <p className="muted">Sem palavras-passe: entra com o Google ou recebe um link mágico no teu e-mail.</p>
            {formError && <p className="field-error mt-3" role="alert">{formError}</p>}
            <div className="auth-form">
              <Button variant="gold" block onClick={onGoogle} loading={googleLoading} loadingText="A redirecionar…" disabled={!isSupabaseConfigured} icon={<Icon name="google" />}>
                Continuar com Google
              </Button>
              <p className="auth-divider" aria-hidden="true"><span>ou</span></p>
              <form onSubmit={onEmail} noValidate className="grid gap-4">
                <Input
                  label="E-mail"
                  type="email"
                  autoComplete="email"
                  placeholder="nome@exemplo.pt"
                  leadingIcon={<Icon name="mail" />}
                  error={errors.email?.message}
                  {...register('email')}
                />
                <Button type="submit" variant="primary" block loading={isSubmitting} loadingText="A enviar link…" disabled={!isSupabaseConfigured}>
                  Continuar
                </Button>
              </form>
            </div>
          </>
        )}
        <Link className="back-link back-center" to="/library"><Icon name="back" />Voltar à biblioteca</Link>
      </div>
    </section>
  );
}

export function LoginRequiredNotice({ message = 'Inicia sessão para guardar o teu progresso.' }: { message?: string }) {
  const location = useLocation();
  return (
    <div className="notice" role="note">
      <Icon name="user" />
      <p>{message}</p>
      <ButtonLink to="/login" state={{ from: location.pathname }} variant="secondary" size="sm" className="ml-auto">Entrar</ButtonLink>
    </div>
  );
}
