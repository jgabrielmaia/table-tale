import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Modal, Textarea } from '@/components/ui';
import { t } from '@/i18n';
import { CategoryPicker } from './CategoryPicker';
import { newGameSchema, type NewGameInput, type NewGameValues } from './schemas';

export interface NewGameModalProps {
  open: boolean;
  /** Categories of other games, offered while typing. */
  suggestions: string[];
  onClose: () => void;
  /** Creates the game; reject to keep the form open with what was typed (the caller reports the error). */
  onCreate: (values: NewGameValues, categories: string[]) => Promise<void>;
}

const EMPTY: NewGameInput = { title: '', description: '', minPlayers: '', maxPlayers: '', durationMinutes: '' };

/** Add a game that is not in the catalogue yet, by hand: only the title is required. Works without BoardGameGeek. */
export function NewGameModal({ open, suggestions, onClose, onCreate }: NewGameModalProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const {
    register, handleSubmit, reset, formState: { errors, isSubmitting },
  } = useForm<NewGameInput, unknown, NewGameValues>({ resolver: zodResolver(newGameSchema), defaultValues: EMPTY });

  // A fresh form every time it opens.
  useEffect(() => {
    if (!open) return;
    reset(EMPTY);
    setCategories([]);
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await onCreate(values, categories);
      onClose();
    } catch {
      // The caller reports the error; keep the form open with what was typed.
    }
  });

  return (
    <Modal
      open={open}
      title={t('newGame.title')}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit" form="new-game-form" loading={isSubmitting} loadingText={t('newGame.saving')}>{t('newGame.submit')}</Button>
        </>
      }
    >
      <form id="new-game-form" className="grid gap-4" onSubmit={submit} noValidate>
        <p className="muted">{t('newGame.hint')}</p>
        <Input label={t('newGame.titleLabel')} maxLength={80} autoComplete="off" error={errors.title?.message} {...register('title')} />
        <Textarea label={t('newGame.description')} rows={3} maxLength={2000} optional error={errors.description?.message} {...register('description')} />
        <div className="new-game-numbers">
          <Input label={t('newGame.minPlayers')} type="number" inputMode="numeric" min={1} max={99} optional error={errors.minPlayers?.message} {...register('minPlayers')} />
          <Input label={t('newGame.maxPlayers')} type="number" inputMode="numeric" min={1} max={99} optional error={errors.maxPlayers?.message} {...register('maxPlayers')} />
          <Input label={t('newGame.duration')} type="number" inputMode="numeric" min={1} max={1440} optional error={errors.durationMinutes?.message} {...register('durationMinutes')} />
        </div>
        <fieldset className="new-game-categories">
          <legend>{t('newGame.categories')}</legend>
          <CategoryPicker value={categories} onChange={setCategories} suggestions={suggestions} />
        </fieldset>
      </form>
    </Modal>
  );
}
