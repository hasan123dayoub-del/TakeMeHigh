import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** Shimmering placeholder. Decorative: hidden from assistive tech. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        'animate-shimmer rounded-[10px] bg-size-[200%_100%]',
        'bg-[linear-gradient(90deg,var(--surface-sunken)_0%,color-mix(in_srgb,var(--surface-raised)_80%,transparent)_50%,var(--surface-sunken)_100%)]',
        className,
      )}
      {...props}
    />
  );
}
