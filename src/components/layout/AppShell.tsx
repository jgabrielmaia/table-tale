import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useI18n } from '@/i18n';
import { BrandDefs } from './Brand';
import { Header } from './Header';
import { MobileNavigation } from './MobileNavigation';

/** Page chrome: skip link, header, main landmark (focused on navigation), footer and mobile tab bar. */
export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const heading = mainRef.current?.querySelector<HTMLElement>('h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    } else mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  const skip = (e: MouseEvent) => {
    e.preventDefault();
    mainRef.current?.focus();
  };

  return (
    <>
      <BrandDefs />
      <a className="skip-link" href="#main" onClick={skip}>{t('shell.skip')}</a>
      {!isSupabaseConfigured && (
        <div className="config-banner" role="alert">
          <div className="container">{t('shell.noSupabase')}</div>
        </div>
      )}
      <Header />
      <main id="main" ref={mainRef} tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <p><span className="footer-brand">Table Tale</span> — {t('footer.tagline')}</p>
          <p className="footer-note">
            <Link to="/lore">{t('nav.lore')}</Link>{import.meta.env.DEV && <> · <Link to="/ui">{t('footer.components')}</Link></>}
          </p>
        </div>
      </footer>
      <MobileNavigation />
    </>
  );
}
