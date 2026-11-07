import { useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BggCredit } from '@/components/bgg/BggCredit';
import { BggFacts } from '@/components/bgg/BggFacts';
import { Button, EmptyState, ErrorState, Icon, Input, LoadingState, Select, useToast } from '@/components/ui';
import { canManageLibrary } from '@/features/communities/permissions';
import { useMyCommunities } from '@/hooks/useCommunities';
import { useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { minutesText, playersText } from '@/lib/format';
import type { BggThing } from '@/types/bgg';
import { useBggImport, useBggPreview, useBggSearch, type ImportTarget } from './hooks';

const PERSONAL = 'personal';

/** Search BoardGameGeek, look at the full data, then import the game and add it to a library the user can manage. */
export function BggImportPage() {
  const { t } = useI18n();
  const { notify } = useToast();
  const [params] = useSearchParams();
  const mine = useMyCommunities();
  const importer = useBggImport();

  const managed = useMemo(() => mine.list.filter((m) => canManageLibrary(m.membership)).map((m) => m.community), [mine.list]);
  const preselected = managed.find((c) => c.slug === params.get('community'))?.id;
  const [chosen, setChosen] = useState<string | null>(null);
  const targetValue = chosen ?? preselected ?? PERSONAL;
  const target: ImportTarget = targetValue === PERSONAL ? { kind: 'personal' } : { kind: 'community', id: targetValue };
  const targetLabel = targetValue === PERSONAL ? t('bgg.targetPersonal') : (managed.find((c) => c.id === targetValue)?.name ?? '');

  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const search = useBggSearch(query);
  const preview = useBggPreview(selected);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSelected(null);
    setQuery(draft.trim());
  };

  const add = (bggId: number) =>
    importer.mutate(
      { bggId, target },
      {
        onSuccess: ({ title, outcome }) =>
          notify(t(outcome === 'added' ? 'bgg.added' : 'bgg.already', { title, target: targetLabel }), { icon: 'check' }),
        onError: (e) => notify(errorMessage(e), { tone: 'error' }),
      },
    );
  const busyId = importer.isPending ? importer.variables?.bggId : null;

  return (
    <div className="container section">
      <div className="section-head">
        <div>
          <p className="eyebrow">{t('library.eyebrow')}</p>
          <h1>{t('bgg.title')}</h1>
        </div>
        <BggCredit />
      </div>
      <p className="lead">{t('bgg.lead')}</p>

      <div className="bgg-controls">
        <Select
          label={t('bgg.target')}
          value={targetValue}
          onChange={(e) => setChosen(e.target.value)}
          options={[{ value: PERSONAL, label: t('bgg.targetPersonal') }, ...managed.map((c) => ({ value: c.id, label: c.name }))]}
          hint={managed.length ? undefined : t('bgg.targetHint')}
        />
        <form className="bgg-search" role="search" aria-label={t('bgg.searchAria')} onSubmit={submit}>
          <Input
            label={t('bgg.searchLabel')}
            type="search"
            autoComplete="off"
            placeholder={t('bgg.searchPlaceholder')}
            value={draft}
            minLength={2}
            maxLength={100}
            onChange={(e) => setDraft(e.target.value)}
            leadingIcon={<Icon name="search" />}
          />
          <Button type="submit" variant="gold" disabled={draft.trim().length < 2} loading={search.isFetching}>{t('bgg.searchButton')}</Button>
        </form>
      </div>

      <div className="bgg-layout">
        <section aria-labelledby="bgg-results">
          <h2 id="bgg-results">{t('bgg.results')}</h2>
          {!query ? (
            <p className="muted">{t('bgg.startHint')}</p>
          ) : search.isLoading ? (
            <LoadingState variant="lines" count={4} label={t('bgg.searching')} />
          ) : search.isError ? (
            <ErrorState compact message={errorMessage(search.error)} onRetry={() => void search.refetch()} />
          ) : !search.data?.length ? (
            <EmptyState compact title={t('bgg.noResults', { query })} />
          ) : (
            <ul className="bgg-results" role="list">
              {search.data.map((hit) => (
                <li key={hit.id} className="panel bgg-result">
                  <div>
                    <h3>{hit.name}</h3>
                    <p className="muted">{hit.yearPublished ? hit.yearPublished : t('bgg.noYear')}</p>
                  </div>
                  <div className="bgg-result-actions">
                    <Button size="sm" variant="ghost" aria-pressed={selected === hit.id} aria-label={t('bgg.viewData', { title: hit.name })} onClick={() => setSelected(hit.id)}>
                      {t('bgg.view')}
                    </Button>
                    {hit.gameSlug && <Link className="btn btn-ghost btn-sm" to={`/games/${hit.gameSlug}`}>{t('bgg.inCatalogue')}</Link>}
                    <Button size="sm" variant="primary" aria-label={t('bgg.importLabel', { title: hit.name, target: targetLabel })} loading={busyId === hit.id} disabled={importer.isPending} onClick={() => add(hit.id)}>
                      {t('bgg.import')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bgg-preview" aria-labelledby="bgg-preview" aria-live="polite">
          <h2 id="bgg-preview">{t('bgg.preview')}</h2>
          {selected === null ? (
            <p className="muted">{t('bgg.previewHint')}</p>
          ) : preview.isLoading ? (
            <LoadingState variant="lines" count={5} label={t('bgg.loadingData')} />
          ) : preview.isError ? (
            <ErrorState compact message={errorMessage(preview.error)} onRetry={() => void preview.refetch()} />
          ) : preview.data ? (
            <Preview thing={preview.data.thing} onImport={() => add(preview.data.thing.id)} busy={busyId === preview.data.thing.id} disabled={importer.isPending} targetLabel={targetLabel} />
          ) : null}
        </section>
      </div>
    </div>
  );
}

function Preview({ thing, onImport, busy, disabled, targetLabel }: { thing: BggThing; onImport: () => void; busy: boolean; disabled: boolean; targetLabel: string }) {
  const { t } = useI18n();
  const players = thing.minPlayers || thing.maxPlayers ? playersText(thing.minPlayers || null, thing.maxPlayers || null) : '—';
  return (
    <article className="panel">
      <h3>{thing.name}</h3>
      <p className="muted">
        {[thing.yearPublished || null, players, minutesText(thing.playingTime || null)].filter((v) => v !== null).join(' · ')}
      </p>
      {thing.description && <p className="bgg-description">{thing.description}</p>}
      <BggFacts thing={thing} />
      <Button variant="primary" className="mt-4" loading={busy} disabled={disabled} onClick={onImport}>
        {t('bgg.importTo', { target: targetLabel })}
      </Button>
    </article>
  );
}
