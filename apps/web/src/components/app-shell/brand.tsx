'use client';

import { Plane } from 'lucide-react';
import { useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import { cn } from '@/lib/utils';

/** Ink circle mark + the TakeMeHigh wordmark. */
export function Brand({
  className,
  compact = false,
  wordmarkClassName,
}: {
  className?: string;
  compact?: boolean;
  wordmarkClassName?: string;
}) {
  const t = useMessages(common);
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-ink-foreground">
        <Plane className="size-4 -rotate-45" aria-hidden />
      </span>
      <span
        className={cn(
          'font-display text-lg font-medium tracking-tight',
          compact && 'sr-only',
          wordmarkClassName,
        )}
      >
        {t.appName}
      </span>
    </span>
  );
}
