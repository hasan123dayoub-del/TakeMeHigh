import { Plane } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Ink circle mark + wordmark. */
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
        TravelOS
      </span>
    </span>
  );
}
