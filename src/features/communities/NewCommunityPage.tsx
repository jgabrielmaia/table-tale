import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui';
import { useCreateCommunity } from '@/hooks/useCommunities';
import { useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { CommunityForm } from './CommunityForm';

export function NewCommunityPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { notify } = useToast();
  const create = useCreateCommunity();

  return (
    <div className="container section narrow">
      <p className="eyebrow">{t('communities.eyebrow')}</p>
      <h1>{t('communities.newTitle')}</h1>
      <p className="muted">{t('communities.newDesc')}</p>
      <CommunityForm
        submitLabel={t('communities.createSubmit')}
        saving={create.isPending}
        onSubmit={async (values) => {
          try {
            const community = await create.mutateAsync(values);
            notify(t('communities.created'));
            navigate(`/communities/${community.slug}`);
          } catch (e) {
            notify(errorMessage(e), { tone: 'error' });
          }
        }}
      />
    </div>
  );
}
