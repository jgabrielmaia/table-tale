import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { ButtonLink, Button, Icon, useToast } from '@/components/ui';
import { PlayerAvatar } from '@/components/identity/PlayerAvatar';
import { useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { Logo } from '@/components/brand/Logo';
import { LanguageSelector } from './LanguageSelector';
import { NAV_ITEMS } from './navItems';

export function Header() {
  const { t } = useI18n();
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
      notify(t('header.signedOut'));
    } catch (e) {
      notify(errorMessage(e), { tone: 'error' });
    }
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" to="/" aria-label={t('header.homeAria')}>
          <Logo variant="horizontal" decorative className="brand-logo" />
          <span className="brand-version">{__APP_VERSION__}</span>
        </Link>

        <button
          className="nav-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? t('nav.closeMenu') : t('nav.openMenu')}</span>
          <Icon name={open ? 'close' : 'menu'} />
        </button>

        <nav id="site-nav" className={`site-nav${open ? ' open' : ''}`} aria-label={t('nav.main')}>
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to}>{t(item.labelKey)}</NavLink>
              </li>
            ))}
          </ul>
          <div className="auth-slot">
            <LanguageSelector />
            {user ? (
              <>
                <Link className="auth-user" to="/profile" aria-label={t('header.profileAria', { name: displayName })}>
                  <PlayerAvatar playerId={user.id} name={displayName || '?'} src={profile.data?.avatarUrl} size="sm" decorative />
                  <span className="auth-email">{displayName}</span>
                </Link>
                <Button variant="outline-light" size="sm" onClick={handleSignOut} icon={<Icon name="logout" />}>
                  {t('common.signOut')}
                </Button>
              </>
            ) : (
              <ButtonLink to="/login" state={{ from: location.pathname }} variant="gold" size="sm" icon={<Icon name="lock" />}>
                {t('common.signIn')}
              </ButtonLink>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
