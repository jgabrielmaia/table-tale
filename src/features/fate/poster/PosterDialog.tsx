import { useEffect, useRef, useState } from 'react';
import { Button, Icon, LoadingState, Modal, useToast } from '@/components/ui';
import { getFaction } from '../cards';
import { useI18n } from '@/i18n';
import { POSTER_FORMATS, POSTER_ORDER, type PosterFormat } from './formats';
import type { PosterInput } from './renderPoster';
import './poster.css';

interface Rendered {
  url: string;
  blob: Blob;
  canvas: HTMLCanvasElement;
  avatarDrawn: boolean;
}

interface PosterDialogProps {
  open: boolean;
  onClose: () => void;
  input: PosterInput;
}

/** Previews the personalised poster in every format and offers download, native share and copy. */
export function PosterDialog({ open, onClose, input }: PosterDialogProps) {
  const { t } = useI18n();
  const { notify } = useToast();
  const [format, setFormat] = useState<PosterFormat>('story');
  const [current, setCurrent] = useState<Rendered | null>(null);
  const [error, setError] = useState(false);
  const [note, setNote] = useState('');
  const cache = useRef(new Map<PosterFormat, Rendered>());

  useEffect(() => {
    const store = cache.current;
    return () => {
      store.forEach((r) => URL.revokeObjectURL(r.url));
      store.clear();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const hit = cache.current.get(format);
    if (hit) {
      setCurrent(hit);
      return;
    }
    let alive = true;
    setCurrent(null);
    setError(false);
    (async () => {
      try {
        const { renderPoster, canvasToBlob } = await import('./renderPoster');
        const { canvas, avatarDrawn } = await renderPoster(input, format);
        const blob = await canvasToBlob(canvas, 'image/jpeg', POSTER_FORMATS[format].quality);
        const rendered: Rendered = { url: URL.createObjectURL(blob), blob, canvas, avatarDrawn };
        if (!alive) {
          URL.revokeObjectURL(rendered.url);
          return;
        }
        cache.current.set(format, rendered);
        setCurrent(rendered);
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => {
      alive = false;
    };
    // The poster is built from the identity revealed in this session, which does not change while the dialog is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, format]);

  const fileName = `table-tale-${input.card.id}-${format}.jpg`;
  const canShareNative = typeof navigator.share === 'function';
  const canCopy = typeof ClipboardItem !== 'undefined' && Boolean(navigator.clipboard?.write);

  const download = () => {
    if (!current) return;
    const a = document.createElement('a');
    a.href = current.url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    notify(t('poster.downloaded'));
  };

  const share = async () => {
    if (!current) return;
    setNote('');
    const file = new File([current.blob], fileName, { type: 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: t('fate.shareTitle'),
          text: t('fate.shareText', { faction: getFaction(input.card.faction).name, card: input.card.title }),
        });
        notify(t('poster.shared'));
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) setNote(t('poster.noNativeShare'));
      }
      return;
    }
    setNote(t('poster.noNativeShare'));
  };

  const copy = async () => {
    if (!current) return;
    try {
      const { canvasToBlob } = await import('./renderPoster');
      const png = await canvasToBlob(current.canvas, 'image/png');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      notify(t('poster.copied'));
    } catch {
      setNote(t('poster.noNativeShare'));
    }
  };

  const spec = POSTER_FORMATS[format];

  return (
    <Modal open={open} title={t('poster.title')} onClose={onClose} size="lg">
      <div className="poster-dialog">
        <div className="poster-formats" role="group" aria-label={t('poster.formatLabel')}>
          {POSTER_ORDER.map((f) => (
            <button key={f} type="button" aria-pressed={format === f} onClick={() => setFormat(f)}>
              {t(POSTER_FORMATS[f].labelKey)}
              <small>{POSTER_FORMATS[f].width}×{POSTER_FORMATS[f].height}</small>
            </button>
          ))}
        </div>

        <div className="poster-stage" style={{ aspectRatio: `${spec.width} / ${spec.height}` }}>
          {error ? (
            <p className="field-error" role="alert">{t('poster.error')}</p>
          ) : current ? (
            <img
              className="poster-preview"
              src={current.url}
              width={spec.width}
              height={spec.height}
              alt={t('poster.alt', { card: input.card.title, faction: getFaction(input.card.faction).name })}
            />
          ) : (
            <LoadingState label={t('poster.generating')} />
          )}
        </div>

        {current && !current.avatarDrawn && <p className="muted small" role="note">{t('poster.avatarFallback')}</p>}
        {note && <p className="muted small" role="status">{note}</p>}

        <div className="poster-actions">
          <Button variant="primary" onClick={download} disabled={!current} icon={<Icon name="check" />}>{t('poster.download')}</Button>
          {canShareNative && <Button variant="gold" onClick={() => void share()} disabled={!current}>{t('poster.share')}</Button>}
          {canCopy && <Button variant="secondary" onClick={() => void copy()} disabled={!current}>{t('poster.copy')}</Button>}
        </div>
        {!canShareNative && <p className="muted small">{t('poster.noNativeShare')}</p>}
      </div>
    </Modal>
  );
}
