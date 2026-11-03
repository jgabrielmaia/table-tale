import { ButtonLink, EmptyState } from '@/components/ui';
import { useI18n } from '@/i18n';

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="container section">
      <h1 className="sr-only">{t('notFound.srTitle')}</h1>
      <EmptyState
        headingLevel={2}
        title={t('notFound.title')}
        description={t('notFound.text')}
        action={<ButtonLink to="/library" variant="primary">{t('common.backToLibrary')}</ButtonLink>}
      />
    </div>
  );
}
