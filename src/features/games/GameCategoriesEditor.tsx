import { useEffect, useState } from 'react';
import { Button, Modal } from '@/components/ui';
import { t } from '@/i18n';
import { CategoryPicker } from './CategoryPicker';
import { sameCategories } from './categories';

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

  // Start from the saved list every time the editor opens.
  useEffect(() => {
    if (open) setDraft(categories);
  }, [open, categories]);

  const save = async () => {
    try {
      await onSave(draft);
      onClose();
    } catch {
      // The caller reports the error; keep the editor open with the list as typed.
    }
  };

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
        <CategoryPicker key={open ? 'open' : 'closed'} value={draft} onChange={setDraft} suggestions={suggestions} />
      </div>
    </Modal>
  );
}
