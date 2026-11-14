import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Button, Icon } from '@/components/ui';
import { useI18n } from '@/i18n';
import { COVER_MIN_WIDTH, COVER_RECOMMENDED, COVER_TYPES } from './cover';

export interface CommunityHeroProps {
  name: string;
  coverUrl: string | null;
  /** Vertical object-position of the cover, in percent (0 = top, 100 = bottom). */
  position: number;
  canEdit: boolean;
  saving: boolean;
  uploading: boolean;
  /** Uploads a new cover photo; rejects (after reporting the error) when it fails. */
  onUpload: (file: File) => Promise<void>;
  onSavePosition: (position: number) => Promise<void>;
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/**
 * The cover at the top of a community page. Owners and admins change it from here: "Edit cover" opens the file picker
 * and, once the new photo is up, they can reposition it — drag it up or down (or use the arrow keys), then save.
 */
export function CommunityHero({ name, coverUrl, position, canEdit, saving, uploading, onUpload, onSavePosition }: CommunityHeroProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<number | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ pointerId: number; startY: number; startPos: number; overflow: number } | null>(null);
  const repositioning = draft !== null;
  const shown = draft ?? position;

  // Focus the photo when repositioning starts, so the arrow keys work straight away.
  useEffect(() => { if (repositioning) frameRef.current?.focus(); }, [repositioning]);

  // How many pixels of the photo are cropped vertically: dragging by that much moves it from 0% to 100%.
  const overflow = () => {
    const frame = frameRef.current;
    const img = imgRef.current;
    if (!frame || !img?.naturalWidth) return 0;
    const renderedHeight = (frame.clientWidth * img.naturalHeight) / img.naturalWidth;
    return Math.max(0, renderedHeight - frame.clientHeight);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!repositioning || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { pointerId: e.pointerId, startY: e.clientY, startPos: shown, overflow: overflow() };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId || d.overflow === 0) return;
    // Dragging the photo down reveals its top, so the position goes towards 0.
    setDraft(clamp(d.startPos - ((e.clientY - d.startY) / d.overflow) * 100));
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === e.pointerId) drag.current = null;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!repositioning) return;
    const step = { ArrowUp: -5, ArrowDown: 5, PageUp: -20, PageDown: 20 }[e.key];
    if (step !== undefined) setDraft(clamp(shown + step));
    else if (e.key === 'Home') setDraft(0);
    else if (e.key === 'End') setDraft(100);
    else if (e.key === 'Escape') setDraft(null);
    else return;
    e.preventDefault();
  };

  const onFile = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    try {
      await onUpload(file);
      setDraft(50); // A new photo starts centred: offer to reposition it straight away.
    } catch {
      // The caller reports the error.
    }
  };

  const save = async () => {
    if (draft === null) return;
    try {
      await onSavePosition(Math.round(draft));
      setDraft(null);
    } catch {
      // The caller reports the error; stay in reposition mode so nothing is lost.
    }
  };

  return (
    <div className="community-hero-block">
    <div className={repositioning ? 'community-cover community-cover--banner community-hero is-repositioning' : 'community-cover community-cover--banner community-hero'}>
      <div
        ref={frameRef}
        className="community-hero__frame"
        {...(repositioning
          ? {
              role: 'slider',
              tabIndex: 0,
              'aria-label': t('communities.cover.positionLabel'),
              'aria-valuemin': 0,
              'aria-valuemax': 100,
              'aria-valuenow': Math.round(shown),
              'aria-valuetext': `${Math.round(shown)}%`,
              'aria-describedby': 'community-hero-hint',
            }
          : {})}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        {coverUrl ? (
          <img ref={imgRef} src={coverUrl} alt={t('communities.cover.alt', { name })} draggable={false} onLoad={(e) => setSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })} style={{ objectPosition: `50% ${shown}%` }} />
        ) : (
          <div className="community-hero__fallback" aria-hidden="true" />
        )}
      </div>
      {!repositioning && <div className="community-hero__veil" aria-hidden="true" />}
      {canEdit && (
        <div className="community-hero__actions">
          {repositioning ? (
            <>
              <p id="community-hero-hint" className="community-hero__hint">{t('communities.cover.repositionHint')}</p>
              <Button size="sm" variant="secondary" disabled={saving} onClick={() => setDraft(null)}>{t('common.cancel')}</Button>
              <Button size="sm" variant="gold" loading={saving} onClick={() => void save()}>{t('communities.cover.savePosition')}</Button>
            </>
          ) : (
            <>
              {coverUrl && !uploading && (
                <Button size="sm" variant="secondary" icon={<Icon name="move" />} onClick={() => setDraft(position)}>{t('communities.cover.reposition')}</Button>
              )}
              <input
                ref={fileRef}
                type="file"
                hidden
                accept={Object.keys(COVER_TYPES).join(',')}
                aria-label={t('communities.cover.edit')}
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
              <Button size="sm" variant="secondary" icon={<Icon name="edit" />} loading={uploading} loadingText={t('communities.cover.uploading')} onClick={() => fileRef.current?.click()}>
                {t('communities.cover.edit')}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
    {repositioning && (
      <p className="container community-hero__specs" role="note">
        {coverUrl && size && <>{t('communities.cover.current', { width: size.width, height: size.height })} </>}
        {t('communities.cover.recommended', COVER_RECOMMENDED)}
        {size && size.width < COVER_MIN_WIDTH && <strong className="community-hero__warn"> {t('communities.cover.tooSmall')}</strong>}
      </p>
    )}
    </div>
  );
}
