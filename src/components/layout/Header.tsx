import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Avatar, ButtonLink, Button, Icon, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { EmblemPaths } from './Brand';
import { NAV_ITEMS } from './navItems';

export function Header() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { notify } = useToast();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const displayName = profile.data?.displayName || user?.email || '';

  const handleSignOut = async () => {
    try {
      await signOut();
      notify('Sessão terminada.');
    } catch (e) {
      notify(errorMessage(e), { tone: 'error' });
    }
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" to="/" aria-label="Table Tale — página inicial">
          <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
            <EmblemPaths />
          </svg>
          <span className="brand-name">
            Table<span className="brand-dot" aria-hidden="true">✦</span>Tale
          </span>
        </Link>

        <button
          className="nav-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? 'Fechar menu' : 'Abrir menu'}</span>
          <Icon name={open ? 'close' : 'menu'} />
        </button>

        <nav id="site-nav" className={`site-nav${open ? ' open' : ''}`} aria-label="Principal">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
          <div className="auth-slot">
            {user ? (
              <>
                <Link className="auth-user" to="/profile" aria-label={`O teu perfil (${displayName})`}>
                  <Avatar name={displayName || '?'} src={profile.data?.avatarUrl} size="sm" decorative />
                  <span className="auth-email">{displayName}</span>
                </Link>
                <Button variant="outline-light" size="sm" onClick={handleSignOut} icon={<Icon name="logout" />}>
                  Sair
                </Button>
              </>
            ) : (
              <ButtonLink to="/login" state={{ from: location.pathname }} variant="gold" size="sm" icon={<Icon name="lock" />}>
                Entrar
              </ButtonLink>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
