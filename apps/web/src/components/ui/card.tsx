import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * The big frosted-glass container that sits on the sky canvas.
 * Use once per screen (it is the app shell's main panel); nest Cards inside.
 */
export function GlassPanel({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="glass-panel" className={cn('glass rounded-panel', className)} {...props} />
  );
}

/** Surface card used inside the glass panel (KPI, chart, table, timeline). */
export function Card({
  className,
  tone = 'surface',
  ...props
}: ComponentProps<'div'> & { tone?: 'surface' | 'raised' | 'altitude' }) {
  return (
    <div
      data-slot="card"
      className={cn(
        'relative rounded-card',
        tone === 'surface' && 'border border-transparent bg-surface dark:border-border/80',
        tone === 'raised' && 'border border-border bg-surface-raised shadow-card',
        tone === 'altitude' && 'overflow-hidden bg-altitude',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 p-5 pb-0 sm:p-6 sm:pb-0',
        className,
      )}
      {...props}
    />
  );
}

/** Uppercase light Outfit title, the Cirrus section heading. */
export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return (
    <h2
      data-slot="card-title"
      className={cn('heading-display text-[16px] leading-tight', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="card-description"
      className={cn('mt-1 text-[14px] text-muted', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('p-5 sm:p-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center gap-3 border-t border-border px-5 py-4 sm:px-6', className)}
      {...props}
    />
  );
}
