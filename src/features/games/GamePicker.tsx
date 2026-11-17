import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { Field } from '@/components/ui';
import { t } from '@/i18n';

export interface GamePickerOption {
  value: string;
  label: string;
}

export interface GamePickerProps {
  label: string;
  options: GamePickerOption[];
  /** The chosen option's value, or '' when nothing is chosen. */
  value: string;
  onChange: (value: string) => void;
}

const MAX_SHOWN = 30;
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/**
 * Type to find a game in a catalogue of hundreds (ARIA combobox): the list shows the first matches, titles that start
 * with the text first. Works with pointer, touch and keyboard (arrows, Enter, Escape).
 */
export function GamePicker({ label, options, value, onChange }: GamePickerProps) {
  const id = useId();
  const listId = `${id}-list`;
  const statusId = `${id}-status`;
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const chosen = options.find((o) => o.value === value);
  const shownText = chosen && !open ? chosen.label : text;

  const matches = useMemo(() => {
    const q = fold(text);
    const folded = options.map((o) => ({ o, f: fold(o.label) }));
    const starts = folded.filter((x) => x.f.startsWith(q));
    const rest = q ? folded.filter((x) => !x.f.startsWith(q) && x.f.includes(q)) : [];
    return [...starts, ...rest].map((x) => x.o);
  }, [options, text]);
  const hits = matches.slice(0, MAX_SHOWN);
  const listOpen = open && hits.length > 0;
  const status = !open ? '' : hits.length === 0 ? t('gamePicker.empty') : matches.length > MAX_SHOWN ? t('gamePicker.more', { n: matches.length - MAX_SHOWN }) : '';

  const pick = (o: GamePickerOption) => {
    onChange(o.value);
    setText(o.label);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (open) { e.preventDefault(); setOpen(false); setActive(-1); }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!hits.length) return;
      e.preventDefault();
      setOpen(true);
      setActive((a) => (e.key === 'ArrowDown' ? (a + 1) % hits.length : a <= 0 ? hits.length - 1 : a - 1));
    } else if (e.key === 'Enter' && listOpen && active >= 0) {
      e.preventDefault();
      const o = hits[active];
      if (o) pick(o);
    }
  };

  return (
    <Field id={id} label={label} className="city-field">
      {(describedBy) => (
        <div className="city-combobox">
          <div className="city-input-wrap">
            <input
              type="text"
              id={id}
              autoComplete="off"
              enterKeyHint="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={listOpen}
              aria-controls={listId}
              aria-activedescendant={listOpen && active >= 0 ? `${id}-opt-${active}` : undefined}
              aria-describedby={[describedBy, status ? statusId : ''].filter(Boolean).join(' ') || undefined}
              placeholder={t('communities.pickGame')}
              value={shownText}
              onChange={(e) => {
                setText(e.target.value);
                setOpen(true);
                setActive(-1);
                if (value) onChange('');
              }}
              onFocus={(e) => { setText(chosen ? chosen.label : text); setOpen(true); e.currentTarget.select(); }}
              onBlur={() => { setOpen(false); setActive(-1); if (!value) setText(''); }}
              onKeyDown={onKeyDown}
            />
            <ul id={listId} role="listbox" aria-label={label} className="city-options" hidden={!listOpen}>
              {hits.map((o, i) => (
                <li
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={o.value === value}
                  className="city-option"
                  data-active={i === active || undefined}
                  // Keeps focus in the input, so the list does not close (blur) before the click lands.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o)}
                >
                  <span className="city-option-text"><strong>{o.label}</strong></span>
                </li>
              ))}
            </ul>
          </div>
          <p id={statusId} className="city-status" role="status" aria-live="polite">{status}</p>
        </div>
      )}
    </Field>
  );
}
