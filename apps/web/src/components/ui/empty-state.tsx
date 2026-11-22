import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Primary call to action (usually a <Button>). */
  action?: ReactNode;
  /** Secondary action or link. */
  secondaryAction?: ReactNode;
  /** Optional list of what the module will contain / what to do next. */
  children?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Icon in a sky "orbit", title, description and CTA. Used for empty lists,
 * no-results and module landing pages.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  size = 'md',
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center text-center',
        size === 'md' ? 'px-6 py-14 sm:py-16' : 'px-4 py-10',
        className,
      )}
    >
      <div className="grid place-items-center *:col-start-1 *:row-start-1" aria-hidden>
        <span className="size-28 rounded-full border border-dashed border-accent/60" />
        <span className="size-20 rounded-full bg-accent-soft" />
        <span className="grid size-14 place-items-center rounded-full bg-surface-raised text-primary shadow-pop">
          <Icon className="size-6" strokeWidth={1.75} />
        </span>
      </div>
      <h3 className="mt-5 font-display text-xl font-normal tracking-tight text-foreground">
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-pretty text-muted">
          {description}
        </p>
      )}
      {children && <div className="mt-6 w-full max-w-xl">{children}</div>}
      {(action || secondaryAction) && (
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
