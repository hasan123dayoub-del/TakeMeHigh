'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const noopSubscribe = () => () => {};

/** Today's long date, rendered on the client only (avoids server/client locale mismatch). */
export function TodayLine({ className }: { className?: string }) {
  const today = useSyncExternalStore(
    noopSubscribe,
    () => formatDate(new Date(), 'long'),
    () => '',
  );
  return (
    <span className={className} suppressHydrationWarning>
      {today || ' '}
    </span>
  );
}

export interface PageHeaderProps {
  title: ReactNode;
  /** Small uppercase line above the title. Defaults to today's date. */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Buttons aligned to the right (wrap under the title on mobile). */
  actions?: ReactNode;
  /** `hero` is the dashboard greeting size; `default` for module pages. */
  size?: 'hero' | 'default';
  className?: string;
}

/**
 * Date line + uppercase light Outfit title + description + actions.
 * Emphasise a word with <strong> inside `title` (rendered at weight 500).
 */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  size = 'default',
  className,
}: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn('flex flex-wrap items-end justify-between gap-x-6 gap-y-5', className)}
    >
      <div className="min-w-0 animate-rise">
        <div className="text-xs font-medium tracking-[0.22em] text-muted uppercase">
          {eyebrow ?? <TodayLine />}
        </div>
        <h1
          className={cn(
            'heading-display mt-2 text-balance [&_strong]:font-medium',
            size === 'hero'
              ? 'text-[34px] leading-[1.05] sm:text-5xl lg:text-[56px]'
              : 'text-[30px] leading-[1.08] sm:text-[40px] lg:text-[46px]',
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-pretty text-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
