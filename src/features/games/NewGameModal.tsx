import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, ButtonLink, Icon, Input, Modal, Textarea } from '@/components/ui';
import { GameCover } from '@/components/games/GameCover';
import { t } from '@/i18n';
import type { Game } from '@/types/domain';
import { CategoryPicker } from './CategoryPicker';
import { findTitleMatch, GAME_COVER_TYPES } from './cover';
import { newGameSchema, type NewGameInput, type NewGameValues } from './schemas';

type CatalogueGame = Pick<Game, 'id' | 'title' | 'slug'>;
export type EditableGame = Pick<Game, 'id' | 'title' | 'slug' | 'description' | 'coverUrl' | 'minPlayers' | 'maxPlayers' | 'durationMinutes' | 'minAge' | 'categories'>;

export interface NewGameModalProps {
  open: boolean;
  /** The game being edited; omitted when adding a new one. */
  game?: EditableGame;
  /** Categories of other games, offered while typing. */
  suggestions: string[];
  /** Catalogue games, to spot a title that already exists (add only). */
  catalogue?: CatalogueGame[];
  /** Games already where the player is adding (the shelf or their collection). */
  alreadyHere?: Set<string>;
  onClose: () => void;
  /**
   * Creates or saves the game. cover: a new File, null to remove the image, undefined to keep it.
   * Reject to keep the form open with what was typed (the caller reports the error).
   */
  onSubmit: (values: NewGameValues, categories: string[], cover: File | null | undefined) => Promise<void>;
  /** Add only: put the existing catalogue game here instead of adding a duplicate. */
  onAddExisting?: (gameId: string) => Promise<void>;
}

const EMPTY: NewGameInput = { title: '', description: '', minPlayers: '', maxPlayers: '', durationMinutes: '', minAge: '' };
const text = (n: number | null) => (n === null ? '' : String(n));
const fromGame = (g: EditableGame): NewGameInput => ({
  title: g.title, description: g.description, minPlayers: text(g.minPlayers), maxPlayers: text(g.maxPlayers),
  durationMinutes: text(g.durationMinutes), minAge: text(g.minAge),
});

/**
 * Add a game that is not in the catalogue yet, by hand (only the title is required; works without BoardGameGeek), or
 * edit one the player added.
 */
export function NewGameModal({ open, game, suggestions, catalogue = [], alreadyHere, onClose, onSubmit, onAddExisting }: NewGameModalProps) {
  const editing = Boolean(game);
  const [categories, setCategories] = useState<string[]>([]);
  const [cover, setCover] = useState<File | null | undefined>(undefined);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileId = useId();
  const {
    register, handleSubmit, reset, watch, formState: { errors, isSubmitting },
  } = useForm<NewGameInput, unknown, NewGameValues>({ resolver: zodResolver(newGameSchema), defaultValues: EMPTY });

  // A fresh form (or the saved game) every time it opens.
  useEffect(() => {
    if (!open) return;
    reset(game ? fromGame(game) : EMPTY);
    setCategories(game?.categories ?? []);
    setCover(undefined);
    setCoverError(null);
  }, [open, game, reset]);

  const title = watch('title') ?? '';
  const match = editing ? null : findTitleMatch(title, catalogue);
  const matchHere = Boolean(match && alreadyHere?.has(match.id));

  // Preview: the picked file, else the saved image unless it is being removed.
  const previewUrl = useMemo(() => (cover ? URL.createObjectURL(cover) : null), [cover]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const shownCover = cover === undefined ? game?.coverUrl ?? null : previewUrl;

  const onFile = (file: File | undefined) => {
    setCoverError(null);
    if (!file) return;
    if (!GAME_COVER_TYPES[file.type]) {
      setCoverError(t('edit.fileType'));
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setCover(file);
  };

  const removeCover = () => {
    setCover(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = handleSubmit(async (values) => {
    if (match) return;
    try {
      await onSubmit(values, categories, cover);
      onClose();
    } catch {
      // The caller reports the error; keep the form open with what was typed.
    }
  });

  const addExisting = async () => {
    if (!match || !onAddExisting) return;
    setAdding(true);
    try {
      await onAddExisting(match.id);
      onClose();
    } catch {
      // Reported by the caller.
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal
      open={open}
      title={editing ? t('newGame.editTitle') : t('newGame.title')}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant="primary"
            type="submit"
            form="new-game-form"
            loading={isSubmitting}
            loadingText={editing ? t('newGame.savingEdit') : t('newGame.saving')}
            disabled={Boolean(match)}
          >
            {editing ? t('newGame.save') : t('newGame.submit')}
          </Button>
        </>
      }
    >
      <form id="new-game-form" className="grid gap-4" onSubmit={submit} noValidate>
        {!editing && <p className="muted">{t('newGame.hint')}</p>}
        <Input label={t('newGame.titleLabel')} maxLength={80} autoComplete="off" error={errors.title?.message} {...register('title')} />
        {match && (
          <div className="new-game-match" role="status">
            <p>{matchHere ? t('newGame.duplicateHere', { title: match.title }) : t('newGame.duplicate', { title: match.title })}</p>
            <div className="new-game-match__actions">
              {!matchHere && onAddExisting && (
                <Button size="sm" variant="secondary" loading={adding} onClick={() => void addExisting()}>{t('newGame.duplicateAdd')}</Button>
              )}
              <ButtonLink size="sm" variant="ghost" to={`/games/${match.slug}`}>{t('newGame.duplicateView')}</ButtonLink>
            </div>
          </div>
        )}
        <Textarea label={t('newGame.description')} rows={3} maxLength={2000} optional error={errors.description?.message} {...register('description')} />
        <div className="new-game-numbers">
          <Input label={t('newGame.minPlayers')} type="number" inputMode="numeric" min={1} max={99} optional error={errors.minPlayers?.message} {...register('minPlayers')} />
          <Input label={t('newGame.maxPlayers')} type="number" inputMode="numeric" min={1} max={99} optional error={errors.maxPlayers?.message} {...register('maxPlayers')} />
          <Input label={t('newGame.duration')} type="number" inputMode="numeric" min={1} max={1440} optional error={errors.durationMinutes?.message} {...register('durationMinutes')} />
          <Input label={t('newGame.minAge')} type="number" inputMode="numeric" min={0} max={21} optional hint={t('newGame.minAgeHint')} error={errors.minAge?.message} {...register('minAge')} />
        </div>
        <fieldset className="new-game-categories">
          <legend>{t('newGame.categories')}</legend>
          <CategoryPicker value={categories} onChange={setCategories} suggestions={suggestions} />
        </fieldset>
        <fieldset className="new-game-categories">
          <legend>{t('newGame.cover')}</legend>
          <div className="new-game-cover">
            <div className="new-game-cover__preview">
              {shownCover ? (
                <img src={shownCover} alt={t('newGame.coverPreview')} />
              ) : (
                <GameCover slug={game?.slug ?? 'novo-jogo'} title={title || t('newGame.title')} coverUrl={null} />
              )}
            </div>
            <div className="field">
              <label htmlFor={fileId}>{shownCover ? t('newGame.coverReplace') : t('newGame.coverAdd')}</label>
              <input
                ref={fileRef}
                id={fileId}
                type="file"
                accept={Object.keys(GAME_COVER_TYPES).join(',')}
                aria-describedby={`${fileId}-hint${coverError ? ` ${fileId}-error` : ''}`}
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              <p className="field-hint" id={`${fileId}-hint`}>{t('newGame.coverHint')}</p>
              {coverError && <p id={`${fileId}-error`} className="field-error" role="alert">{coverError}</p>}
              {shownCover && (
                <Button variant="ghost" size="sm" icon={<Icon name="trash" />} onClick={removeCover}>{t('newGame.coverRemove')}</Button>
              )}
            </div>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
