'use client';

import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useFieldControl } from './form-field';

export const fieldBase = cn(
  'w-full min-w-0 rounded-field border border-border bg-surface-raised text-sm text-foreground shadow-card',
  'placeholder:text-subtle transition-[border-color,box-shadow] duration-150 outline-none',
  'hover:border-border-strong',
  'focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20 focus-visible:outline-none',
  'aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/20',
  'disabled:cursor-not-allowed disabled:opacity-60',
);

export interface InputProps extends ComponentProps<'input'> {
  /** Icon rendered inside the field on the left. */
  startIcon?: ReactNode;
  /** Element rendered inside the field on the right (e.g. a show-password button). */
  endSlot?: ReactNode;
}

export function Input({ className, startIcon, endSlot, type = 'text', ...props }: InputProps) {
  const field = useFieldControl();
  const plain = !startIcon && !endSlot;
  const input = (
    <input
      data-slot="input"
      type={type}
      {...field}
      {...props}
      className={cn(
        fieldBase,
        'h-11 px-4',
        startIcon && 'pl-10',
        endSlot && 'pr-11',
        'file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        plain && className,
      )}
    />
  );
  if (plain) return input;
  return (
    <div className={cn('relative', className)}>
      {startIcon && (
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-subtle [&_svg]:size-4">
          {startIcon}
        </span>
      )}
      {input}
      {endSlot && <span className="absolute top-1/2 right-1.5 -translate-y-1/2">{endSlot}</span>}
    </div>
  );
}
