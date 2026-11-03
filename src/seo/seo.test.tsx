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
    const g = { title: 'Duelo por Cardia', genre: 'Duelo', minPlayers: 2, maxPlayers: 2, durationMinutes: 15, complexity: 'Leve', description: 'Duelo de cartas para dois jogadores: em cada ronda, ambos revelam um personagem e o mais forte vence — mas cada habilidade pode virar o resultado.' };
    const seo = gameSeo(g, 'pt');
    expect(seo.title.length).toBeLessThanOrEqual(60);
    expect(seo.description.length).toBeLessThanOrEqual(160);
    expect(seo.description).toContain('2 jogadores');
  });
});

describe('RouteSeo', () => {
  it('sets title, canonical and index for a public page', () => {
    renderAt('/library');
    expect(document.title).toContain('Biblioteca');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toMatch(/\/library\/$/);
    expect(meta('meta[name="robots"]')).toBe('index, follow');
  });

  it('marks private pages and unknown routes as noindex', () => {
    renderAt('/login');
    expect(meta('meta[name="robots"]')).toBe('noindex, follow');
    renderAt('/does-not-exist');
    expect(meta('meta[name="robots"]')).toBe('noindex, follow');
  });
});
