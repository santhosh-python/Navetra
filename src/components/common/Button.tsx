import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

/** Class names for a button. Use with <Link> when the control navigates instead of acting. */
export function buttonClasses(options: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  const { variant = 'secondary', size = 'md', iconOnly = false, fullWidth = false, className } = options;
  return [
    'btn',
    variant === 'primary' && 'btn--primary',
    variant === 'ghost' && 'btn--ghost',
    variant === 'danger' && 'btn--danger',
    size === 'sm' && 'btn--sm',
    iconOnly && 'btn--icon',
    fullWidth && 'btn--block',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  /** Icon-only buttons need an aria-label. */
  iconOnly?: boolean;
  fullWidth?: boolean;
}

export function Button({ variant, size, icon, iconOnly, fullWidth, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses({ variant, size, iconOnly, fullWidth, className })} {...rest}>
      {icon}
      {!iconOnly && children}
    </button>
  );
}
