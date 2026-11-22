'use client';

import { AlertTriangle, RotateCw, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ApiError, errorMessage } from '@/lib/api';
import { useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import { cn } from '@/lib/utils';

/** Designed error state with retry. 400/403/409 messages from the API are shown verbatim. */
export function ErrorState({
  error,
  onRetry,
  className,
  size = 'md',
}: {
  error?: unknown;
  onRetry?: () => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const c = useMessages(common);
  const api = error instanceof ApiError ? error : null;
  if (api?.isForbidden) return <ForbiddenState className={className} />;
  const human = api && [400, 404, 409].includes(api.status);
  return (
    <EmptyState
      size={size}
      icon={AlertTriangle}
      title={c.errorTitle}
      description={api?.isNetwork ? c.networkError : human ? errorMessage(error) : c.errorBody}
      action={
        onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            <RotateCw aria-hidden />
            {c.retry}
          </Button>
        )
      }
      className={className}
    />
  );
}

/** Page-level "no access" state for roles that can't open a section. */
export function ForbiddenState({ className }: { className?: string }) {
  const c = useMessages(common);
  return (
    <Card className={cn('grid place-items-center', className)}>
      <EmptyState icon={ShieldOff} title={c.forbiddenTitle} description={c.forbiddenBody} />
    </Card>
  );
}
