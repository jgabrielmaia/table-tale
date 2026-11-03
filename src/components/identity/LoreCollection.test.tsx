import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { applyLang } from '@/i18n/core';
import { I18nProvider } from '@/i18n';
import type { PlayerIdentity } from '@/features/fate/api';
import { LoreCollection, LoreLocked } from './LoreCollection';

const identity = (cardId: string, isActive: boolean, season: string): PlayerIdentity => ({
  playerId: 'p1',
  seasonId: season,
  cardId,
  faction: ['earth', 'water', 'fire', 'air'].includes(cardId) ? 'elementais' : 'arcanos',
  selectedAt: '2026-11-03T10:00:00Z',
  isActive,
  season: { id: season, slug: season, name: season === 's2' ? 'Season 2' : 'Season 1', startsAt: '2026-01-01', endsAt: null, isActive },
});

const wrap = (ui: React.ReactNode) => render(<I18nProvider><MemoryRouter>{ui}</MemoryRouter></I18nProvider>);

afterEach(() => applyLang('pt'));

describe('Lore identity integration', () => {
  it('unlocked: shows all nine cards and highlights only the assigned one', () => {
    wrap(<LoreCollection active={identity('fire', true, 's2')} history={[identity('star', false, 's1')]} />);
    expect(screen.getAllByRole('img', { name: /The Magician|The High Priestess|The Star|The World|Temperance|Earth|Water|Fire|Air/ }).length).toBeGreaterThanOrEqual(9);
    // The highlighted card appears once on its own and once in the grid, always labelled as the player's identity.
    expect(screen.getAllByText('A tua identidade sazonal')).toHaveLength(2);
    const history = screen.getByText('Histórico de temporadas').closest('div') as HTMLElement;
    expect(within(history).getByText('The Star')).toBeInTheDocument();
  });

  it('locked: reveals no card artwork and links straight to the Fate Draw', () => {
    wrap(<LoreLocked history={[]} />);
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Descobre o teu destino' })).toHaveAttribute('href', '/fate');
  });

  it('is localized', () => {
    applyLang('en');
    wrap(<LoreLocked history={[]} />);
    expect(screen.getByRole('link', { name: 'Discover your fate' })).toHaveAttribute('href', '/fate');
  });
});
