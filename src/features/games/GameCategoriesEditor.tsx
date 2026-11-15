import { useEffect, useId, useState } from 'react';
import { Button, Icon, Input, Modal } from '@/components/ui';
import { t } from '@/i18n';
import {
  addCategory, CATEGORIES_MAX, CATEGORY_MAX_LENGTH, removeCategory, sameCategories, type CategoryProblem,
} from './categories';

export interface GameCategoriesEditorProps {
  open: boolean;
  categories: string[];
  /** Categories of other games, offered while typing. */
  suggestions: string[];
  saving: boolean;
  onClose: () => void;
  onSave: (categories: string[]) => Promise<void>;
}

/** The owner's editor for a game's categories: as many labels as they like (up to the database limit), saved together. */
export function GameCategoriesEditor({ open, categories, suggestions, saving, onClose, onSave }: GameCategoriesEditorProps) {
  const [draft, setDraft] = useState(categories);
  const [text, setText] = useState('');
  const [problem, setProblem] = useState<CategoryProblem | null>(null);
  const listId = useId();

  // Start from the saved list every time the editor opens.
  useEffect(() => {
    if (!open) return;
    setDraft(categories);
    setText('');
    setProblem(null);
  }, [open, categories]);

  const add = () => {
    const result = addCategory(draft, text);
    if (result.problem) return setProblem(result.problem);
    setDraft(result.list);
    setText('');
    setProblem(null);
  };

  const save = async () => {
    try {
      await onSave(draft);
      onClose();
    } catch {
      // The caller reports the error; keep the editor open with the list as typed.
    }
  };

  const message = problem ? t(`game.categories.err.${problem}`, { max: problem === 'tooLong' ? CATEGORY_MAX_LENGTH : CATEGORIES_MAX }) : undefined;

  return (
    <Modal
      open={open}
      title={t('game.categories.edit')}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" loading={saving} loadingText={t('edit.saving')} disabled={sameCategories(draft, categories)} onClick={() => void save()}>
            {t('edit.save')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <p className="muted">{t('game.categories.hint')}</p>
        {draft.length ? (
          <ul className="category-chips" role="list">
            {draft.map((c) => (
              <li key={c} className="category-chip">
                <span>{c}</span>
                <button type="button" className="category-chip__remove" aria-label={t('game.categories.remove', { name: c })} onClick={() => setDraft(removeCategory(draft, c))}>
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
            hint={t('game.categories.count', { n: draft.length, max: CATEGORIES_MAX })}
            onChange={(e) => { setText(e.target.value); setProblem(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          />
          <datalist id={listId}>
            {suggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
          <Button variant="secondary" icon={<Icon name="plus" />} onClick={add}>{t('game.categories.add')}</Button>
        </div>
      </div>
    </Modal>
  );
}
