'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Accessible switch row (role="switch") with label and hint. */
export function SwitchRow({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3', disabled && 'cursor-not-allowed opacity-60')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors duration-200',
          'focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none',
          checked ? 'border-ink bg-ink' : 'border-border-strong bg-surface-sunken',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute top-1/2 size-4.5 -translate-y-1/2 rounded-full bg-surface-raised shadow-card transition-[inset-inline-start] duration-200 ease-out-soft',
            checked ? 'start-[calc(100%-1.25rem)]' : 'start-0.5',
          )}
        />
      </button>
      <span className="grid gap-0.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}
