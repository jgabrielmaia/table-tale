import { Button, ButtonLink, EmptyState, ErrorState, Icon, LoadingState, useToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import { localizeEvent, useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';

export function EventsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { events: rawEvents, query, toggle } = useEvents();
  const events = rawEvents.map(localizeEvent);
  const { notify } = useToast();
  const now = Date.now();

  return (
    <div className="container section">
      <div className="section-head">
        <div>
          <p className="eyebrow">{t('events.eyebrow')}</p>
          <h1>{t('events.title')}</h1>
        </div>
        <p className="results-count">{t('events.subtitle')}</p>
      </div>

      {query.isLoading ? (
        <LoadingState label={t('events.loading')} />
      ) : query.isError ? (
        <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : !events.length ? (
        <EmptyState symbol="shield" title={t('events.emptyTitle')} description={t('events.emptyText')} />
      ) : (
        <ul className="event-list panel" role="list">
          {events.map((e) => {
            const future = new Date(e.eventDate).getTime() > now;
            const date = new Date(e.eventDate);
            const pending = toggle.isPending && toggle.variables?.eventId === e.id;
            return (
              <li key={e.id} className={`event${e.isParticipating ? ' attended' : ''}`}>
                <div className="event-date" aria-hidden="true">
                  <span>{date.getDate()}</span>
                  <small>{formatDate(e.eventDate, { month: 'short' }).replace('.', '')}</small>
                </div>
                <div className="event-body">
                  <h2 className="text-base">{e.name}</h2>
                  <p className="event-meta">
                    <time dateTime={e.eventDate}>{formatDate(e.eventDate, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
                    <span className="event-place"><Icon name="pin" />{e.location}</span>
                  </p>
                  <p className="event-text">{e.description}</p>
                </div>
                {user ? (
                  <Button
                    size="sm"
                    variant={e.isParticipating ? 'secondary' : 'ghost'}
                    aria-pressed={e.isParticipating}
                    loading={pending}
                    icon={e.isParticipating ? <Icon name="check" /> : undefined}
                    onClick={() =>
                      toggle.mutate(
                        { eventId: e.id, participate: !e.isParticipating },
                        {
                          onSuccess: () => notify(e.isParticipating ? t('events.left') : t('events.joined'), { icon: e.isParticipating ? 'calendar' : 'check' }),
                          onError: (err) => notify(errorMessage(err), { tone: 'error' }),
                        },
                      )
                    }
                  >
                    {future ? (e.isParticipating ? t('events.registered') : t('events.willJoin')) : e.isParticipating ? t('events.attended') : t('events.markAttendance')}
                  </Button>
                ) : (
                  <ButtonLink size="sm" variant="ghost" to="/login" state={{ from: '/events' }}>{t('events.signInToJoin')}</ButtonLink>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
