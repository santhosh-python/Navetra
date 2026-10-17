import type { ReactNode } from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Visible label, optional hint and error message around a control.
 * Pass `fieldAria(...)` to the control so the hint and error are announced with it.
 */
export function FormField({ id, label, hint, error, children, className }: FormFieldProps) {
  return (
    <div className={`field ${className ?? ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <span className="field__hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field__error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

/** Accessibility attributes for a control inside FormField. */
export function fieldAria(id: string, hint?: string, error?: string) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ');
  return {
    id,
    'aria-describedby': describedBy || undefined,
    'aria-invalid': error ? (true as const) : undefined,
  };
}
