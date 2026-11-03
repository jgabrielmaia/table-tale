import { NavLink } from 'react-router-dom';
import { BrandSymbol } from '@/components/ui';
import { NAV_ITEMS } from './navItems';

/** Bottom tab bar shown on phones (the header keeps its hamburger menu as well). */
export function MobileNavigation() {
  const items = [{ to: '/', label: 'Início', symbol: 'star' }, ...NAV_ITEMS];
  return (
    <nav className="mobile-tabbar" aria-label="Navegação rápida">
      {items.slice(0, 5).map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'}>
          <BrandSymbol name={item.symbol} />
          <span>{item.label.replace(' & Elementais', '')}</span>
        </NavLink>
      ))}
    </nav>
  );
}
