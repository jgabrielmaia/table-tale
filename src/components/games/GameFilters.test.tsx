import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EMPTY_FILTERS, type GameFilterValues } from '@/features/games/filters';
import { GameFilters } from './GameFilters';

function Harness({ showPersonalFilters, onReset = vi.fn() }: { showPersonalFilters: boolean; onReset?: () => void }) {
  const [values, setValues] = useState<GameFilterValues>(EMPTY_FILTERS);
  return <GameFilters values={values} categories={['Card Game', 'Music']} mechanics={['Dice Rolling']} onChange={setValues} onReset={onReset} showPersonalFilters={showPersonalFilters} />;
}

describe('GameFilters', () => {
  it('updates the search and category controls', async () => {
    const user = userEvent.setup();
    render(<Harness showPersonalFilters />);

    await user.type(screen.getByRole('searchbox', { name: 'Pesquisar por nome' }), 'Dixit');
    expect(screen.getByRole('searchbox', { name: 'Pesquisar por nome' })).toHaveValue('Dixit');

    await user.selectOptions(screen.getByLabelText('Categoria'), 'Card Game');
    expect(screen.getByLabelText('Categoria')).toHaveValue('Card Game');
    await user.selectOptions(screen.getByLabelText('Mecânica'), 'Dice Rolling');
    expect(screen.getByLabelText('Mecânica')).toHaveValue('Dice Rolling');
  });

  it('keeps personal filters disabled until login and exposes reset', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<Harness showPersonalFilters={false} onReset={onReset} />);

    expect(screen.getByLabelText('Estado')).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /só favoritos/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(onReset).toHaveBeenCalledOnce();
  });
});
