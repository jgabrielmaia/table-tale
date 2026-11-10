import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getLang } from '@/i18n';
import { env } from '@/lib/env';
import { DYNAMIC_SEO_PREFIXES, NOT_FOUND_SEO, findPage } from './pages';

function setTag(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

const meta = (attr: 'name' | 'property', key: string) => () => {
  const el = document.createElement('meta');
  el.setAttribute(attr, key);
  return el;
};

export interface PageSeoState {
  title: string;
  description: string;
  /** Router path of the canonical URL. */
  path: string;
  noindex?: boolean;
}

/** Keeps title, description, canonical and robots in sync with the page after client-side navigation. */
export function usePageSeo({ title, description, path, noindex = false }: PageSeoState) {
  useEffect(() => {
    const canonical = `${env.siteUrl}${path === '/' ? '/' : `${path.replace(/\/+$/, '')}/`}`;
    document.title = title;
    setTag('meta[name="description"]', meta('name', 'description'), 'content', description);
    setTag('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', canonical);
    setTag('meta[name="robots"]', meta('name', 'robots'), 'content', noindex ? 'noindex, follow' : 'index, follow');
    setTag('meta[property="og:title"]', meta('property', 'og:title'), 'content', title);
    setTag('meta[property="og:description"]', meta('property', 'og:description'), 'content', description);
    setTag('meta[property="og:url"]', meta('property', 'og:url'), 'content', canonical);
    setTag('meta[name="twitter:title"]', meta('name', 'twitter:title'), 'content', title);
    setTag('meta[name="twitter:description"]', meta('name', 'twitter:description'), 'content', description);
  }, [title, description, path, noindex]);
}

function StaticRouteSeo({ pathname }: { pathname: string }) {
  const lang = getLang();
  const page = findPage(pathname.replace(/(.)\/+$/, '$1'));
  const seo = page ?? NOT_FOUND_SEO;
  usePageSeo({ title: seo.title[lang], description: seo.description[lang], path: page?.path ?? pathname, noindex: !page?.index });
  return null;
}

/**
 * Metadata for every static route. Game, community and player pages set their own through `usePageSeo`;
 * static paths under those prefixes (/games/import, /communities/new) still use their PAGES entry.
 */
export function RouteSeo() {
  const { pathname } = useLocation();
  const path = pathname.replace(/(.)\/+$/, '$1');
  const dynamic = !findPage(path) && DYNAMIC_SEO_PREFIXES.some((prefix) => path.startsWith(prefix));
  return dynamic ? null : <StaticRouteSeo pathname={pathname} />;
}
