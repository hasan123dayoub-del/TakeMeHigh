'use client';

import { ChevronRight, Inbox } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/lib/auth';
import { fmt, useMessages } from '@/lib/i18n';
import type { DashboardBooking } from '@/lib/types/dashboard';
import { useFormat } from '@/lib/use-format';
import { dashboardMessages } from './messages';
import { Money } from './money';

function Row({ href, children }: { href?: string; children: ReactNode }) {
  const cls = 'flex items-start gap-3 py-3';
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <div className={cls}>{children}</div>
  );
}

export function RecentBookings({ bookings, loading }: { bookings: DashboardBooking[] | undefined; loading: boolean }) {
  const t = useMessages(dashboardMessages);
  const f = useFormat();
  const router = useRouter();
  const { can } = useAuth();
  const canOpen = can('bookings.view');
  const href = (b: DashboardBooking) => `/dashboard/bookings/${b.id}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.recentBookingsTitle}</CardTitle>
        {canOpen && (
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard/bookings">
              {t.viewAllBookings}
              <ChevronRight className="rtl-flip" aria-hidden />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-4 sm:pt-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !bookings?.length ? (
          <EmptyState size="sm" icon={Inbox} title={t.noBookings} description={t.noBookingsBody} />
        ) : (
          <>
            {/* Mobile: stacked list */}
            <ul className="divide-y divide-border md:hidden">
              {bookings.map((b) => (
                <li key={b.id}>
                  <Row href={canOpen ? href(b) : undefined}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{b.customer}</span>
                        <StatusBadge kind="booking" status={b.status} size="sm" />
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted">{b.trip}</div>
                      <div className="mt-1 text-xs text-subtle">
                        <span className="ltr-nums">{b.reference}</span> · {f.relative(b.createdAt)}
                      </div>
                    </div>
                    <span className="num shrink-0 text-sm font-medium"><Money value={b.total} currency={b.currencyCode} /></span>
                  </Row>
                </li>
              ))}
            </ul>

            {/* Desktop: table */}
            <div className="hidden md:block">
              <Table className="text-start">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {[t.colReference, t.colCustomer, t.colTrip, t.colPax, t.colTotal, t.colStatus, t.colWhen].map((h, i) => (
                      <TableHead key={h} className={i === 3 || i === 4 ? 'text-end' : 'text-start'}>
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow
                      key={b.id}
                      className={canOpen ? 'cursor-pointer' : undefined}
                      onClick={canOpen ? () => router.push(href(b)) : undefined}
                    >
                      <TableCell>
                        {canOpen ? (
                          <Link href={href(b)} className="ltr-nums font-medium text-muted hover:text-primary" onClick={(e) => e.stopPropagation()}>
                            {b.reference}
                          </Link>
                        ) : (
                          <span className="ltr-nums text-muted">{b.reference}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{b.customer}</TableCell>
                      <TableCell className="max-w-64 truncate text-muted">{b.trip}</TableCell>
                      <TableCell className="num text-end">{fmt(t.pax, { n: f.number(b.passengers) })}</TableCell>
                      <TableCell className="num text-end font-medium whitespace-nowrap"><Money value={b.total} currency={b.currencyCode} /></TableCell>
                      <TableCell>
                        <StatusBadge kind="booking" status={b.status} size="sm" />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted">{f.relative(b.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
