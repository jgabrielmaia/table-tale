import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Avatar, Button, Input, Modal, Select, Textarea } from '@/components/ui';
import { AVATAR_MAX_BYTES } from './api';
import { profileSchema, type ProfileFormValues } from './schemas';
import type { Faction, Profile } from '@/types/domain';

export interface ProfileEditModalProps {
  open: boolean;
  profile: Profile;
  factions: Faction[];
  saving: boolean;
  /** Picture supplied by the sign-in provider, when available. */
  providerAvatar?: string | null;
  onClose: () => void;
  onSave: (values: ProfileFormValues & { avatarFile: File | null; avatarUrl?: string | null }) => Promise<void>;
}

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];

export function ProfileEditModal({ open, profile, factions, saving, providerAvatar, onClose, onSave }: ProfileEditModalProps) {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [useProvider, setUseProvider] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset({ displayName: profile.displayName, bio: profile.bio ?? '', factionId: profile.factionId });
    setAvatarFile(null);
    setUseProvider(false);
    setPreview(null);
    setFileError(null);
  }, [open, profile, reset]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const onFile = (file: File | undefined) => {
    setFileError(null);
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return setFileError('Usa uma imagem PNG, JPEG ou WebP.');
    if (file.size > AVATAR_MAX_BYTES) return setFileError('A imagem não pode exceder 1 MB.');
    setAvatarFile(file);
    setUseProvider(false);
    setPreview(URL.createObjectURL(file));
  };

  const submit = handleSubmit(async (values) => {
    try {
      await onSave({ ...values, factionId: values.factionId || null, avatarFile, ...(useProvider && providerAvatar ? { avatarUrl: providerAvatar } : {}) });
      onClose();
    } catch {
      // Error already surfaced by the caller; keep the modal open with the user's input.
    }
  });

  return (
    <Modal
      open={open}
      title="Editar perfil"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" form="profile-form" loading={saving} loadingText="A guardar…">Guardar alterações</Button>
        </>
      }
    >
      <form id="profile-form" className="grid gap-4" onSubmit={submit} noValidate>
        <div className="flex items-center gap-4">
          <Avatar name={profile.displayName || 'Jogador'} src={preview ?? (useProvider ? providerAvatar : null) ?? profile.avatarUrl} size="sm" className="!h-16 !w-16 !text-xl" />
          <div className="field">
            <label htmlFor="avatar-file">Avatar <span className="optional">(PNG, JPEG ou WebP, até 1 MB)</span></label>
            <input
              ref={fileRef}
              id="avatar-file"
              type="file"
              accept={ACCEPTED.join(',')}
              aria-describedby={fileError ? 'avatar-error' : undefined}
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            {fileError && <p id="avatar-error" className="field-error" role="alert">{fileError}</p>}
            {providerAvatar && providerAvatar !== profile.avatarUrl && !avatarFile && !useProvider && (
              <Button variant="ghost" size="sm" onClick={() => setUseProvider(true)}>Usar a foto da minha conta</Button>
            )}
          </div>
        </div>
        <Input label="Nome" autoComplete="name" maxLength={60} error={errors.displayName?.message} {...register('displayName')} />
        <Select
          label="Facção"
          hint="Nenhuma facção é superior à outra: escolhe a filosofia que mais te representa."
          options={[{ value: '', label: 'Sem facção' }, ...factions.map((f) => ({ value: f.id, label: `${f.name} — ${f.lore.latin}` }))]}
          {...register('factionId', { setValueAs: (v: string) => v || null })}
        />
        <Textarea label="Sobre ti" rows={3} maxLength={280} optional error={errors.bio?.message} {...register('bio')} />
      </form>
    </Modal>
  );
}
