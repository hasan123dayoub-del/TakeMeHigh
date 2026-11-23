'use client';

import { CloudOff, Lock, SearchX } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, errorMessage } from '@/lib/api';
import { useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';

/** Loading / error / forbidden / not-found states for a page-level query. */
export function QueryState({
  isLoading,
  error,
  onRetry,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  onRetry?: () => void;
  children: ReactNode;
}) {
  const c = useMessages(common);
  if (isLoading) return <PageSkeleton />;
  if (error) {
    const e = error instanceof ApiError ? error : null;
    if (e?.isForbidden) return <EmptyState icon={Lock} title={c.forbiddenTitle} description={c.forbiddenBody} />;
    if (e?.isNotFound) return <EmptyState icon={SearchX} title={c.notFoundTitle} description={errorMessage(error)} />;
    return (
      <EmptyState
        icon={CloudOff}
        title={c.errorTitle}
        description={e?.isNetwork ? c.networkError : errorMessage(error)}
        action={onRetry ? <Button onClick={onRetry}>{c.retry}</Button> : undefined}
      />
    );
  }
  return <>{children}</>;
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-5 w-96 max-w-full" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

/** Label / value pair for detail pages. */
export function Field({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium break-words">{children ?? '—'}</dd>
    </div>
  );
}
