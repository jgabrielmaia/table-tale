import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PAGES, gameSeo } from './pages';
import { RouteSeo } from './RouteSeo';

const meta = (sel: string) => document.head.querySelector(sel)?.getAttribute('content');
const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><RouteSeo /></MemoryRouter>);

describe('page metadata table', () => {
  it('keeps indexable titles and descriptions within search snippet limits', () => {
    for (const p of PAGES.filter((x) => x.index)) {
      for (const lang of ['pt', 'en'] as const) {
        expect(p.title[lang].length, `${p.path} title ${lang}`).toBeGreaterThanOrEqual(45);
        expect(p.title[lang].length, `${p.path} title ${lang}`).toBeLessThanOrEqual(62);
        expect(p.description[lang].length, `${p.path} description ${lang}`).toBeGreaterThanOrEqual(120);
        expect(p.description[lang].length, `${p.path} description ${lang}`).toBeLessThanOrEqual(160);
      }
    }
  });

  it('builds unique, bounded game metadata', () => {
    const g = { title: 'Duelo por Cardia', categories: ['Card Game'], minPlayers: 2, maxPlayers: 2, durationMinutes: 15, description: 'Duelo de cartas para dois jogadores: em cada ronda, ambos revelam um personagem e o mais forte vence — mas cada habilidade pode virar o resultado.' };
    const seo = gameSeo(g, 'pt');
    expect(seo.title.length).toBeLessThanOrEqual(60);
    expect(seo.description.length).toBeLessThanOrEqual(160);
    expect(seo.description).toContain('2 jogadores');
  });
});

describe('RouteSeo', () => {
  it('sets title, canonical and index for a public page', () => {
    renderAt('/games');
    expect(document.title).toContain('Jogos');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toMatch(/\/games\/$/);
    expect(meta('meta[name="robots"]')).toBe('index, follow');
  });

  it('gives the communities list, new community and BGG import their own titles, never "not found"', () => {
    const pages: [string, string][] = [['/communities', 'Comunidades'], ['/communities/new', 'Nova comunidade'], ['/games/import', 'Importar do BoardGameGeek']];
    for (const [path, title] of pages) {
      renderAt(path);
      expect(document.title, path).toBe(`${title} | Table Tale`);
    }
  });

  it('leaves game, community and player pages to set their own title', () => {
    for (const path of ['/games/coup', '/communities/table-tale', '/players/00000000-0000-4000-8000-0000000000a1']) {
      document.title = 'set by the page';
      renderAt(path);
      expect(document.title, path).toBe('set by the page');
    }
  });

  it('marks private pages and unknown routes as noindex', () => {
    renderAt('/login');
    expect(meta('meta[name="robots"]')).toBe('noindex, follow');
    renderAt('/does-not-exist');
    expect(meta('meta[name="robots"]')).toBe('noindex, follow');
  });
});
