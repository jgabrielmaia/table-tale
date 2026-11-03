import { useEffect, useState, type MouseEvent } from 'react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/format';

export interface SidebarItem {
  id: string;
  label: string;
}

export interface SidebarProps {
  items: SidebarItem[];
  label: string;
  title?: string;
}

/** Sticky in-page navigation with scroll-spy (becomes a horizontal chip bar on small screens). */
export function Sidebar({ items, label, title }: SidebarProps) {
  const { t } = useI18n();
  const [active, setActive] = useState(items[0]?.id ?? '');

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && setActive(entry.target.id)),
      { rootMargin: '-30% 0px -60% 0px' },
    );
    items.forEach((i) => {
      const el = document.getElementById(i.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  const go = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    setActive(id);
  };

  return (
    <nav className="lore-toc" aria-label={label}>
      <p className="lore-toc-title">{title ?? t('sidebar.title')}</p>
      <ol>
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className={cn(active === item.id && 'active')} aria-current={active === item.id ? 'true' : undefined} onClick={(e) => go(e, item.id)}>
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
