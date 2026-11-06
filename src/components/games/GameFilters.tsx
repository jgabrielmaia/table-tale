import { Button, Icon, Input, Select } from '@/components/ui';
import type { DurationFilter, GameFilterValues, PlayersFilter } from '@/features/games/filters';
import { t } from '@/i18n';
import { statusOptions } from './GameStatusBadge';

export interface GameFiltersProps {
  values: GameFilterValues;
  /** BGG categories and mechanics present in the catalogue. */
  categories: string[];
  mechanics: string[];
  onChange: (values: GameFilterValues) => void;
  onReset: () => void;
  showPersonalFilters: boolean;
}

const playerOptions = (): { value: PlayersFilter; label: string }[] => [
  { value: '', label: t('filters.playersAny') },
  { value: '1', label: t('filters.playersSolo') },
  { value: '2', label: t('filters.playersTwo') },
  { value: '3-4', label: t('filters.playersThreeFour') },
  { value: '5+', label: t('filters.playersFivePlus') },
];

const durationOptions = (): { value: DurationFilter; label: string }[] => [
  { value: '', label: t('filters.durationAny') },
  { value: 'short', label: t('filters.durationShort') },
  { value: 'medium', label: t('filters.durationMedium') },
  { value: 'long', label: t('filters.durationLong') },
  { value: 'epic', label: t('filters.durationEpic') },
];

export function GameFilters({ values, categories, mechanics, onChange, onReset, showPersonalFilters }: GameFiltersProps) {
  const set = <K extends keyof GameFilterValues>(key: K, value: GameFilterValues[K]) => onChange({ ...values, [key]: value });

  return (
    <form className="filters" role="search" aria-label={t('filters.aria')} onSubmit={(e) => e.preventDefault()}>
      <Input
        label={t('filters.search')}
        type="search"
        placeholder={t('filters.searchPlaceholder')}
        autoComplete="off"
        value={values.query}
        onChange={(e) => set('query', e.target.value)}
        wrapperClassName="field-search"
        leadingIcon={<Icon name="search" />}
      />
      <Select
        label={t('filters.category')}
        value={values.category}
        onChange={(e) => set('category', e.target.value)}
        options={[{ value: '', label: t('filters.all') }, ...categories.map((c) => ({ value: c, label: c }))]}
      />
      <Select
        label={t('filters.mechanic')}
        value={values.mechanic}
        onChange={(e) => set('mechanic', e.target.value)}
        options={[{ value: '', label: t('filters.all') }, ...mechanics.map((m) => ({ value: m, label: m }))]}
      />
      <Select label={t('filters.players')} value={values.players} onChange={(e) => set('players', e.target.value as PlayersFilter)} options={playerOptions()} />
      <Select label={t('filters.duration')} value={values.duration} onChange={(e) => set('duration', e.target.value as DurationFilter)} options={durationOptions()} />
      <Select
        label={t('filters.status')}
        value={values.status}
        disabled={!showPersonalFilters}
        hint={showPersonalFilters ? undefined : t('filters.statusHint')}
        onChange={(e) => set('status', e.target.value as GameFilterValues['status'])}
        options={[{ value: '', label: t('filters.allStatuses') }, ...statusOptions()]}
      />
      <div className="filters-extra">
        <label className="check">
          <input
            type="checkbox"
            checked={values.favoritesOnly}
            disabled={!showPersonalFilters}
            onChange={(e) => set('favoritesOnly', e.target.checked)}
          />
          <span><Icon name="heart" />{t('filters.favoritesOnly')}</span>
        </label>
        <Button variant="ghost" size="sm" onClick={onReset}>{t('filters.clear')}</Button>
      </div>
    </form>
  );
}
