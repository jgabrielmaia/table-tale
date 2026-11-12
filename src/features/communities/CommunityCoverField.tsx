import { useRef, useState } from 'react';
import { Button, Icon } from '@/components/ui';
import { useI18n } from '@/i18n';
import { COVER_MAX_BYTES, COVER_TYPES } from './cover';

export interface CommunityCoverFieldProps {
  name: string;
  coverUrl: string | null;
  uploading: boolean;
  removing: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}

/** Owners and admins pick the community's cover photo (Manage tab). The file is sent as soon as it is chosen. */
export function CommunityCoverField({ name, coverUrl, uploading, removing, onUpload, onRemove }: CommunityCoverFieldProps) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!COVER_TYPES[file.type]) return setError(t('edit.fileType'));
    if (file.size > COVER_MAX_BYTES) return setError(t('communities.cover.errSize'));
    try {
      await onUpload(file);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <section className="community-cover-field" aria-labelledby="community-cover-title">
      <h3 id="community-cover-title">{t('communities.cover.title')}</h3>
      <p className="muted">{t('communities.cover.hint')}</p>
      <div className="community-cover-field__row">
        <div className="community-cover community-cover--thumb">
          {coverUrl ? <img src={coverUrl} alt={t('communities.cover.alt', { name })} /> : <CoverFallback />}
        </div>
        <div className="field">
          <label htmlFor="community-cover-file">{coverUrl ? t('communities.cover.replace') : t('communities.cover.add')}</label>
          <input
            ref={fileRef}
            id="community-cover-file"
            type="file"
            accept={Object.keys(COVER_TYPES).join(',')}
            disabled={uploading || removing}
            aria-describedby={error ? 'community-cover-error' : undefined}
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          {uploading && <p className="muted" role="status">{t('communities.cover.uploading')}</p>}
          {error && <p id="community-cover-error" className="field-error" role="alert">{error}</p>}
          {coverUrl && (
            <Button variant="ghost" size="sm" icon={<Icon name="trash" />} loading={removing} disabled={uploading} onClick={() => void onRemove()}>
              {t('communities.cover.remove')}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

/** Shown when a community has no cover photo. Decorative. */
export function CoverFallback() {
  return (
    <span className="community-cover__fallback" aria-hidden="true">
      <Icon name="users" />
    </span>
  );
}
