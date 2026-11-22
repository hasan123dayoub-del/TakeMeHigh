'use client';

import { CheckCircle2, ChevronRight, Clock3, Gavel, Hourglass, ListOrdered, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { useMessages } from '@/lib/i18n';
import type { DashboardData } from '@/lib/types/dashboard';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { dashboardMessages } from './messages';

function TaskGroup({
  icon: Icon,
  title,
  hint,
  count,
  tone,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  count: number;
  tone: 'warning' | 'primary' | 'info';
  children?: ReactNode;
}) {
  const f = useFormat();
  return (
    <section className="rounded-tile border border-border bg-surface-raised p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full',
            tone === 'warning' && 'bg-warning/14 text-[color-mix(in_srgb,var(--warning)_78%,var(--text))]',
            tone === 'primary' && 'bg-primary/12 text-primary',
            tone === 'info' && 'bg-info/12 text-[color-mix(in_srgb,var(--info)_78%,var(--text))]',
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium">{title}</h3>
            <span className="num text-lg leading-none font-medium">{f.number(count)}</span>
          </div>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </section>
  );
}

function TaskLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group/task flex items-center gap-2 rounded-[12px] px-2.5 py-2 text-[13px] transition-colors hover:bg-surface focus-visible:bg-surface"
    >
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronRight className="rtl-flip size-4 shrink-0 text-subtle transition-transform group-hover/task:translate-x-0.5 rtl:group-hover/task:-translate-x-0.5" aria-hidden />
    </Link>
  );
}

export function TasksPanel({ tasks, loading }: { tasks: DashboardData['tasks'] | undefined; loading: boolean }) {
  const t = useMessages(dashboardMessages);
  const f = useFormat();
  const { can } = useAuth();
  const canBookings = can('bookings.view');

  const empty =
    tasks &&
    !tasks.awaitingDecision.length &&
    !tasks.registrationClosingSoon.length &&
    !tasks.pendingBookings &&
    !tasks.waitingList;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div>
          <CardTitle>{t.tasksTitle}</CardTitle>
          <CardDescription>{t.tasksHint}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {loading || !tasks ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 w-full rounded-tile" />)
        ) : empty ? (
          <EmptyState size="sm" icon={CheckCircle2} title={t.allClear} description={t.allClearBody} />
        ) : (
          <>
            {tasks.awaitingDecision.length > 0 && (
              <TaskGroup
                icon={Gavel}
                tone="warning"
                title={t.awaitingDecision}
                hint={t.awaitingDecisionHint}
                count={tasks.awaitingDecision.length}
              >
                <ul className="-mx-1">
                  {tasks.awaitingDecision.map((trip) => (
                    <li key={trip.id}>
                      <TaskLink href={`/dashboard/trips/${trip.id}`}>
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="ltr-nums font-medium">{trip.code}</span>
                          <span className="text-xs text-muted">{f.date(trip.departureDate, 'short')}</span>
                          <Badge tone={trip.minimumReached ? 'success' : 'danger'} size="sm" dot>
                            {trip.minimumReached ? t.minReached : t.minMissing}
                          </Badge>
                          <span className="num text-xs text-muted">
                            {f.number(trip.confirmedSeats)}/{f.number(trip.minPassengers)}
                          </span>
                        </span>
                      </TaskLink>
                    </li>
                  ))}
                </ul>
              </TaskGroup>
            )}

            {tasks.registrationClosingSoon.length > 0 && (
              <TaskGroup
                icon={Clock3}
                tone="primary"
                title={t.closingSoon}
                hint={t.closingSoonHint}
                count={tasks.registrationClosingSoon.length}
              >
                <ul className="-mx-1">
                  {tasks.registrationClosingSoon.map((trip) => (
                    <li key={trip.id}>
                      <TaskLink href={`/dashboard/trips/${trip.id}`}>
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="ltr-nums font-medium">{trip.code}</span>
                          <span className="text-xs text-muted">{f.relative(`${trip.closesOn}T23:59:59`)}</span>
                          <Badge tone={trip.confirmedSeats >= trip.minPassengers ? 'success' : 'warning'} size="sm">
                            <span className="num">
                              {f.number(trip.confirmedSeats)}/{f.number(trip.minPassengers)}
                            </span>
                          </Badge>
                        </span>
                      </TaskLink>
                    </li>
                  ))}
                </ul>
              </TaskGroup>
            )}

            {tasks.pendingBookings > 0 && (
              <TaskGroup icon={Hourglass} tone="warning" title={t.pendingTask} count={tasks.pendingBookings}>
                {canBookings && (
                  <TaskLink href="/dashboard/bookings?status=PENDING">
                    <span className="text-muted">{t.review}</span>
                  </TaskLink>
                )}
              </TaskGroup>
            )}

            {tasks.waitingList > 0 && (
              <TaskGroup icon={ListOrdered} tone="info" title={t.waitingTask} count={tasks.waitingList}>
                {canBookings && (
                  <TaskLink href="/dashboard/bookings?status=WAITING_LIST">
                    <span className="text-muted">{t.review}</span>
                  </TaskLink>
                )}
              </TaskGroup>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
