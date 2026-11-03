import { Button, Icon, Input, Select } from '@/components/ui';
import type { DurationFilter, GameFilterValues, PlayersFilter } from '@/features/games/filters';
import { STATUS_OPTIONS } from './GameStatusBadge';

export interface GameFiltersProps {
  values: GameFilterValues;
  genres: string[];
  onChange: (values: GameFilterValues) => void;
  onReset: () => void;
  showPersonalFilters: boolean;
}

const PLAYER_OPTIONS: { value: PlayersFilter; label: string }[] = [
  { value: '', label: 'Qualquer número' },
  { value: '1', label: 'Solo (1)' },
  { value: '2', label: '2 jogadores' },
  { value: '3-4', label: '3–4 jogadores' },
  { value: '5+', label: '5 ou mais' },
];

const DURATION_OPTIONS: { value: DurationFilter; label: string }[] = [
  { value: '', label: 'Qualquer duração' },
  { value: 'short', label: 'Até 30 min' },
  { value: 'medium', label: '31–60 min' },
  { value: 'long', label: '61–120 min' },
  { value: 'epic', label: 'Mais de 2 h' },
];

export function GameFilters({ values, genres, onChange, onReset, showPersonalFilters }: GameFiltersProps) {
  const set = <K extends keyof GameFilterValues>(key: K, value: GameFilterValues[K]) => onChange({ ...values, [key]: value });

  return (
    <form className="filters" role="search" aria-label="Pesquisar e filtrar jogos" onSubmit={(e) => e.preventDefault()}>
      <Input
        label="Pesquisar por nome"
        type="search"
        placeholder="Ex.: Dixit"
        autoComplete="off"
        value={values.query}
        onChange={(e) => set('query', e.target.value)}
        wrapperClassName="field-search"
        leadingIcon={<Icon name="search" />}
      />
      <Select
        label="Género"
        value={values.genre}
        onChange={(e) => set('genre', e.target.value)}
        options={[{ value: '', label: 'Todos' }, ...genres.map((g) => ({ value: g, label: g }))]}
      />
      <Select label="Jogadores" value={values.players} onChange={(e) => set('players', e.target.value as PlayersFilter)} options={PLAYER_OPTIONS} />
      <Select label="Duração" value={values.duration} onChange={(e) => set('duration', e.target.value as DurationFilter)} options={DURATION_OPTIONS} />
      <Select
        label="Estado"
        value={values.status}
        disabled={!showPersonalFilters}
        hint={showPersonalFilters ? undefined : 'Entra para filtrar pelo teu progresso.'}
        onChange={(e) => set('status', e.target.value as GameFilterValues['status'])}
        options={[{ value: '', label: 'Todos os estados' }, ...STATUS_OPTIONS]}
      />
      <div className="filters-extra">
        <label className="check">
          <input
            type="checkbox"
            checked={values.favoritesOnly}
            disabled={!showPersonalFilters}
            onChange={(e) => set('favoritesOnly', e.target.checked)}
          />
          <span><Icon name="heart" />Só favoritos</span>
        </label>
        <Button variant="ghost" size="sm" onClick={onReset}>Limpar filtros</Button>
      </div>
    </form>
  );
}
