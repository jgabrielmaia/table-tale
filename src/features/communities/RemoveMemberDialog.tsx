import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, Input, Modal } from '@/components/ui';
import { useI18n } from '@/i18n';
import { nameMatches } from './removeMember';

interface Props {
  /** The member about to be removed, or null while the dialog is closed. */
  member: { displayName: string } | null;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Removing a member is easy to regret, so the owner types the player's name to confirm. */
export function RemoveMemberDialog({ member, busy, onConfirm, onClose }: Props) {
  const { t } = useI18n();
  const [typed, setTyped] = useState('');
  const name = member?.displayName ?? '';
  const field = useRef<HTMLInputElement>(null);
  // Modal opens the <dialog> in its own effect, which runs first; focus after that so the field gets it (autoFocus is lost on a closed dialog).
  useEffect(() => {
    setTyped('');
    if (member) field.current?.focus();
  }, [member]);
  const ok = nameMatches(typed, name);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (ok && !busy) onConfirm();
  };

  return (
    <Modal
      open={member !== null}
      title={t('communities.removeDialog.title', { name })}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" disabled={!ok} loading={busy} onClick={onConfirm}>{t('communities.remove')}</Button>
        </>
      }
    >
      <form onSubmit={submit}>
        <p>{t('communities.removeDialog.body', { name })}</p>
        <Input
          label={t('communities.removeDialog.label', { name })}
          ref={field}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </form>
    </Modal>
  );
}
