import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { useI18n } from '@/i18n';
import { CityField } from './CityField';
import { toLocationFields } from './cityLookup';
import { communitySchema, type CommunityFormValues } from './schemas';

export const EMPTY_COMMUNITY_FORM: CommunityFormValues = {
  name: '',
  description: '',
  visibility: 'public',
  shelfVisibility: 'public',
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
  const { t, locale } = useI18n();
  const { register, handleSubmit, setValue, setFocus, watch, formState: { errors } } = useForm<CommunityFormValues>({
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
      <Select
        label={t('communities.shelfVisibility')}
        hint={watch('visibility') === 'private' ? t('communities.shelfPrivateCommunity') : t('communities.shelfVisibilityHint')}
        options={[
          { value: 'public', label: t('communities.shelfPublic') },
          { value: 'private', label: t('communities.shelfMembers') },
        ]}
        {...register('shelfVisibility')}
      />
      <fieldset className="form-grid" aria-label={t('communities.location')}>
        <CityField
          registration={register('city')}
          error={errors.city?.message}
          onPick={(hit) => {
            // City, country and coordinates come from the pick; district is not in the API, so the user fills it next.
            const fields = toLocationFields(hit, locale);
            (Object.keys(fields) as (keyof typeof fields)[]).forEach((k) => setValue(k, fields[k], { shouldDirty: true, shouldValidate: true }));
            setFocus('district');
          }}
        />
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
