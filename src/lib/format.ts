import { getLocale, t, tn } from '@/i18n';

export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export const todayIso = () => new Date().toLocaleDateString('sv-SE');

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(getLocale(), options);
}

/** How long ago a 'YYYY-MM-DD' day was, in the active locale: "today", "yesterday", "3 days ago", "2 weeks ago"... */
export function relativeDay(value: string, today = todayIso()) {
  const days = Math.max(0, Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${value}T12:00:00Z`)) / 86_400_000));
  if (Number.isNaN(days)) return formatDate(value);
  const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });
  if (days < 7) return rtf.format(-days, 'day');
  if (days < 30) return rtf.format(-Math.floor(days / 7), 'week');
  if (days < 365) return rtf.format(-Math.floor(days / 30), 'month');
  return rtf.format(-Math.floor(days / 365), 'year');
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

