import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/format';

interface FieldWrapperProps {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
  children: (describedBy: string | undefined) => ReactNode;
}

/** Label + control + hint/error wiring (aria-describedby / aria-invalid). */
export function Field({ id, label, error, hint, optional, className, children }: FieldWrapperProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('field', className)}>
      <label htmlFor={id}>
        {label} {optional && <span className="optional">(opcional)</span>}
      </label>
      {children(describedBy)}
      {hint && <p className="field-hint" id={hintId}>{hint}</p>}
      {error && <p className="field-error" id={errorId} role="alert">{error}</p>}
    </div>
  );
}

type BaseProps = { label: ReactNode; error?: string; hint?: string; optional?: boolean; wrapperClassName?: string; leadingIcon?: ReactNode };

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & BaseProps>(function Input(
  { label, error, hint, optional, wrapperClassName, leadingIcon, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field id={inputId} label={label} error={error} hint={hint} optional={optional} className={wrapperClassName}>
      {(describedBy) => {
        const input = <input ref={ref} id={inputId} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...rest} />;
        return leadingIcon ? <div className="input-icon">{leadingIcon}{input}</div> : input;
      }}
    </Field>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & BaseProps>(function Textarea(
  { label, error, hint, optional, wrapperClassName, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field id={inputId} label={label} error={error} hint={hint} optional={optional} className={wrapperClassName}>
      {(describedBy) => <textarea ref={ref} id={inputId} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...rest} />}
    </Field>
  );
});

export interface SelectOption {
  value: string;
  label: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & BaseProps & { options: SelectOption[] }>(function Select(
  { label, error, hint, optional, wrapperClassName, id, options, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field id={inputId} label={label} error={error} hint={hint} optional={optional} className={wrapperClassName}>
      {(describedBy) => (
        <select ref={ref} id={inputId} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </Field>
  );
});
