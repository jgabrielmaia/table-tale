import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { GameCover } from '@/components/games/GameCover';
import { Button, Icon } from '@/components/ui';
import { t } from '@/i18n';
import { CategoryPicker } from './CategoryPicker';
import { findTitleMatch, GAME_COVER_TYPES } from './cover';
import type { EditableGame } from './NewGameModal';
import { newGameSchema, type NewGameInput, type NewGameValues } from './schemas';

type CatalogueGame = { id: string; title: string; slug: string };

export interface GameInlineEditProps {
  game: EditableGame;
  suggestions: string[];
  catalogue: CatalogueGame[];
  /** The read-only facts (owners, copies, condition), shown after the editable ones so the page keeps its shape. */
  extraFacts: ReactNode;
  /** Saves the game. cover: a new File, null to remove it, undefined to keep it. Reject to stay in edit mode. */
  onSave: (values: NewGameValues, categories: string[], cover: File | null | undefined) => Promise<void>;
  onClose: () => void;
}

const text = (n: number | null) => (n === null ? '' : String(n));
const fromGame = (g: EditableGame): NewGameInput => ({
  title: g.title, description: g.description, minPlayers: text(g.minPlayers), maxPlayers: text(g.maxPlayers),
  durationMinutes: text(g.durationMinutes), minAge: text(g.minAge),
});

/**
 * The game page itself, made editable: each fact is the field it shows as, the picture is replaced where it sits and
 * the Save / Cancel bar stays on screen. What you see is what the page will look like once saved.
 */
export function GameInlineEdit({ game, suggestions, catalogue, extraFacts, onSave, onClose }: GameInlineEditProps) {
  const [categories, setCategories] = useState(game.categories);
  const [cover, setCover] = useState<File | null | undefined>(undefined);
  const [coverError, setCoverError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const titleRef = useRef<HTMLInputElement | null>(null);
  const {
    register, handleSubmit, watch, formState: { errors, isSubmitting, isDirty },
  } = useForm<NewGameInput, unknown, NewGameValues>({ resolver: zodResolver(newGameSchema), defaultValues: fromGame(game) });

  const title = watch('title') ?? '';
  const match = findTitleMatch(title, catalogue, game.id);
  const dirty = isDirty || cover !== undefined || JSON.stringify(categories) !== JSON.stringify(game.categories);

  // Preview: the picked file, else the saved picture unless it is being removed.
  const previewUrl = useMemo(() => (cover ? URL.createObjectURL(cover) : null), [cover]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const shownCover = cover === undefined ? game.coverUrl : previewUrl;

  // Closing the tab with unsaved changes asks first, like Cancel does.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const cancel = () => {
    if (dirty && !window.confirm(t('inlineEdit.discard'))) return;
    onClose();
  };

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
      await onSave(values, categories, cover);
      onClose();
    } catch {
      // The caller reports the error; stay in edit mode with what was typed.
    }
  });

  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void submit(); }
  };

  const titleField = register('title');
  const num = (name: 'minPlayers' | 'maxPlayers' | 'durationMinutes' | 'minAge', label: string, min: number, max: number) => (
    <input
      className="edit-fact"
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      aria-label={label}
      aria-invalid={errors[name] ? true : undefined}
      placeholder="—"
      {...register(name)}
    />
  );
  const problems = [errors.title?.message, errors.description?.message, errors.minPlayers?.message, errors.maxPlayers?.message, errors.durationMinutes?.message, errors.minAge?.message, coverError].filter(Boolean) as string[];

  return (
    <form className="edit-form" onSubmit={submit} onKeyDown={onKeyDown} noValidate aria-label={t('newGame.editTitle')}>
      <article className="detail-grid is-editing" aria-labelledby="game-title">
        <figure className="detail-media">
          {shownCover ? <img src={shownCover} alt={t('newGame.coverPreview')} /> : <GameCover slug={game.slug} title={title || game.title} coverUrl={null} loading="eager" />}
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-label={t('newGame.cover')}
            accept={Object.keys(GAME_COVER_TYPES).join(',')}
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <figcaption className="edit-cover-actions">
            <Button size="sm" variant="secondary" icon={<Icon name="edit" />} onClick={() => fileRef.current?.click()}>
              {shownCover ? t('newGame.coverReplace') : t('newGame.coverAdd')}
            </Button>
            {shownCover && <Button size="sm" variant="ghost" icon={<Icon name="trash" />} onClick={removeCover}>{t('newGame.coverRemove')}</Button>}
          </figcaption>
          <p className="game-credit">{t('newGame.coverHint')}</p>
        </figure>

        <div className="detail-info">
          <fieldset className="edit-categories">
            <legend className="eyebrow">{t('newGame.categories')}</legend>
            <CategoryPicker value={categories} onChange={setCategories} suggestions={suggestions} />
          </fieldset>

          <h1 id="game-title" className="edit-h1">
            <input
              className="edit-title"
              maxLength={80}
              autoComplete="off"
              aria-label={t('newGame.titleLabel')}
              aria-invalid={errors.title || match ? true : undefined}
              aria-describedby={match ? errorId : undefined}
              {...titleField}
              ref={(el) => { titleField.ref(el); titleRef.current = el; }}
            />
          </h1>
          {match && (
            <p id={errorId} className="edit-note" role="status">
              {t('newGame.duplicate', { title: match.title })} <Link to={`/games/${match.slug}`}>{t('newGame.duplicateView')}</Link>
            </p>
          )}
          <textarea className="edit-lead lead" rows={4} maxLength={2000} aria-label={t('newGame.description')} placeholder={t('newGame.description')} {...register('description')} />

          <dl className="facts">
            <div>
              <dt>{t('game.players')}</dt>
              <dd className="edit-range">{num('minPlayers', t('newGame.minPlayers'), 1, 99)}<span aria-hidden="true">–</span>{num('maxPlayers', t('newGame.maxPlayers'), 1, 99)}</dd>
            </div>
            <div><dt>{t('game.avgDuration')}</dt><dd>{num('durationMinutes', t('newGame.duration'), 1, 1440)}<span className="muted">min</span></dd></div>
            <div><dt>{t('game.minAge')}</dt><dd>{num('minAge', t('newGame.minAge'), 0, 21)}<span className="muted">+</span></dd></div>
            {extraFacts}
          </dl>
          {problems.length > 0 && <ul className="edit-problems" role="alert">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
      </article>

      <div className="edit-bar" role="region" aria-label={t('inlineEdit.bar')}>
        <p className="edit-bar__status" role="status">{dirty ? t('inlineEdit.unsaved') : t('inlineEdit.editing')}</p>
        <Button variant="ghost" onClick={cancel}>{t('common.cancel')}</Button>
        <Button variant="primary" type="submit" loading={isSubmitting} loadingText={t('newGame.savingEdit')} disabled={Boolean(match)}>{t('newGame.save')}</Button>
      </div>
    </form>
  );
}
