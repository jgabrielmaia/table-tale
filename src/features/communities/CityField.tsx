import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Field, Icon } from '@/components/ui';
import { useI18n } from '@/i18n';
import { isSupabaseConfigured } from '@/lib/supabase';
import { cleanCityQuery, describeHit, searchCities, type CityHit } from './cityLookup';

const DEBOUNCE_MS = 350;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

interface CityFieldProps {
  /** `register('city')` of the form: the text box stays a normal, freely editable field. */
  registration: UseFormRegisterReturn;
  error?: string;
  onPick: (hit: CityHit) => void;
}

/**
 * City input with suggestions (ARIA combobox). Typing is always allowed; after a short pause the text is looked up
 * and the matches appear in a list that works with pointer, touch and keyboard (arrows, Enter, Escape).
 * When the lookup is not available the field keeps working as a plain text input and says so in a short note.
 */
export function CityField({ registration, error, onPick }: CityFieldProps) {
  const { t, locale } = useI18n();
  const id = useId();
  const listId = `${id}-list`;
  const statusId = `${id}-status`;
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const wanted = cleanCityQuery(text);
  const query = useDebounced(wanted, DEBOUNCE_MS);
  const lookup = useQuery({
    queryKey: ['city-search', query],
    queryFn: ({ signal }) => searchCities(query!, signal),
    enabled: isSupabaseConfigured && Boolean(query),
    staleTime: 60 * 60_000,
    retry: false,
  });

  const showing = open && Boolean(wanted) && wanted === query;
  const hits = showing && lookup.data ? lookup.data : [];
  const listOpen = hits.length > 0;
  const searching = open && Boolean(wanted) && (wanted !== query || lookup.isFetching);
  const failed = open && Boolean(wanted) && wanted === query && lookup.isError;
  const empty = showing && lookup.isSuccess && hits.length === 0;
  const status = searching ? t('communities.citySearch.searching') : failed ? `${lookup.error?.message ?? ""} ${t('communities.citySearch.manual')}` : empty ? t('communities.citySearch.empty') : '';

  const pick = (hit: CityHit) => {
    onPick(hit);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setActive(-1);
      }
      return;
    }
    if (!listOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % hits.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? hits.length - 1 : a - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      // Picking must not submit the form.
      e.preventDefault();
      const hit = hits[active];
      if (hit) pick(hit);
    }
  };

  return (
    <Field id={id} label={t('communities.city')} error={error} hint={t('communities.citySearch.hint')} className="city-field">
      {(describedBy) => (
        <div className="city-combobox">
          <div className="city-input-wrap">
          <input
            type="text"
            id={id}
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={listOpen}
            aria-controls={listId}
            aria-activedescendant={listOpen && active >= 0 ? `${id}-opt-${active}` : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={[describedBy, status ? statusId : ''].filter(Boolean).join(' ') || undefined}
            maxLength={120}
            {...registration}
            onChange={(e) => {
              void registration.onChange(e);
              setText(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onBlur={(e) => {
              void registration.onBlur(e);
              setOpen(false);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
          <ul id={listId} role="listbox" aria-label={t('communities.citySearch.results')} className="city-options" hidden={!listOpen}>
            {hits.map((hit, i) => (
              <li
                key={`${hit.name}-${hit.country}-${hit.latitude}-${hit.longitude}`}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className="city-option"
                data-active={i === active || undefined}
                // Keeps focus in the input, so the list does not close (blur) before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(hit)}
              >
                <Icon name="pin" aria-hidden="true" />
                <span className="city-option-text">
                  <strong>{hit.name}</strong>
                  <span>{describeHit(hit, locale)}</span>
                </span>
              </li>
            ))}
          </ul>
          </div>
          <p id={statusId} className={failed ? 'city-status city-status-warn' : 'city-status'} role="status" aria-live="polite">
            {status}
          </p>
        </div>
      )}
    </Field>
  );
}
