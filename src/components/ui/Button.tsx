import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/format';

export type ButtonVariant = 'primary' | 'gold' | 'teal' | 'secondary' | 'ghost' | 'outline-light';
export type ButtonSize = 'sm' | 'md';

const classes = (variant: ButtonVariant, size: ButtonSize, block?: boolean, className?: string) =>
  cn('btn', `btn-${variant}`, size === 'sm' && 'btn-sm', block && 'btn-block', className);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', block, loading, loadingText, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={classes(variant, size, block, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : icon}
      {loading && loadingText ? loadingText : children}
    </button>
  );
});

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: ReactNode;
}

export function ButtonLink({ variant = 'secondary', size = 'md', block, icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={classes(variant, size, block, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
