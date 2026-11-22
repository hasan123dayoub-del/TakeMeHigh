'use client';

import { CloudOff, RotateCw, SearchX, ShieldOff, type LucideIcon } from 'lucide-react';
import { useCallback, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/api';
import { common, useMessages } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { errorStatus, isNetworkError } from './utils';

/** Maps any thrown value to text: API messages verbatim, network errors in the UI language. */
export function useErrorText() {
  const c = useMessages(common);
  return useCallback(
    (err: unknown) => (isNetworkError(err) ? c.networkError : errorMessage(err, c.errorBody)),
    [c],
  );
}

/** Designed error state with retry. 403 renders the "no access" state, 404 "not found". */
export function QueryError({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const c = useMessages(common);
  const text = useErrorText();
  const status = errorStatus(error);
  if (status === 403) return <Forbidden className={className} />;
  return (
    <EmptyState
      className={className}
      icon={status === 404 ? SearchX : CloudOff}
      title={status === 404 ? c.notFoundTitle : c.errorTitle}
      description={text(error)}
      action={
        onRetry && status !== 404 ? (
          <Button variant="secondary" onClick={onRetry}>
            <RotateCw /> {c.retry}
          </Button>
        ) : undefined
      }
    />
  );
}

export function Forbidden({ className }: { className?: string }) {
  const c = useMessages(common);
  return (
    <EmptyState className={className} icon={ShieldOff} title={c.forbiddenTitle} description={c.forbiddenBody} />
  );
}

/** Inline banner for a failed mutation (API 400/409 messages are shown verbatim). */
export function ErrorBanner({ children, className }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className={cn(
        'rounded-tile border border-danger/25 bg-danger/8 px-4 py-3 text-[13px] leading-relaxed text-[color-mix(in_srgb,var(--danger)_80%,var(--text))]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Neutral info callout. */
export function Callout({
  icon: Icon,
  children,
  tone = 'info',
  className,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  tone?: 'info' | 'warning' | 'success';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-tile border px-4 py-3 text-[13px] leading-relaxed',
        tone === 'info' && 'border-primary/20 bg-accent-soft/70 text-foreground',
        tone === 'warning' && 'border-warning/30 bg-warning/10 text-foreground',
        tone === 'success' && 'border-success/30 bg-success/10 text-foreground',
        className,
      )}
    >
      {Icon && (
        <Icon
          aria-hidden
          className={cn(
            'mt-0.5 size-4 shrink-0',
            tone === 'info' && 'text-primary',
            tone === 'warning' && 'text-warning',
            tone === 'success' && 'text-success',
          )}
        />
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Skeleton for a detail page: header + KPI row + content card. */
export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="grid gap-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-10 w-2/3 max-w-xl" />
        <Skeleton className="h-4 w-1/2 max-w-md" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="grid gap-4 p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-28" />
          </Card>
        ))}
      </div>
      <Card className="grid gap-3 p-6">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-5" style={{ width: `${90 - i * 12}%` }} />
        ))}
      </Card>
    </div>
  );
}
