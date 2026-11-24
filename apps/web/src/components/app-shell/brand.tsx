'use client';

import { LogoBadge } from '@/components/brand/logo';
import { cn } from '@/lib/utils';

/** Take Me High badge + wordmark ("Take Me" in ink, "High" in the primary sky). */
export function Brand({
  className,
  compact = false,
  wordmarkClassName,
}: {
  className?: string;
  compact?: boolean;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn('group/brand inline-flex items-center gap-2.5', className)}>
      <LogoBadge className="size-10 shrink-0 transition-transform duration-500 ease-out-soft group-hover/brand:-rotate-6 group-hover/brand:scale-105" />
      <span
        dir="ltr"
        className={cn('font-display text-lg font-semibold tracking-tight whitespace-nowrap', compact && 'sr-only', wordmarkClassName)}
      >
        Take Me <span className="text-primary">High</span>
      </span>
    </span>
  );
}
