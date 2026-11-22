'use client';

import { createContext, useContext, useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Label } from './label';

type FieldContextValue = {
  id: string;
  descriptionId?: string;
  errorId?: string;
  invalid: boolean;
  required?: boolean;
};

const FieldContext = createContext<FieldContextValue | null>(null);

/** Read by Input / Textarea / SelectTrigger to wire id + aria attributes automatically. */
export function useFieldControl() {
  const ctx = useContext(FieldContext);
  if (!ctx) return {};
  const describedBy = [ctx.descriptionId, ctx.errorId].filter(Boolean).join(' ') || undefined;
  return {
    id: ctx.id,
    'aria-invalid': ctx.invalid || undefined,
    'aria-describedby': describedBy,
    'aria-required': ctx.required || undefined,
  } as const;
}

export interface FormFieldProps {
  label: ReactNode;
  /** Validation message; when set the control is marked aria-invalid. */
  error?: string;
  /** Helper text under the control. */
  hint?: ReactNode;
  required?: boolean;
  /** Optional element aligned right of the label (e.g. "Forgot password?"). */
  labelAside?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Label + control + hint + error. The control inside picks up `id`,
 * `aria-invalid` and `aria-describedby` from context, so screen readers
 * announce the error together with the field.
 */
export function FormField({
  label,
  error,
  hint,
  required,
  labelAside,
  id: idProp,
  className,
  children,
}: FormFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const descriptionId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <FieldContext.Provider value={{ id, descriptionId, errorId, invalid: !!error, required }}>
      <div data-slot="form-field" className={cn('grid gap-2', className)}>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={id}>
            {label}
            {required && (
              <span className="text-danger" aria-hidden>
                {' '}
                *
              </span>
            )}
          </Label>
          {labelAside}
        </div>
        {children}
        {hint && !error && (
          <p id={descriptionId} className="text-xs text-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}
