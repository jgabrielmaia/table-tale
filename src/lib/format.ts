import { getLocale, t, tn } from '@/i18n';

export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export const todayIso = () => new Date().toLocaleDateString('sv-SE');

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(getLocale(), options);
}

export const formatNumber = (value: number) => value.toLocaleString(getLocale());

export const playersLabel = (min: number, max: number) =>
  min === max ? tn('common.players', min) : t('common.playersRange', { min, max });

/** BGG does not always know players or duration (stored as null): show a dash instead of inventing a value. */
export const playersText = (min: number | null, max: number | null) => {
  if (min === null && max === null) return '—';
  const lo = min ?? max!;
  return playersLabel(lo, max ?? lo);
};
export const minutesText = (n: number | null) => (n === null ? '—' : t('common.minutesApprox', { n }));

export const initials = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';

export const statusLabel = (status: 'unplayed' | 'in_progress' | 'completed') => t(`status.${status}`);

