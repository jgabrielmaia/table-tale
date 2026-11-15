import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Avatar, Button, Input, Modal, Textarea } from '@/components/ui';
import { t } from '@/i18n';
import { shrinkErrorMessage, shrinkImage } from '@/lib/image';
import { AVATAR_TARGET } from './api';
import { profileSchema, type ProfileFormValues } from './schemas';
import type { Profile } from '@/types/domain';

export interface ProfileEditModalProps {
  open: boolean;
  profile: Profile;
  saving: boolean;
  /** Picture supplied by the sign-in provider, when available. */
  providerAvatar?: string | null;
  onClose: () => void;
  onSave: (values: ProfileFormValues & { avatarFile: File | null; avatarUrl?: string | null }) => Promise<void>;
}

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];

export function ProfileEditModal({ open, profile, saving, providerAvatar, onClose, onSave }: ProfileEditModalProps) {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [useProvider, setUseProvider] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset({ displayName: profile.displayName, bio: profile.bio ?? '' });
    setAvatarFile(null);
    setUseProvider(false);
    setPreview(null);
    setFileError(null);
  }, [open, profile, reset]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  /** Any size of photo is accepted: it is shrunk in the browser to fit AVATAR_TARGET, and the preview shows the result. */
  const onFile = async (file: File | undefined) => {
    setFileError(null);
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return setFileError(t('edit.fileType'));
    setPreparing(true);
    try {
      const photo = await shrinkImage(file, AVATAR_TARGET);
      setAvatarFile(photo);
      setUseProvider(false);
      setPreview(URL.createObjectURL(photo));
    } catch (e) {
      setFileError(shrinkErrorMessage(e));
    } finally {
      setPreparing(false);
    }
  };

  const submit = handleSubmit(async (values) => {
    try {
      await onSave({ ...values, avatarFile, ...(useProvider && providerAvatar ? { avatarUrl: providerAvatar } : {}) });
      onClose();
    } catch {
      // Error already surfaced by the caller; keep the modal open with the user's input.
    }
  });

  return (
    <Modal
      open={open}
      title={t('edit.title')}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit" form="profile-form" loading={saving} loadingText={t('edit.saving')} disabled={preparing}>{t('edit.save')}</Button>
        </>
      }
    >
      <form id="profile-form" className="grid gap-4" onSubmit={submit} noValidate>
        <div className="flex items-center gap-4">
          <Avatar name={profile.displayName || t('common.player')} src={preview ?? (useProvider ? providerAvatar : null) ?? profile.avatarUrl} size="sm" className="!h-16 !w-16 !text-xl" />
          <div className="field">
            <label htmlFor="avatar-file">{t('edit.avatar')} <span className="optional">{t('edit.avatarHint')}</span></label>
            <input
              ref={fileRef}
              id="avatar-file"
              type="file"
              accept={ACCEPTED.join(',')}
              disabled={preparing}
              aria-describedby={fileError ? 'avatar-error' : undefined}
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            {preparing && <p className="muted" role="status">{t('image.preparing')}</p>}
            {fileError && <p id="avatar-error" className="field-error" role="alert">{fileError}</p>}
            {providerAvatar && providerAvatar !== profile.avatarUrl && !avatarFile && !useProvider && (
              <Button variant="ghost" size="sm" onClick={() => setUseProvider(true)}>{t('edit.useProvider')}</Button>
            )}
          </div>
        </div>
        <Input label={t('edit.name')} autoComplete="name" maxLength={60} error={errors.displayName?.message} {...register('displayName')} />
        <Textarea label={t('edit.bio')} rows={3} maxLength={280} optional error={errors.bio?.message} {...register('bio')} />
      </form>
    </Modal>
  );
}
