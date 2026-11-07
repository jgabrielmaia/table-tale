import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { useI18n } from '@/i18n';
import { communitySchema, type CommunityFormValues } from './schemas';

export const EMPTY_COMMUNITY_FORM: CommunityFormValues = {
  name: '',
  description: '',
  visibility: 'public',
  city: '',
  district: '',
  country: '',
  latitude: '',
  longitude: '',
};

export interface CommunityFormProps {
  defaultValues?: CommunityFormValues;
  submitLabel: string;
  saving: boolean;
  onSubmit: (values: CommunityFormValues) => Promise<void> | void;
}

/** Shared by "new community" and "edit community". Location (city, district, country) is required. */
export function CommunityForm({ defaultValues = EMPTY_COMMUNITY_FORM, submitLabel, saving, onSubmit }: CommunityFormProps) {
  const { t } = useI18n();
  const { register, handleSubmit, formState: { errors } } = useForm<CommunityFormValues>({
    resolver: zodResolver(communitySchema),
    defaultValues,
  });

  return (
    <form className="form-stack" onSubmit={handleSubmit((v) => onSubmit(v))} noValidate>
      <Input label={t('communities.name')} error={errors.name?.message} {...register('name')} />
      <Textarea label={t('communities.description')} optional rows={3} error={errors.description?.message} {...register('description')} />
      <Select
        label={t('communities.visibility')}
        options={[
          { value: 'public', label: t('communities.public') },
          { value: 'private', label: t('communities.private') },
        ]}
        {...register('visibility')}
      />
      <fieldset className="form-grid" aria-label={t('communities.location')}>
        <Input label={t('communities.city')} error={errors.city?.message} {...register('city')} />
        <Input label={t('communities.district')} error={errors.district?.message} {...register('district')} />
        <Input label={t('communities.country')} error={errors.country?.message} {...register('country')} />
      </fieldset>
      <div className="form-grid">
        <Input label={t('communities.latitude')} optional inputMode="decimal" error={errors.latitude?.message} {...register('latitude')} />
        <Input label={t('communities.longitude')} optional inputMode="decimal" hint={t('communities.coordsHint')} error={errors.longitude?.message} {...register('longitude')} />
      </div>
      <div className="form-actions">
        <Button type="submit" variant="gold" loading={saving}>{submitLabel}</Button>
      </div>
    </form>
  );
}
