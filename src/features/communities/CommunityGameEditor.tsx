import { useEffect, useState } from 'react';
import { Button, Icon, Modal, Textarea } from '@/components/ui';
import { useI18n } from '@/i18n';
import type { CommunityGameEntry, CommunityMember } from '@/types/domain';

const NOTES_MAX = 500;
/** Select value for a copy that belongs to the community rather than a member. */
const COMMUNITY = '';

export interface CommunityGameEditorProps {
  entry: CommunityGameEntry | null;
  /** Active members who can own a copy. */
  members: CommunityMember[];
  busy: boolean;
  onClose: () => void;
  onAddCopy: (ownerId: string | null) => Promise<void>;
  onSetOwner: (copyId: string, ownerId: string | null) => Promise<void>;
  onRemoveCopy: (copyId: string) => Promise<void>;
  onSaveNotes: (notes: string) => Promise<void>;
}

/**
 * Shelf managers edit a game on their community's shelf: one row per copy with its owner, and the additional info.
 * The game itself (title, cover, details) is the shared catalogue entry and is not edited here.
 */
export function CommunityGameEditor({ entry, members, busy, onClose, onAddCopy, onSetOwner, onRemoveCopy, onSaveNotes }: CommunityGameEditorProps) {
  const { t } = useI18n();
  const [notes, setNotes] = useState('');
  const entryId = entry?.id;
  const savedNotes = entry?.notes ?? '';

  useEffect(() => setNotes(savedNotes), [entryId, savedNotes]);

  if (!entry) return null;
  const copies = entry.copyList;
  const ownerOptions = [
    { value: COMMUNITY, label: t('communities.gameEditor.communityOwned') },
    ...members.map((m) => ({ value: m.userId, label: m.displayName })),
  ];
  // A copy may belong to someone who has since left: keep them selectable so the row still shows its owner.
  const optionsFor = (ownerId: string | null, ownerName: string | null) =>
    ownerId && !ownerOptions.some((o) => o.value === ownerId) ? [...ownerOptions, { value: ownerId, label: ownerName ?? ownerId }] : ownerOptions;
  const toOwner = (value: string) => (value === COMMUNITY ? null : value);
  const notesChanged = notes.trim() !== savedNotes.trim();

  return (
    <Modal
      open
      size="lg"
      title={t('communities.gameEditor.title', { title: entry.game.title })}
      onClose={onClose}
      footer={<Button variant="secondary" onClick={onClose}>{t('communities.gameEditor.done')}</Button>}
    >
      <p className="muted">{t('communities.gameEditor.hint')}</p>

      <section className="shelf-copies" aria-labelledby="shelf-copies-title">
        <h3 id="shelf-copies-title">{t('communities.gameEditor.copies')}</h3>
        <ol className="shelf-copies-list">
          {copies.map((copy, i) => {
            const n = i + 1;
            return (
              <li key={copy.id} className="shelf-copy">
                <span className="shelf-copy-n" aria-hidden="true">{t('communities.gameEditor.copyN', { n })}</span>
                <select
                  aria-label={t('communities.gameEditor.ownerOf', { n })}
                  value={copy.ownerId ?? COMMUNITY}
                  disabled={busy}
                  onChange={(e) => void onSetOwner(copy.id, toOwner(e.target.value))}
                >
                  {optionsFor(copy.ownerId, copy.ownerName).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={t('communities.gameEditor.removeCopy', { n })}
                  disabled={busy || copies.length <= 1}
                  onClick={() => void onRemoveCopy(copy.id)}
                >
                  <Icon name="trash" />
                </button>
              </li>
            );
          })}
        </ol>
        {copies.length <= 1 && <p className="field-hint">{t('communities.gameEditor.lastCopy')}</p>}
        <Button variant="ghost" size="sm" icon={<Icon name="plus" />} disabled={busy} onClick={() => void onAddCopy(null)}>
          {t('communities.gameEditor.addCopy')}
        </Button>
      </section>

      <form
        className="shelf-notes"
        onSubmit={(e) => {
          e.preventDefault();
          if (notesChanged) void onSaveNotes(notes);
        }}
      >
        <Textarea
          label={t('communities.gameEditor.notes')}
          hint={t('communities.gameEditor.notesHint')}
          optional
          rows={3}
          maxLength={NOTES_MAX}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button type="submit" variant="gold" size="sm" disabled={busy || !notesChanged}>{t('communities.gameEditor.saveNotes')}</Button>
      </form>
    </Modal>
  );
}
