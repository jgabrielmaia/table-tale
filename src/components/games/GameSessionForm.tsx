import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Icon, Input, Textarea } from '@/components/ui';
import { sessionSchema, type SessionFormInput, type SessionFormValues } from '@/features/games/schemas';
import { cn, todayIso } from '@/lib/format';

export interface GameSessionFormProps {
  defaultDuration?: number;
  defaultPlayers?: number;
  onSubmit: (values: SessionFormValues) => Promise<void>;
}

export function GameSessionForm({ defaultDuration, defaultPlayers, onSubmit }: GameSessionFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SessionFormInput, unknown, SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      playedAt: todayIso(),
      durationMinutes: defaultDuration ?? '',
      playersCount: defaultPlayers ?? '',
      rating: '',
      notes: '',
    },
  });

  const rating = Number(watch('rating')) || 0;

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch {
      return; // keep the user's input; the caller already reported the error
    }
    reset({ playedAt: todayIso(), durationMinutes: defaultDuration ?? '', playersCount: defaultPlayers ?? '', rating: '', notes: '' });
  });

  return (
    <form className="session-form" onSubmit={submit} noValidate aria-label="Registar sessão">
      <Input label="Data" type="date" max={todayIso()} error={errors.playedAt?.message} {...register('playedAt')} />
      <Input label="Jogadores" type="number" inputMode="numeric" min={1} max={99} optional error={errors.playersCount?.message} {...register('playersCount')} />
      <Input label="Duração (min)" type="number" inputMode="numeric" min={1} max={1440} optional error={errors.durationMinutes?.message} {...register('durationMinutes')} />

      <fieldset className="field">
        <legend>Avaliação <span className="optional">(opcional)</span></legend>
        <div className="rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className={cn(n <= rating && 'on')}>
              <input type="radio" value={n} checked={rating === n} onChange={() => setValue('rating', n, { shouldValidate: true })} name="rating" />
              <span aria-hidden="true">★</span>
              <span className="sr-only">{n} {n === 1 ? 'estrela' : 'estrelas'}</span>
            </label>
          ))}
          {rating > 0 && (
            <button type="button" className="btn-link ml-2 text-sm" onClick={() => setValue('rating', '')}>Limpar</button>
          )}
        </div>
        {errors.rating?.message && <p className="field-error" role="alert">{errors.rating.message}</p>}
      </fieldset>

      <Textarea
        label="Notas"
        optional
        rows={3}
        maxLength={1000}
        placeholder="Momentos marcantes, pontuações, regras da casa…"
        wrapperClassName="field-wide"
        error={errors.notes?.message}
        {...register('notes')}
      />
      <div className="field-wide form-actions">
        <Button type="submit" variant="primary" loading={isSubmitting} loadingText="A registar…" icon={<Icon name="plus" />}>
          Registar sessão
        </Button>
      </div>
    </form>
  );
}
