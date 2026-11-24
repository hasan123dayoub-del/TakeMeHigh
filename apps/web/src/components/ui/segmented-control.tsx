'use client';

import { motion } from 'motion/react';
import { ToggleGroup } from 'radix-ui';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Accessible label when `label` is an icon. */
  ariaLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  size?: 'sm' | 'md';
  /** `contained` = white pill track (top-nav style); `loose` = separate pills (filter chips). */
  appearance?: 'contained' | 'loose';
  className?: string;
  'aria-label': string;
}

/**
 * Pill segmented control with the Cirrus ink-black active pill.
 * Keyboard: arrow keys move focus (Radix ToggleGroup), Space/Enter selects.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  size = 'sm',
  appearance = 'contained',
  className,
  ...aria
}: SegmentedControlProps<T>) {
  const layoutId = useId();
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
      className={cn(
        'inline-flex items-center',
        appearance === 'contained'
          ? 'gap-0.5 rounded-full border border-border bg-surface-raised p-1'
          : 'flex-wrap gap-1.5',
        className,
      )}
      {...aria}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <ToggleGroup.Item
            key={o.value}
            value={o.value}
            aria-label={o.ariaLabel}
            className={cn(
              'relative inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              size === 'sm' ? 'h-8 px-3.5 text-xs' : 'h-9 px-4 text-[14px]',
              active ? 'text-ink-foreground' : 'text-muted hover:text-foreground',
              appearance === 'loose' &&
                !active &&
                'border border-border bg-surface-raised hover:border-border-strong',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                aria-hidden
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </ToggleGroup.Item>
        );
      })}
    </ToggleGroup.Root>
  );
}
