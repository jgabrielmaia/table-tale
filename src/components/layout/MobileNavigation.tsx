import { NavLink } from 'react-router-dom';
import { BrandSymbol } from '@/components/ui';
import { useI18n } from '@/i18n';
import { NAV_ITEMS } from './navItems';

/** Bottom tab bar shown on phones (the header keeps its hamburger menu as well). */
export function MobileNavigation() {
  const { t } = useI18n();
  const items = [{ to: '/', labelKey: 'nav.home' as const, shortKey: 'nav.home' as const, symbol: 'star' }, ...NAV_ITEMS];
  return (
    <nav className="mobile-tabbar" aria-label={t('nav.quick')}>
      {items.slice(0, 5).map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'}>
          <BrandSymbol name={item.symbol} />
          <span>{t(item.shortKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
