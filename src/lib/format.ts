export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export const todayIso = () => new Date().toLocaleDateString('sv-SE');

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-PT', options);
}

export const playersLabel = (min: number, max: number) =>
  min === max ? `${min} ${min === 1 ? 'jogador' : 'jogadores'}` : `${min}–${max} jogadores`;

export const initials = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';

export const STATUS_LABELS = {
  unplayed: 'Por jogar',
  in_progress: 'Em progresso',
  completed: 'Concluído',
} as const;
