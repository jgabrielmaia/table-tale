import { useId, useState } from 'react';
import { Button, Icon, Input } from '@/components/ui';
import { t } from '@/i18n';
import { addCategory, CATEGORIES_MAX, CATEGORY_MAX_LENGTH, removeCategory, type CategoryProblem } from './categories';

export interface CategoryPickerProps {
  value: string[];
  onChange: (categories: string[]) => void;
  /** Categories of other games, offered while typing. */
  suggestions: string[];
}

/** A game's categories as removable chips plus a field to add more (Enter or the button), as many as the database allows. */
export function CategoryPicker({ value, onChange, suggestions }: CategoryPickerProps) {
  const [text, setText] = useState('');
  const [problem, setProblem] = useState<CategoryProblem | null>(null);
  const listId = useId();

  const add = () => {
    const result = addCategory(value, text);
    if (result.problem) return setProblem(result.problem);
    onChange(result.list);
    setText('');
    setProblem(null);
  };

  const message = problem ? t(`game.categories.err.${problem}`, { max: problem === 'tooLong' ? CATEGORY_MAX_LENGTH : CATEGORIES_MAX }) : undefined;

  return (
    <div className="grid gap-4">
      {value.length ? (
        <ul className="category-chips" role="list">
          {value.map((c) => (
            <li key={c} className="category-chip">
              <span>{c}</span>
              <button type="button" className="category-chip__remove" aria-label={t('game.categories.remove', { name: c })} onClick={() => onChange(removeCategory(value, c))}>
                <Icon name="close" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{t('game.categories.none')}</p>
      )}
      <div className="category-add">
        <Input
          label={t('game.categories.label')}
          value={text}
          list={listId}
          maxLength={CATEGORY_MAX_LENGTH + 20}
          autoComplete="off"
          error={message}
          hint={t('game.categories.count', { n: value.length, max: CATEGORIES_MAX })}
          onChange={(e) => { setText(e.target.value); setProblem(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <datalist id={listId}>
          {suggestions.map((s) => <option key={s} value={s} />)}
        </datalist>
        <Button variant="secondary" icon={<Icon name="plus" />} onClick={add}>{t('game.categories.add')}</Button>
      </div>
    </div>
  );
}
