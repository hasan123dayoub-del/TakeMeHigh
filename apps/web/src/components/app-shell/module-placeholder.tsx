'use client';

import { ArrowLeft, Check, ShieldOff, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/lib/auth';
import { MODULE_COPY, type ModuleKey } from './module-copy';

export interface ModuleLandingProps {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Heading of the empty state, e.g. "No trips scheduled yet". */
  emptyTitle: string;
  emptyDescription: string;
  /** What this module covers (rendered as a checklist). */
  capabilities: string[];
  actions?: ReactNode;
  /** Extra content between the header and the empty state. */
  children?: ReactNode;
}

/**
 * Module landing view used until each module's data screens ship:
 * PageHeader + EmptyState with a capability checklist. Checks the module's
 * permission and shows a restricted state for roles without access.
 */
export function ModulePage({
  module,
  actions,
  children,
}: {
  module: ModuleKey;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const copy = MODULE_COPY[module];
  const { can } = useAuth();
  if (!can(copy.permission)) return <RestrictedModule title={copy.title} />;
  return (
    <ModuleLanding {...copy} actions={actions}>
      {children}
    </ModuleLanding>
  );
}

export function ModuleLanding({
  title,
  description,
  icon,
  emptyTitle,
  emptyDescription,
  capabilities,
  actions,
  children,
}: ModuleLandingProps) {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageHeader title={title} description={description} actions={actions} />
      <div className="flex flex-1 flex-col gap-3">
        {children}
        <Card className="flex flex-1 items-center justify-center">
          <EmptyState icon={icon} title={emptyTitle} description={emptyDescription}>
            <ul className="grid gap-2 text-left sm:grid-cols-2">
              {capabilities.map((c) => (
                <li
                  key={c}
                  className="flex items-start gap-2.5 rounded-tile border border-border bg-surface-raised px-3.5 py-3 text-[13px] leading-snug"
                >
                  <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  </span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </EmptyState>
        </Card>
      </div>
    </div>
  );
}

export function RestrictedModule({ title }: { title: string }) {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageHeader title={title} />
      <Card className="flex flex-1 items-center justify-center">
        <EmptyState
          icon={ShieldOff}
          title="You don't have access to this area"
          description="Your role doesn't include this module. Ask your agency owner or an administrator if you need access."
          action={
            <Button asChild variant="ink">
              <Link href="/dashboard">
                <ArrowLeft /> Back to dashboard
              </Link>
            </Button>
          }
        />
      </Card>
    </div>
  );
}
