import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EMPTY_FILTERS, type GameFilterValues } from '@/features/games/filters';
import { GameFilters } from './GameFilters';

function Harness({ showPersonalFilters, onReset = vi.fn() }: { showPersonalFilters: boolean; onReset?: () => void }) {
  const [values, setValues] = useState<GameFilterValues>(EMPTY_FILTERS);
  return <GameFilters values={values} genres={['Cartas', 'Música']} onChange={setValues} onReset={onReset} showPersonalFilters={showPersonalFilters} />;
}

describe('GameFilters', () => {
  it('updates the search and genre controls', async () => {
    const user = userEvent.setup();
    render(<Harness showPersonalFilters />);

    await user.type(screen.getByRole('searchbox', { name: 'Pesquisar por nome' }), 'Dixit');
    expect(screen.getByRole('searchbox', { name: 'Pesquisar por nome' })).toHaveValue('Dixit');

    await user.selectOptions(screen.getByLabelText('Género'), 'Cartas');
    expect(screen.getByLabelText('Género')).toHaveValue('Cartas');
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
